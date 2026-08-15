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
