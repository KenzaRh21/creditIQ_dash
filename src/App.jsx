import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import "./App.css";

const fmt  = n => new Intl.NumberFormat("fr-MA").format(Math.round(n));
const fmtM = n => (n / 1e6).toFixed(2);
const fmtP = n => `${(n * 100).toFixed(1)}%`;
const pc   = p => (p > 0.8 ? "#F43F5E" : p > 0.6 ? "#F59E0B" : "#10B981");
const gst  = p => (p >= 0.8 ? "CRITIQUE" : p >= 0.436 ? "RISQUE" : "SAIN");

const STCLS = { CRITIQUE: "b br", RISQUE: "b ba", SAIN: "b bg" };
const RCLS  = {
  Champion: "b bc", Fidele: "b bG", "Fidèle": "b bG",
  "A Surveiller": "b bv", "À Surveiller": "b bv",
  "En Danger": "b ba", Perdu: "b br",
};
const RLBL = {
  Champion: "Champion", Fidele: "Fidèle",
  "A Surveiller": "À Surveiller", "En Danger": "En Danger", Perdu: "Perdu",
};
const RCOL = {
  Champion: "#06B6D4", Fidele: "#10B981",
  "A Surveiller": "#7C3AED", "En Danger": "#F59E0B", Perdu: "#F43F5E",
};

const Tip = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <div className="tip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tip-row">
          <span className="tip-dot" style={{ background: p.color || p.fill }} />
          <span className="tip-name">{p.name}:</span>
          <strong style={{ color: p.color || p.fill, fontFamily: "JetBrains Mono, monospace" }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}{unit}
          </strong>
        </div>
      ))}
    </div>
  );
};

const PBar = ({ pct, color, width = "100%" }) => (
  <div className="pbar" style={{ width }}>
    <div className="pbar-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
  </div>
);

const MiniGauge = ({ v, color, label, size = 68 }) => {
  const r = size / 2 - 6, circ = 2 * Math.PI * r, dash = v * circ;
  return (
    <div className="gauge-wrap">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={6} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="gauge-val" style={{ color }}>{(v * 100).toFixed(0)}%</div>
      </div>
      <span className="gauge-label">{label}</span>
    </div>
  );
};

export default function App() {
  const D   = window.__D || {};
  const K   = D.kpis            || {};
  const S   = D.segments        || {};
  const T10 = D.top10_risque    || [];
  const Q   = D.seuils_rfm      || {};
  const M   = D.model_metrics   || {};
  const CD  = D.cashflow_mensuel?.length ? D.cashflow_mensuel : [];
  const DD  = D.dso_mensuel?.length      ? D.dso_mensuel      : [];

  const RSIZE = D.risque_par_taille?.length ? D.risque_par_taille : [
    { t: "TPE", v: 0 }, { t: "PME", v: 0 }, { t: "Grand Compte", v: 0 }
  ];
  const FHIST = D.fhist?.length ? D.fhist : [];

  const clients = T10.map(c => ({
    fk_soc: c.fk_soc,
    nom: c.nom_client, ttc: c.ca_total, p: c.prob_retard_moy,
    ipr: c.ipr_total,  rfm: c.segment_rfm, fid: c.score_fidelite,
    taille: c.taille || "—", st: gst(c.prob_retard_moy),
    anom: c.is_anomalie === 1,
    ret: c.prob_retard_moy > 0.436 ? Math.round(c.prob_retard_moy * 35) : 0,
  }));

  const nCritClients = K.nb_critiques || 0;
  const nRiskClients = K.nb_risque    || 0;
  const nSainClients = K.nb_sain      || ((K.nb_clients || 0) - nCritClients - nRiskClients);
  const nCritFact    = K.nb_critiques_fact || 0;
  const nRiskFact    = K.nb_risque_fact    || 0;
  const nAnom        = K.nb_anomalies      || 0;

  const RFMSEGS = ["Champion", "Fidele", "A Surveiller", "En Danger", "Perdu"].map(k => ({
    k, nm: RLBL[k] || k, n: S[k] || 0,
    pct: K.nb_clients > 0 ? Math.round((S[k] || 0) / K.nb_clients * 1000) / 10 : 0,
    col: RCOL[k],
  }));

  const FEATS = [
    { n: "tx_succes_hist",      v: 22, c: "#F43F5E" },
    { n: "nb_defauts_hist",     v: 18, c: "#F43F5E" },
    { n: "tendance_retard",     v: 15, c: "#06B6D4" },
    { n: "encours_client",      v: 12, c: "#2563EB" },
    { n: "variation_ca_client", v: 9,  c: "#7C3AED" },
    { n: "nb_factures_3m",      v: 8,  c: "#2563EB" },
    { n: "total_ttc",           v: 7,  c: "#7C3AED" },
    { n: "mois_critique",       v: 5,  c: "#F59E0B" },
  ];

  const [tab,        setTab]        = useState("ov");
  const [srch,       setSrch]       = useState("");
  const [filt,       setFilt]       = useState("ALL");
  const [modal,      setModal]      = useState(null);
  const [relLoading, setRelLoading] = useState(false);
  const [relDone,    setRelDone]    = useState({});

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const rows = clients.filter(c =>
    c.nom.toLowerCase().includes(srch.toLowerCase()) &&
    (filt === "ALL" || c.st === filt || (filt === "ANOM" && c.anom))
  );

  const handleRelance = async (c) => {
    setRelLoading(true);
    try {
      await fetch("http://localhost:5000/api/scoring/relance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fk_soc:          c.fk_soc,
          nom_client:      c.nom,
          ca_total:        c.ttc,
          prob_retard_moy: c.p,
        }),
      });
      setRelDone(prev => ({ ...prev, [c.nom]: true }));
    } catch(e) {
      console.error(e);
    }
    setRelLoading(false);
    const sujet = encodeURIComponent(`Relance paiement — ${c.nom}`);
    const corps = encodeURIComponent(
      `Bonjour,\n\nNous vous contactons concernant vos factures en retard.\n\n` +
      `Client : ${c.nom}\nEncours : ${new Intl.NumberFormat("fr-MA").format(Math.round(c.ttc))} MAD\n` +
      `Probabilité retard : ${(c.p * 100).toFixed(1)}%\n\n` +
      `Merci de régulariser votre situation dans les meilleurs délais.\n\nCordialement`
    );
    window.open(`mailto:?subject=${sujet}&body=${corps}`);
    setModal(null);
  };

  const BtnRelance = ({ c }) => c.st === "SAIN" ? null : relDone[c.nom]
    ? <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700 }}>✓ Envoyé</span>
    : <button className="btn btn-blue" style={{ padding: "3px 8px", fontSize: 10 }}
        onClick={() => setModal(c)}>Relancer</button>;

  const TABS = [
    { id: "ov",  lb: "Overview",      ic: "▦" },
    { id: "rp",  lb: "Risk Pipeline", ic: "⊞", bdg: nCritClients, bc: "bdr" },
    { id: "rfm", lb: "Loyalty RFM",   ic: "◈", bdg: nAnom,        bc: "bda" },
    { id: "fc",  lb: "Forecast",      ic: "⟿" },
    { id: "ai",  lb: "AI Model",      ic: "✦" },
  ];

  return (
    <div id="ciq">

      {/* TOPBAR */}
      <div className="top">
        <div className="logo-wrap">
          <div className="logo-sq">CQ</div>
          <div>
            <div className="logo-name">CréditIQ</div>
            <div className="logo-sub">ENTERPRISE</div>
          </div>
        </div>
        {TABS.map(t => (
          <button key={t.id} className={`nav-tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            <span className="nav-ic">{t.ic}</span> {t.lb}
            {t.bdg != null && <span className={`bdg ${t.bc || ""}`}>{t.bdg}</span>}
          </button>
        ))}
        <div className="top-right">
          <div className="live-pill">
            <span className="dot dot-live" style={{ background: "#10B981" }} />
            <span className="live-txt">LIVE</span>
          </div>
          <span className="top-date">{today}</span>
        </div>
      </div>

      {/* ALERT STRIP */}
      <div className="alert-strip">
        <span className="dot dot-live" style={{ background: "#FCA5A5" }} />
        <strong className="al-critical">CRITICAL:</strong>
        <span>
          {nCritClients} clients CRITIQUE · {nRiskClients} clients RISQUE
          · Exposition {fmtM(K.exposition_risque || 0)}M MAD
          · Bad debt {K.bad_debt_ratio || 0}%
        </span>
        <strong className="al-anom"> · {nAnom} anomalies détectées</strong>
        <button className="btn btn-blue al-btn">Lancer relances →</button>
      </div>

      {/* SUBBAR */}
      <div className="subbar">
        <span className="sbar-title">{TABS.find(t => t.id === tab)?.lb}</span>
        {tab === "rp" && ["ALL", "CRITIQUE", "RISQUE", "SAIN", "ANOM"].map(f => (
          <button key={f} className={`chip${filt === f ? " on" : ""}`} onClick={() => setFilt(f)}>{f}</button>
        ))}
        {tab === "rp" && (
          <input type="text" placeholder="Search client..." value={srch}
            onChange={e => setSrch(e.target.value)} className="search-input" />
        )}
        <div className="sbar-right">
          <span className="sbar-meta">{K.nb_factures} factures · {K.nb_clients} clients · seuil 0.436</span>
          <a href="http://localhost:5000/api/scoring/health" target="_blank" rel="noreferrer">
            <button className="btn">API ↗</button>
          </a>
        </div>
      </div>

      <div className="body">

        {/* KPI ROW */}
        <div className="kpi-row a1">
          {[
            { l: "Exposition Risque",  v: fmtM(K.exposition_risque || 0) + "M MAD", c: "#F43F5E", s: `${K.pct_risque || 0}% du CA` },
            { l: "Créances >90j",      v: (K.bad_debt_ratio || 0) + "%",             c: "#F59E0B", s: fmt(K.bad_debt || 0) + " MAD" },
            { l: "CA Sécurisé IA",     v: fmtM(K.ca_securise || 0) + "M",            c: "#10B981", s: "Estimation relances" },
            { l: "Forecast M+1",       v: fmtM(K.forecast_m1 || 0) + "M MAD",        c: "#2563EB", s: "Régression linéaire" },
            { l: "DSO Moyen",          v: (K.dso_moyen || 0) + " j",                 c: "#7C3AED", s: "Norme B2B : 30j" },
            { l: "Clients / Factures", v: "" + (K.nb_clients || 0),                  c: "#06B6D4", s: (K.nb_factures || 0) + " factures" },
          ].map(k => (
            <div key={k.l} className="kpi-card">
              <div className="kpi-accent" style={{ background: k.c }} />
              <div className="kpi-label">{k.l}</div>
              <div className="kpi-val" style={{ color: k.c }}>{k.v}</div>
              <div className="kpi-sub">{k.s}</div>
            </div>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab === "ov" && (
          <>
            <div className="g21 a2">
              <div className="panel">
                <div className="panel-head">
                  <span className="ph-title">▲ Cash-Flow Mensuel — Données réelles</span>
                  <span className="ph-meta">
                    <span className="legend-item"><span className="legend-line" style={{ background: "#94A3B8", opacity: 0.6 }} />Théorique</span>
                    <span className="legend-item"><span className="legend-line" style={{ background: "#2563EB" }} />Encaissé</span>
                  </span>
                </div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={175}>
                    <AreaChart data={CD} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#94A3B8" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}M`} />
                      <Tooltip content={<Tip unit="k MAD" />} />
                      <Area type="monotone" dataKey="theo" name="Théorique" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gT)" dot={false} />
                      <Area type="monotone" dataKey="sec"  name="Encaissé"  stroke="#2563EB" strokeWidth={2}   fill="url(#gS)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="status-col">
                {[
                  { l: "CRITIQUE", n: nCritClients, pct: parseFloat((nCritClients / (K.nb_clients || 1) * 100).toFixed(1)), c: "#F43F5E", bg: "#FFF1F2" },
                  { l: "RISQUE",   n: nRiskClients, pct: parseFloat((nRiskClients / (K.nb_clients || 1) * 100).toFixed(1)), c: "#F59E0B", bg: "#FFFBEB" },
                  { l: "SAIN",     n: nSainClients, pct: parseFloat((nSainClients / (K.nb_clients || 1) * 100).toFixed(1)), c: "#10B981", bg: "#ECFDF5" },
                ].map(s => (
                  <div key={s.l} className="status-card" style={{ background: s.bg, border: `1px solid ${s.c}30` }}>
                    <div className="status-top">
                      <div className="status-left">
                        <span className="dot" style={{ background: s.c }} />
                        <span className="status-label">{s.l}</span>
                        <span className="status-pct">{s.pct}%</span>
                      </div>
                      <span className="status-n mono" style={{ color: s.c }}>{s.n}</span>
                    </div>
                    <div className="status-bar"><PBar pct={Math.min(100, s.pct * 4)} color={s.c} /></div>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", padding: "4px 0" }}>
                  Comptage par client (prob. moy.)
                </div>
              </div>
            </div>

            <div className="g3 a3">
              <div className="panel">
                <div className="panel-head">
                  <span className="ph-title">⏱ DSO Mensuel — Réel</span>
                  <span className="ph-meta">Moy. <strong className="mono" style={{ color: "#F59E0B" }}>{K.dso_moyen || 0}j</strong></span>
                </div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={125}>
                    <LineChart data={DD} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip unit="j" />} />
                      <ReferenceLine y={K.dso_moyen} stroke="rgba(244,63,94,.4)" strokeDasharray="3 2" />
                      <Line type="monotone" dataKey="v" name="DSO" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><span className="ph-title">⊙ Risque par Taille</span></div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={125}>
                    <BarChart data={RSIZE} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="t" type="category" width={92} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip unit="%" />} />
                      <Bar dataKey="v" name="Risque" radius={[0, 3, 3, 0]}>
                        {RSIZE.map((e, i) => <Cell key={i} fill={e.v > 60 ? "#F43F5E" : e.v > 40 ? "#F59E0B" : "#10B981"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <span className="ph-title">◈ Segments RFM</span>
                  <span className="ph-meta">{K.nb_clients} clients</span>
                </div>
                <div className="panel-body" style={{ paddingTop: 8 }}>
                  {RFMSEGS.map(s => (
                    <div key={s.k} className="rfm-row">
                      <span className="rfm-name">{s.nm}</span>
                      <div style={{ flex: 1 }}><PBar pct={Math.min(100, s.pct * 3)} color={s.col} /></div>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: s.col, minWidth: 24, textAlign: "right" }}>{s.n}</span>
                      <span className="rfm-pct">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel a4">
              <div className="panel-head">
                <span className="ph-title">🎯 Top 10 Clients — IPR Live</span>
                <span className="ph-meta">
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>Clients :</span>
                  <span className="b br">{nCritClients} CRITIQUE</span>
                  <span className="b ba">{nRiskClients} RISQUE</span>
                  <span className="b bg">{nSainClients} SAIN</span>
                </span>
              </div>
              <table className="dt">
                <thead>
                  <tr>{["#","Client","Taille","CA Total","Prob. Retard","IPR","Fidélité","Segment RFM","Statut Client","Action"].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {clients.map((c, i) => (
                    <tr key={i} className={c.anom ? "tr-anom" : ""}>
                      <td><span className="mono" style={{ color: "#94A3B8", fontSize: 10 }}>{String(i+1).padStart(2,"0")}</span></td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{c.nom}</div>
                        {c.anom && <span className="anom-tag">⚠ ANOM</span>}
                      </td>
                      <td><span className="b bs">{c.taille}</span></td>
                      <td><span className="mono" style={{ fontSize: 11.5 }}>{fmt(c.ttc)} MAD</span></td>
                      <td style={{ minWidth: 110 }}>
                        <div className="prob-cell">
                          <div style={{ flex: 1 }}><PBar pct={c.p * 100} color={pc(c.p)} /></div>
                          <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: pc(c.p), minWidth: 34 }}>{fmtP(c.p)}</span>
                        </div>
                      </td>
                      <td><span className="mono ipr-val" style={{ color: c.ipr > 8 ? "#F43F5E" : c.ipr > 6 ? "#F59E0B" : "#10B981" }}>{c.ipr.toFixed(1)}</span></td>
                      <td>
                        <div className="fid-cell">
                          <PBar pct={c.fid} color={c.fid > 70 ? "#06B6D4" : c.fid > 50 ? "#10B981" : c.fid > 30 ? "#F59E0B" : "#F43F5E"} width="40px" />
                          <span className="mono" style={{ fontSize: 10.5, fontWeight: 700 }}>{c.fid}</span>
                        </div>
                      </td>
                      <td><span className={RCLS[c.rfm] || "b bs"}>{RLBL[c.rfm] || c.rfm}</span></td>
                      <td><span className={STCLS[c.st]}>{c.st}</span></td>
                      <td><BtnRelance c={c} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="panel-footer">
                Statut basé sur prob_retard_moy du client · seuil CRITIQUE ≥ 0.80 · RISQUE ≥ 0.436
              </div>
            </div>
          </>
        )}

        {/* ══ RISK PIPELINE ══ */}
        {tab === "rp" && (
          <>
            <div className="g4 a1">
              {[
                { l: "Total Clients",     v: K.nb_clients || 0, c: "#2563EB", s: "Population complète" },
                { l: "Clients Critiques", v: nCritClients,       c: "#F43F5E", s: "prob moy ≥ 0.80" },
                { l: "Clients à Risque",  v: nRiskClients,       c: "#F59E0B", s: "prob moy ≥ 0.436" },
                { l: "Clients Sains",     v: nSainClients,       c: "#10B981", s: "prob moy < 0.436" },
              ].map(k => (
                <div key={k.l} className="kpi-card" style={{ borderTop: `3px solid ${k.c}` }}>
                  <div className="kpi-label">{k.l}</div>
                  <div className="kpi-val" style={{ color: k.c, fontSize: 26 }}>{k.v}</div>
                  <div className="kpi-sub">{k.s}</div>
                </div>
              ))}
            </div>

            <div className="g4 a2" style={{ marginBottom: 8 }}>
              {[
                { l: "Total Factures",      v: K.nb_factures || 0, c: "#2563EB", s: "Toutes factures" },
                { l: "Factures Critiques",  v: nCritFact,           c: "#F43F5E", s: "prob ≥ 0.80 ou tendance" },
                { l: "Factures à Risque",   v: nRiskFact,           c: "#F59E0B", s: "prob ≥ 0.436" },
                { l: "Anomalies IsoForest", v: nAnom,               c: "#7C3AED",
                  s: `${((nAnom / (K.nb_factures || 1)) * 100).toFixed(1)}% des factures` },
              ].map(k => (
                <div key={k.l} className="kpi-card" style={{ borderTop: `3px solid ${k.c}` }}>
                  <div className="kpi-label">{k.l}</div>
                  <div className="kpi-val" style={{ color: k.c, fontSize: 22 }}>{k.v}</div>
                  <div className="kpi-sub">{k.s}</div>
                </div>
              ))}
            </div>

            <div className="panel a3">
              <div className="panel-head">
                <span className="ph-title">Risk Pipeline — Top 10 clients à risque · {rows.length} résultats</span>
                <span className="ph-meta">
                  {["ALL","CRITIQUE","RISQUE","SAIN","ANOM"].map(f => (
                    <button key={f} className={`chip${filt === f ? " on" : ""}`} onClick={() => setFilt(f)}>{f}</button>
                  ))}
                  <input type="text" placeholder="Search..." value={srch} onChange={e => setSrch(e.target.value)} className="search-input" style={{ width: 170 }} />
                </span>
              </div>
              <table className="dt">
                <thead>
                  <tr>{["#","Client","Taille","CA Total","Prob. Retard","IPR","Fidélité","Segment","Retard est.","Statut","Action"].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((c, i) => (
                    <tr key={i} className={c.anom ? "tr-anom" : ""}>
                      <td><span className="mono" style={{ color: "#94A3B8", fontSize: 10 }}>{String(i+1).padStart(2,"0")}</span></td>
                      <td><strong>{c.nom}</strong>{c.anom && <span className="anom-tag">⚠ ANOM</span>}</td>
                      <td><span className="b bs">{c.taille}</span></td>
                      <td><span className="mono" style={{ fontSize: 11.5 }}>{fmt(c.ttc)}</span></td>
                      <td style={{ minWidth: 110 }}>
                        <div className="prob-cell">
                          <div style={{ flex: 1 }}><PBar pct={c.p * 100} color={pc(c.p)} /></div>
                          <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: pc(c.p), minWidth: 34 }}>{fmtP(c.p)}</span>
                        </div>
                      </td>
                      <td><span className="mono ipr-val" style={{ color: c.ipr > 8 ? "#F43F5E" : c.ipr > 6 ? "#F59E0B" : "#10B981" }}>{c.ipr.toFixed(1)}</span></td>
                      <td>
                        <div className="fid-cell">
                          <PBar pct={c.fid} color={c.fid > 70 ? "#06B6D4" : c.fid > 50 ? "#10B981" : c.fid > 30 ? "#F59E0B" : "#F43F5E"} width="36px" />
                          <span className="mono" style={{ fontSize: 10.5, fontWeight: 700 }}>{c.fid}</span>
                        </div>
                      </td>
                      <td><span className={RCLS[c.rfm] || "b bs"}>{RLBL[c.rfm] || c.rfm}</span></td>
                      <td><span className="mono" style={{ fontWeight: 700, color: c.ret > 0 ? "#F43F5E" : "#94A3B8", fontSize: 11 }}>{c.ret > 0 ? `+${c.ret}j` : "—"}</span></td>
                      <td><span className={STCLS[c.st]}>{c.st}</span></td>
                      <td><BtnRelance c={c} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="panel-footer">
                Statut client = classification par prob_retard_moy · Top 10 IPR affiché · {K.nb_clients} clients total
              </div>
            </div>
          </>
        )}

        {/* ══ RFM ══ */}
        {tab === "rfm" && (
          <>
            <div className="g5 a1">
              {RFMSEGS.map(s => (
                <div key={s.k} className="kpi-card" style={{ borderTop: `3px solid ${s.col}` }}>
                  <div className="kpi-label">{s.nm}</div>
                  <div className="kpi-val" style={{ color: s.col, fontSize: 26 }}>{s.n}</div>
                  <div className="kpi-sub">{s.pct}%</div>
                  <div style={{ marginTop: 8 }}><PBar pct={Math.min(100, s.pct * 3.5)} color={s.col} /></div>
                </div>
              ))}
            </div>

            <div className="g32 a2">
              <div className="panel">
                <div className="panel-head"><span className="ph-title">Distribution Score Fidélité</span></div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={195}>
                    <BarChart data={FHIST}>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="r" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="pe" name="Perdu"        stackId="a" fill="#F43F5E" />
                      <Bar dataKey="da" name="En Danger"    stackId="a" fill="#F59E0B" />
                      <Bar dataKey="su" name="À Surveiller" stackId="a" fill="#7C3AED" />
                      <Bar dataKey="fi" name="Fidèle"       stackId="a" fill="#10B981" />
                      <Bar dataKey="ch" name="Champion"     stackId="a" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><span className="ph-title">Seuils Quantiles — API Live</span></div>
                <table className="dt">
                  <thead><tr><th>Segment</th><th>Min</th><th>Max</th><th>Clients</th></tr></thead>
                  <tbody>
                    {[
                      { sg: "Champion",     mn: Q.q85, mx: 100,   n: S["Champion"]     || 0, c: "#06B6D4" },
                      { sg: "Fidèle",       mn: Q.q65, mx: Q.q85, n: S["Fidele"]       || 0, c: "#10B981" },
                      { sg: "À Surveiller", mn: Q.q25, mx: Q.q65, n: S["A Surveiller"] || 0, c: "#7C3AED" },
                      { sg: "En Danger",    mn: Q.q10, mx: Q.q25, n: S["En Danger"]    || 0, c: "#F59E0B" },
                      { sg: "Perdu",        mn: 0,     mx: Q.q10, n: S["Perdu"]        || 0, c: "#F43F5E" },
                    ].map(s => (
                      <tr key={s.sg}>
                        <td><div className="seg-cell"><span className="dot" style={{ background: s.c }} /><strong>{s.sg}</strong></div></td>
                        <td><span className="mono" style={{ fontSize: 11, color: "#64748B" }}>{s.mn}</span></td>
                        <td><span className="mono" style={{ fontSize: 11, color: "#64748B" }}>{s.mx}</span></td>
                        <td><span className="mono" style={{ fontSize: 11, fontWeight: 700, color: s.c }}>{s.n}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="panel-footer">q10={Q.q10} · q25={Q.q25} · q65={Q.q65} · q85={Q.q85}</div>
              </div>
            </div>

            <div className="panel a3">
              <div className="panel-head"><span className="ph-title">Clients — Top 10 IPR Live</span></div>
              <table className="dt">
                <thead><tr>{["Client","Taille","CA Total","Fidélité","Prob. Retard","Segment RFM","IPR","Statut Client"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {clients.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.nom}</strong></td>
                      <td><span className="b bs">{c.taille}</span></td>
                      <td><span className="mono" style={{ fontSize: 11.5 }}>{fmt(c.ttc)}</span></td>
                      <td>
                        <div className="fid-cell">
                          <PBar pct={c.fid} color={c.fid > 70 ? "#06B6D4" : c.fid > 50 ? "#10B981" : c.fid > 30 ? "#F59E0B" : "#F43F5E"} width="40px" />
                          <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{c.fid}</span>
                        </div>
                      </td>
                      <td><span className="mono" style={{ fontWeight: 700, color: pc(c.p) }}>{fmtP(c.p)}</span></td>
                      <td><span className={RCLS[c.rfm] || "b bs"}>{RLBL[c.rfm] || c.rfm}</span></td>
                      <td><span className="mono ipr-val" style={{ color: c.ipr > 8 ? "#F43F5E" : c.ipr > 6 ? "#F59E0B" : "#10B981" }}>{c.ipr.toFixed(1)}</span></td>
                      <td><span className={STCLS[c.st]}>{c.st}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ FORECAST ══ */}
        {tab === "fc" && (
          <>
            <div className="g4 a1">
              {[
                { l: "Forecast M+1",   v: fmtM(K.forecast_m1 || 0) + "M MAD", c: "#2563EB", s: "Régression linéaire" },
                { l: "Forecast M+2",   v: fmtM(K.forecast_m2 || 0) + "M MAD", c: "#7C3AED", s: "Régression linéaire" },
                { l: "DSO Moyen",      v: (K.dso_moyen || 0) + " j",           c: "#F59E0B", s: "Norme B2B : 30j" },
                { l: "Bad Debt Ratio", v: (K.bad_debt_ratio || 0) + "%",       c: "#F43F5E", s: fmt(K.bad_debt || 0) + " MAD" },
              ].map((k, i) => (
                <div key={k.l} className={`kpi-card a${i+1}`} style={{ borderTop: `3px solid ${k.c}` }}>
                  <div className="kpi-label">{k.l}</div>
                  <div className="kpi-val" style={{ color: k.c, fontSize: 20 }}>{k.v}</div>
                  <div className="kpi-sub">{k.s}</div>
                </div>
              ))}
            </div>

            <div className="panel a2" style={{ marginBottom: 8 }}>
              <div className="panel-head">
                <span className="ph-title">📈 Cash-Flow — 12 mois réels (k MAD)</span>
                <span className="ph-meta">
                  <span className="legend-item"><span className="legend-line" style={{ background: "#94A3B8", opacity: 0.6 }} />Théorique</span>
                  <span className="legend-item"><span className="legend-line" style={{ background: "#2563EB" }} />Encaissé</span>
                </span>
              </div>
              <div className="panel-body">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={CD} margin={{ top: 4, right: 12, bottom: 0, left: 10 }}>
                    <defs>
                      <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gFT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#94A3B8" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
                    <Tooltip content={<Tip unit="k MAD" />} />
                    <Area type="monotone" dataKey="theo" name="Théorique" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gFT)" dot={false} />
                    <Area type="monotone" dataKey="sec"  name="Encaissé"  stroke="#2563EB" strokeWidth={2}   fill="url(#gF)"  dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="g2 a3">
              <div className="panel">
                <div className="panel-head">
                  <span className="ph-title">⏱ DSO — 12 mois réels</span>
                  <span className="ph-meta">Moy. <strong className="mono" style={{ color: "#F59E0B" }}>{K.dso_moyen || 0}j</strong></span>
                </div>
                <div className="panel-body">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={DD} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip unit="j" />} />
                      <ReferenceLine y={K.dso_moyen} stroke="rgba(244,63,94,.35)" strokeDasharray="3 2"
                        label={{ value: `Moy ${K.dso_moyen}j`, position: "insideTopRight", fontSize: 9, fill: "#F43F5E" }} />
                      <Line type="monotone" dataKey="v" name="DSO" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: "#F59E0B" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><span className="ph-title">Résumé Forecast</span></div>
                <table className="dt">
                  <thead><tr><th>Période</th><th>Prévision CA</th><th>DSO est.</th><th>Bad Debt</th></tr></thead>
                  <tbody>
                    {[
                      { p: "M+1", v: fmtM(K.forecast_m1 || 0) + "M", dso: (K.dso_moyen || 0), bd: (K.bad_debt_ratio || 0) + "%" },
                      { p: "M+2", v: fmtM(K.forecast_m2 || 0) + "M", dso: ((K.dso_moyen || 0) + 2).toFixed(1), bd: ((K.bad_debt_ratio || 0) + 0.2).toFixed(1) + "%" },
                    ].map(r => (
                      <tr key={r.p}>
                        <td><strong className="mono">{r.p}</strong></td>
                        <td><span className="mono" style={{ fontWeight: 700, color: "#2563EB" }}>{r.v} MAD</span></td>
                        <td><span className="mono" style={{ color: "#F59E0B", fontWeight: 700 }}>{r.dso}j</span></td>
                        <td><span className="mono" style={{ fontWeight: 700, color: "#F43F5E" }}>{r.bd}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="panel-footer">LinearRegression · {K.nb_factures} factures · seuil 0.436</div>
              </div>
            </div>
          </>
        )}

        {/* ══ AI MODEL ══ */}
        {tab === "ai" && (
          <>
            <div className="g5 a1">
              {[
                { l: "AUC-ROC",    v: M.auc       ? M.auc.toFixed(3)                 : "0.805", c: "#F43F5E" },
                { l: "F1-Score",   v: M.f1        ? M.f1.toFixed(3)                  : "0.740", c: "#2563EB" },
                { l: "Recall",     v: M.recall    ? (M.recall*100).toFixed(1)+"%"    : "82.8%", c: "#7C3AED" },
                { l: "Précision",  v: M.precision ? (M.precision*100).toFixed(1)+"%" : "66.9%", c: "#10B981" },
                { l: "Seuil Opt.", v: "0.436",                                                   c: "#F59E0B" },
              ].map(k => (
                <div key={k.l} className="kpi-card" style={{ borderTop: `3px solid ${k.c}` }}>
                  <div className="kpi-label">{k.l}</div>
                  <div className="kpi-val" style={{ color: k.c, fontSize: 22 }}>{k.v}</div>
                </div>
              ))}
            </div>

            <div className="g32 a2">
              <div className="panel">
                <div className="panel-head"><span className="ph-title">🔬 Importance des Variables</span></div>
                <div className="panel-body">
                  {FEATS.map((f, i) => (
                    <div key={f.n} className="feat-row">
                      <span className="mono feat-idx">{String(i+1).padStart(2,"0")}</span>
                      <span className="mono feat-name">{f.n}</span>
                      <div style={{ flex: 1 }}><PBar pct={(f.v / 22) * 100} color={f.c} /></div>
                      <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: f.c, minWidth: 28, textAlign: "right" }}>{f.v}%</span>
                    </div>
                  ))}
                  <div className="feat-note">
                    ✨ Features v2 : variation_ca_client · nb_factures_3m · intervalle_max_hist · ca_trend_3fact
                  </div>
                </div>
              </div>

              <div className="side-col">
                <div className="panel" style={{ flex: 1 }}>
                  <div className="panel-head"><span className="ph-title">Performance Modèle</span></div>
                  <div className="panel-body gauge-grid">
                    <MiniGauge v={M.auc       || 0.805} color="#F43F5E" label="AUC" />
                    <MiniGauge v={M.f1        || 0.740} color="#2563EB" label="F1" />
                    <MiniGauge v={M.recall    || 0.828} color="#7C3AED" label="Recall" />
                    <MiniGauge v={M.precision || 0.669} color="#10B981" label="Précision" />
                  </div>
                </div>
                <div className="panel" style={{ flex: 1 }}>
                  <div className="panel-head"><span className="ph-title">Architecture</span></div>
                  <table className="dt">
                    <tbody>
                      {[
                        ["Algorithme",   "Random Forest"],
                        ["Calibration",  "Isotonique CV=3"],
                        ["Anomalies",    `IsoForest ${((nAnom / (K.nb_factures || 1)) * 100).toFixed(1)}%`],
                        ["Split",        "Temporel 80/20"],
                        ["Anti-Leakage", "Expanding window"],
                        ["Seuil",        "0.436"],
                        ["Factures",     "" + (K.nb_factures || 0)],
                        ["Clients",      "" + (K.nb_clients  || 0)],
                      ].map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ color: "#94A3B8", fontSize: 11, width: "45%" }}>{k}</td>
                          <td><span className="mono" style={{ fontWeight: 600, fontSize: 11 }}>{v}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="panel dark-panel a3">
              <div className="panel-head dark-head">
                <span className="ph-title" style={{ color: "#06B6D4" }}>▸ Executive Summary — Données API Live</span>
              </div>
              <div className="exec-grid">
                {[
                  { l: "Exposition Risque",  v: fmtM(K.exposition_risque || 0) + "M MAD",                c: "#F43F5E" },
                  { l: "Forecast M+1",       v: fmtM(K.forecast_m1 || 0) + "M MAD",                      c: "#2563EB" },
                  { l: "Créances >90j",      v: (K.bad_debt_ratio || 0) + "%",                            c: "#F59E0B" },
                  { l: "DSO Moyen",          v: (K.dso_moyen || 0) + "j",                                 c: "#7C3AED" },
                  { l: "Clients Critiques",  v: nCritClients + " clients",                                 c: "#F43F5E" },
                  { l: "En Danger + Perdus", v: ((S["En Danger"] || 0) + (S["Perdu"] || 0)) + " clients", c: "#F59E0B" },
                ].map(s => (
                  <div key={s.l} className="exec-item">
                    <div className="exec-label">{s.l}</div>
                    <div className="exec-val mono" style={{ color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      {/* ══ MODALE RELANCE ══ */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "#1E293B", borderRadius: 12, padding: "28px 32px",
            minWidth: 420, maxWidth: 520, border: "1px solid #334155",
            boxShadow: "0 24px 48px rgba(0,0,0,0.4)"
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: "#2563EB22",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
              }}>📨</div>
              <div>
                <div style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 15 }}>Confirmer la relance</div>
                <div style={{ color: "#94A3B8", fontSize: 12 }}>Cette action sera enregistrée dans Dolibarr</div>
              </div>
              <button onClick={() => setModal(null)} style={{
                marginLeft: "auto", background: "none", border: "none",
                color: "#64748B", fontSize: 18, cursor: "pointer"
              }}>✕</button>
            </div>

            <div style={{ background: "#0F172A", borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
              {[
                ["Client",        modal.nom],
                ["Taille",        modal.taille],
                ["Encours total", fmt(modal.ttc) + " MAD"],
                ["Prob. retard",  (modal.p * 100).toFixed(1) + "%"],
                ["Statut",        modal.st],
                ["Segment RFM",   modal.rfm],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "5px 0", borderBottom: "1px solid #1E293B"
                }}>
                  <span style={{ color: "#64748B", fontSize: 12 }}>{k}</span>
                  <span style={{
                    color: k === "Prob. retard" ? (modal.p > 0.8 ? "#F43F5E" : "#F59E0B")
                         : k === "Statut"       ? (modal.st === "CRITIQUE" ? "#F43F5E" : "#F59E0B")
                         : "#F1F5F9",
                    fontWeight: 600, fontSize: 12, fontFamily: "JetBrains Mono, monospace"
                  }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: "#2563EB15", border: "1px solid #2563EB30",
              borderRadius: 6, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#94A3B8"
            }}>
              ✓ Enregistrement dans <strong style={{ color: "#06B6D4" }}>Dolibarr (actioncomm)</strong><br/>
              ✓ Ouverture d'un <strong style={{ color: "#06B6D4" }}>email pré-rempli</strong>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)} style={{
                padding: "8px 18px", borderRadius: 6, border: "1px solid #334155",
                background: "none", color: "#94A3B8", cursor: "pointer", fontSize: 13
              }}>Annuler</button>
              <button
                onClick={() => handleRelance(modal)}
                disabled={relLoading}
                style={{
                  padding: "8px 20px", borderRadius: 6, border: "none",
                  background: relLoading ? "#334155" : "#2563EB",
                  color: "#fff", cursor: relLoading ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 700
                }}
              >
                {relLoading ? "Envoi..." : "Confirmer la relance →"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}