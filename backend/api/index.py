"""
Главный API для CRM проката квадроциклов BogatovTravel.
Обрабатывает все CRUD операции: квадроциклы, брони, клиенты, финансы.
v4
"""
import json
import os
import traceback
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

def noneify(val):
    """Преобразует пустую строку в None — для корректной вставки в БД."""
    if val == '' or val is None:
        return None
    return val

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
                    INSERT INTO "{S}".quads (name, model, year, power, hourly_rate, status, mileage, last_service_date, notes, location)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                """, (body['name'], noneify(body.get('model')), noneify(body.get('year')),
                      noneify(body.get('power')), body.get('hourly_rate', 1800) or 1800,
                      body.get('status', 'available') or 'available',
                      body.get('mileage', 0) or 0,
                      noneify(body.get('last_service_date')), noneify(body.get('notes')),
                      noneify(body.get('location'))))
                conn.commit()
                return ok(dict(cur.fetchone()))

            elif method == 'PUT':
                qid = params.get('id')
                fields = []
                vals = []
                date_fields = {'last_service_date', 'next_service_mileage'}
                for f in ['name','model','year','power','hourly_rate','status','mileage','last_service_date','next_service_mileage','notes','location']:
                    if f in body:
                        fields.append(f'{f} = %s')
                        vals.append(noneify(body[f]) if f in date_fields else body[f])
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
                status = body.get('status', 'pending')
                cur.execute(f"""
                    INSERT INTO "{S}".bookings (quad_id, client_id, start_time, end_time, duration_hours, amount, deposit, status, payment_method, notes)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                """, (body['quad_id'], body['client_id'], body['start_time'], body['end_time'],
                      body.get('duration_hours'), body['amount'], body.get('deposit', 0),
                      status, body.get('payment_method','cash'), body.get('notes')))
                booking = dict(cur.fetchone())
                # Автоплатёж только при статусе "тур исполнен"
                if status == 'returned' and body.get('amount'):
                    cur.execute(f"""
                        INSERT INTO "{S}".transactions (type, category, amount, description, booking_id, transaction_date)
                        VALUES ('income', 'Аренда', %s, %s, %s, CURRENT_DATE)
                    """, (body['amount'], f"Тур #{booking['id']}", booking['id']))
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
                if quad_id and new_status:
                    if new_status == 'returned' and old_status != 'returned':
                        cur.execute(f'UPDATE "{S}".quads SET status=\'available\' WHERE id=%s', (quad_id,))
                    elif new_status == 'cancelled':
                        cur.execute(f'UPDATE "{S}".quads SET status=\'available\' WHERE id=%s', (quad_id,))

                # Автоплатёж при переходе в "тур исполнен"
                if new_status == 'returned' and old_status != 'returned':
                    amount = booking.get('amount') or body.get('amount')
                    if amount:
                        cur.execute(f"""
                            SELECT id FROM "{S}".transactions WHERE booking_id=%s AND type='income'
                        """, (bid,))
                        if not cur.fetchone():
                            cur.execute(f"""
                                INSERT INTO "{S}".transactions (type, category, amount, description, booking_id, transaction_date)
                                VALUES ('income', 'Аренда', %s, %s, %s, CURRENT_DATE)
                            """, (amount, f"Тур #{bid}", bid))

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

        # ── EMPLOYEES ──────────────────────────────────────────
        elif resource == 'employees':
            if method == 'GET':
                cur.execute(f'SELECT * FROM "{S}".employees ORDER BY created_at')
                return ok([dict(r) for r in cur.fetchall()])

            elif method == 'POST':
                cur.execute(f"""
                    INSERT INTO "{S}".employees (name, role, phone, status, notes)
                    VALUES (%s,%s,%s,%s,%s) RETURNING *
                """, (body['name'], body.get('role'), body.get('phone'),
                      body.get('status', 'active'), body.get('notes')))
                conn.commit()
                return ok(dict(cur.fetchone()))

            elif method == 'PUT':
                eid = params.get('id')
                fields, vals = [], []
                for f in ['name', 'role', 'phone', 'status', 'notes']:
                    if f in body:
                        fields.append(f'{f} = %s')
                        vals.append(body[f])
                vals.append(eid)
                cur.execute(f'UPDATE "{S}".employees SET {", ".join(fields)} WHERE id=%s RETURNING *', vals)
                conn.commit()
                return ok(dict(cur.fetchone()))

            elif method == 'DELETE':
                eid = params.get('id')
                cur.execute(f'DELETE FROM "{S}".employees WHERE id=%s', (eid,))
                conn.commit()
                return ok({'deleted': True})

        # ── DAILY REPORTS ──────────────────────────────────────
        elif resource == 'daily_reports':
            if method == 'GET':
                rid = params.get('id')
                if rid:
                    cur.execute(f'SELECT * FROM "{S}".daily_reports WHERE id=%s', (rid,))
                    row = cur.fetchone()
                    if not row:
                        return {'statusCode': 404, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': '{"error":"not found"}'}
                    report = dict(row)
                    report['report_date'] = str(report['report_date'])
                    cur.execute(f'SELECT * FROM "{S}".report_tours WHERE report_id=%s ORDER BY sort_order', (rid,))
                    report['tours'] = [dict(r) for r in cur.fetchall()]
                    cur.execute(f'SELECT * FROM "{S}".report_expenses WHERE report_id=%s ORDER BY sort_order', (rid,))
                    report['expenses'] = [dict(r) for r in cur.fetchall()]
                    return ok(report)
                else:
                    cur.execute(f'SELECT * FROM "{S}".daily_reports ORDER BY report_date DESC')
                    rows = []
                    for r in cur.fetchall():
                        d = dict(r)
                        d['report_date'] = str(d['report_date'])
                        rows.append(d)
                    return ok(rows)

            elif method == 'POST':
                # Сохраняем отчёт целиком: {report_date, point, total_cash, remainder, notes, tours:[{title,quads_info,amount}], expenses:[{title,amount}]}
                tours = body.pop('tours', [])
                expenses = body.pop('expenses', [])
                cur.execute(f"""
                    INSERT INTO "{S}".daily_reports (report_date, point, total_cash, remainder, notes)
                    VALUES (%s,%s,%s,%s,%s) RETURNING id
                """, (body['report_date'], body['point'], body.get('total_cash', 0),
                      body.get('remainder', 0), body.get('notes')))
                new_id = cur.fetchone()['id']
                for i, t in enumerate(tours):
                    cur.execute(f"""INSERT INTO "{S}".report_tours (report_id,title,quads_info,amount,sort_order)
                        VALUES (%s,%s,%s,%s,%s)""", (new_id, t['title'], t.get('quads_info',''), t.get('amount',0), i))
                for i, e in enumerate(expenses):
                    cur.execute(f"""INSERT INTO "{S}".report_expenses (report_id,title,amount,sort_order)
                        VALUES (%s,%s,%s,%s)""", (new_id, e['title'], e.get('amount',0), i))
                conn.commit()
                return ok({'id': new_id})

            elif method == 'DELETE':
                rid = params.get('id')
                cur.execute(f'DELETE FROM "{S}".report_tours WHERE report_id=%s', (rid,))
                cur.execute(f'DELETE FROM "{S}".report_expenses WHERE report_id=%s', (rid,))
                cur.execute(f'DELETE FROM "{S}".daily_reports WHERE id=%s', (rid,))
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

            # Статистика по точкам из дневных отчётов (общая)
            cur.execute(f"""
                SELECT
                  point,
                  COUNT(*) as reports_count,
                  COALESCE(SUM(total_cash),0) as total_cash,
                  COALESCE(SUM(remainder),0) as total_remainder,
                  COALESCE(AVG(total_cash),0) as avg_cash,
                  MIN(report_date) as first_date,
                  MAX(report_date) as last_date
                FROM "{S}".daily_reports
                GROUP BY point ORDER BY total_cash DESC
            """)
            point_stats = [dict(r) for r in cur.fetchall()]
            for p in point_stats:
                p['first_date'] = str(p['first_date']) if p['first_date'] else None
                p['last_date'] = str(p['last_date']) if p['last_date'] else None

            # Общая сводка по всем точкам
            cur.execute(f"""
                SELECT
                  COALESCE(SUM(total_cash),0) as grand_total_cash,
                  COALESCE(SUM(remainder),0) as grand_total_remainder,
                  COUNT(*) as grand_reports_count,
                  COALESCE(AVG(total_cash),0) as grand_avg_cash
                FROM "{S}".daily_reports
            """)
            point_totals = dict(cur.fetchone())

            # Динамика по точкам по месяцам
            cur.execute(f"""
                SELECT
                  point,
                  TO_CHAR(DATE_TRUNC('month', report_date), 'YYYY-MM') as month_key,
                  COALESCE(SUM(total_cash),0) as total_cash,
                  COALESCE(SUM(remainder),0) as total_remainder,
                  COUNT(*) as reports_count
                FROM "{S}".daily_reports
                GROUP BY point, DATE_TRUNC('month', report_date), TO_CHAR(DATE_TRUNC('month', report_date), 'YYYY-MM')
                ORDER BY DATE_TRUNC('month', report_date) ASC
            """)
            point_monthly = [dict(r) for r in cur.fetchall()]

            return ok({
                'monthly': monthly,
                'expense_by_category': expense_by_cat,
                'income_by_category': income_by_cat,
                'totals': totals,
                'month_totals': month_totals,
                'quad_stats': quad_stats,
                'booking_stats': booking_stats,
                'daily_current': daily_current,
                'point_stats': point_stats,
                'point_totals': point_totals,
                'point_monthly': point_monthly,
            })

        # ── BUDGET DISTRIBUTION ────────────────────────────────────
        if resource == 'budget':
            if method == 'GET':
                cur.execute(f"""
                    SELECT id, point, date, daily_cash, amortization, salary,
                           advertising, reserve, remainder, instructors_json, created_at
                    FROM "{S}".budget_distributions
                    ORDER BY date DESC, id DESC
                    LIMIT 200
                """)
                return ok({'items': [dict(r) for r in cur.fetchall()]})

            if method == 'POST':
                cash = float(body.get('daily_cash', 0))
                point = body.get('point', '')
                date = body.get('date', '')
                instructors_json = body.get('instructors_json', '[]')
                amort = round(cash * 0.10, 2)
                salary = round(cash * 0.15, 2)
                adv = round(cash * 0.10, 2)
                reserve = round(cash * 0.15, 2)
                remainder = round(cash * 0.50, 2)
                cur.execute(f"""
                    INSERT INTO "{S}".budget_distributions
                      (point, date, daily_cash, amortization, salary, advertising, reserve, remainder, instructors_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (point, date, cash, amort, salary, adv, reserve, remainder, instructors_json))
                new_id = cur.fetchone()['id']
                conn.commit()
                return ok({'id': new_id})

            if method == 'DELETE':
                row_id = body.get('id')
                cur.execute(f'DELETE FROM "{S}".budget_distributions WHERE id = %s', (row_id,))
                conn.commit()
                return ok({'deleted': row_id})

        # ── CERTIFICATES ───────────────────────────────────────
        if resource == 'certificates':
            if method == 'GET':
                cur.execute(f'SELECT * FROM "{S}".certificates ORDER BY paid_date DESC, id DESC')
                rows = []
                for r in cur.fetchall():
                    d = dict(r)
                    d['paid_date'] = str(d['paid_date'])
                    rows.append(d)
                return ok(rows)

            if method == 'POST':
                cur.execute(f"""
                    INSERT INTO "{S}".certificates (client_name, phone, telegram, passport, notes, paid_date, status, amount)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                """, (body['client_name'], noneify(body.get('phone')), noneify(body.get('telegram')),
                      noneify(body.get('passport')), noneify(body.get('notes')),
                      body['paid_date'], body.get('status', 'pending'),
                      float(body.get('amount', 0) or 0)))
                conn.commit()
                row = dict(cur.fetchone())
                row['paid_date'] = str(row['paid_date'])
                return ok(row)

            if method == 'PUT':
                cid = params.get('id')
                cur.execute(f"""
                    UPDATE "{S}".certificates
                    SET client_name=%s, phone=%s, telegram=%s, passport=%s, notes=%s,
                        paid_date=%s, status=%s, amount=%s
                    WHERE id=%s RETURNING *
                """, (body['client_name'], noneify(body.get('phone')), noneify(body.get('telegram')),
                      noneify(body.get('passport')), noneify(body.get('notes')),
                      body['paid_date'], body.get('status', 'pending'),
                      float(body.get('amount', 0) or 0), cid))
                conn.commit()
                row = dict(cur.fetchone())
                row['paid_date'] = str(row['paid_date'])
                return ok(row)

            if method == 'DELETE':
                cid = params.get('id')
                cur.execute(f'DELETE FROM "{S}".certificates WHERE id=%s', (cid,))
                conn.commit()
                return ok({'deleted': True})

        # ── POINT GOALS ────────────────────────────────────────
        if resource == 'point_goals':
            if method == 'GET':
                cur.execute(f"""
                    SELECT g.*,
                      COALESCE((
                        SELECT SUM(t.amount)
                        FROM "{S}".transactions t
                        WHERE t.type = 'income'
                          AND t.transaction_date <= g.deadline
                      ), 0) AS earned
                    FROM "{S}".point_goals g
                    ORDER BY g.deadline ASC, g.id ASC
                """)
                rows = []
                for r in cur.fetchall():
                    d = dict(r)
                    d['deadline'] = str(d['deadline'])
                    d['created_at'] = str(d['created_at'])
                    d['updated_at'] = str(d['updated_at'])
                    rows.append(d)
                return ok(rows)

            if method == 'POST':
                cur.execute(f"""
                    INSERT INTO "{S}".point_goals (point, goal_amount, deadline, label)
                    VALUES (%s, %s, %s, %s) RETURNING *
                """, (body['point'], float(body['goal_amount']),
                      body['deadline'], noneify(body.get('label'))))
                conn.commit()
                row = dict(cur.fetchone())
                row['deadline'] = str(row['deadline'])
                row['created_at'] = str(row['created_at'])
                row['updated_at'] = str(row['updated_at'])
                return ok(row)

            if method == 'PUT':
                gid = params.get('id')
                cur.execute(f"""
                    UPDATE "{S}".point_goals
                    SET point=%s, goal_amount=%s, deadline=%s, label=%s, updated_at=NOW()
                    WHERE id=%s RETURNING *
                """, (body['point'], float(body['goal_amount']),
                      body['deadline'], noneify(body.get('label')), gid))
                conn.commit()
                row = dict(cur.fetchone())
                row['deadline'] = str(row['deadline'])
                row['created_at'] = str(row['created_at'])
                row['updated_at'] = str(row['updated_at'])
                return ok(row)

            if method == 'DELETE':
                gid = params.get('id')
                cur.execute(f'DELETE FROM "{S}".point_goals WHERE id=%s', (gid,))
                conn.commit()
                return ok({'deleted': True})

        return err('Unknown resource')

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] resource={resource} method={method} body={body}: {traceback.format_exc()}")
        return err(str(e), 500)
    finally:
        cur.close()
        conn.close()