import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

type Section =
  | "dashboard" | "clients" | "bookings" | "quads"
  | "payments" | "reports" | "expenses" | "income"
  | "calendar" | "employees" | "contacts";

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

// ── Утилиты ───────────────────────────────────────────────────

function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}

function Empty({ icon, text, action, onAction }: { icon: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-16 text-center">
      <Icon name={icon} size={40} className="text-muted-foreground mx-auto mb-4" />
      <p className="font-medium text-foreground mb-1">{text}</p>
      {action && <button onClick={onAction} className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">{action}</button>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    available: { label: "Доступен", cls: "status-available" },
    rented: { label: "В аренде", cls: "status-rented" },
    maintenance: { label: "Сервис", cls: "status-maintenance" },
    retired: { label: "Списан", cls: "status-completed" },
    pending: { label: "Ожидание", cls: "status-pending" },
    confirmed: { label: "Подтверждено", cls: "status-confirmed" },
    issued: { label: "Выдан", cls: "status-rented" },
    returned: { label: "Возвращён", cls: "status-completed" },
    cancelled: { label: "Отменено", cls: "status-maintenance" },
    active: { label: "Активен", cls: "status-available" },
    vip: { label: "VIP", cls: "status-confirmed" },
    new: { label: "Новый", cls: "status-pending" },
    blacklisted: { label: "Чёрный список", cls: "status-maintenance" },
    "day-off": { label: "Выходной", cls: "status-completed" },
    income: { label: "Доход", cls: "status-available" },
    expense: { label: "Расход", cls: "status-maintenance" },
  };
  const s = map[status] || { label: status, cls: "status-completed" };
  return <span className={`status-badge ${s.cls}`}>{s.label}</span>;
}

// ── Подтверждение удаления ─────────────────────────────────────

function ConfirmDelete({ text, onConfirm, onCancel }: { text: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-2xl animate-fade-in p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Trash2" size={20} className="text-red-600" />
        </div>
        <h2 className="font-semibold text-foreground mb-2">Удалить?</h2>
        <p className="text-sm text-muted-foreground mb-6">{text}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground">Отмена</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">Удалить</button>
        </div>
      </div>
    </div>
  );
}

// ── Модальное окно ────────────────────────────────────────────

interface ModalProps { title: string; onClose: () => void; onSubmit: () => void; loading?: boolean; children: React.ReactNode; }

function Modal({ title, onClose, onSubmit, loading, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div ref={ref} className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-display font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground">Отмена</button>
          <button onClick={onSubmit} disabled={loading} className="px-5 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>{children}</div>;
}

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";
const selectCls = inputCls + " cursor-pointer";

// ── ГРАФИКИ ───────────────────────────────────────────────────

function BarChart({ data, height = 140 }: {
   
  data: { label: string; income: number; expense: number }[];
  height?: number;
}) {
  if (!data.length) return <p className="text-sm text-muted-foreground text-center py-8">Нет данных — внесите доходы и расходы</p>;
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map(d => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
            <div className="w-full flex gap-0.5 items-end" style={{ height: height - 20 }}>
              <div title={`Доход: ₽${d.income.toLocaleString()}`} className="flex-1 bg-emerald-400 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer" style={{ height: `${(d.income / max) * (height - 20)}px`, minHeight: d.income > 0 ? 2 : 0 }} />
              <div title={`Расход: ₽${d.expense.toLocaleString()}`} className="flex-1 bg-red-300 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer" style={{ height: `${(d.expense / max) * (height - 20)}px`, minHeight: d.expense > 0 ? 2 : 0 }} />
            </div>
            <div className="text-[10px] text-muted-foreground truncate w-full text-center">{d.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />Доходы</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" />Расходы</span>
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  if (!data.length || data.every(d => d.value === 0)) return <p className="text-sm text-muted-foreground text-center py-8">Нет данных</p>;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  const r = 50, cx = 60, cy = 60, stroke = 22;
  const circumference = 2 * Math.PI * r;
  const segments = data.map(d => {
    const pct = d.value / total;
    const seg = { ...d, pct, dashArray: `${pct * circumference} ${circumference}`, dashOffset: -offset * circumference };
    offset += pct;
    return seg;
  });
  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {segments.map((seg, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset}
            transform="rotate(-90 60 60)" className="transition-all" />
        ))}
        <text x="60" y="57" textAnchor="middle" className="text-xs font-bold" fontSize="11" fill="currentColor">₽{(total / 1000).toFixed(0)}к</text>
        <text x="60" y="70" textAnchor="middle" fontSize="8" fill="gray">всего</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: seg.color }} />{seg.label}</span>
            <span className="font-semibold">₽{seg.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ДАШБОРД ───────────────────────────────────────────────────

function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.dashboard().then(d => { setData(d); setLoading(false); }); }, []);
  if (loading) return <Spinner />;

  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const profit = (Number(data.month_income) || 0) - (Number(data.month_expense) || 0);

  const stats = [
    { label: "В аренде", value: String(data.rented_quads || 0), icon: "Bike", color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Броней сегодня", value: String(data.today_bookings || 0), icon: "Calendar", color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Доход за месяц", value: `₽ ${(Number(data.month_income) || 0).toLocaleString()}`, icon: "TrendingUp", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Доступно квадов", value: `${data.available_quads || 0} / ${data.total_quads || 0}`, icon: "CheckCircle", color: "text-violet-500", bg: "bg-violet-50" },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Дашборд</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{today}</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4`}><Icon name={s.icon} size={20} className={s.color} /></div>
            <div className="text-2xl font-display font-semibold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Активные бронирования</h2>
          <div className="space-y-3">
            {(data.active_bookings_list || []).slice(0, 5).map((b: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div><div className="text-sm font-medium">{b.client_name}</div><div className="text-xs text-muted-foreground">{b.quad_name} · {new Date(b.start_time).toLocaleDateString("ru-RU")}</div></div>
                <div className="flex items-center gap-3"><StatusBadge status={b.status} /><span className="text-sm font-semibold">₽ {(Number(b.amount) || 0).toLocaleString()}</span></div>
              </div>
            ))}
            {!(data.active_bookings_list?.length) && <p className="text-sm text-muted-foreground py-8 text-center">Нет активных бронирований</p>}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Статус техники</h2>
          <div className="space-y-3">
            {(data.quads || []).map((q: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-semibold text-muted-foreground">Q{q.id}</div>
                  <div><div className="text-sm font-medium">{q.name}</div><div className="text-xs text-muted-foreground">{q.model}</div></div>
                </div>
                <StatusBadge status={q.status} />
              </div>
            ))}
            {!(data.quads?.length) && <p className="text-sm text-muted-foreground py-8 text-center">Техника не добавлена</p>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Доход за месяц</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">₽ {(Number(data.month_income) || 0).toLocaleString()}</div>
          <div className={`text-xs mt-1 flex items-center gap-1 ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            <Icon name={profit >= 0 ? "TrendingUp" : "TrendingDown"} size={12} /> Прибыль: ₽ {profit.toLocaleString()}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Расходы за месяц</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">₽ {(Number(data.month_expense) || 0).toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Всего клиентов</h2>
          <div className="text-3xl font-display font-semibold text-foreground mt-2">{data.total_clients || 0}</div>
          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Icon name="Users" size={12} /> в базе</div>
        </div>
      </div>
    </div>
  );
}

// ── КЛИЕНТЫ ───────────────────────────────────────────────────

function Clients() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", telegram: "", passport: "", notes: "" });

  const load = useCallback(() => { api.clients.list().then(d => { setItems(d); setLoading(false); }); }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    await api.clients.create(form);
    setSaving(false); setShowModal(false);
    setForm({ full_name: "", phone: "", telegram: "", passport: "", notes: "" });
    load();
  };

  const remove = async (id: number) => { await api.clients.remove(id); setDeleteId(null); load(); };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in space-y-6">
      {showModal && (
        <Modal title="Новый клиент" onClose={() => setShowModal(false)} onSubmit={save} loading={saving}>
          <Field label="Имя и фамилия *"><input className={inputCls} placeholder="Алексей Морозов" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Телефон"><input className={inputCls} placeholder="+7 900 000-00-00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Telegram"><input className={inputCls} placeholder="@username" value={form.telegram} onChange={e => setForm({ ...form, telegram: e.target.value })} /></Field>
          <Field label="Паспорт / документ"><input className={inputCls} placeholder="4520 123456" value={form.passport} onChange={e => setForm({ ...form, passport: e.target.value })} /></Field>
          <Field label="Заметки"><textarea className={inputCls} rows={2} placeholder="VIP, постоянный клиент..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {deleteId !== null && <ConfirmDelete text="Клиент будет удалён из базы" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-semibold">Клиенты</h1><p className="text-muted-foreground text-sm mt-1">{items.length} клиентов в базе</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"><Icon name="Plus" size={16} /> Добавить клиента</button>
      </div>

      {!items.length ? <Empty icon="Users" text="Клиентов пока нет" action="Добавить клиента" onAction={() => setShowModal(true)} /> : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Клиент</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Телефон</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Поездок</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Сумма</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4">Статус</th>
              <th className="text-left text-xs text-muted-foreground font-medium px-6 py-4"></th>
            </tr></thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${c.is_blacklisted ? "bg-red-50/50" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-semibold text-primary">{c.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                      <div><span className="text-sm font-medium">{c.full_name}</span>{c.is_blacklisted && <div className="text-[10px] text-red-600 font-medium">Чёрный список</div>}{c.notes && <div className="text-[10px] text-muted-foreground">{c.notes}</div>}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-6 py-4 text-sm">{c.trips_count}</td>
                  <td className="px-6 py-4 text-sm font-medium">₽ {Number(c.total_spent).toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={c.is_blacklisted ? "blacklisted" : Number(c.trips_count) > 5 ? "vip" : Number(c.trips_count) === 0 ? "new" : "active"} /></td>
                  <td className="px-6 py-4">
                    <button onClick={() => setDeleteId(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── КВАДРОЦИКЛЫ ───────────────────────────────────────────────

function Quads() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", model: "", year: "", power: "", hourly_rate: "1800", status: "available", mileage: "0", last_service_date: "", notes: "" });

  const load = useCallback(() => { api.quads.list().then(d => { setItems(d); setLoading(false); }); }, []);
  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: number, status: string) => { await api.quads.update(id, { status }); load(); };
  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await api.quads.create({ ...form, year: Number(form.year) || null, hourly_rate: Number(form.hourly_rate) || 1800, mileage: Number(form.mileage) || 0 });
    setSaving(false); setShowModal(false);
    setForm({ name: "", model: "", year: "", power: "", hourly_rate: "1800", status: "available", mileage: "0", last_service_date: "", notes: "" });
    load();
  };
  const remove = async (id: number) => { await api.quads.remove(id); setDeleteId(null); load(); };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in space-y-6">
      {showModal && (
        <Modal title="Добавить квадроцикл" onClose={() => setShowModal(false)} onSubmit={save} loading={saving}>
          <Field label="Название / позывной *"><input className={inputCls} placeholder="Кабан-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Модель"><input className={inputCls} placeholder="Yamaha Grizzly 700" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></Field>
            <Field label="Год"><input className={inputCls} type="number" placeholder="2024" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Мощность"><input className={inputCls} placeholder="62 л.с." value={form.power} onChange={e => setForm({ ...form, power: e.target.value })} /></Field>
            <Field label="Ставка (₽/ч)"><input className={inputCls} type="number" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Пробег (км)"><input className={inputCls} type="number" value={form.mileage} onChange={e => setForm({ ...form, mileage: e.target.value })} /></Field>
            <Field label="Дата ТО"><input className={inputCls} type="date" value={form.last_service_date} onChange={e => setForm({ ...form, last_service_date: e.target.value })} /></Field>
          </div>
          <Field label="Статус">
            <select className={selectCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="available">Доступен</option>
              <option value="maintenance">На ТО</option>
              <option value="retired">Списан</option>
            </select>
          </Field>
          <Field label="Заметки"><textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {deleteId !== null && <ConfirmDelete text="Квадроцикл будет удалён из парка" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-semibold">Квадроциклы</h1><p className="text-muted-foreground text-sm mt-1">{items.length} единиц техники</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"><Icon name="Plus" size={16} /> Добавить технику</button>
      </div>

      {!items.length ? <Empty icon="Bike" text="Техника не добавлена" action="Добавить квадроцикл" onAction={() => setShowModal(true)} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(q => (
            <div key={q.id} className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">Q-{String(q.id).padStart(2, "0")}</div>
                  <div className="font-semibold text-foreground">{q.name}</div>
                  <div className="text-sm text-muted-foreground">{q.model}{q.year ? ` · ${q.year}` : ""}{q.power ? ` · ${q.power}` : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={q.status} />
                  <button onClick={() => setDeleteId(q.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={13} /></button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
                <span className="flex items-center gap-1"><Icon name="Gauge" size={12} /> {q.mileage} км</span>
                {q.last_service_date && <span>· ТО: {new Date(q.last_service_date).toLocaleDateString("ru-RU")}</span>}
              </div>
              {q.notes && <div className="text-xs text-muted-foreground">{q.notes}</div>}
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">₽ {q.hourly_rate}/ч</div>
                <div className="flex gap-1.5">
                  {q.status === "available" && <button onClick={() => changeStatus(q.id, "maintenance")} className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg hover:bg-yellow-100 transition-colors font-medium">На ТО</button>}
                  {q.status === "maintenance" && <button onClick={() => changeStatus(q.id, "available")} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors font-medium">Готов</button>}
                  {q.status === "rented" && <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded-lg font-medium">В аренде</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── БРОНИРОВАНИЯ ──────────────────────────────────────────────

function Bookings() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quadsList, setQuadsList] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ quad_id: "", client_id: "", start_time: "", duration_hours: "2", amount: "", deposit: "0", payment_method: "cash", status: "pending", notes: "" });

  const load = useCallback(() => {
    Promise.all([api.bookings.list(), api.quads.list(), api.clients.list()]).then(([b, q, c]) => { setItems(b); setQuadsList(q); setClientsList(c); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const calcAmount = (qid: string, hrs: string) => { const q = quadsList.find(q => String(q.id) === qid); return q && hrs ? String(q.hourly_rate * Number(hrs)) : form.amount; };
  const changeStatus = async (id: number, status: string) => { await api.bookings.update(id, { status }); load(); };
  const save = async () => {
    if (!form.quad_id || !form.client_id || !form.start_time) return;
    setSaving(true);
    const hrs = Number(form.duration_hours) || 2;
    const start = new Date(form.start_time);
    const end = new Date(start.getTime() + hrs * 3600000);
    await api.bookings.create({ ...form, quad_id: Number(form.quad_id), client_id: Number(form.client_id), start_time: start.toISOString(), end_time: end.toISOString(), duration_hours: hrs, amount: Number(form.amount), deposit: Number(form.deposit) });
    setSaving(false); setShowModal(false);
    setForm({ quad_id: "", client_id: "", start_time: "", duration_hours: "2", amount: "", deposit: "0", payment_method: "cash", status: "pending", notes: "" });
    load();
  };
  const remove = async (id: number) => { await api.bookings.remove(id); setDeleteId(null); load(); };

  if (loading) return <Spinner />;
  const active = items.filter(b => ["pending", "confirmed", "issued"].includes(b.status)).length;

  return (
    <div className="animate-fade-in space-y-6">
      {showModal && (
        <Modal title="Новое бронирование" onClose={() => setShowModal(false)} onSubmit={save} loading={saving}>
          <Field label="Квадроцикл *">
            <select className={selectCls} value={form.quad_id} onChange={e => { const amt = calcAmount(e.target.value, form.duration_hours); setForm({ ...form, quad_id: e.target.value, amount: amt }); }}>
              <option value="">— Выберите квадроцикл —</option>
              {quadsList.filter(q => q.status === "available").map(q => <option key={q.id} value={q.id}>{q.name} — ₽{q.hourly_rate}/ч</option>)}
            </select>
          </Field>
          <Field label="Клиент *">
            <select className={selectCls} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— Выберите клиента —</option>
              {clientsList.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `(${c.phone})` : ""}</option>)}
            </select>
          </Field>
          <Field label="Дата и время *"><input className={inputCls} type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Продолжительность (ч)"><input className={inputCls} type="number" min="1" max="24" value={form.duration_hours} onChange={e => { const amt = calcAmount(form.quad_id, e.target.value); setForm({ ...form, duration_hours: e.target.value, amount: amt }); }} /></Field>
            <Field label="Сумма (₽)"><input className={inputCls} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Залог (₽)"><input className={inputCls} type="number" value={form.deposit} onChange={e => setForm({ ...form, deposit: e.target.value })} /></Field>
            <Field label="Оплата">
              <select className={selectCls} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                <option value="cash">Наличные</option><option value="card">Карта</option><option value="transfer">Перевод</option>
              </select>
            </Field>
          </div>
          <Field label="Статус">
            <select className={selectCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Ожидание</option><option value="confirmed">Подтверждено</option><option value="issued">Выдан</option>
            </select>
          </Field>
          <Field label="Заметки"><textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {deleteId !== null && <ConfirmDelete text="Бронирование и связанные транзакции будут удалены" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-semibold">Бронирования</h1><p className="text-muted-foreground text-sm mt-1">{active} активных · {items.length} всего</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"><Icon name="Plus" size={16} /> Новое бронирование</button>
      </div>

      {!items.length ? <Empty icon="ClipboardList" text="Бронирований нет" action="Создать бронирование" onAction={() => setShowModal(true)} /> : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">№</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Клиент</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Квадроцикл</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Начало</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Ч.</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Сумма</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Статус</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Действие</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4"></th>
              </tr></thead>
              <tbody>
                {items.map(b => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 text-sm text-muted-foreground font-mono">#{b.id}</td>
                    <td className="px-5 py-4 text-sm font-medium">{b.client_name || "—"}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{b.quad_name}</td>
                    <td className="px-5 py-4 text-sm">{new Date(b.start_time).toLocaleDateString("ru-RU")}</td>
                    <td className="px-5 py-4 text-sm">{b.duration_hours}</td>
                    <td className="px-5 py-4 text-sm font-semibold">₽ {Number(b.amount).toLocaleString()}</td>
                    <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {b.status === "pending" && <button onClick={() => changeStatus(b.id, "confirmed")} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 font-medium whitespace-nowrap">Подтвердить</button>}
                        {b.status === "confirmed" && <button onClick={() => changeStatus(b.id, "issued")} className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-200 font-medium">Выдать</button>}
                        {b.status === "issued" && <button onClick={() => changeStatus(b.id, "returned")} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-200 font-medium">Принять</button>}
                        {["pending", "confirmed"].includes(b.status) && <button onClick={() => changeStatus(b.id, "cancelled")} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-lg hover:bg-red-200 font-medium">Отмена</button>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => setDeleteId(b.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ТРАНЗАКЦИИ (общий компонент) ──────────────────────────────

function TransactionSection({ type }: { type: "income" | "expense" | "all" }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>({ items: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const isAll = type === "all";
  const defCat = type === "income" ? "Аренда" : "ТО и ремонт";
  const [form, setForm] = useState({ type: type === "all" ? "income" : type, category: defCat, amount: "", description: "", transaction_date: new Date().toISOString().slice(0, 10) });

  const load = useCallback(() => {
    const params = type !== "all" ? { type } : undefined;
    api.transactions.list(params).then(d => { setData(d); setLoading(false); });
  }, [type]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.category || !form.amount) return;
    setSaving(true);
    await api.transactions.create({ ...form, amount: Number(form.amount) });
    setSaving(false); setShowModal(false);
    setForm({ type: type === "all" ? "income" : type, category: defCat, amount: "", description: "", transaction_date: new Date().toISOString().slice(0, 10) });
    load();
  };
  const remove = async (id: number) => { await api.transactions.remove(id); setDeleteId(null); load(); };

  const title = type === "income" ? "Доходы" : type === "expense" ? "Расходы" : "Платежи";
  const addLabel = type === "income" ? "Внести доход" : type === "expense" ? "Внести расход" : "Добавить транзакцию";
  const total = type === "income" ? data.totals?.total_income : type === "expense" ? data.totals?.total_expense : undefined;

  const incomeCategories = ["Аренда", "Залог", "Экскурсионный тур", "Аренда экипировки", "Прочее"];
  const expenseCategories = ["ТО и ремонт", "Топливо", "Зарплата", "Аренда базы", "Страховка", "Запчасти", "Маркетинг", "Прочее"];

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in space-y-6">
      {showModal && (
        <Modal title={addLabel} onClose={() => setShowModal(false)} onSubmit={save} loading={saving}>
          {isAll && <Field label="Тип *">
            <select className={selectCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="income">Доход</option><option value="expense">Расход</option>
            </select>
          </Field>}
          <Field label="Категория *">
            <select className={selectCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {(isAll ? (form.type === "income" ? incomeCategories : expenseCategories) : type === "income" ? incomeCategories : expenseCategories).map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Сумма (₽) *"><input className={inputCls} type="number" min="0" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Описание"><textarea className={inputCls} rows={2} placeholder="Подробности..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Дата"><input className={inputCls} type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} /></Field>
        </Modal>
      )}
      {deleteId !== null && <ConfirmDelete text="Запись будет удалена" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.items?.length || 0} записей{total !== undefined ? ` · ₽ ${Number(total).toLocaleString()}` : ""}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"><Icon name="Plus" size={16} /> {addLabel}</button>
      </div>

      {isAll && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="stat-card"><div className="text-xs text-muted-foreground mb-1">Итого доходов</div><div className="text-2xl font-display font-semibold text-emerald-600">₽ {Number(data.totals?.total_income || 0).toLocaleString()}</div></div>
          <div className="stat-card"><div className="text-xs text-muted-foreground mb-1">Итого расходов</div><div className="text-2xl font-display font-semibold text-red-500">₽ {Number(data.totals?.total_expense || 0).toLocaleString()}</div></div>
          <div className="stat-card"><div className="text-xs text-muted-foreground mb-1">Прибыль</div><div className={`text-2xl font-display font-semibold ${Number(data.totals?.profit) >= 0 ? "text-foreground" : "text-red-500"}`}>₽ {Number(data.totals?.profit || 0).toLocaleString()}</div></div>
        </div>
      )}

      {!(data.items?.length) ? <Empty icon={type === "income" ? "TrendingUp" : "TrendingDown"} text="Записей нет" action={addLabel} onAction={() => setShowModal(true)} /> : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                {isAll && <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Тип</th>}
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Категория</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Описание</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Дата</th>
                <th className="text-left text-xs text-muted-foreground font-medium px-5 py-4">Сумма</th>
                <th className="px-5 py-4"></th>
              </tr></thead>
              <tbody>
                {(data.items || []).map((t: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    {isAll && <td className="px-5 py-4"><StatusBadge status={t.type} /></td>}
                    <td className="px-5 py-4 text-sm font-medium">{t.category}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{t.description || "—"}</td>
                    <td className="px-5 py-4 text-sm">{t.transaction_date}</td>
                    <td className={`px-5 py-4 text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                      {t.type === "income" ? "+" : "−"}₽ {Number(t.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => setDeleteId(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!isAll && (
                <tfoot><tr className="border-t border-border bg-muted/30">
                  <td colSpan={3} className="px-5 py-4 text-sm font-semibold">Итого</td>
                  <td className={`px-5 py-4 text-sm font-bold ${type === "income" ? "text-emerald-600" : "text-red-500"}`}>₽ {Number(total || 0).toLocaleString()}</td>
                  <td />
                </tr></tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ОТЧЁТЫ ────────────────────────────────────────────────────

function Reports() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.reports().then(d => { setData(d); setLoading(false); }); }, []);
  if (loading) return <Spinner />;

  const monthly = (data.monthly || []) as { month_key: string; month: string; income: number; expense: number; profit: number }[];
  const barData = monthly.map(m => ({
    label: new Date(m.month).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }),
    income: Number(m.income),
    expense: Number(m.expense),
  }));

  const expCats = (data.expense_by_category || []) as { category: string; total: number }[];
  const incCats = (data.income_by_category || []) as { category: string; total: number }[];
  const totals = data.totals || {};
  const monthT = data.month_totals || {};
  const quadStats = (data.quad_stats || []) as { name: string; trips: number; revenue: number; total_hours: number }[];

  const expColors = ["#f87171", "#fb923c", "#fbbf24", "#a78bfa", "#60a5fa", "#34d399", "#f472b6", "#94a3b8"];
  const incColors = ["#34d399", "#60a5fa", "#a78bfa", "#fbbf24", "#fb923c", "#f87171", "#f472b6", "#94a3b8"];

  const donutExpense = expCats.slice(0, 8).map((e, i) => ({ label: e.category, value: Number(e.total), color: expColors[i % expColors.length] }));
  const donutIncome = incCats.slice(0, 8).map((e, i) => ({ label: e.category, value: Number(e.total), color: incColors[i % incColors.length] }));

  const totalProfit = Number(totals.total_profit || 0);
  const monthProfit = Number(monthT.month_profit || 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-display font-semibold">Отчёты</h1><p className="text-muted-foreground text-sm mt-1">Аналитика по реальным данным</p></div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Доход за месяц</div>
          <div className="text-2xl font-display font-semibold text-emerald-600">₽ {Number(monthT.month_income || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Расход за месяц</div>
          <div className="text-2xl font-display font-semibold text-red-500">₽ {Number(monthT.month_expense || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Прибыль за месяц</div>
          <div className={`text-2xl font-display font-semibold ${monthProfit >= 0 ? "text-foreground" : "text-red-500"}`}>₽ {monthProfit.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Прибыль всего</div>
          <div className={`text-2xl font-display font-semibold ${totalProfit >= 0 ? "text-foreground" : "text-red-500"}`}>₽ {totalProfit.toLocaleString()}</div>
        </div>
      </div>

      {/* График по месяцам */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-semibold mb-6">Доходы и расходы по месяцам</h2>
        <BarChart data={barData} height={160} />
      </div>

      {/* Структура доходов и расходов */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold mb-5">Структура доходов</h2>
          <DonutChart data={donutIncome} />
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold mb-5">Структура расходов</h2>
          <DonutChart data={donutExpense} />
        </div>
      </div>

      {/* Доходность техники */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-semibold mb-4">Доходность техники</h2>
        {!quadStats.length || quadStats.every(q => q.trips === 0) ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Нет завершённых аренд</p>
        ) : (
          <div className="space-y-3">
            {quadStats.map(q => {
              const maxRev = Math.max(...quadStats.map(x => Number(x.revenue)), 1);
              const pct = (Number(q.revenue) / maxRev) * 100;
              return (
                <div key={q.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{q.name}</span>
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      <span>{q.trips} поездок · {Number(q.total_hours).toFixed(0)} ч</span>
                      <span className="text-emerald-600 font-semibold text-sm">₽ {Number(q.revenue).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── КАЛЕНДАРЬ ─────────────────────────────────────────────────

function CalendarView() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bookings, setBookings] = useState<any[]>([]);
  useEffect(() => { api.bookings.list().then(setBookings); }, []);

  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const monthName = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  const byDay: Record<number, string[]> = {};
  bookings.forEach(b => {
    if (["pending", "confirmed", "issued", "returned"].includes(b.status)) {
      const d = new Date(b.start_time);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(b.client_name || "Бронь");
      }
    }
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-display font-semibold">Календарь аренд</h1><p className="text-muted-foreground text-sm mt-1 capitalize">{monthName}</p></div>
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => <div key={d} className="text-center text-xs text-muted-foreground font-medium py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1, isToday = day === now.getDate();
            const bks = byDay[day] || [];
            return (
              <div key={day} className={`min-h-16 rounded-xl p-2 text-xs border transition-colors ${isToday ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
                <div className={`font-semibold mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>{day}</div>
                {bks.slice(0, 2).map((n, j) => <div key={j} className="bg-orange-100 text-orange-700 rounded px-1 py-0.5 mb-0.5 truncate text-[10px]">{n}</div>)}
                {bks.length > 2 && <div className="text-[10px] text-muted-foreground">+{bks.length - 2}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── СОТРУДНИКИ ────────────────────────────────────────────────

const emptyEmp = { name: "", role: "", phone: "", status: "active", notes: "" };

function Employees() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState(emptyEmp);

  const load = useCallback(() => {
    api.employees.list().then(d => { setItems(d); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditItem(null); setForm(emptyEmp); setShowModal(true); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (e: any) => { setEditItem(e); setForm({ name: e.name, role: e.role || "", phone: e.phone || "", status: e.status, notes: e.notes || "" }); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editItem) {
      await api.employees.update(editItem.id, form);
    } else {
      await api.employees.create(form);
    }
    setSaving(false); setShowModal(false);
    load();
  };

  const remove = async (id: number) => { await api.employees.remove(id); setDeleteId(null); load(); };

  if (loading) return <Spinner />;

  const roleColors: Record<string, string> = {
    "Инструктор": "bg-blue-50 text-blue-700",
    "Механик": "bg-yellow-50 text-yellow-700",
    "Администратор": "bg-violet-50 text-violet-700",
    "Охранник": "bg-gray-100 text-gray-600",
  };

  return (
    <div className="animate-fade-in space-y-6">
      {showModal && (
        <Modal
          title={editItem ? "Редактировать сотрудника" : "Добавить сотрудника"}
          onClose={() => setShowModal(false)}
          onSubmit={save}
          loading={saving}
        >
          <Field label="Имя и фамилия *">
            <input className={inputCls} placeholder="Иван Смирнов" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Должность">
            <select className={selectCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="">— Выберите —</option>
              <option>Инструктор</option>
              <option>Механик</option>
              <option>Администратор</option>
              <option>Охранник</option>
            </select>
          </Field>
          <Field label="Телефон">
            <input className={inputCls} placeholder="+7 900 000-00-00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Статус">
            <select className={selectCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="active">Активен</option>
              <option value="day-off">Выходной</option>
              <option value="fired">Уволен</option>
            </select>
          </Field>
          <Field label="Заметки">
            <textarea className={inputCls} rows={2} placeholder="Доп. информация..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </Modal>
      )}
      {deleteId !== null && (
        <ConfirmDelete text="Сотрудник будет удалён из системы" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Сотрудники</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} человек в команде</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Добавить сотрудника
        </button>
      </div>

      {!items.length ? (
        <Empty icon="UserCog" text="Сотрудников пока нет" action="Добавить сотрудника" onAction={openAdd} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(e => (
            <div key={e.id} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                {e.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground truncate">{e.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {e.role && <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${roleColors[e.role] || "bg-muted text-muted-foreground"}`}>{e.role}</span>}
                </div>
                {e.phone && <div className="text-xs text-muted-foreground mt-1">{e.phone}</div>}
                {e.notes && <div className="text-xs text-muted-foreground mt-0.5 truncate">{e.notes}</div>}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <StatusBadge status={e.status} />
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(e)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Редактировать"
                  >
                    <Icon name="Pencil" size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteId(e.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Удалить"
                  >
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── КОНТАКТЫ ──────────────────────────────────────────────────

function Contacts() {
  const [company, setCompany] = useState({ name: "ООО «BogatovTravel»", phone: "", email: "", address: "", hours: "Пн–Вс, 08:00–20:00" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(company);
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-semibold">Контакты</h1><p className="text-muted-foreground text-sm mt-1">Информация о компании</p></div>
        {!editing && <button onClick={() => { setDraft(company); setEditing(true); }} className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-foreground"><Icon name="Pencil" size={16} /> Редактировать</button>}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="font-semibold">Реквизиты компании</h2>
          {editing ? (
            <div className="space-y-4">
              <Field label="Название"><input className={inputCls} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Телефон"><input className={inputCls} placeholder="+7 800 000-00-00" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></Field>
              <Field label="Email"><input className={inputCls} placeholder="info@example.ru" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></Field>
              <Field label="Адрес"><input className={inputCls} placeholder="г. Сочи, ул. Горная, 12" value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} /></Field>
              <Field label="Режим работы"><input className={inputCls} value={draft.hours} onChange={e => setDraft({ ...draft, hours: e.target.value })} /></Field>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setCompany(draft); setEditing(false); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Сохранить</button>
                <button onClick={() => setEditing(false)} className="border border-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-foreground">Отмена</button>
              </div>
            </div>
          ) : (
            [{ icon: "Building2", label: "Компания", value: company.name }, { icon: "Phone", label: "Телефон", value: company.phone || "—" }, { icon: "Mail", label: "Email", value: company.email || "—" }, { icon: "MapPin", label: "Адрес", value: company.address || "—" }, { icon: "Clock", label: "Режим работы", value: company.hours }].map(item => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center"><Icon name={item.icon} size={16} className="text-muted-foreground" /></div>
                <div><div className="text-xs text-muted-foreground">{item.label}</div><div className="text-sm font-medium">{item.value}</div></div>
              </div>
            ))
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="font-semibold">Уведомления</h2>
          {[{ label: "SMS при бронировании", on: true }, { label: "Telegram при оплате", on: true }, { label: "Напоминание за 2 часа", on: false }, { label: "Отчёт в конце дня", on: true }].map(n => (
            <div key={n.label} className="flex items-center justify-between">
              <span className="text-sm">{n.label}</span>
              <div className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer ${n.on ? "bg-primary" : "bg-muted"}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${n.on ? "translate-x-4" : ""}`} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ГЛАВНЫЙ КОМПОНЕНТ ─────────────────────────────────────────

export default function Index() {
  const [active, setActive] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections: Record<Section, React.ReactNode> = {
    dashboard: <Dashboard />,
    clients: <Clients />,
    bookings: <Bookings />,
    quads: <Quads />,
    calendar: <CalendarView />,
    payments: <TransactionSection type="all" />,
    income: <TransactionSection type="income" />,
    expenses: <TransactionSection type="expense" />,
    reports: <Reports />,
    employees: <Employees />,
    contacts: <Contacts />,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:relative z-30 lg:z-auto h-full w-64 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`} style={{ background: "hsl(var(--sidebar-background))" }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center"><Icon name="Bike" size={18} className="text-white" /></div>
            <div>
              <div className="font-display font-semibold text-white text-sm leading-tight">BogatovTravel</div>
              <div className="text-[10px] opacity-50" style={{ color: "hsl(var(--sidebar-foreground))" }}>CRM · Прокат квадроциклов</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {navItems.map(item => (
            <div key={item.id} className={`sidebar-item ${active === item.id ? "active" : ""}`} style={active !== item.id ? { color: "hsl(var(--sidebar-foreground))" } : {}} onClick={() => { setActive(item.id); setSidebarOpen(false); }}>
              <Icon name={item.icon} size={18} /><span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="px-3 py-4" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
          <div className="sidebar-item" style={{ color: "hsl(var(--sidebar-foreground))" }}><Icon name="Settings" size={18} /><span className="text-sm">Настройки</span></div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden w-8 h-8 flex items-center justify-center text-muted-foreground" onClick={() => setSidebarOpen(true)}><Icon name="Menu" size={20} /></button>
            <div className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5 w-64">
              <Icon name="Search" size={16} className="text-muted-foreground" />
              <input type="text" placeholder="Поиск..." className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><Icon name="Bell" size={18} /></button>
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-sm font-bold text-primary cursor-pointer">БТ</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{sections[active]}</main>
      </div>
    </div>
  );
}