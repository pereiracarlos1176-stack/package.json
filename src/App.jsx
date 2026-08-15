import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Car, Users, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, Gauge, Zap, Plus, X, Trash2, Pencil, Loader2, Receipt } from "lucide-react";
import { supabase } from "./supabaseClient";

const statusMeta = {
  active: { label: "Em serviço", color: "#00D9A3", dot: "#00D9A3" },
  charging: { label: "A carregar", color: "#E8A33D", dot: "#E8A33D" },
  maintenance: { label: "Manutenção", color: "#E85D5D", dot: "#E85D5D" },
};

const expenseCategoryMeta = {
  seguro: { label: "Seguro", color: "#8FB8E3" },
  manutencao: { label: "Manutenção", color: "#E8A33D" },
  carregamento: { label: "Carregamento", color: "#00D9A3" },
  outro: { label: "Outro", color: "#8A93A0" },
};

const NAV = [
  { id: "frota", label: "Frota", icon: Car },
  { id: "motoristas", label: "Motoristas", icon: Users },
  { id: "despesas", label: "Despesas", icon: Receipt },
  { id: "financeiro", label: "Financeiro", icon: TrendingUp },
];

function Sparkline({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - ((v - min) / (max - min || 1)) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-16">
      <polyline points={pts} fill="none" stroke="#00D9A3" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function BatteryBar({ soh }) {
  const color = soh >= 95 ? "#00D9A3" : soh >= 90 ? "#8FE3C4" : "#E8A33D";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-[#2A2F38] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${soh}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-[#8A93A0]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{soh}%</span>
    </div>
  );
}

function Plate({ plate }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded border border-[#3B4A5A] text-[#F2F3F0] text-xs tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {plate}
    </span>
  );
}

function IconBtn({ onClick, children, title }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 rounded-md hover:bg-[#232830] text-[#8A93A0] hover:text-[#F2F3F0] transition-colors">
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[#8A93A0]">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "bg-[#1D232C] border border-[#2A2F38] rounded-md px-3 py-2 text-sm text-[#F2F3F0] outline-none focus:border-[#00D9A3] transition-colors";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-[#181C22] border border-[#2A2F38] rounded-lg w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</div>
          <IconBtn onClick={onClose} title="Fechar"><X size={16} /></IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

function VehicleForm({ initial, drivers, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { plate: "", model: "", status: "active", soh: 100, km: 0, driver_id: "", platform: "" }
  );
  return (
    <div className="flex flex-col gap-3">
      <Field label="Matrícula">
        <input className={inputClass} value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} placeholder="AA-00-BB" />
      </Field>
      <Field label="Modelo">
        <input className={inputClass} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Tesla Model Y 2024" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Em serviço</option>
            <option value="charging">A carregar</option>
            <option value="maintenance">Manutenção</option>
          </select>
        </Field>
        <Field label="SOH bateria (%)">
          <input type="number" min="0" max="100" className={inputClass} value={form.soh} onChange={(e) => setForm({ ...form, soh: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quilómetros">
          <input type="number" min="0" className={inputClass} value={form.km} onChange={(e) => setForm({ ...form, km: Number(e.target.value) })} />
        </Field>
        <Field label="Plataforma">
          <input className={inputClass} value={form.platform || ""} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="Uber / Bolt" />
        </Field>
      </div>
      <Field label="Motorista atribuído">
        <select className={inputClass} value={form.driver_id || ""} onChange={(e) => setForm({ ...form, driver_id: e.target.value || null })}>
          <option value="">— Nenhum —</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="px-3 py-2 rounded-md text-sm text-[#8A93A0] hover:text-[#F2F3F0]">Cancelar</button>
        <button
          onClick={() => form.plate && form.model && onSave(form)}
          className="px-3 py-2 rounded-md text-sm font-medium"
          style={{ background: "#00D9A3", color: "#0B0D10" }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function DriverForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: "", week_trips: 0, week_earnings: 0, rating: 5.0 });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nome">
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do motorista" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Viagens (semana)">
          <input type="number" min="0" className={inputClass} value={form.week_trips} onChange={(e) => setForm({ ...form, week_trips: Number(e.target.value) })} />
        </Field>
        <Field label="Ganhos € (semana)">
          <input type="number" min="0" className={inputClass} value={form.week_earnings} onChange={(e) => setForm({ ...form, week_earnings: Number(e.target.value) })} />
        </Field>
        <Field label="Rating">
          <input type="number" min="0" max="5" step="0.01" className={inputClass} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="px-3 py-2 rounded-md text-sm text-[#8A93A0] hover:text-[#F2F3F0]">Cancelar</button>
        <button
          onClick={() => form.name && onSave(form)}
          className="px-3 py-2 rounded-md text-sm font-medium"
          style={{ background: "#00D9A3", color: "#0B0D10" }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function ExpenseForm({ initial, vehicles, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { category: "manutencao", description: "", amount: 0, vehicle_id: "", date: new Date().toISOString().slice(0, 10) }
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria">
          <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(expenseCategoryMeta).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor (€)">
          <input type="number" min="0" step="0.01" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Descrição">
        <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Revisão dos 20.000 km" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Viatura associada">
          <select className={inputClass} value={form.vehicle_id || ""} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value || null })}>
            <option value="">— Geral / frota —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate}</option>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="px-3 py-2 rounded-md text-sm text-[#8A93A0] hover:text-[#F2F3F0]">Cancelar</button>
        <button
          onClick={() => form.description && form.amount >= 0 && onSave(form)}
          className="px-3 py-2 rounded-md text-sm font-medium"
          style={{ background: "#00D9A3", color: "#0B0D10" }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("frota");
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicleModal, setVehicleModal] = useState(null);
  const [driverModal, setDriverModal] = useState(null);
  const [expenseModal, setExpenseModal] = useState(null);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [v, d, e] = await Promise.all([
        supabase.from("vehicles").select("*").order("created_at"),
        supabase.from("drivers").select("*").order("created_at"),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
      ]);
      if (v.error || d.error || e.error) throw v.error || d.error || e.error;
      setVehicles(v.data || []);
      setDrivers(d.data || []);
      setExpenses(e.data || []);
      setError("");
    } catch (err) {
      setError("Não foi possível ligar à base de dados. Verifica as variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveVehicle = async (form) => {
    const { error: err } = form.id
      ? await supabase.from("vehicles").update(form).eq("id", form.id)
      : await supabase.from("vehicles").insert(form);
    if (err) setError("Falha ao guardar viatura.");
    else {
      setVehicleModal(null);
      loadAll();
    }
  };

  const deleteVehicle = async (id) => {
    const { error: err } = await supabase.from("vehicles").delete().eq("id", id);
    if (err) setError("Falha ao remover viatura.");
    else loadAll();
  };

  const saveDriver = async (form) => {
    const { error: err } = form.id
      ? await supabase.from("drivers").update(form).eq("id", form.id)
      : await supabase.from("drivers").insert(form);
    if (err) setError("Falha ao guardar motorista.");
    else {
      setDriverModal(null);
      loadAll();
    }
  };

  const deleteDriver = async (id) => {
    const { error: err } = await supabase.from("drivers").delete().eq("id", id);
    if (err) setError("Falha ao remover motorista.");
    else loadAll();
  };

  const saveExpense = async (form) => {
    const { error: err } = form.id
      ? await supabase.from("expenses").update(form).eq("id", form.id)
      : await supabase.from("expenses").insert(form);
    if (err) setError("Falha ao guardar despesa.");
    else {
      setExpenseModal(null);
      loadAll();
    }
  };

  const deleteExpense = async (id) => {
    const { error: err } = await supabase.from("expenses").delete().eq("id", id);
    if (err) setError("Falha ao remover despesa.");
    else loadAll();
  };

  const driverName = (id) => drivers.find((d) => d.id === id)?.name || "—";
  const vehiclePlate = (id) => vehicles.find((v) => v.id === id)?.plate || null;

  const totals = useMemo(() => {
    const activeCount = vehicles.filter((v) => v.status === "active").length;
    const weekTotal = drivers.reduce((s, d) => s + Number(d.week_earnings || 0), 0);
    const avgSoh = vehicles.length ? Math.round(vehicles.reduce((s, v) => s + (v.soh || 0), 0) / vehicles.length) : 0;
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const net = weekTotal - expenseTotal;
    return { activeCount, weekTotal, avgSoh, expenseTotal, net };
  }, [vehicles, drivers, expenses]);

  const weeklySeries = useMemo(() => {
    const base = totals.weekTotal || 1000;
    return [0.7, 0.78, 0.88, 0.83, 0.95, 0.9, 1.0, 1].map((f) => Math.round(base * f * 0.85 + base * 0.15));
  }, [totals.weekTotal]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#14171C", color: "#8A93A0" }}>
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#14171C", color: "#F2F3F0", fontFamily: "'Inter', sans-serif" }}>
      <aside className="w-56 shrink-0 border-r border-[#232830] flex flex-col py-6 px-4">
        <div className="mb-8 px-2">
          <div className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>FrotaUber</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5">Certezoscilante Unipessoal</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const isActive = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left"
                style={{ background: isActive ? "#1D232C" : "transparent", color: isActive ? "#F2F3F0" : "#8A93A0" }}
              >
                <Icon size={16} strokeWidth={2} />
                {n.label}
                {isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto px-3 py-3 rounded-md border border-[#232830]">
          <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
            <Zap size={12} style={{ color: "#00D9A3" }} />
            Frota 100% elétrica
          </div>
        </div>
      </aside>

      <main className="flex-1 px-8 py-6 max-w-6xl">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {tab === "frota" && "Estado da frota"}
              {tab === "motoristas" && "Motoristas"}
              {tab === "despesas" && "Despesas"}
              {tab === "financeiro" && "Financeiro — semana atual"}
            </h1>
            <p className="text-sm text-[#6B7280] mt-1">Dados guardados na base de dados — acessíveis de qualquer dispositivo</p>
          </div>
          {tab === "frota" && (
            <button onClick={() => setVehicleModal("new")} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium" style={{ background: "#00D9A3", color: "#0B0D10" }}>
              <Plus size={15} /> Viatura
            </button>
          )}
          {tab === "motoristas" && (
            <button onClick={() => setDriverModal("new")} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium" style={{ background: "#00D9A3", color: "#0B0D10" }}>
              <Plus size={15} /> Motorista
            </button>
          )}
          {tab === "despesas" && (
            <button onClick={() => setExpenseModal("new")} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium" style={{ background: "#00D9A3", color: "#0B0D10" }}>
              <Plus size={15} /> Despesa
            </button>
          )}
        </header>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-xs text-[#E8A33D] bg-[#1D232C] border border-[#2A2F38] rounded-md px-3 py-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-[#232830] p-4">
            <div className="flex items-center gap-2 text-[#8A93A0] text-xs mb-2"><CheckCircle2 size={14} /> Viaturas ativas</div>
            <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{totals.activeCount}/{vehicles.length}</div>
          </div>
          <div className="rounded-lg border border-[#232830] p-4">
            <div className="flex items-center gap-2 text-[#8A93A0] text-xs mb-2"><Gauge size={14} /> SOH médio da bateria</div>
            <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{totals.avgSoh}%</div>
          </div>
          <div className="rounded-lg border border-[#232830] p-4">
            <div className="flex items-center gap-2 text-[#8A93A0] text-xs mb-2"><TrendingUp size={14} /> Faturação semanal</div>
            <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>€{totals.weekTotal.toLocaleString("pt-PT")}</div>
            <Sparkline data={weeklySeries} />
          </div>
          <div className="rounded-lg border border-[#232830] p-4">
            <div className="flex items-center gap-2 text-[#8A93A0] text-xs mb-2"><Receipt size={14} /> Lucro líquido (semana)</div>
            <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif", color: totals.net >= 0 ? "#00D9A3" : "#E85D5D" }}>
              €{totals.net.toLocaleString("pt-PT")}
            </div>
            <div className="text-[11px] text-[#6B7280] mt-1">despesas: €{totals.expenseTotal.toLocaleString("pt-PT")}</div>
          </div>
        </div>

        {tab === "frota" && (
          <div className="rounded-lg border border-[#232830] overflow-hidden">
            {vehicles.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6B7280]">Sem viaturas. Adiciona a primeira.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#6B7280] text-xs border-b border-[#232830]">
                    <th className="px-4 py-3 font-medium">Matrícula</th>
                    <th className="px-4 py-3 font-medium">Modelo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Bateria</th>
                    <th className="px-4 py-3 font-medium">Km</th>
                    <th className="px-4 py-3 font-medium">Motorista</th>
                    <th className="px-4 py-3 font-medium">Plataforma</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => {
                    const meta = statusMeta[v.status] || statusMeta.active;
                    return (
                      <tr key={v.id} className="border-b border-[#1D232C] last:border-0 group">
                        <td className="px-4 py-3"><Plate plate={v.plate} /></td>
                        <td className="px-4 py-3 text-[#D6D9DE]">{v.model}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: meta.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3"><BatteryBar soh={v.soh} /></td>
                        <td className="px-4 py-3 text-[#8A93A0] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{Number(v.km).toLocaleString("pt-PT")}</td>
                        <td className="px-4 py-3 text-[#D6D9DE]">{driverName(v.driver_id)}</td>
                        <td className="px-4 py-3 text-[#6B7280]">{v.platform || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <IconBtn onClick={() => setVehicleModal(v)} title="Editar"><Pencil size={14} /></IconBtn>
                            <IconBtn onClick={() => deleteVehicle(v.id)} title="Remover"><Trash2 size={14} /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "motoristas" && (
          <div className="grid grid-cols-2 gap-4">
            {drivers.length === 0 && (
              <div className="col-span-2 p-8 text-center text-sm text-[#6B7280] rounded-lg border border-[#232830]">Sem motoristas. Adiciona o primeiro.</div>
            )}
            {drivers.map((d) => {
              const v = vehicles.find((x) => x.driver_id === d.id);
              return (
                <div key={d.id} className="rounded-lg border border-[#232830] p-4 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{d.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8A93A0]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>★ {d.rating}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconBtn onClick={() => setDriverModal(d)} title="Editar"><Pencil size={14} /></IconBtn>
                        <IconBtn onClick={() => deleteDriver(d.id)} title="Remover"><Trash2 size={14} /></IconBtn>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">{v ? <Plate plate={v.plate} /> : <span className="text-xs text-[#6B7280]">Sem viatura atribuída</span>}</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[#6B7280] text-xs">Viagens (semana)</div>
                      <div className="tabular-nums">{d.week_trips}</div>
                    </div>
                    <div>
                      <div className="text-[#6B7280] text-xs">Ganhos (semana)</div>
                      <div className="tabular-nums" style={{ color: "#00D9A3" }}>€{Number(d.week_earnings).toLocaleString("pt-PT")}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "despesas" && (
          <div className="rounded-lg border border-[#232830] overflow-hidden">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6B7280]">Sem despesas registadas.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#6B7280] text-xs border-b border-[#232830]">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Viatura</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => {
                    const meta = expenseCategoryMeta[e.category] || expenseCategoryMeta.outro;
                    const plate = vehiclePlate(e.vehicle_id);
                    return (
                      <tr key={e.id} className="border-b border-[#1D232C] last:border-0 group">
                        <td className="px-4 py-3 text-[#8A93A0] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{e.date}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: meta.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#D6D9DE]">{e.description}</td>
                        <td className="px-4 py-3">{plate ? <Plate plate={plate} /> : <span className="text-[#6B7280] text-xs">Geral</span>}</td>
                        <td className="px-4 py-3 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>€{Number(e.amount).toLocaleString("pt-PT")}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <IconBtn onClick={() => setExpenseModal(e)} title="Editar"><Pencil size={14} /></IconBtn>
                            <IconBtn onClick={() => deleteExpense(e.id)} title="Remover"><Trash2 size={14} /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "financeiro" && (
          <div className="rounded-lg border border-[#232830] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[#8A93A0]">Faturação por motorista</div>
              <div className="text-xs text-[#6B7280]">Semana atual</div>
            </div>
            {drivers.length === 0 ? (
              <div className="text-sm text-[#6B7280]">Sem dados de motoristas ainda.</div>
            ) : (
              <div className="space-y-3">
                {drivers
                  .slice()
                  .sort((a, b) => b.week_earnings - a.week_earnings)
                  .map((d) => {
                    const pct = totals.weekTotal ? (d.week_earnings / totals.weekTotal) * 100 : 0;
                    return (
                      <div key={d.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{d.name}</span>
                          <span className="tabular-nums text-[#8A93A0]">€{d.week_earnings}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#1D232C] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#00D9A3" }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {vehicles.some((v) => v.status === "maintenance") && (
              <div className="mt-6 flex items-center gap-2 text-xs text-[#E8A33D] border-t border-[#232830] pt-4">
                <AlertTriangle size={14} />
                {vehicles.filter((v) => v.status === "maintenance").map((v) => v.plate).join(", ")} em manutenção
              </div>
            )}

            {expenses.length > 0 && (
              <div className="mt-6 border-t border-[#232830] pt-4">
                <div className="text-sm text-[#8A93A0] mb-3">Despesas por categoria</div>
                <div className="space-y-3">
                  {Object.entries(expenseCategoryMeta).map(([key, meta]) => {
                    const catTotal = expenses.filter((e) => e.category === key).reduce((s, e) => s + Number(e.amount), 0);
                    if (!catTotal) return null;
                    const pct = totals.expenseTotal ? (catTotal / totals.expenseTotal) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{meta.label}</span>
                          <span className="tabular-nums text-[#8A93A0]">€{catTotal.toLocaleString("pt-PT")}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#1D232C] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {vehicleModal && (
        <Modal title={vehicleModal === "new" ? "Nova viatura" : "Editar viatura"} onClose={() => setVehicleModal(null)}>
          <VehicleForm initial={vehicleModal === "new" ? null : vehicleModal} drivers={drivers} onSave={saveVehicle} onCancel={() => setVehicleModal(null)} />
        </Modal>
      )}
      {driverModal && (
        <Modal title={driverModal === "new" ? "Novo motorista" : "Editar motorista"} onClose={() => setDriverModal(null)}>
          <DriverForm initial={driverModal === "new" ? null : driverModal} onSave={saveDriver} onCancel={() => setDriverModal(null)} />
        </Modal>
      )}
      {expenseModal && (
        <Modal title={expenseModal === "new" ? "Nova despesa" : "Editar despesa"} onClose={() => setExpenseModal(null)}>
          <ExpenseForm initial={expenseModal === "new" ? null : expenseModal} vehicles={vehicles} onSave={saveExpense} onCancel={() => setExpenseModal(null)} />
        </Modal>
      )}
    </div>
  );
}
