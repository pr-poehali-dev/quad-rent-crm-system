import { useState } from "react";
import Icon from "@/components/ui/icon";

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

const clients = [
  { id: 1, name: "Алексей Морозов", phone: "+7 900 123-45-67", trips: 5, spent: 18500, status: "active" },
  { id: 2, name: "Мария Соколова", phone: "+7 911 234-56-78", trips: 2, spent: 7200, status: "active" },
  { id: 3, name: "Дмитрий Козлов", phone: "+7 922 345-67-89", trips: 8, spent: 32000, status: "vip" },
  { id: 4, name: "Анна Петрова", phone: "+7 933 456-78-90", trips: 1, spent: 3600, status: "new" },
  { id: 5, name: "Сергей Волков", phone: "+7 944 567-89-01", trips: 3, spent: 11700, status: "active" },
];

const bookings = [
  { id: "BR-001", client: "Алексей Морозов", quad: "ATV-Pro 750", date: "04.05.2026", duration: "3 ч", amount: 5400, status: "confirmed" },
  { id: "BR-002", client: "Мария Соколова", quad: "Yamaha Grizzly", date: "04.05.2026", duration: "2 ч", amount: 3600, status: "pending" },
  { id: "BR-003", client: "Дмитрий Козлов", quad: "Can-Am Outlander", date: "05.05.2026", duration: "5 ч", amount: 9000, status: "confirmed" },
  { id: "BR-004", client: "Анна Петрова", quad: "ATV-Pro 750", date: "06.05.2026", duration: "2 ч", amount: 3600, status: "pending" },
  { id: "BR-005", client: "Сергей Волков", quad: "Polaris Sportsman", date: "03.05.2026", duration: "4 ч", amount: 7200, status: "completed" },
];

const quads = [
  { id: "Q-01", name: "ATV-Pro 750", model: "2023", power: "62 л.с.", rate: 1800, status: "rented", location: "55.7558° N" },
  { id: "Q-02", name: "Yamaha Grizzly", model: "2022", power: "55 л.с.", rate: 1800, status: "available", location: "База" },
  { id: "Q-03", name: "Can-Am Outlander", model: "2024", power: "78 л.с.", rate: 1800, status: "available", location: "База" },
  { id: "Q-04", name: "Polaris Sportsman", model: "2023", power: "68 л.с.", rate: 1800, status: "maintenance", location: "Сервис" },
  { id: "Q-05", name: "Honda FourTrax", model: "2022", power: "45 л.с.", rate: 1500, status: "available", location: "База" },
];

const payments = [
  { id: "PAY-001", client: "Дмитрий Козлов", booking: "BR-005", date: "03.05.2026", amount: 7200, method: "Карта", status: "paid" },
  { id: "PAY-002", client: "Алексей Морозов", booking: "BR-001", date: "04.05.2026", amount: 5400, method: "Наличные", status: "paid" },
  { id: "PAY-003", client: "Мария Соколова", booking: "BR-002", date: "04.05.2026", amount: 3600, method: "Карта", status: "pending" },
  { id: "PAY-004", client: "Дмитрий Козлов", booking: "BR-003", date: "05.05.2026", amount: 9000, method: "Карта", status: "pending" },
];

const expenses = [
  { id: 1, category: "ТО и ремонт", description: "Замена масла Q-04", date: "01.05.2026", amount: 3200 },
  { id: 2, category: "Топливо", description: "Заправка парка", date: "02.05.2026", amount: 8500 },
  { id: 3, category: "Страховка", description: "Полис на май", date: "01.05.2026", amount: 15000 },
  { id: 4, category: "Зарплата", description: "Сотрудники", date: "01.05.2026", amount: 45000 },
  { id: 5, category: "Аренда", description: "База стоянка", date: "01.05.2026", amount: 20000 },
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

function Dashboard() {
  const stats = [
    { label: "Активных аренд", value: "3", icon: "Bike", color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Бронирований сегодня", value: "5", icon: "Calendar", color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Доход за май", value: "₽ 87 200", icon: "TrendingUp", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Доступно квадроциклов", value: "3 / 5", icon: "CheckCircle", color: "text-violet-500", bg: "bg-violet-50" },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Дашборд</h1>
        <p className="text-muted-foreground text-sm mt-1">Понедельник, 4 мая 2026</p>
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
          <h2 className="font-semibold text-foreground mb-4">Последние бронирования</h2>
          <div className="space-y-3">
            {bookings.slice(0, 4).map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{b.client}</div>
                  <div className="text-xs text-muted-foreground">{b.quad} · {b.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  <span className="text-sm font-semibold">₽ {b.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Статус техники</h2>
          <div className="space-y-3">
            {quads.map((q) => (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-semibold text-muted-foreground">{q.id}</div>
                  <div>
                    <div className="text-sm font-medium">{q.name}</div>
                    <div className="text-xs text-muted-foreground">{q.location}</div>
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
          <h2 className="font-semibold text-foreground mb-1">Доход за май</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">₽ 87 200</div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <Icon name="TrendingUp" size={12} /> +24% к апрелю
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Расходы за май</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">₽ 91 700</div>
          <div className="text-xs text-muted-foreground mt-1">ТО, топливо, зарплата</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Всего клиентов</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">148</div>
          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <Icon name="Users" size={12} /> 12 новых в этом месяце
          </div>
        </div>
      </div>
    </div>
  );
}

function Clients() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Клиенты</h1>
          <p className="text-muted-foreground text-sm mt-1">148 клиентов в базе</p>
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
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-semibold text-primary">
                      {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{c.phone}</td>
                <td className="px-6 py-4 text-sm">{c.trips}</td>
                <td className="px-6 py-4 text-sm font-medium">₽ {c.spent.toLocaleString()}</td>
                <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
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
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Бронирования</h1>
          <p className="text-muted-foreground text-sm mt-1">5 активных заказов</p>
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
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Дата</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Длит.</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Сумма</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Статус</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{b.id}</td>
                  <td className="px-6 py-4 text-sm font-medium">{b.client}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{b.quad}</td>
                  <td className="px-6 py-4 text-sm">{b.date}</td>
                  <td className="px-6 py-4 text-sm">{b.duration}</td>
                  <td className="px-6 py-4 text-sm font-semibold">₽ {b.amount.toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
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
    </div>
  );
}

function Quads() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Квадроциклы</h1>
          <p className="text-muted-foreground text-sm mt-1">5 единиц техники</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить технику
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {quads.map((q) => (
          <div key={q.id} className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-mono mb-1">{q.id}</div>
                <div className="font-semibold text-foreground">{q.name}</div>
                <div className="text-sm text-muted-foreground">{q.model} · {q.power}</div>
              </div>
              <StatusBadge status={q.status} />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Icon name="MapPin" size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{q.location}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Ставка: </span>
                <span className="font-semibold">₽ {q.rate}/ч</span>
              </div>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-all">
                  <Icon name="Navigation" size={14} />
                </button>
                <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-all">
                  <Icon name="FileText" size={14} />
                </button>
                <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-all">
                  <Icon name="Settings" size={14} />
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
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Платежи</h1>
          <p className="text-muted-foreground text-sm mt-1">4 транзакции в мае</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить платёж
        </button>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">№</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Клиент</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Бронирование</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Дата</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Сумма</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Способ</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{p.id}</td>
                  <td className="px-6 py-4 text-sm font-medium">{p.client}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{p.booking}</td>
                  <td className="px-6 py-4 text-sm">{p.date}</td>
                  <td className="px-6 py-4 text-sm font-semibold">₽ {p.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{p.method}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
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
  const months = ["Янв", "Фев", "Мар", "Апр", "Май"];
  const income = [42000, 58000, 71000, 70000, 87200];
  const expns = [55000, 60000, 78000, 75000, 91700];
  const maxVal = Math.max(...income, ...expns);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Отчёты</h1>
        <p className="text-muted-foreground text-sm mt-1">Аналитика и статистика</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Доход за май</div>
          <div className="text-2xl font-display font-semibold">₽ 87 200</div>
          <div className="text-xs text-emerald-600 mt-1">+24% к апрелю</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Расходы за май</div>
          <div className="text-2xl font-display font-semibold">₽ 91 700</div>
          <div className="text-xs text-red-500 mt-1">+22% к апрелю</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Средний чек</div>
          <div className="text-2xl font-display font-semibold">₽ 6 250</div>
          <div className="text-xs text-muted-foreground mt-1">За поездку</div>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-semibold mb-6">Доходы и расходы по месяцам</h2>
        <div className="flex items-end gap-4" style={{ height: "160px" }}>
          {months.map((m, i) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full flex gap-1 items-end" style={{ height: "130px" }}>
                <div
                  className="flex-1 bg-emerald-400 rounded-t-md opacity-80"
                  style={{ height: `${(income[i] / maxVal) * 130}px` }}
                />
                <div
                  className="flex-1 bg-red-300 rounded-t-md opacity-80"
                  style={{ height: `${(expns[i] / maxVal) * 130}px` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">{m}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-emerald-400 opacity-80" /> Доходы
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-red-300 opacity-80" /> Расходы
          </div>
        </div>
      </div>
    </div>
  );
}

function Expenses() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Расходы</h1>
          <p className="text-muted-foreground text-sm mt-1">Май 2026 · ₽ {total.toLocaleString()}</p>
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
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 text-sm font-medium">{e.category}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{e.description}</td>
                <td className="px-6 py-4 text-sm">{e.date}</td>
                <td className="px-6 py-4 text-sm font-semibold text-red-600">₽ {e.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/30">
              <td colSpan={3} className="px-6 py-4 text-sm font-semibold">Итого за май</td>
              <td className="px-6 py-4 text-sm font-bold text-foreground">₽ {total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Income() {
  const incomeData = [
    { id: 1, source: "Аренда квадроциклов", date: "01–04.05.2026", amount: 58200, desc: "18 поездок" },
    { id: 2, source: "Аренда экипировки", date: "01–04.05.2026", amount: 12400, desc: "Шлемы, перчатки" },
    { id: 3, source: "Экскурсионные туры", date: "02.05.2026", amount: 16600, desc: "3 группы" },
  ];
  const total = incomeData.reduce((s, i) => s + i.amount, 0);
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Доходы</h1>
          <p className="text-muted-foreground text-sm mt-1">Май 2026 · ₽ {total.toLocaleString()}</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить
        </button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {incomeData.map((i) => (
          <div key={i.id} className="stat-card">
            <div className="text-xs text-muted-foreground mb-1">{i.source}</div>
            <div className="text-2xl font-display font-semibold text-emerald-600">₽ {i.amount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{i.desc}</div>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Итого за май</h2>
          <span className="text-2xl font-display font-semibold text-emerald-600">₽ {total.toLocaleString()}</span>
        </div>
        <div className="text-sm text-muted-foreground">Данные по всем источникам дохода за текущий месяц</div>
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
