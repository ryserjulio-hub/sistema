import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Activity, Database, Cpu, TrendingUp, PieChart as PieIcon, ShieldAlert,
  Workflow, Lock, ChevronRight, Menu, X, ArrowUp, ArrowDown, CheckCircle2,
  AlertTriangle, Circle, Radio,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  TOKENS                                                             */
/* ------------------------------------------------------------------ */
const COLORS = {
  void: "#050508",
  panel: "#0d0b1a",
  panelBorder: "#241f3d",
  purple: "#b14bff",
  purpleDim: "#6b3aa0",
  cyan: "#2ee6d6",
  magenta: "#ff3868",
  amber: "#ffb84d",
  ghost: "#dcd9f5",
  muted: "#726d95",
};

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                          */
/* ------------------------------------------------------------------ */
const composite = Array.from({ length: 24 }, (_, i) => ({
  t: `T-${23 - i}`,
  idx: 100 + Math.sin(i / 3) * 6 + i * 0.4 + (Math.random() - 0.5) * 2,
}));

const tickerData = [
  { label: "SELIC", value: "10,75%", delta: -0.25 },
  { label: "IPCA (12m)", value: "4,18%", delta: 0.12 },
  { label: "USD/BRL", value: "5,42", delta: 0.31 },
  { label: "IBOV", value: "138.240", delta: 1.02 },
  { label: "CDI", value: "10,65%", delta: -0.1 },
  { label: "DXY", value: "101,8", delta: -0.18 },
  { label: "VIX", value: "14,2", delta: -2.4 },
  { label: "PETR4", value: "38,91", delta: 0.87 },
];

const dataSources = [
  { name: "BACEN — SGS API", type: "Séries temporais", status: "online", lastSync: "há 2 min", volume: "1,4M linhas" },
  { name: "IBGE — SIDRA", type: "Indicadores estruturais", status: "online", lastSync: "há 11 min", volume: "820k linhas" },
  { name: "FRED", type: "Macro global", status: "online", lastSync: "há 4 min", volume: "2,1M linhas" },
  { name: "yfinance", type: "Mercado / preços", status: "degradado", lastSync: "há 38 min", volume: "6,7M linhas" },
  { name: "B3 — Dados de mercado", type: "Renda variável", status: "online", lastSync: "há 1 min", volume: "3,9M linhas" },
];

const ingestVolume = Array.from({ length: 12 }, (_, i) => ({
  t: `D-${11 - i}`,
  volume: 40 + Math.random() * 60,
}));

const models = [
  { name: "VAR(2) — Câmbio × Juros", type: "Vetor autorregressivo", r2: 0.87, aic: -412.3, status: "validado" },
  { name: "ARIMA(1,1,1) — IPCA", type: "Série temporal", r2: 0.79, aic: -298.1, status: "validado" },
  { name: "Regressão salarial (dummies)", type: "OLS + termos de interação", r2: 0.64, aic: 1042.5, status: "em revisão" },
  { name: "VECM — Paridade de juros", type: "Cointegração", r2: 0.71, aic: -187.6, status: "validado" },
];

const residuals = Array.from({ length: 20 }, (_, i) => ({
  t: i,
  res: (Math.random() - 0.5) * 2.4,
}));

const forecast = Array.from({ length: 14 }, (_, i) => {
  const base = 4.1 + i * 0.05 + Math.sin(i / 2) * 0.15;
  return {
    t: i < 6 ? `M-${6 - i}` : i === 6 ? "Atual" : `M+${i - 6}`,
    real: i <= 6 ? +base.toFixed(2) : null,
    previsto: i >= 6 ? +base.toFixed(2) : null,
    low: i >= 6 ? +(base - 0.4 - i * 0.03).toFixed(2) : null,
    high: i >= 6 ? +(base + 0.4 + i * 0.03).toFixed(2) : null,
  };
});

const allocation = [
  { name: "Renda Fixa Pós", value: 34 },
  { name: "Ações Brasil", value: 24 },
  { name: "Ações Global", value: 16 },
  { name: "Câmbio / Hedge", value: 12 },
  { name: "Multimercado", value: 9 },
  { name: "Caixa", value: 5 },
];
const ALLOC_COLORS = [COLORS.purple, COLORS.cyan, COLORS.amber, COLORS.magenta, COLORS.purpleDim, COLORS.muted];

const holdings = [
  { asset: "Tesouro Selic 2029", class: "Renda Fixa", weight: "18,2%", pl: 2.1 },
  { asset: "PETR4", class: "Ações BR", weight: "6,4%", pl: -1.3 },
  { asset: "VALE3", class: "Ações BR", weight: "5,1%", pl: 3.8 },
  { asset: "S&P 500 ETF", class: "Ações Global", weight: "9,7%", pl: 1.4 },
  { asset: "USD Futuro", class: "Câmbio", weight: "7,0%", pl: 0.6 },
];

const stress = [
  { scenario: "Choque cambial +15%", impact: -8.2 },
  { scenario: "Selic +200bps", impact: -4.6 },
  { scenario: "Crash equities -20%", impact: -11.4 },
  { scenario: "Liquidez sistêmica", impact: -6.1 },
];

const workflows = [
  { name: "Ingestão BACEN → Data Lake", trigger: "Cron 06:00", status: "ativo", lastRun: "há 3h", runs: 412 },
  { name: "Retreino VAR semanal", trigger: "Cron dom 23:00", status: "ativo", lastRun: "há 2d", runs: 51 },
  { name: "Alerta de risco → Slack", trigger: "Evento VaR", status: "ativo", lastRun: "há 14min", runs: 1203 },
  { name: "Sync portfólio → dashboard", trigger: "Cron 5min", status: "pausado", lastRun: "há 6h", runs: 9840 },
];

const auditLog = [
  { time: "23:41:02", actor: "svc-forecast-engine", action: "Leitura de modelo VAR(2)", level: "info" },
  { time: "23:38:17", actor: "julio.dev", action: "Login via SSO", level: "info" },
  { time: "23:12:55", actor: "svc-ingestion", action: "Falha de autenticação yfinance", level: "warn" },
  { time: "22:59:40", actor: "n8n-runner", action: "Workflow 'sync portfólio' pausado manualmente", level: "warn" },
  { time: "22:01:03", actor: "unknown-ip:187.44.x.x", action: "Tentativa de acesso à API negada", level: "critical" },
];

/* ------------------------------------------------------------------ */
/*  PRIMITIVES                                                         */
/* ------------------------------------------------------------------ */
function Panel({ title, eyebrow, right, children, className = "" }) {
  return (
    <div className={`panel ${className}`}>
      {(title || eyebrow) && (
        <div className="panel-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <div className="panel-title">{title}</div>}
          </div>
          {right}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}

function StatusDot({ status }) {
  const map = {
    online: COLORS.cyan,
    ativo: COLORS.cyan,
    validado: COLORS.cyan,
    degradado: COLORS.amber,
    pausado: COLORS.amber,
    "em revisão": COLORS.amber,
    offline: COLORS.magenta,
  };
  return <span className="status-dot" style={{ background: map[status] || COLORS.muted, boxShadow: `0 0 8px ${map[status] || COLORS.muted}` }} />;
}

function Metric({ label, value, delta, unit = "" }) {
  const up = delta >= 0;
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}{unit}</div>
      <div className={`metric-delta ${up ? "up" : "down"}`}>
        {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        {Math.abs(delta)}%
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TICKER TAPE — signature element                                   */
/* ------------------------------------------------------------------ */
function TickerTape() {
  const items = [...tickerData, ...tickerData];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((it, i) => (
          <div className="ticker-item" key={i}>
            <Radio size={11} className="ticker-pulse" />
            <span className="ticker-label">{it.label}</span>
            <span className="ticker-value">{it.value}</span>
            <span className={`ticker-delta ${it.delta >= 0 ? "up" : "down"}`}>
              {it.delta >= 0 ? "▲" : "▼"} {Math.abs(it.delta)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MODULE PAGES                                                       */
/* ------------------------------------------------------------------ */
function Overview() {
  return (
    <div className="grid">
      <Panel eyebrow="00 · Índice composto" title="Termômetro Macro" className="span-8">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={composite}>
            <defs>
              <linearGradient id="gIdx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.purple} stopOpacity={0.55} />
                <stop offset="100%" stopColor={COLORS.purple} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.panelBorder} vertical={false} />
            <XAxis dataKey="t" stroke={COLORS.muted} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }} axisLine={false} tickLine={false} />
            <YAxis stroke={COLORS.muted} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }} />
            <Area type="monotone" dataKey="idx" stroke={COLORS.purple} strokeWidth={2} fill="url(#gIdx)" />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel eyebrow="Status" title="Saúde do Sistema" className="span-4">
        <div className="metric-stack">
          <Metric label="Pipeline" value="98,2" unit="%" delta={0.4} />
          <Metric label="Acurácia média" value="84,6" unit="%" delta={1.1} />
          <Metric label="Portfólio (MTD)" value="+2,3" unit="%" delta={2.3} />
          <Metric label="VaR 1d (95%)" value="1,8" unit="%" delta={-0.6} />
        </div>
      </Panel>

      <Panel eyebrow="Feed" title="Últimos Eventos" className="span-6">
        <ul className="feed">
          <li><CheckCircle2 size={14} color={COLORS.cyan} /> Retreino do modelo VAR(2) concluído com sucesso</li>
          <li><AlertTriangle size={14} color={COLORS.amber} /> yfinance com latência acima do esperado</li>
          <li><CheckCircle2 size={14} color={COLORS.cyan} /> Novo ciclo de forecast de IPCA publicado</li>
          <li><AlertTriangle size={14} color={COLORS.magenta} /> Tentativa de acesso não autorizado bloqueada</li>
        </ul>
      </Panel>

      <Panel eyebrow="Módulos" title="Mapa do Pipeline" className="span-6">
        <div className="pipeline-map">
          {["Ingestão", "Data Lake", "Modelos", "Forecast", "Portfólio", "Risco"].map((s, i, arr) => (
            <React.Fragment key={s}>
              <div className="pipe-node"><span>{s}</span></div>
              {i < arr.length - 1 && <div className="pipe-link" />}
            </React.Fragment>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DataPipeline() {
  return (
    <div className="grid">
      <Panel eyebrow="01 · Ingestão" title="Fontes de Dados" className="span-7">
        <table className="table">
          <thead>
            <tr><th>Fonte</th><th>Tipo</th><th>Status</th><th>Última sync</th><th>Volume</th></tr>
          </thead>
          <tbody>
            {dataSources.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td className="muted">{d.type}</td>
                <td><StatusDot status={d.status} /> {d.status}</td>
                <td className="mono">{d.lastSync}</td>
                <td className="mono">{d.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel eyebrow="Throughput" title="Volume Diário Ingerido" className="span-5">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ingestVolume}>
            <CartesianGrid stroke={COLORS.panelBorder} vertical={false} />
            <XAxis dataKey="t" stroke={COLORS.muted} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis stroke={COLORS.muted} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }} />
            <Bar dataKey="volume" fill={COLORS.cyan} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function EconometricModels() {
  return (
    <div className="grid">
      <Panel eyebrow="02 · Modelagem" title="Modelos Ativos" className="span-7">
        <table className="table">
          <thead>
            <tr><th>Modelo</th><th>Tipo</th><th>R²</th><th>AIC</th><th>Status</th></tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name}>
                <td>{m.name}</td>
                <td className="muted">{m.type}</td>
                <td className="mono">{m.r2.toFixed(2)}</td>
                <td className="mono">{m.aic.toFixed(1)}</td>
                <td><StatusDot status={m.status} /> {m.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel eyebrow="Diagnóstico" title="Resíduos — VAR(2)" className="span-5">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={residuals}>
            <CartesianGrid stroke={COLORS.panelBorder} vertical={false} />
            <XAxis dataKey="t" stroke={COLORS.muted} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis stroke={COLORS.muted} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }} />
            <Line type="monotone" dataKey="res" stroke={COLORS.purple} strokeWidth={1.5} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function ForecastEngine() {
  return (
    <div className="grid">
      <Panel eyebrow="03 · Projeção" title="IPCA — Horizonte 12M (com intervalo de confiança)" className="span-12">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={forecast}>
            <defs>
              <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.panelBorder} vertical={false} />
            <XAxis dataKey="t" stroke={COLORS.muted} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis stroke={COLORS.muted} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }} />
            <Area type="monotone" dataKey="high" stroke="none" fill="url(#gBand)" />
            <Area type="monotone" dataKey="low" stroke="none" fill={COLORS.void} fillOpacity={1} />
            <Line type="monotone" dataKey="real" stroke={COLORS.ghost} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="previsto" stroke={COLORS.cyan} strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function PortfolioManager() {
  return (
    <div className="grid">
      <Panel eyebrow="04 · Alocação" title="Composição do Portfólio" className="span-5">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
              {allocation.map((_, i) => <Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="legend">
          {allocation.map((a, i) => (
            <div className="legend-item" key={a.name}>
              <span className="legend-dot" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
              {a.name} <span className="mono muted">{a.value}%</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel eyebrow="Posições" title="Principais Ativos" className="span-7">
        <table className="table">
          <thead><tr><th>Ativo</th><th>Classe</th><th>Peso</th><th>P&L</th></tr></thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.asset}>
                <td>{h.asset}</td>
                <td className="muted">{h.class}</td>
                <td className="mono">{h.weight}</td>
                <td className={`mono ${h.pl >= 0 ? "up" : "down"}`}>{h.pl >= 0 ? "+" : ""}{h.pl}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function RiskEngine() {
  return (
    <div className="grid">
      <Panel eyebrow="05 · Risco" title="Cenários de Stress" className="span-7">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stress} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid stroke={COLORS.panelBorder} horizontal={false} />
            <XAxis type="number" stroke={COLORS.muted} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="scenario" stroke={COLORS.muted} tick={{ fontSize: 10 }} width={140} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }} />
            <Bar dataKey="impact" fill={COLORS.magenta} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel eyebrow="VaR" title="Value at Risk (95%, 1 dia)" className="span-5">
        <div className="metric-stack">
          <Metric label="VaR Carteira" value="1,8" unit="%" delta={-0.6} />
          <Metric label="Expected Shortfall" value="2,7" unit="%" delta={-0.3} />
          <Metric label="Volatilidade 30d" value="14,2" unit="%" delta={0.8} />
        </div>
      </Panel>
    </div>
  );
}

function Automation() {
  return (
    <div className="grid">
      <Panel eyebrow="06 · N8N" title="Workflows" className="span-12">
        <table className="table">
          <thead><tr><th>Workflow</th><th>Gatilho</th><th>Status</th><th>Última execução</th><th>Execuções</th></tr></thead>
          <tbody>
            {workflows.map((w) => (
              <tr key={w.name}>
                <td>{w.name}</td>
                <td className="muted">{w.trigger}</td>
                <td><StatusDot status={w.status} /> {w.status}</td>
                <td className="mono">{w.lastRun}</td>
                <td className="mono">{w.runs.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Security() {
  return (
    <div className="grid">
      <Panel eyebrow="07 · Segurança" title="Log de Auditoria" className="span-12">
        <table className="table">
          <thead><tr><th>Hora</th><th>Ator</th><th>Ação</th><th>Nível</th></tr></thead>
          <tbody>
            {auditLog.map((l, i) => (
              <tr key={i}>
                <td className="mono">{l.time}</td>
                <td className="muted">{l.actor}</td>
                <td>{l.action}</td>
                <td>
                  <span className={`badge ${l.level}`}>{l.level}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NAV CONFIG                                                         */
/* ------------------------------------------------------------------ */
const NAV = [
  { id: "overview", num: "00", label: "Visão Geral", icon: Activity, Page: Overview },
  { id: "pipeline", num: "01", label: "Data Pipeline", icon: Database, Page: DataPipeline },
  { id: "models", num: "02", label: "Modelos Econométricos", icon: Cpu, Page: EconometricModels },
  { id: "forecast", num: "03", label: "Forecast Engine", icon: TrendingUp, Page: ForecastEngine },
  { id: "portfolio", num: "04", label: "Portfolio Manager", icon: PieIcon, Page: PortfolioManager },
  { id: "risk", num: "05", label: "Risk Engine", icon: ShieldAlert, Page: RiskEngine },
  { id: "automation", num: "06", label: "Automação (n8n)", icon: Workflow, Page: Automation },
  { id: "security", num: "07", label: "Segurança", icon: Lock, Page: Security },
];

/* ------------------------------------------------------------------ */
/*  APP SHELL                                                          */
/* ------------------------------------------------------------------ */
export default function App() {
  const [active, setActive] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const current = useMemo(() => NAV.find((n) => n.id === active) || NAV[0], [active]);
  const Page = current.Page;

  return (
    <div className="macroai-app">
      <style>{CSS}</style>

      <header className="topbar">
        <div className="topbar-left">
          <button className="burger" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="brand">
            <span className="brand-glyph">Δ</span>
            <span className="brand-text">MACRO<span className="accent">.AI</span></span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="pill"><Circle size={8} fill={COLORS.cyan} color={COLORS.cyan} /> sistema online</div>
          <div className="clock mono">{clock.toLocaleTimeString("pt-BR", { hour12: false })} UTC-3</div>
        </div>
      </header>

      <div className="body">
        <nav className={`sidebar ${navOpen ? "open" : ""}`}>
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                className={`nav-item ${active === n.id ? "active" : ""}`}
                onClick={() => { setActive(n.id); setNavOpen(false); }}
              >
                <span className="nav-num mono">{n.num}</span>
                <Icon size={16} />
                <span className="nav-label">{n.label}</span>
                {active === n.id && <ChevronRight size={14} className="nav-chevron" />}
              </button>
            );
          })}
        </nav>

        <main className="content">
          <div className="content-head">
            <span className="eyebrow mono">{current.num} / 07</span>
            <h1>{current.label}</h1>
          </div>
          <Page />
        </main>
      </div>

      <TickerTape />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STYLES                                                             */
/* ------------------------------------------------------------------ */
const CSS = `
.macroai-app {
  --bg: ${COLORS.void};
  --panel: ${COLORS.panel};
  --border: ${COLORS.panelBorder};
  --purple: ${COLORS.purple};
  --cyan: ${COLORS.cyan};
  --magenta: ${COLORS.magenta};
  --amber: ${COLORS.amber};
  --ghost: ${COLORS.ghost};
  --muted: ${COLORS.muted};

  background:
    radial-gradient(ellipse 900px 500px at 15% -10%, rgba(177,75,255,0.16), transparent 60%),
    radial-gradient(ellipse 700px 500px at 90% 10%, rgba(46,230,214,0.10), transparent 60%),
    var(--bg);
  color: var(--ghost);
  font-family: 'Inter', -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.macroai-app * { box-sizing: border-box; }

/* -------- topbar -------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(13,11,26,0.7);
  backdrop-filter: blur(10px);
  position: sticky; top: 0; z-index: 30;
}
.topbar-left { display: flex; align-items: center; gap: 14px; }
.burger { display: none; background: none; border: 1px solid var(--border); color: var(--ghost); border-radius: 6px; padding: 6px; cursor: pointer; }
.brand { display: flex; align-items: center; gap: 8px; font-family: 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: 0.06em; font-size: 16px; }
.brand-glyph { color: var(--purple); text-shadow: 0 0 12px var(--purple); font-size: 20px; }
.brand-text .accent { color: var(--cyan); }
.topbar-right { display: flex; align-items: center; gap: 14px; }
.pill { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); border: 1px solid var(--border); padding: 5px 10px; border-radius: 999px; }
.clock { font-size: 12px; color: var(--muted); }

/* -------- layout -------- */
.body { display: flex; flex: 1; min-height: 0; }
.sidebar {
  width: 232px; flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 16px 10px;
  display: flex; flex-direction: column; gap: 2px;
  background: rgba(13,11,26,0.4);
}
.nav-item {
  display: flex; align-items: center; gap: 10px;
  background: none; border: none; color: var(--muted);
  padding: 10px 10px; border-radius: 8px; text-align: left; cursor: pointer;
  font-size: 13px; font-family: 'Inter', sans-serif;
  transition: background 0.15s, color 0.15s;
  position: relative;
}
.nav-item:hover { color: var(--ghost); background: rgba(177,75,255,0.08); }
.nav-item.active { color: var(--ghost); background: rgba(177,75,255,0.14); box-shadow: inset 2px 0 0 var(--purple); }
.nav-num { font-size: 10px; color: var(--purple); width: 18px; }
.nav-label { flex: 1; }
.nav-chevron { color: var(--cyan); }

.content { flex: 1; padding: 24px 28px 90px; overflow-x: hidden; min-width: 0; }
.content-head { margin-bottom: 20px; }
.content-head .eyebrow { color: var(--purple); font-size: 11px; letter-spacing: 0.15em; }
.content-head h1 { font-family: 'Space Grotesk', sans-serif; font-size: 26px; margin: 4px 0 0; font-weight: 600; }

/* -------- grid & panels -------- */
.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
.span-4 { grid-column: span 4; } .span-5 { grid-column: span 5; }
.span-6 { grid-column: span 6; } .span-7 { grid-column: span 7; }
.span-8 { grid-column: span 8; } .span-12 { grid-column: span 12; }

.panel {
  background: linear-gradient(180deg, rgba(23,18,42,0.7), rgba(13,11,26,0.7));
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
}
.panel-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.eyebrow { font-size: 10px; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }
.panel-title { font-family: 'Space Grotesk', sans-serif; font-size: 14px; margin-top: 2px; color: var(--ghost); }

/* -------- metrics -------- */
.metric-stack { display: flex; flex-direction: column; gap: 14px; }
.metric { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
.metric-label { font-size: 12px; color: var(--muted); flex: 1; }
.metric-value { font-family: 'IBM Plex Mono', monospace; font-size: 18px; margin: 0 10px; }
.metric-delta { font-family: 'IBM Plex Mono', monospace; font-size: 11px; display: flex; align-items: center; gap: 2px; }
.metric-delta.up { color: var(--cyan); } .metric-delta.down { color: var(--magenta); }

/* -------- table -------- */
.table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.table th { text-align: left; color: var(--muted); font-weight: 500; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 6px 8px; border-bottom: 1px solid var(--border); }
.table td { padding: 9px 8px; border-bottom: 1px solid rgba(36,31,61,0.6); }
.table tr:last-child td { border-bottom: none; }
.mono { font-family: 'IBM Plex Mono', monospace; }
.muted { color: var(--muted); }
.up { color: var(--cyan); } .down { color: var(--magenta); }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; }

/* -------- feed -------- */
.feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.feed li { display: flex; align-items: center; gap: 10px; font-size: 12.5px; }

/* -------- pipeline map -------- */
.pipeline-map { display: flex; align-items: center; flex-wrap: wrap; gap: 0; }
.pipe-node { border: 1px solid var(--border); background: rgba(177,75,255,0.08); border-radius: 8px; padding: 8px 12px; font-size: 11.5px; }
.pipe-link { width: 22px; height: 1px; background: linear-gradient(90deg, var(--purple), var(--cyan)); margin: 0 4px; }

/* -------- legend -------- */
.legend { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; font-size: 12px; }
.legend-item { display: flex; align-items: center; gap: 8px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }

/* -------- badge -------- */
.badge { font-size: 10px; padding: 3px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; }
.badge.info { background: rgba(46,230,214,0.12); color: var(--cyan); }
.badge.warn { background: rgba(255,184,77,0.14); color: var(--amber); }
.badge.critical { background: rgba(255,56,104,0.14); color: var(--magenta); }

/* -------- ticker (signature element) -------- */
.ticker {
  position: sticky; bottom: 0; z-index: 30;
  border-top: 1px solid var(--border);
  background: rgba(5,5,8,0.85);
  backdrop-filter: blur(8px);
  overflow: hidden;
  height: 34px; display: flex; align-items: center;
}
.ticker-track { display: flex; gap: 28px; white-space: nowrap; animation: scroll-ticker 30s linear infinite; padding-left: 100%; }
.ticker-item { display: flex; align-items: center; gap: 7px; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; }
.ticker-label { color: var(--muted); }
.ticker-value { color: var(--ghost); }
.ticker-delta.up { color: var(--cyan); } .ticker-delta.down { color: var(--magenta); }
.ticker-pulse { color: var(--purple); animation: pulse 1.6s ease-in-out infinite; }
@keyframes scroll-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .ticker-track { animation: none; }
  .ticker-pulse { animation: none; }
}

/* -------- responsive -------- */
@media (max-width: 880px) {
  .burger { display: block; }
  .sidebar {
    position: fixed; top: 57px; left: 0; bottom: 34px; z-index: 40;
    transform: translateX(-100%); transition: transform 0.2s;
    background: var(--bg); width: 240px;
  }
  .sidebar.open { transform: translateX(0); }
  .span-4, .span-5, .span-6, .span-7, .span-8 { grid-column: span 12; }
  .content { padding: 18px 16px 90px; }
}

.nav-item:focus-visible, .burger:focus-visible {
  outline: 2px solid var(--cyan); outline-offset: 2px;
}
`;
