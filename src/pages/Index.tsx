import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

type Section =
  | "dashboard"
  | "clients"
  | "bookings"
  | "quads"
  | "payments"
  | "reports"
  | "expenses"
  | "income"
  | "calendar"
  | "employees"
  | "contacts";

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { id: "clients", label: "Клиенты", icon: "Users" },
  { id: "bookings", label: "Бронирования", icon: "ClipboardList" },
  { id: "quads", label: "Квадроциклы", icon: "Bike" },
  { id: "calendar", label: "Календарь аренд", icon: "Calendar" },
  { id: "payments", label: "Платежи", icon: "CreditCard" },
  { id: "income", label: "Доходы", icon: "TrendingUp" },
  { id: "expenses", label: "Расходы", icon: "TrendingDown" },
  { id: "reports", label: "Отчёты", icon: "BarChart3" },
  { id: "employees", label: "Сотрудники", icon: "UserCog" },
  { id: "contacts", label: "Контакты", icon: "Phone" },
];

const employees = [
  { id: 1, name: "Иван Смирнов", role: "Механик", phone: "+7 900 111-22-33", status: "active" },
  { id: 2, name: "Кирилл Быков", role: "Инструктор", phone: "+7 900 222-33-44", status: "active" },
  { id: 3, name: "Ольга Нечаева", role: "Администратор", phone: "+7 900 333-44-55", status: "active" },
  { id: 4, name: "Роман Тимофеев", role: "Инструктор", phone: "+7 900 444-55-66", status: "day-off" },
];

const calendarDays = Array.from({ length: 31 }, (_, i) => {
  const d = i + 1;
  const bk: string[] = [];
  if (d === 3) bk.push("Сергей В.");
  if (d === 4) bk.push("Алексей М.", "Мария С.");
  if (d === 5) bk.push("Дмитрий К.");
  if (d === 6) bk.push("Анна П.");
  if (d === 10) bk.push("Новый");
  if (d === 12) bk.push("Новый", "Новый");
  return { day: d, bookings: bk };
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    available: { label: "Доступен", cls: "status-available" },
    rented: { label: "В аренде", cls: "status-rented" },
    maintenance: { label: "Сервис", cls: "status-maintenance" },
    pending: { label: "Ожидание", cls: "status-pending" },
    confirmed: { label: "Подтверждено", cls: "status-confirmed" },
    completed: { label: "Завершено", cls: "status-completed" },
    paid: { label: "Оплачено", cls: "status-available" },
    active: { label: "Активен", cls: "status-available" },
    vip: { label: "VIP", cls: "status-confirmed" },
    new: { label: "Новый", cls: "status-pending" },
    "day-off": { label: "Выходной", cls: "status-completed" },
  };
  const s = map[status] || { label: status, cls: "status-completed" };
  return <span className={`status-badge ${s.cls}`}>{s.label}</span>;
}

function Spinner() {
  return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}

function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const profit = (data.month_income || 0) - (data.month_expense || 0);

  const stats = [
    { label: "В аренде", value: String(data.rented_quads || 0), icon: "Bike", color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Броней сегодня", value: String(data.today_bookings || 0), icon: "Calendar", color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Доход за месяц", value: `₽ ${(data.month_income || 0).toLocaleString()}`, icon: "TrendingUp", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Доступно квадов", value: `${data.available_quads || 0} / ${data.total_quads || 0}`, icon: "CheckCircle", color: "text-violet-500", bg: "bg-violet-50" },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Дашборд</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{today}</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
              <Icon name={s.icon} size={20} className={s.color} />
            </div>
            <div className="text-2xl font-display font-semibold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Активные бронирования</h2>
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.active_bookings_list || []).slice(0, 5).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{b.client_name}</div>
                  <div className="text-xs text-muted-foreground">{b.quad_name} · {new Date(b.start_time).toLocaleDateString('ru-RU')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  <span className="text-sm font-semibold">₽ {(b.amount || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {(data.active_bookings_list || []).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Нет активных бронирований</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Статус техники</h2>
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.quads || []).map((q: any) => (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-semibold text-muted-foreground">Q{q.id}</div>
                  <div>
                    <div className="text-sm font-medium">{q.name}</div>
                    <div className="text-xs text-muted-foreground">{q.model}</div>
                  </div>
                </div>
                <StatusBadge status={q.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Доход за месяц</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">₽ {(data.month_income || 0).toLocaleString()}</div>
          <div className={`text-xs mt-1 flex items-center gap-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            <Icon name={profit >= 0 ? "TrendingUp" : "TrendingDown"} size={12} /> Прибыль: ₽ {profit.toLocaleString()}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Расходы за месяц</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">₽ {(data.month_expense || 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">ТО, топливо, зарплата</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Всего клиентов</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">{data.total_clients || 0}</div>
          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <Icon name="Users" size={12} /> в базе
          </div>
        </div>
      </div>
    </div>
  );
}

function Clients() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.clients.list().then(d => { setItems(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Клиенты</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} клиентов в базе</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить
        </button>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Клиент</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Телефон</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Поездок</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Сумма</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Статус</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${c.is_blacklisted ? 'bg-red-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-semibold text-primary">
                      {c.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{c.full_name}</span>
                      {c.is_blacklisted && <div className="text-[10px] text-red-600 font-medium">Чёрный список</div>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{c.phone || '—'}</td>
                <td className="px-6 py-4 text-sm">{c.trips_count}</td>
                <td className="px-6 py-4 text-sm font-medium">₽ {Number(c.total_spent).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={c.is_blacklisted ? 'maintenance' : c.trips_count > 5 ? 'vip' : c.trips_count === 0 ? 'new' : 'active'} />
                </td>
                <td className="px-6 py-4">
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Icon name="MoreHorizontal" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bookings() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.bookings.list().then(d => { setItems(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

   
  const changeStatus = async (id: number, status: string) => {
    await api.bookings.update(id, { status });
    load();
  };

  if (loading) return <Spinner />;

  const active = items.filter(b => ['pending','confirmed','issued'].includes(b.status)).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Бронирования</h1>
          <p className="text-muted-foreground text-sm mt-1">{active} активных · {items.length} всего</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Новое бронирование
        </button>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">№</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Клиент</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Квадроцикл</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Начало</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Ч.</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Сумма</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Статус</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Действие</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">#{b.id}</td>
                  <td className="px-6 py-4 text-sm font-medium">{b.client_name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{b.quad_name}</td>
                  <td className="px-6 py-4 text-sm">{new Date(b.start_time).toLocaleDateString('ru-RU')}</td>
                  <td className="px-6 py-4 text-sm">{b.duration_hours}</td>
                  <td className="px-6 py-4 text-sm font-semibold">₽ {Number(b.amount).toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                  <td className="px-6 py-4">
                    {b.status === 'confirmed' && (
                      <button onClick={() => changeStatus(b.id, 'issued')} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-200 transition-colors">Выдать</button>
                    )}
                    {b.status === 'issued' && (
                      <button onClick={() => changeStatus(b.id, 'returned')} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-200 transition-colors">Принять</button>
                    )}
                    {b.status === 'pending' && (
                      <button onClick={() => changeStatus(b.id, 'confirmed')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors">Подтвердить</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Quads() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.quads.list().then(d => { setItems(d); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: number, status: string) => {
    await api.quads.update(id, { status });
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Квадроциклы</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} единиц техники</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить технику
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((q) => (
          <div key={q.id} className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-mono mb-1">Q-{String(q.id).padStart(2,'0')}</div>
                <div className="font-semibold text-foreground">{q.name}</div>
                <div className="text-sm text-muted-foreground">{q.model} · {q.power}</div>
              </div>
              <StatusBadge status={q.status} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
              <Icon name="Gauge" size={12} /> Пробег: {q.mileage} км
              {q.last_service_date && (
                <span className="ml-2">· ТО: {new Date(q.last_service_date).toLocaleDateString('ru-RU')}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Ставка: </span>
                <span className="font-semibold">₽ {q.hourly_rate}/ч</span>
              </div>
              <div className="flex gap-1.5">
                {q.status === 'available' && (
                  <button onClick={() => changeStatus(q.id, 'maintenance')} className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg hover:bg-yellow-100 transition-colors">На ТО</button>
                )}
                {q.status === 'maintenance' && (
                  <button onClick={() => changeStatus(q.id, 'available')} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors">Готов</button>
                )}
                <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-all">
                  <Icon name="FileText" size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Payments() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>({ items: [], totals: {} });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.transactions.list().then(d => { setData(d); setLoading(false); });
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Платежи</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.items?.length || 0} транзакций</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить
        </button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Итого доходов</div>
          <div className="text-2xl font-display font-semibold text-emerald-600">₽ {Number(data.totals?.total_income || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Итого расходов</div>
          <div className="text-2xl font-display font-semibold text-red-600">₽ {Number(data.totals?.total_expense || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Прибыль</div>
          <div className={`text-2xl font-display font-semibold ${data.totals?.profit >= 0 ? 'text-foreground' : 'text-red-600'}`}>₽ {Number(data.totals?.profit || 0).toLocaleString()}</div>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">№</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Тип</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Категория</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Описание</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Дата</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(data.items || []).map((p: any) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">#{p.id}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.type === 'income' ? 'confirmed' : 'maintenance'} /></td>
                  <td className="px-6 py-4 text-sm font-medium">{p.category}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{p.description || '—'}</td>
                  <td className="px-6 py-4 text-sm">{p.transaction_date}</td>
                  <td className={`px-6 py-4 text-sm font-semibold ${p.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {p.type === 'income' ? '+' : '-'}₽ {Number(p.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Reports() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.reports().then(d => { setData(d); setLoading(false); }); }, []);
  if (loading) return <Spinner />;

  const monthly = data.monthly || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxVal = Math.max(...monthly.map((m: any) => Math.max(Number(m.income), Number(m.expense))), 1);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Отчёты</h1>
        <p className="text-muted-foreground text-sm mt-1">Аналитика и статистика</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold mb-6">Доходы и расходы по месяцам</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных</p>
          ) : (
            <div className="flex items-end gap-3" style={{ height: "150px" }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {monthly.slice(0,6).reverse().map((m: any) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: "120px" }}>
                    <div className="flex-1 bg-emerald-400 rounded-t-md opacity-80" style={{ height: `${(Number(m.income) / maxVal) * 120}px` }} />
                    <div className="flex-1 bg-red-300 rounded-t-md opacity-80" style={{ height: `${(Number(m.expense) / maxVal) * 120}px` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground">{new Date(m.month).toLocaleDateString('ru-RU', { month: 'short' })}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="w-3 h-3 rounded-sm bg-emerald-400 opacity-80" /> Доходы</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="w-3 h-3 rounded-sm bg-red-300 opacity-80" /> Расходы</div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold mb-4">Расходы по категориям</h2>
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.expense_by_category || []).map((e: any) => (
              <div key={e.category} className="flex items-center justify-between">
                <span className="text-sm">{e.category}</span>
                <span className="text-sm font-semibold text-red-600">₽ {Number(e.total).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-semibold mb-4">Доходность техники</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Квадроцикл</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Поездок</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Выручка</th>
            </tr></thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(data.quad_stats || []).map((q: any) => (
                <tr key={q.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{q.name}</td>
                  <td className="px-4 py-3 text-sm">{q.trips}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-600">₽ {Number(q.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Expenses() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>({ items: [], totals: { total_expense: 0 } });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.transactions.list({ type: 'expense' }).then(d => { setData(d); setLoading(false); });
  }, []);
  if (loading) return <Spinner />;
  const total = data.totals?.total_expense || 0;
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Расходы</h1>
          <p className="text-muted-foreground text-sm mt-1">₽ {Number(total).toLocaleString()} всего</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить
        </button>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Категория</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Описание</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Дата</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.items || []).map((e: any) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 text-sm font-medium">{e.category}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{e.description || '—'}</td>
                <td className="px-6 py-4 text-sm">{e.transaction_date}</td>
                <td className="px-6 py-4 text-sm font-semibold text-red-600">₽ {Number(e.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/30">
              <td colSpan={3} className="px-6 py-4 text-sm font-semibold">Итого</td>
              <td className="px-6 py-4 text-sm font-bold text-foreground">₽ {Number(total).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Income() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>({ items: [], totals: { total_income: 0 } });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.transactions.list({ type: 'income' }).then(d => { setData(d); setLoading(false); });
  }, []);
  if (loading) return <Spinner />;
  const total = data.totals?.total_income || 0;
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Доходы</h1>
          <p className="text-muted-foreground text-sm mt-1">₽ {Number(total).toLocaleString()} всего</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить
        </button>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Категория</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Описание</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Дата</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.items || []).map((e: any) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 text-sm font-medium">{e.category}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{e.description || '—'}</td>
                <td className="px-6 py-4 text-sm">{e.transaction_date}</td>
                <td className="px-6 py-4 text-sm font-semibold text-emerald-600">₽ {Number(e.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/30">
              <td colSpan={3} className="px-6 py-4 text-sm font-semibold">Итого</td>
              <td className="px-6 py-4 text-sm font-bold text-emerald-600">₽ {Number(total).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CalendarView() {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Календарь аренд</h1>
        <p className="text-muted-foreground text-sm mt-1">Май 2026</p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* May 2026 starts on Friday — offset 4 */}
          {Array.from({ length: 4 }).map((_, i) => <div key={`empty-${i}`} />)}
          {calendarDays.map((d) => (
            <div
              key={d.day}
              className={`min-h-16 rounded-xl p-2 text-xs border transition-colors ${
                d.day === 4
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className={`font-semibold mb-1 ${d.day === 4 ? "text-primary" : "text-foreground"}`}>{d.day}</div>
              {d.bookings.map((b, i) => (
                <div key={i} className="bg-orange-100 text-orange-700 rounded px-1 py-0.5 mb-0.5 truncate text-[10px]">{b}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Employees() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Сотрудники</h1>
          <p className="text-muted-foreground text-sm mt-1">4 человека в команде</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {employees.map((e) => (
          <div key={e.id} className="bg-card rounded-2xl border border-border p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
              {e.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{e.name}</div>
              <div className="text-sm text-muted-foreground">{e.role}</div>
              <div className="text-xs text-muted-foreground mt-1">{e.phone}</div>
            </div>
            <StatusBadge status={e.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Contacts() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Контакты</h1>
        <p className="text-muted-foreground text-sm mt-1">Информация о компании</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="font-semibold">Реквизиты компании</h2>
          {[
            { icon: "Building2", label: "Компания", value: "ООО «МотоПрокат»" },
            { icon: "Phone", label: "Телефон", value: "+7 800 555-35-35" },
            { icon: "Mail", label: "Email", value: "info@motoprokat.ru" },
            { icon: "MapPin", label: "Адрес", value: "г. Сочи, ул. Горная, 12" },
            { icon: "Clock", label: "Режим работы", value: "Пн–Вс, 08:00–20:00" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
                <Icon name={item.icon} size={16} className="text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-sm font-medium">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="font-semibold">Уведомления</h2>
          {[
            { label: "SMS при бронировании", enabled: true },
            { label: "Email при оплате", enabled: true },
            { label: "Напоминание за 2 часа", enabled: false },
            { label: "Отчёт в конце дня", enabled: true },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <span className="text-sm">{n.label}</span>
              <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${n.enabled ? "bg-primary" : "bg-muted"}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${n.enabled ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const [active, setActive] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sectionComponents: Record<Section, JSX.Element> = {
    dashboard: <Dashboard />,
    clients: <Clients />,
    bookings: <Bookings />,
    quads: <Quads />,
    calendar: <CalendarView />,
    payments: <Payments />,
    income: <Income />,
    expenses: <Expenses />,
    reports: <Reports />,
    employees: <Employees />,
    contacts: <Contacts />,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:relative z-30 lg:z-auto h-full w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        <div className="px-6 py-6 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Icon name="Bike" size={18} className="text-white" />
            </div>
            <div>
              <div className="font-display font-semibold text-white text-sm leading-tight">МотоПрокат</div>
              <div className="text-[10px] opacity-50" style={{ color: "hsl(var(--sidebar-foreground))" }}>CRM система</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${active === item.id ? "active" : ""}`}
              style={active !== item.id ? { color: "hsl(var(--sidebar-foreground))" } : {}}
              onClick={() => { setActive(item.id); setSidebarOpen(false); }}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
          <div className="sidebar-item" style={{ color: "hsl(var(--sidebar-foreground))" }}>
            <Icon name="Settings" size={18} />
            <span className="text-sm">Настройки</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-8 h-8 flex items-center justify-center text-muted-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="Menu" size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5 w-64">
              <Icon name="Search" size={16} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск..."
                className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
              <Icon name="Bell" size={18} />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-sm font-bold text-primary cursor-pointer">
              АД
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {sectionComponents[active]}
        </main>
      </div>
    </div>
  );
}