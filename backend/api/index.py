"""
Главный API для CRM проката квадроциклов BogatovTravel.
Обрабатывает все CRUD операции: квадроциклы, брони, клиенты, финансы.
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

S = 't_p21303888_quad_rent_crm_system'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def ok(data):
    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, code=400):
    return {'statusCode': code, 'headers': CORS_HEADERS, 'body': json.dumps({'error': msg})}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'dashboard')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # ── DASHBOARD ──────────────────────────────────────────
        if resource == 'dashboard':
            cur.execute(f"""
                SELECT
                  (SELECT COUNT(*) FROM "{S}".quads) AS total_quads,
                  (SELECT COUNT(*) FROM "{S}".quads WHERE status = 'available') AS available_quads,
                  (SELECT COUNT(*) FROM "{S}".quads WHERE status = 'rented') AS rented_quads,
                  (SELECT COUNT(*) FROM "{S}".quads WHERE status = 'maintenance') AS maintenance_quads,
                  (SELECT COUNT(*) FROM "{S}".bookings WHERE status IN ('confirmed','issued')) AS active_bookings,
                  (SELECT COUNT(*) FROM "{S}".bookings WHERE DATE(start_time) = CURRENT_DATE) AS today_bookings,
                  (SELECT COALESCE(SUM(amount),0) FROM "{S}".transactions WHERE type='income' AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)) AS month_income,
                  (SELECT COALESCE(SUM(amount),0) FROM "{S}".transactions WHERE type='expense' AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)) AS month_expense,
                  (SELECT COUNT(*) FROM "{S}".clients) AS total_clients
            """)
            stats = dict(cur.fetchone())

            cur.execute(f"""
                SELECT id, name, model, status, hourly_rate, mileage, last_service_date
                FROM "{S}".quads ORDER BY id
            """)
            stats['quads'] = [dict(r) for r in cur.fetchall()]

            cur.execute(f"""
                SELECT b.id, b.start_time, b.end_time, b.status, b.amount, b.duration_hours,
                       c.full_name as client_name, c.phone as client_phone,
                       q.name as quad_name
                FROM "{S}".bookings b
                JOIN "{S}".clients c ON c.id = b.client_id
                JOIN "{S}".quads q ON q.id = b.quad_id
                WHERE b.status IN ('pending','confirmed','issued')
                ORDER BY b.start_time LIMIT 10
            """)
            stats['active_bookings_list'] = [dict(r) for r in cur.fetchall()]

            cur.execute(f"""
                SELECT type, category, amount, description, transaction_date
                FROM "{S}".transactions ORDER BY created_at DESC LIMIT 8
            """)
            stats['recent_transactions'] = [dict(r) for r in cur.fetchall()]

            return ok(stats)

        # ── QUADS ──────────────────────────────────────────────
        elif resource == 'quads':
            if method == 'GET':
                cur.execute(f'SELECT * FROM "{S}".quads ORDER BY id')
                return ok([dict(r) for r in cur.fetchall()])

            elif method == 'POST':
                cur.execute(f"""
                    INSERT INTO "{S}".quads (name, model, year, power, hourly_rate, status, mileage, last_service_date, notes)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                """, (body['name'], body.get('model'), body.get('year'), body.get('power'),
                      body.get('hourly_rate', 1800), body.get('status','available'),
                      body.get('mileage', 0), body.get('last_service_date'), body.get('notes')))
                conn.commit()
                return ok(dict(cur.fetchone()))

            elif method == 'PUT':
                qid = params.get('id')
                fields = []
                vals = []
                for f in ['name','model','year','power','hourly_rate','status','mileage','last_service_date','next_service_mileage','notes']:
                    if f in body:
                        fields.append(f'{f} = %s')
                        vals.append(body[f])
                vals.append(qid)
                cur.execute(f'UPDATE "{S}".quads SET {", ".join(fields)} WHERE id = %s RETURNING *', vals)
                conn.commit()
                return ok(dict(cur.fetchone()))

            elif method == 'DELETE':
                qid = params.get('id')
                cur.execute(f'DELETE FROM "{S}".transactions WHERE booking_id IN (SELECT id FROM "{S}".bookings WHERE quad_id=%s)', (qid,))
                cur.execute(f'DELETE FROM "{S}".bookings WHERE quad_id=%s', (qid,))
                cur.execute(f'DELETE FROM "{S}".quads WHERE id=%s', (qid,))
                conn.commit()
                return ok({'deleted': True})

        # ── CLIENTS ────────────────────────────────────────────
        elif resource == 'clients':
            if method == 'GET':
                search = params.get('search', '')
                if search:
                    cur.execute(f"""
                        SELECT c.*, COUNT(b.id) as trips_count, COALESCE(SUM(b.amount),0) as total_spent
                        FROM "{S}".clients c LEFT JOIN "{S}".bookings b ON b.client_id = c.id
                        WHERE c.full_name ILIKE %s OR c.phone ILIKE %s
                        GROUP BY c.id ORDER BY c.created_at DESC
                    """, (f'%{search}%', f'%{search}%'))
                else:
                    cur.execute(f"""
                        SELECT c.*, COUNT(b.id) as trips_count, COALESCE(SUM(b.amount),0) as total_spent
                        FROM "{S}".clients c LEFT JOIN "{S}".bookings b ON b.client_id = c.id
                        GROUP BY c.id ORDER BY c.created_at DESC
                    """)
                return ok([dict(r) for r in cur.fetchall()])

            elif method == 'POST':
                cur.execute(f"""
                    INSERT INTO "{S}".clients (full_name, phone, telegram, passport, notes)
                    VALUES (%s,%s,%s,%s,%s) RETURNING *
                """, (body['full_name'], body.get('phone'), body.get('telegram'),
                      body.get('passport'), body.get('notes')))
                conn.commit()
                return ok(dict(cur.fetchone()))

            elif method == 'PUT':
                cid = params.get('id')
                fields, vals = [], []
                for f in ['full_name','phone','telegram','passport','is_blacklisted','blacklist_reason','notes']:
                    if f in body:
                        fields.append(f'{f} = %s')
                        vals.append(body[f])
                vals.append(cid)
                cur.execute(f'UPDATE "{S}".clients SET {", ".join(fields)} WHERE id = %s RETURNING *', vals)
                conn.commit()
                return ok(dict(cur.fetchone()))

            elif method == 'DELETE':
                cid = params.get('id')
                cur.execute(f'UPDATE "{S}".bookings SET client_id=NULL WHERE client_id=%s', (cid,))
                cur.execute(f'DELETE FROM "{S}".clients WHERE id=%s', (cid,))
                conn.commit()
                return ok({'deleted': True})

        # ── BOOKINGS ───────────────────────────────────────────
        elif resource == 'bookings':
            if method == 'GET':
                date_from = params.get('date_from')
                date_to = params.get('date_to')
                status_filter = params.get('status')

                where = []
                vals = []
                if date_from:
                    where.append("b.start_time >= %s")
                    vals.append(date_from)
                if date_to:
                    where.append("b.start_time <= %s")
                    vals.append(date_to)
                if status_filter:
                    where.append("b.status = %s")
                    vals.append(status_filter)

                where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''
                cur.execute(f"""
                    SELECT b.*, c.full_name as client_name, c.phone as client_phone, c.is_blacklisted,
                           q.name as quad_name, q.hourly_rate
                    FROM "{S}".bookings b
                    JOIN "{S}".clients c ON c.id = b.client_id
                    JOIN "{S}".quads q ON q.id = b.quad_id
                    {where_sql}
                    ORDER BY b.start_time DESC LIMIT 100
                """, vals)
                return ok([dict(r) for r in cur.fetchall()])

            elif method == 'POST':
                cur.execute(f"""
                    INSERT INTO "{S}".bookings (quad_id, client_id, start_time, end_time, duration_hours, amount, deposit, status, payment_method, notes)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                """, (body['quad_id'], body['client_id'], body['start_time'], body['end_time'],
                      body.get('duration_hours'), body['amount'], body.get('deposit', 0),
                      body.get('status','pending'), body.get('payment_method','cash'), body.get('notes')))
                booking = dict(cur.fetchone())
                if body.get('status') in ('confirmed','issued'):
                    cur.execute(f'UPDATE "{S}".quads SET status=\'rented\' WHERE id=%s', (body['quad_id'],))
                if body.get('amount'):
                    cur.execute(f"""
                        INSERT INTO "{S}".transactions (type, category, amount, description, booking_id, transaction_date)
                        VALUES ('income', 'Аренда', %s, %s, %s, CURRENT_DATE)
                    """, (body['amount'], f"Бронь #{booking['id']}", booking['id']))
                conn.commit()
                return ok(booking)

            elif method == 'PUT':
                bid = params.get('id')
                cur.execute(f'SELECT status, quad_id FROM "{S}".bookings WHERE id=%s', (bid,))
                row = cur.fetchone()
                old_status = row['status'] if row else None
                quad_id = row['quad_id'] if row else None

                fields, vals = [], []
                for f in ['status','notes','deposit','payment_method','amount']:
                    if f in body:
                        fields.append(f'{f} = %s')
                        vals.append(body[f])
                vals.append(bid)
                cur.execute(f'UPDATE "{S}".bookings SET {", ".join(fields)} WHERE id=%s RETURNING *', vals)
                booking = dict(cur.fetchone())

                new_status = body.get('status')
                if quad_id:
                    if new_status == 'returned' and old_status != 'returned':
                        cur.execute(f'UPDATE "{S}".quads SET status=\'available\' WHERE id=%s', (quad_id,))
                    elif new_status == 'issued' and old_status != 'issued':
                        cur.execute(f'UPDATE "{S}".quads SET status=\'rented\' WHERE id=%s', (quad_id,))
                    elif new_status == 'cancelled' and old_status in ('confirmed','issued'):
                        cur.execute(f'UPDATE "{S}".quads SET status=\'available\' WHERE id=%s', (quad_id,))

                conn.commit()
                return ok(booking)

            elif method == 'DELETE':
                bid = params.get('id')
                cur.execute(f'SELECT quad_id, status FROM "{S}".bookings WHERE id=%s', (bid,))
                row = cur.fetchone()
                if row and row['status'] in ('issued', 'confirmed'):
                    cur.execute(f"UPDATE \"{S}\".quads SET status='available' WHERE id=%s", (row['quad_id'],))
                cur.execute(f'DELETE FROM "{S}".transactions WHERE booking_id=%s', (bid,))
                cur.execute(f'DELETE FROM "{S}".bookings WHERE id=%s', (bid,))
                conn.commit()
                return ok({'deleted': True})

        # ── TRANSACTIONS ───────────────────────────────────────
        elif resource == 'transactions':
            if method == 'GET':
                month = params.get('month')
                ttype = params.get('type')
                where, vals = [], []
                if month:
                    where.append("DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', %s::date)")
                    vals.append(month)
                if ttype:
                    where.append("type = %s")
                    vals.append(ttype)
                where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''
                cur.execute(f"""
                    SELECT t.*, b.id as booking_ref
                    FROM "{S}".transactions t LEFT JOIN "{S}".bookings b ON b.id = t.booking_id
                    {where_sql}
                    ORDER BY t.transaction_date DESC, t.created_at DESC
                """, vals)
                rows = [dict(r) for r in cur.fetchall()]

                cur.execute(f"""
                    SELECT
                      COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS total_income,
                      COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS total_expense
                    FROM "{S}".transactions {where_sql}
                """, vals)
                totals = dict(cur.fetchone())
                totals['profit'] = totals['total_income'] - totals['total_expense']
                return ok({'items': rows, 'totals': totals})

            elif method == 'POST':
                cur.execute(f"""
                    INSERT INTO "{S}".transactions (type, category, amount, description, booking_id, transaction_date)
                    VALUES (%s,%s,%s,%s,%s,%s) RETURNING *
                """, (body['type'], body['category'], body['amount'],
                      body.get('description'), body.get('booking_id'), body.get('transaction_date', 'today')))
                conn.commit()
                return ok(dict(cur.fetchone()))

            elif method == 'DELETE':
                tid = params.get('id')
                cur.execute(f'DELETE FROM "{S}".transactions WHERE id=%s', (tid,))
                conn.commit()
                return ok({'deleted': True})

        # ── REPORTS ────────────────────────────────────────────
        elif resource == 'reports':
            # Помесячная динамика (до 12 мес.)
            cur.execute(f"""
                SELECT
                  TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month_key,
                  DATE_TRUNC('month', transaction_date) AS month,
                  COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS income,
                  COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense,
                  COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) -
                  COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS profit
                FROM "{S}".transactions
                GROUP BY 1,2 ORDER BY 2 ASC LIMIT 12
            """)
            monthly = [dict(r) for r in cur.fetchall()]

            # Расходы по категориям (все время)
            cur.execute(f"""
                SELECT category, SUM(amount) AS total, COUNT(*) as count
                FROM "{S}".transactions WHERE type='expense'
                GROUP BY category ORDER BY total DESC
            """)
            expense_by_cat = [dict(r) for r in cur.fetchall()]

            # Доходы по категориям (все время)
            cur.execute(f"""
                SELECT category, SUM(amount) AS total, COUNT(*) as count
                FROM "{S}".transactions WHERE type='income'
                GROUP BY category ORDER BY total DESC
            """)
            income_by_cat = [dict(r) for r in cur.fetchall()]

            # Итоги за все время
            cur.execute(f"""
                SELECT
                  COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS total_income,
                  COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS total_expense,
                  COUNT(CASE WHEN type='income' THEN 1 END) AS income_count,
                  COUNT(CASE WHEN type='expense' THEN 1 END) AS expense_count
                FROM "{S}".transactions
            """)
            totals = dict(cur.fetchone())
            totals['total_profit'] = totals['total_income'] - totals['total_expense']

            # Итоги текущего месяца
            cur.execute(f"""
                SELECT
                  COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS month_income,
                  COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS month_expense
                FROM "{S}".transactions
                WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
            """)
            month_totals = dict(cur.fetchone())
            month_totals['month_profit'] = month_totals['month_income'] - month_totals['month_expense']

            # Статистика по технике
            cur.execute(f"""
                SELECT q.name, q.hourly_rate,
                  COUNT(b.id) as trips,
                  COALESCE(SUM(b.amount),0) as revenue,
                  COALESCE(SUM(b.duration_hours),0) as total_hours
                FROM "{S}".quads q LEFT JOIN "{S}".bookings b ON b.quad_id = q.id AND b.status = 'returned'
                GROUP BY q.id, q.name, q.hourly_rate ORDER BY revenue DESC
            """)
            quad_stats = [dict(r) for r in cur.fetchall()]

            # Статистика бронирований
            cur.execute(f"""
                SELECT status, COUNT(*) as count, COALESCE(SUM(amount),0) as total
                FROM "{S}".bookings GROUP BY status
            """)
            booking_stats = [dict(r) for r in cur.fetchall()]

            # Среднедневная выручка (текущий месяц)
            cur.execute(f"""
                SELECT transaction_date, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
                       SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
                FROM "{S}".transactions
                WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY transaction_date ORDER BY transaction_date
            """)
            daily_current = [dict(r) for r in cur.fetchall()]

            return ok({
                'monthly': monthly,
                'expense_by_category': expense_by_cat,
                'income_by_category': income_by_cat,
                'totals': totals,
                'month_totals': month_totals,
                'quad_stats': quad_stats,
                'booking_stats': booking_stats,
                'daily_current': daily_current,
            })

        return err('Unknown resource')

    except Exception as e:
        conn.rollback()
        return err(str(e), 500)
    finally:
        cur.close()
        conn.close()