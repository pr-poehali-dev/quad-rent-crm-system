import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api, ApiError } from "@/lib/api";

type Section =
  | "dashboard" | "clients" | "bookings" | "quads"
  | "payments" | "reports" | "expenses" | "income"
  | "calendar" | "employees" | "contacts" | "daily_reports";

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
  { id: "daily_reports", label: "Дневные отчёты", icon: "FileText" },
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl animate-fade-in"
        onMouseDown={e => e.stopPropagation()}
      >
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
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.dashboard().then(d => { setData(d); setLoading(false); }).catch((e) => {
      setError(e instanceof ApiError && e.status === 402
        ? 'Превышен лимит вычислений. Пополните баланс на poehali.dev'
        : 'Нет соединения с сервером');
      setLoading(false);
    });
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <Spinner />;
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
      <Icon name="WifiOff" size={32} className="text-muted-foreground" />
      <div className="text-muted-foreground text-sm">{error || 'Не удалось загрузить данные'}</div>
      <button onClick={load} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">Повторить</button>
    </div>
  );

  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const profit = (Number(data.month_income) || 0) - (Number(data.month_expense) || 0);

  const stats = [
    { label: "В аренде", value: String(data.rented_quads || 0), icon: "Bike", color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Броней сегодня", value: String(data.today_bookings || 0), icon: "Calendar", color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Доход за месяц", value: `₽ ${(Number(data.month_income) || 0).toLocaleString()}`, icon: "TrendingUp", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Доступно квадов", value: `${data.available_quads || 0} / ${data.total_quads || 0}`, icon: "CheckCircle", color: "text-violet-500", bg: "bg-violet-50" },
  ];

  return (
    <div className="animate-fade-in space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-semibold text-foreground">Дашборд</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{today}</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon name={s.icon} size={18} className={s.color} /></div>
            <div className="text-xl sm:text-2xl font-display font-semibold text-foreground">{s.value}</div>
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

const emptyClientForm = { full_name: "", phone: "", telegram: "", passport: "", notes: "", is_blacklisted: false, blacklist_reason: "" };

function Clients() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState(emptyClientForm);

  const load = useCallback(() => { setLoading(true); api.clients.list().then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditItem(null); setForm(emptyClientForm); setShowModal(true); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (c: any) => {
    setEditItem(c);
    setForm({ full_name: c.full_name || "", phone: c.phone || "", telegram: c.telegram || "", passport: c.passport || "", notes: c.notes || "", is_blacklisted: !!c.is_blacklisted, blacklist_reason: c.blacklist_reason || "" });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    if (editItem) {
      await api.clients.update(editItem.id, form);
    } else {
      await api.clients.create(form);
    }
    setSaving(false); setShowModal(false); setEditItem(null);
    setForm(emptyClientForm);
    load();
  };

  const remove = async (id: number) => { await api.clients.remove(id); setDeleteId(null); load(); };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in space-y-6">
      {showModal && (
        <Modal title={editItem ? "Редактировать клиента" : "Новый клиент"} onClose={() => { setShowModal(false); setEditItem(null); }} onSubmit={save} loading={saving}>
          <Field label="Имя и фамилия *"><input className={inputCls} placeholder="Алексей Морозов" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Телефон"><input className={inputCls} placeholder="+7 900 000-00-00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Telegram"><input className={inputCls} placeholder="@username" value={form.telegram} onChange={e => setForm({ ...form, telegram: e.target.value })} /></Field>
          <Field label="Паспорт / документ"><input className={inputCls} placeholder="4520 123456" value={form.passport} onChange={e => setForm({ ...form, passport: e.target.value })} /></Field>
          <Field label="Заметки"><textarea className={inputCls} rows={2} placeholder="VIP, постоянный клиент..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <input type="checkbox" id="blacklist" checked={form.is_blacklisted} onChange={e => setForm({ ...form, is_blacklisted: e.target.checked })} className="w-4 h-4 accent-red-600" />
            <label htmlFor="blacklist" className="text-sm font-medium text-foreground cursor-pointer select-none">Чёрный список</label>
          </div>
          {form.is_blacklisted && <Field label="Причина блокировки"><input className={inputCls} placeholder="Причина..." value={form.blacklist_reason} onChange={e => setForm({ ...form, blacklist_reason: e.target.value })} /></Field>}
        </Modal>
      )}
      {deleteId !== null && <ConfirmDelete text="Клиент будет удалён из базы" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-display font-semibold">Клиенты</h1><p className="text-muted-foreground text-sm mt-1">{items.length} клиентов в базе</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"><Icon name="Plus" size={16} /><span className="hidden sm:inline">Добавить клиента</span><span className="sm:hidden">Добавить</span></button>
      </div>

      {!items.length ? <Empty icon="Users" text="Клиентов пока нет" action="Добавить клиента" onAction={openAdd} /> : (
        <>
          {/* Карточки на мобиле */}
          <div className="flex flex-col gap-3 sm:hidden">
            {items.map(c => {
              const initials = c.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              const status = c.is_blacklisted ? "blacklisted" : Number(c.trips_count) > 5 ? "vip" : Number(c.trips_count) === 0 ? "new" : "active";
              return (
                <div key={c.id} className={`bg-card rounded-2xl border border-border p-4 ${c.is_blacklisted ? "border-red-200 bg-red-50/30" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-foreground truncate">{c.full_name}</div>
                        <StatusBadge status={status} />
                      </div>
                      {c.phone && <div className="text-sm text-muted-foreground mt-0.5">{c.phone}</div>}
                      {c.telegram && <div className="text-xs text-muted-foreground">{c.telegram}</div>}
                      {c.notes && <div className="text-xs text-muted-foreground mt-1 italic">{c.notes}</div>}
                      {c.is_blacklisted && <div className="text-xs text-red-600 font-medium mt-1">⛔ Чёрный список{c.blacklist_reason ? `: ${c.blacklist_reason}` : ""}</div>}
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">{c.trips_count} поездок</span>
                        <span className="text-xs font-semibold text-foreground">₽ {Number(c.total_spent).toLocaleString()}</span>
                        {c.passport && <span className="text-xs text-muted-foreground truncate">📄 {c.passport}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(c)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Icon name="Pencil" size={14} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Таблица на десктопе */}
          <div className="hidden sm:block bg-card rounded-2xl border border-border overflow-hidden">
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
                        <div><span className="text-sm font-medium">{c.full_name}</span>{c.is_blacklisted && <div className="text-[10px] text-red-600 font-medium">Чёрный список{c.blacklist_reason ? `: ${c.blacklist_reason}` : ""}</div>}{c.notes && <div className="text-[10px] text-muted-foreground">{c.notes}</div>}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{c.phone || "—"}</td>
                    <td className="px-6 py-4 text-sm">{c.trips_count}</td>
                    <td className="px-6 py-4 text-sm font-medium">₽ {Number(c.total_spent).toLocaleString()}</td>
                    <td className="px-6 py-4"><StatusBadge status={c.is_blacklisted ? "blacklisted" : Number(c.trips_count) > 5 ? "vip" : Number(c.trips_count) === 0 ? "new" : "active"} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Icon name="Pencil" size={13} /></button>
                        <button onClick={() => setDeleteId(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── КВАДРОЦИКЛЫ ───────────────────────────────────────────────

const emptyQuadForm = { name: "", model: "", year: "", power: "", hourly_rate: "1800", status: "available", mileage: "0", last_service_date: "", notes: "", location: "" };

function Quads() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editItem, setEditItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyQuadForm);

  const load = useCallback(() => { setLoading(true); api.quads.list().then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditItem(null); setForm(emptyQuadForm); setShowModal(true); };
  const openEdit = (q: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setEditItem(q);
    setForm({
      name: q.name || "",
      model: q.model || "",
      year: q.year ? String(q.year) : "",
      power: q.power || "",
      hourly_rate: String(q.hourly_rate || 1800),
      status: q.status || "available",
      mileage: String(q.mileage || 0),
      last_service_date: q.last_service_date ? q.last_service_date.slice(0, 10) : "",
      notes: q.notes || "",
      location: q.location || "",
    });
    setShowModal(true);
  };

  const changeStatus = async (id: number, status: string) => { await api.quads.update(id, { status }); load(); };
  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = { ...form, year: Number(form.year) || null, hourly_rate: Number(form.hourly_rate) || 1800, mileage: Number(form.mileage) || 0 };
    if (editItem) {
      await api.quads.update(editItem.id, data);
    } else {
      await api.quads.create(data);
    }
    setSaving(false); setShowModal(false); setEditItem(null);
    setForm(emptyQuadForm);
    load();
  };
  const remove = async (id: number) => { await api.quads.remove(id); setDeleteId(null); load(); };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in space-y-6">
      {showModal && (
        <Modal title={editItem ? "Редактировать квадроцикл" : "Добавить квадроцикл"} onClose={() => { setShowModal(false); setEditItem(null); }} onSubmit={save} loading={saving}>
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
          <Field label="Точка (локация)"><input className={inputCls} placeholder="Точка 1, Центр, Набережная..." value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Заметки"><textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {deleteId !== null && <ConfirmDelete text="Квадроцикл будет удалён из парка" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-display font-semibold">Квадроциклы</h1><p className="text-muted-foreground text-sm mt-1">{items.length} единиц техники</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"><Icon name="Plus" size={16} /><span className="hidden sm:inline">Добавить технику</span><span className="sm:hidden">Добавить</span></button>
      </div>

      {!items.length ? <Empty icon="Bike" text="Техника не добавлена" action="Добавить квадроцикл" onAction={openAdd} /> : (
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
                  <button onClick={() => openEdit(q)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Icon name="Pencil" size={13} /></button>
                  <button onClick={() => setDeleteId(q.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={13} /></button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
                <span className="flex items-center gap-1"><Icon name="Gauge" size={12} /> {q.mileage} км</span>
                {q.last_service_date && <span>· ТО: {new Date(q.last_service_date).toLocaleDateString("ru-RU")}</span>}
              </div>
              {q.location && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Icon name="MapPin" size={11} />{q.location}</div>}
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
  const [form, setForm] = useState({ quad_id: "", client_id: "", start_time: "", duration_hours: "2", amount: "", deposit: "0", payment_method: "cash", status: "pending", notes: "", point: "" });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.bookings.list(), api.quads.list(), api.clients.list()]).then(([b, q, c]) => { setItems(b); setQuadsList(q); setClientsList(c); setLoading(false); }).catch(() => setLoading(false));
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
    setForm({ quad_id: "", client_id: "", start_time: "", duration_hours: "2", amount: "", deposit: "0", payment_method: "cash", status: "pending", notes: "", point: "" });
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Точка">
              <select className={selectCls} value={form.point} onChange={e => setForm({ ...form, point: e.target.value })}>
                <option value="">— Не указана —</option>
                <option value="Находка">Находка</option>
                <option value="Волчанец">Волчанец</option>
                <option value="Другая">Другая</option>
              </select>
            </Field>
            <Field label="Статус">
              <select className={selectCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Ожидание</option><option value="confirmed">Подтверждено</option><option value="issued">Выдан</option>
              </select>
            </Field>
          </div>
          <Field label="Заметки"><textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {deleteId !== null && <ConfirmDelete text="Бронирование и связанные транзакции будут удалены" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-display font-semibold">Бронирования</h1><p className="text-muted-foreground text-sm mt-1">{active} активных · {items.length} всего</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"><Icon name="Plus" size={16} /><span className="hidden sm:inline">Новое бронирование</span><span className="sm:hidden">Создать</span></button>
      </div>

      {!items.length ? <Empty icon="ClipboardList" text="Бронирований нет" action="Создать бронирование" onAction={() => setShowModal(true)} /> : (
        <>
          {/* Карточки на мобиле */}
          <div className="flex flex-col gap-3 sm:hidden">
            {items.map(b => (
              <div key={b.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-foreground">{b.client_name || "—"}</div>
                    <div className="text-sm text-muted-foreground">{b.quad_name}</div>
                    {b.point && <div className="text-xs text-muted-foreground mt-0.5">📍 {b.point}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={b.status} />
                    <button onClick={() => setDeleteId(b.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={13} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>{new Date(b.start_time).toLocaleDateString("ru-RU")} · {b.duration_hours} ч</div>
                  </div>
                  <div className="text-sm font-bold text-foreground">₽ {Number(b.amount).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {b.status === "pending" && <button onClick={() => changeStatus(b.id, "confirmed")} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-200 font-medium">Подтвердить</button>}
                  {b.status === "confirmed" && <button onClick={() => changeStatus(b.id, "issued")} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-xl hover:bg-orange-200 font-medium">Выдать</button>}
                  {b.status === "issued" && <button onClick={() => changeStatus(b.id, "returned")} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-emerald-200 font-medium">Принять</button>}
                  {["pending", "confirmed"].includes(b.status) && <button onClick={() => changeStatus(b.id, "cancelled")} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-xl hover:bg-red-200 font-medium">Отмена</button>}
                </div>
              </div>
            ))}
          </div>
          {/* Таблица на десктопе */}
          <div className="hidden sm:block bg-card rounded-2xl border border-border overflow-hidden">
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
        </>
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
    setLoading(true);
    const params = type !== "all" ? { type } : undefined;
    api.transactions.list(params).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
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

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.items?.length || 0} записей{total !== undefined ? ` · ₽ ${Number(total).toLocaleString()}` : ""}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"><Icon name="Plus" size={16} /><span className="hidden sm:inline">{addLabel}</span><span className="sm:hidden">Добавить</span></button>
      </div>

      {isAll && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="stat-card"><div className="text-xs text-muted-foreground mb-1">Доходы</div><div className="text-lg sm:text-2xl font-display font-semibold text-emerald-600">₽ {Number(data.totals?.total_income || 0).toLocaleString()}</div></div>
          <div className="stat-card"><div className="text-xs text-muted-foreground mb-1">Расходы</div><div className="text-lg sm:text-2xl font-display font-semibold text-red-500">₽ {Number(data.totals?.total_expense || 0).toLocaleString()}</div></div>
          <div className="stat-card"><div className="text-xs text-muted-foreground mb-1">Прибыль</div><div className={`text-lg sm:text-2xl font-display font-semibold ${Number(data.totals?.profit) >= 0 ? "text-foreground" : "text-red-500"}`}>₽ {Number(data.totals?.profit || 0).toLocaleString()}</div></div>
        </div>
      )}

      {!(data.items?.length) ? <Empty icon={type === "income" ? "TrendingUp" : "TrendingDown"} text="Записей нет" action={addLabel} onAction={() => setShowModal(true)} /> : (
        <>
          {/* Карточки на мобиле */}
          <div className="flex flex-col gap-2 sm:hidden">
            {(data.items || []).map((t: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <div key={t.id} className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{t.category}</span>
                    {isAll && <StatusBadge status={t.type} />}
                  </div>
                  {t.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</div>}
                  <div className="text-xs text-muted-foreground mt-0.5">{t.transaction_date}</div>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${t.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                  {t.type === "income" ? "+" : "−"}₽ {Number(t.amount).toLocaleString()}
                </div>
                <button onClick={() => setDeleteId(t.id)} className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="Trash2" size={13} /></button>
              </div>
            ))}
            {!isAll && (
              <div className="bg-muted/50 rounded-2xl border border-border px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Итого</span>
                <span className={`text-sm font-bold ${type === "income" ? "text-emerald-600" : "text-red-500"}`}>₽ {Number(total || 0).toLocaleString()}</span>
              </div>
            )}
          </div>
          {/* Таблица на десктопе */}
          <div className="hidden sm:block bg-card rounded-2xl border border-border overflow-hidden">
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
        </>
      )}
    </div>
  );
}

// ── ОТЧЁТЫ ────────────────────────────────────────────────────

function Reports() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.reports().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
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
  const pointStats = (data.point_stats || []) as { point: string; reports_count: number; total_cash: number; total_remainder: number; avg_cash: number }[];
  const pointTotals = data.point_totals || {};

  const expColors = ["#f87171", "#fb923c", "#fbbf24", "#a78bfa", "#60a5fa", "#34d399", "#f472b6", "#94a3b8"];
  const incColors = ["#34d399", "#60a5fa", "#a78bfa", "#fbbf24", "#fb923c", "#f87171", "#f472b6", "#94a3b8"];

  const donutExpense = expCats.slice(0, 8).map((e, i) => ({ label: e.category, value: Number(e.total), color: expColors[i % expColors.length] }));
  const donutIncome = incCats.slice(0, 8).map((e, i) => ({ label: e.category, value: Number(e.total), color: incColors[i % incColors.length] }));

  const totalProfit = Number(totals.total_profit || 0);
  const monthProfit = Number(monthT.month_profit || 0);
  const fmtM = (n: number) => `₽ ${Number(n).toLocaleString("ru-RU")}`;

  const pointColors: Record<string, { bg: string; border: string; text: string; bar: string }> = {
    "Находка": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", bar: "#60a5fa" },
    "Волчанец": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "#34d399" },
    "Другая": { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", bar: "#a78bfa" },
  };
  const defaultColor = { bg: "bg-muted", border: "border-border", text: "text-foreground", bar: "#94a3b8" };

  return (
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-xl sm:text-2xl font-display font-semibold">Отчёты</h1><p className="text-muted-foreground text-sm mt-1">Аналитика по реальным данным</p></div>

      {/* KPI транзакций */}
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

      {/* ── СТАТИСТИКА ПО ТОЧКАМ ── */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Статистика по точкам</h2>

        {/* Общая сводка */}
        {Number(pointTotals.grand_reports_count) > 0 && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <div className="stat-card">
              <div className="text-xs text-muted-foreground mb-1">Общая касса (все точки)</div>
              <div className="text-2xl font-display font-semibold text-foreground">{fmtM(Number(pointTotals.grand_total_cash))}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs text-muted-foreground mb-1">Общий остаток</div>
              <div className={`text-2xl font-display font-semibold ${Number(pointTotals.grand_total_remainder) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtM(Number(pointTotals.grand_total_remainder))}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs text-muted-foreground mb-1">Всего рабочих дней</div>
              <div className="text-2xl font-display font-semibold text-foreground">{Number(pointTotals.grand_reports_count)}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs text-muted-foreground mb-1">Средняя касса в день</div>
              <div className="text-2xl font-display font-semibold text-foreground">{fmtM(Math.round(Number(pointTotals.grand_avg_cash)))}</div>
            </div>
          </div>
        )}

        {/* Карточки по точкам */}
        {!pointStats.length ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <Icon name="MapPin" size={36} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Нет данных — заполни дневные отчёты</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {pointStats.map(p => {
              const col = pointColors[p.point] || defaultColor;
              const maxCash = Math.max(...pointStats.map(x => Number(x.total_cash)), 1);
              const pct = (Number(p.total_cash) / maxCash) * 100;
              return (
                <div key={p.point} className={`bg-card rounded-2xl border ${col.border} p-5 space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full`} style={{ background: col.bar }} />
                      <span className={`font-semibold text-lg ${col.text}`}>{p.point}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{p.reports_count} дней</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`${col.bg} rounded-xl p-3`}>
                      <div className="text-xs text-muted-foreground mb-0.5">Касса всего</div>
                      <div className="font-semibold text-foreground">{fmtM(Number(p.total_cash))}</div>
                    </div>
                    <div className={`${col.bg} rounded-xl p-3`}>
                      <div className="text-xs text-muted-foreground mb-0.5">Остаток всего</div>
                      <div className={`font-semibold ${Number(p.total_remainder) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtM(Number(p.total_remainder))}</div>
                    </div>
                    <div className={`${col.bg} rounded-xl p-3`}>
                      <div className="text-xs text-muted-foreground mb-0.5">Средняя касса</div>
                      <div className="font-semibold text-foreground">{fmtM(Math.round(Number(p.avg_cash)))}</div>
                    </div>
                    <div className={`${col.bg} rounded-xl p-3`}>
                      <div className="text-xs text-muted-foreground mb-0.5">Доля кассы</div>
                      <div className="font-semibold text-foreground">{Math.round(pct)}%</div>
                    </div>
                  </div>
                  <div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col.bar }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

      {/* Распределение бюджета */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <BudgetDistribution />
      </div>
    </div>
  );
}

// ── РАСПРЕДЕЛЕНИЕ БЮДЖЕТА ──────────────────────────────────────

const BUDGET_CRITERIA = [
  { key: "amortization", label: "Амортизация", pct: 10, color: "#f87171" },
  { key: "salary",       label: "Зарплата",    pct: 15, color: "#fb923c" },
  { key: "advertising",  label: "Реклама",     pct: 10, color: "#fbbf24" },
  { key: "reserve",      label: "Резерв",      pct: 15, color: "#a78bfa" },
  { key: "remainder",    label: "Остаток",     pct: 50, color: "#34d399" },
];

const POINTS = ["Волчанец", "Находка"];

const POINT_COLORS: Record<string, { border: string; text: string; accent: string }> = {
  "Волчанец": { border: "border-emerald-200", text: "text-emerald-700", accent: "#34d399" },
  "Находка":  { border: "border-blue-200",    text: "text-blue-700",    accent: "#60a5fa" },
};

function BudgetDistribution() {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [cash, setCash] = useState<Record<string, string>>({ "Волчанец": "", "Находка": "" });
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);

  const load = () => api.budget.list().then(d => setItems(d.items || []));
  useEffect(() => { load(); }, []);

  const handleSave = async (point: string) => {
    const val = parseFloat(cash[point]);
    if (!val || val <= 0) return;
    setSaving(true);
    await api.budget.create({ point, date, daily_cash: val });
    setCash(prev => ({ ...prev, [point]: "" }));
    await load();
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    await api.budget.remove(id);
    await load();
  };

  const fmtM = (n: number) => `₽ ${Number(n).toLocaleString("ru-RU")}`;

  // Сводка по всем записям
  const totals = BUDGET_CRITERIA.reduce((acc, c) => {
    acc[c.key] = items.reduce((s, r) => s + Number(r[c.key] || 0), 0);
    return acc;
  }, {} as Record<string, number>);
  const grandCash = items.reduce((s, r) => s + Number(r.daily_cash || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Распределение бюджета</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Введи дневную кассу — деньги распределятся автоматически</p>
      </div>

      {/* Ввод кассы */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {POINTS.map(point => {
          const col = POINT_COLORS[point];
          const preview = parseFloat(cash[point]) || 0;
          return (
            <div key={point} className={`bg-card rounded-2xl border ${col.border} p-5 space-y-4`}>
              <div className={`font-semibold text-base ${col.text}`}>{point}</div>

              <div className="flex gap-2">
                <input
                  type="date"
                  className={inputCls + " w-36"}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                <input
                  className={inputCls + " flex-1"}
                  type="number"
                  placeholder="Дневная касса, ₽"
                  value={cash[point]}
                  onChange={e => setCash(prev => ({ ...prev, [point]: e.target.value }))}
                />
                <button
                  disabled={saving || !cash[point]}
                  onClick={() => handleSave(point)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
                >
                  Добавить
                </button>
              </div>

              {/* Превью расчёта */}
              {preview > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BUDGET_CRITERIA.map(c => (
                    <div key={c.key} className="bg-muted/50 rounded-xl p-2.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        <span className="text-xs text-muted-foreground">{c.label} {c.pct}%</span>
                      </div>
                      <div className="font-semibold text-sm">{fmtM(Math.round(preview * c.pct / 100))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Сводная таблица */}
      {grandCash > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold">Итого по всем точкам</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="bg-muted/40 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="text-xs text-muted-foreground mb-0.5">Общая касса</div>
              <div className="font-semibold">{fmtM(grandCash)}</div>
            </div>
            {BUDGET_CRITERIA.map(c => (
              <div key={c.key} className="bg-muted/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
                <div className="font-semibold">{fmtM(Math.round(totals[c.key]))}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* История записей */}
      {items.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold text-sm">История распределений</div>
          <div className="divide-y divide-border">
            {items.map((r: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              const col = POINT_COLORS[r.point] || { border: "border-border", text: "text-foreground", accent: "#94a3b8" };
              return (
                <div key={r.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-semibold ${col.text}`}>{r.point}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString("ru-RU")}</span>
                        <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">Касса: {fmtM(Number(r.daily_cash))}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {BUDGET_CRITERIA.map(c => (
                          <span key={c.key} className="text-xs text-muted-foreground">
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: c.color, verticalAlign: "middle" }} />
                            {c.label}: {fmtM(Number(r[c.key]))}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                    >
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!items.length && (
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <Icon name="PieChart" size={36} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Введи дневную кассу выше — появится первая запись</p>
        </div>
      )}
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

// ── ДНЕВНЫЕ ОТЧЁТЫ ────────────────────────────────────────────

interface TourRow { title: string; quads_info: string; amount: string; }
interface ExpRow { title: string; amount: string; }

const emptyTour = (): TourRow => ({ title: "", quads_info: "", amount: "" });
const emptyExp = (): ExpRow => ({ title: "", amount: "" });

function DailyReports() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [viewReport, setViewReport] = useState<any | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [point, setPoint] = useState("Находка");
  const [totalCash, setTotalCash] = useState("");
  const [notes, setNotes] = useState("");
  const [tours, setTours] = useState<TourRow[]>([emptyTour()]);
  const [exps, setExps] = useState<ExpRow[]>([emptyExp()]);

  const load = useCallback(() => {
    setLoading(true);
    api.daily_reports.list().then(d => { setReports(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toursTotal = tours.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const expsTotal = exps.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const remainder = toursTotal - expsTotal;

  const openForm = () => {
    setDate(today); setPoint("Находка"); setTotalCash(""); setNotes("");
    setTours([emptyTour()]); setExps([emptyExp()]);
    setShowForm(true);
  };

  const save = async () => {
    if (!point.trim()) return;
    setSaving(true);
    await api.daily_reports.create({
      report_date: date,
      point,
      total_cash: parseFloat(totalCash) || toursTotal,
      remainder,
      notes,
      tours: tours.filter(t => t.title.trim()).map(t => ({ ...t, amount: parseFloat(t.amount) || 0 })),
      expenses: exps.filter(e => e.title.trim()).map(e => ({ ...e, amount: parseFloat(e.amount) || 0 })),
    });
    setSaving(false); setShowForm(false); load();
  };

  const remove = async (id: number) => {
    await api.daily_reports.remove(id); setDeleteId(null); load();
  };

  const setTour = (i: number, field: keyof TourRow, val: string) =>
    setTours(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  const setExp = (i: number, field: keyof ExpRow, val: string) =>
    setExps(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString("ru-RU"); } catch { return s; } };
  const fmtMoney = (n: number) => `${Number(n).toLocaleString("ru-RU")} ₽`;

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Форма создания */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
              <h2 className="font-display font-semibold text-foreground">Новый дневной отчёт</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Icon name="X" size={16} /></button>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* Шапка */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Дата</label>
                  <input className={inputCls} type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Точка</label>
                  <select className={selectCls} value={point} onChange={e => setPoint(e.target.value)}>
                    <option>Находка</option>
                    <option>Волчанец</option>
                    <option>Другая</option>
                  </select>
                </div>
              </div>

              {/* Туры */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Туры</span>
                  <button onClick={() => setTours(p => [...p, emptyTour()])} className="text-xs text-primary hover:underline flex items-center gap-1"><Icon name="Plus" size={12} /> Добавить тур</button>
                </div>
                <div className="space-y-2">
                  {tours.map((t, i) => (
                    <div key={i} className="flex gap-2 items-start bg-muted/40 rounded-xl p-3">
                      <div className="flex-1 space-y-2">
                        <input className={inputCls} placeholder="Название (напр: Тур 1 час)" value={t.title} onChange={e => setTour(i, 'title', e.target.value)} />
                        <div className="flex gap-2">
                          <input className={inputCls} placeholder="Техника (300/300/200)" value={t.quads_info} onChange={e => setTour(i, 'quads_info', e.target.value)} />
                          <input className={inputCls} type="number" placeholder="Сумма ₽" value={t.amount} onChange={e => setTour(i, 'amount', e.target.value)} style={{ width: 120 }} />
                        </div>
                      </div>
                      {tours.length > 1 && (
                        <button onClick={() => setTours(p => p.filter((_, idx) => idx !== i))} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1">
                          <Icon name="Trash2" size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm font-semibold text-emerald-600 mt-2">Итого туры: {fmtMoney(toursTotal)}</div>
              </div>

              {/* Расходы */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Расходы</span>
                  <button onClick={() => setExps(p => [...p, emptyExp()])} className="text-xs text-primary hover:underline flex items-center gap-1"><Icon name="Plus" size={12} /> Добавить расход</button>
                </div>
                <div className="space-y-2">
                  {exps.map((e, i) => (
                    <div key={i} className="flex gap-2 items-center bg-muted/40 rounded-xl px-3 py-2">
                      <input className={inputCls + " flex-1"} placeholder="Описание (напр: ЗП инструктор)" value={e.title} onChange={ev => setExp(i, 'title', ev.target.value)} />
                      <input className={inputCls} type="number" placeholder="Сумма ₽" value={e.amount} onChange={ev => setExp(i, 'amount', ev.target.value)} style={{ width: 120 }} />
                      {exps.length > 1 && (
                        <button onClick={() => setExps(p => p.filter((_, idx) => idx !== i))} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Icon name="Trash2" size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm font-semibold text-red-500 mt-2">Итого расходы: {fmtMoney(expsTotal)}</div>
              </div>

              {/* Заметки */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Заметки</label>
                <textarea className={inputCls} rows={2} placeholder="Дополнительно..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {/* Итог */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                <span className="font-semibold text-foreground">Остаток</span>
                <span className={`text-xl font-display font-bold ${remainder >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtMoney(remainder)}</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground">Отмена</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Сохранение..." : "Сохранить отчёт"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Просмотр отчёта */}
      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
              <div>
                <div className="font-display font-semibold text-foreground">Отчёт — {viewReport.point}</div>
                <div className="text-sm text-muted-foreground">{fmtDate(viewReport.report_date)}</div>
              </div>
              <button onClick={() => setViewReport(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Icon name="X" size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {viewReport.tours?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Туры</div>
                  {viewReport.tours.map((t: { id: number; title: string; quads_info: string; amount: number }) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <div className="text-sm font-medium">{t.title}</div>
                        {t.quads_info && <div className="text-xs text-muted-foreground">({t.quads_info})</div>}
                      </div>
                      <div className="text-sm font-semibold text-emerald-600">{fmtMoney(Number(t.amount))}</div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 text-sm font-semibold">
                    <span>Итого туры</span>
                    <span className="text-emerald-600">{fmtMoney(viewReport.tours.reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0))}</span>
                  </div>
                </div>
              )}
              {viewReport.expenses?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Расходы</div>
                  {viewReport.expenses.map((e: { id: number; title: string; amount: number }) => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="text-sm">{e.title}</div>
                      <div className="text-sm font-semibold text-red-500">{fmtMoney(Number(e.amount))}</div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 text-sm font-semibold">
                    <span>Итого расходы</span>
                    <span className="text-red-500">{fmtMoney(viewReport.expenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0))}</span>
                  </div>
                </div>
              )}
              {viewReport.notes && <div className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3">{viewReport.notes}</div>}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                <span className="font-semibold">Остаток</span>
                <span className={`text-xl font-display font-bold ${Number(viewReport.remainder) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtMoney(Number(viewReport.remainder))}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && <ConfirmDelete text="Отчёт будет удалён" onConfirm={() => remove(deleteId)} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-semibold">Дневные отчёты</h1>
          <p className="text-muted-foreground text-sm mt-1">{reports.length} отчётов</p>
        </div>
        <button onClick={openForm} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
          <Icon name="Plus" size={16} /><span className="hidden sm:inline">Новый отчёт</span><span className="sm:hidden">Создать</span>
        </button>
      </div>

      {!reports.length ? (
        <Empty icon="FileText" text="Отчётов пока нет" action="Создать первый отчёт" onAction={openForm} />
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="FileText" size={22} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{fmtDate(r.report_date)}</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">{r.point}</span>
                </div>
                <div className="flex gap-4 mt-1.5 text-sm">
                  <span className="text-emerald-600 font-medium">Касса: {fmtMoney(Number(r.total_cash))}</span>
                  <span className={`font-medium ${Number(r.remainder) >= 0 ? "text-foreground" : "text-red-500"}`}>Остаток: {fmtMoney(Number(r.remainder))}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={async () => { const d = await api.daily_reports.get(r.id); setViewReport(d); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Просмотр"
                >
                  <Icon name="Eye" size={15} />
                </button>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Удалить"
                >
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
    setLoading(true);
    api.employees.list().then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
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

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-semibold">Сотрудники</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} человек в команде</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
          <Icon name="Plus" size={16} /><span className="hidden sm:inline">Добавить сотрудника</span><span className="sm:hidden">Добавить</span>
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
    daily_reports: <DailyReports />,
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 sm:pb-6">{sections[active]}</main>
      </div>

      {/* Нижняя навигация — только мобиле */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around px-1 py-1 safe-area-pb">
        {[
          { id: "dashboard" as Section, label: "Дашборд", icon: "LayoutDashboard" },
          { id: "bookings" as Section, label: "Брони", icon: "ClipboardList" },
          { id: "daily_reports" as Section, label: "Отчёт", icon: "FileText" },
          { id: "clients" as Section, label: "Клиенты", icon: "Users" },
          { id: "quads" as Section, label: "Техника", icon: "Bike" },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl flex-1 transition-colors ${active === item.id ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
          >
            <Icon name={item.icon} size={20} />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl flex-1 transition-colors text-muted-foreground`}
        >
          <Icon name="Menu" size={20} />
          <span className="text-[10px] font-medium leading-tight">Ещё</span>
        </button>
      </nav>
    </div>
  );
}