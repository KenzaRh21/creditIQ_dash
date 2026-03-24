import React, { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";
import "./App.css";

const fmt   = n => new Intl.NumberFormat("fr-MA").format(Math.round(n));
const fmtM  = n => (n / 1e6).toFixed(2);
const fmtP  = n => `${(n * 100).toFixed(1)}%`;
const pc    = p => p > 0.8 ? "#dc2626" : p > 0.5 ? "#d97706" : "#16a34a";
const gst   = p => p >= 0.8 ? "CRITIQUE" : p >= 0.436 ? "RISQUE" : "SAIN";

const SEG_COLOR = {
  Champion:"#1d4ed8", Fidele:"#15803d", "Fidèle":"#15803d",
  "A Surveiller":"#7c3aed", "À Surveiller":"#7c3aed",
  "En Danger":"#b45309", Perdu:"#dc2626",
};
const SEG_BG = {
  Champion:"#eff6ff", Fidele:"#f0fdf4", "Fidèle":"#f0fdf4",
  "A Surveiller":"#f5f3ff", "À Surveiller":"#f5f3ff",
  "En Danger":"#fffbeb", Perdu:"#fef2f2",
};
const SEG_LABEL = {
  Champion:"Champion", Fidele:"Fidèle",
  "A Surveiller":"À Surveiller", "En Danger":"En Danger", Perdu:"Perdu",
};
const ST_COLOR = { CRITIQUE:"#dc2626", RISQUE:"#d97706", SAIN:"#16a34a" };
const ST_BG    = { CRITIQUE:"#fef2f2", RISQUE:"#fffbeb", SAIN:"#f0fdf4" };

const PBar = ({ pct, color, w="100%" }) => (
  <div style={{ width:w, height:5, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
    <div style={{ width:`${Math.min(100,pct)}%`, height:"100%", background:color, borderRadius:3 }} />
  </div>
);

const Badge = ({ children, color="#1d4ed8", bg="#eff6ff" }) => (
  <span style={{ display:"inline-block", padding:"1px 7px", borderRadius:20,
    fontSize:10, fontWeight:500, background:bg, color, whiteSpace:"nowrap" }}>
    {children}
  </span>
);
const StatBadge = ({ st }) => <Badge color={ST_COLOR[st]} bg={ST_BG[st]}>{st}</Badge>;
const SegBadge  = ({ seg }) => (
  <Badge color={SEG_COLOR[seg]||"#64748b"} bg={SEG_BG[seg]||"#f8fafc"}>
    {SEG_LABEL[seg]||seg}
  </Badge>
);

const Tooltip2 = ({ active, payload, label, unit="" }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"0.5px solid #e2e8f0", borderRadius:6,
      padding:"8px 12px", fontSize:11, boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
      <div style={{ fontWeight:500, marginBottom:4, color:"#334155" }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:2, background:p.color||p.fill, display:"inline-block" }}/>
          <span style={{ color:"#64748b" }}>{p.name}:</span>
          <strong style={{ color:p.color||p.fill, fontFamily:"monospace" }}>
            {typeof p.value==="number"?p.value.toFixed(1):p.value}{unit}
          </strong>
        </div>
      ))}
    </div>
  );
};

const Panel = ({ title, meta, children, style={} }) => (
  <div style={{ background:"#fff", border:"0.5px solid #e2e8f0", borderRadius:8, padding:"14px 16px", ...style }}>
    {(title||meta) && (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        {title && <span style={{ fontSize:12, fontWeight:500, color:"#1e293b" }}>{title}</span>}
        {meta  && <div style={{ display:"flex", alignItems:"center", gap:6 }}>{meta}</div>}
      </div>
    )}
    {children}
  </div>
);

const KpiCard = ({ label, value, sub, color="#1d4ed8", accent }) => (
  <div style={{ background:"#fff", border:"0.5px solid #e2e8f0", borderRadius:8,
    padding:"12px 14px", borderTop:`2.5px solid ${color}` }}>
    <div style={{ fontSize:10, color:"#64748b", marginBottom:4 }}>{label}</div>
    <div style={{ fontSize:18, fontWeight:500, color, lineHeight:1.2 }}>{value}</div>
    {sub    && <div style={{ fontSize:10, color:"#94a3b8", marginTop:3 }}>{sub}</div>}
    {accent && <div style={{ marginTop:6 }}>{accent}</div>}
  </div>
);

const SegRow = ({ color, name, pct, n }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"0.5px solid #f1f5f9" }}>
    <span style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }}/>
    <span style={{ fontSize:11, fontWeight:500, minWidth:94 }}>{name}</span>
    <div style={{ flex:1 }}><PBar pct={pct*3.2} color={color} /></div>
    <span style={{ fontSize:11, fontWeight:500, color, minWidth:22, textAlign:"right" }}>{n}</span>
    <span style={{ fontSize:10, color:"#94a3b8", minWidth:34, textAlign:"right" }}>{pct}%</span>
  </div>
);

const MatriceSante = ({ scatterData }) => {
  const [tooltip, setTooltip] = React.useState(null);
  const pts = scatterData.length > 0 ? scatterData : [
    {x:12,y:0.91,nom:"Client A",seg:"Perdu"},{x:28,y:0.78,nom:"Client C",seg:"En Danger"},
    {x:44,y:0.58,nom:"Client E",seg:"A Surveiller"},{x:64,y:0.35,nom:"Client H",seg:"Fidele"},
    {x:80,y:0.18,nom:"Client J",seg:"Champion"},{x:94,y:0.08,nom:"Client L",seg:"Champion"},
  ];
  const W=700,H=220,ML=42,MR=70,MT=10,MB=28;
  const PW=W-ML-MR,PH=H-MT-MB;
  const sx=v=>ML+(v/100)*PW, sy=v=>MT+(1-v)*PH;
  const yTicks=[0,0.2,0.4,0.6,0.8,1.0], xTicks=[0,20,40,60,80,100];
  return (
    <div style={{ width:"100%", overflowX:"auto", position:"relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:240, display:"block" }}
        onMouseLeave={()=>setTooltip(null)}>
        {yTicks.map(v=><line key={v} x1={ML} y1={sy(v)} x2={ML+PW} y2={sy(v)} stroke="#f1f5f9" strokeWidth={1}/>)}
        {xTicks.map(v=><line key={v} x1={sx(v)} y1={MT} x2={sx(v)} y2={MT+PH} stroke="#f1f5f9" strokeWidth={1}/>)}
        {yTicks.map(v=><text key={v} x={ML-5} y={sy(v)+3.5} textAnchor="end" fontSize={8} fill="#94a3b8">{Math.round(v*100)}%</text>)}
        {xTicks.map(v=><text key={v} x={sx(v)} y={MT+PH+14} textAnchor="middle" fontSize={8} fill="#94a3b8">{v}</text>)}
        <line x1={ML} y1={sy(0.436)} x2={ML+PW} y2={sy(0.436)} stroke="#d97706" strokeWidth={1} strokeDasharray="5,3"/>
        <text x={ML+PW+4} y={sy(0.436)+3} fontSize={8} fill="#d97706">0.436</text>
        <line x1={ML} y1={sy(0.80)} x2={ML+PW} y2={sy(0.80)} stroke="#dc2626" strokeWidth={1} strokeDasharray="5,3"/>
        <text x={ML+PW+4} y={sy(0.80)+3} fontSize={8} fill="#dc2626">0.80</text>
        <line x1={sx(50)} y1={MT} x2={sx(50)} y2={MT+PH} stroke="#e2e8f0" strokeWidth={1}/>
        <line x1={ML} y1={MT} x2={ML} y2={MT+PH} stroke="#e2e8f0" strokeWidth={0.5}/>
        <line x1={ML} y1={MT+PH} x2={ML+PW} y2={MT+PH} stroke="#e2e8f0" strokeWidth={0.5}/>
        <text x={ML+PW/2} y={H-2} textAnchor="middle" fontSize={9} fill="#94a3b8">Score fidélité →</text>
        {pts.map((d,i)=>{
          const color=SEG_COLOR[d.seg]||"#94a3b8";
          const cx=sx(d.x||0), cy=sy(d.y||0);
          const isH=tooltip&&tooltip.i===i;
          return <circle key={i} cx={cx} cy={cy} r={isH?8:5} fill={color} fillOpacity={isH?1:0.78}
            stroke={color} strokeWidth={isH?2:0.5} style={{cursor:"pointer"}}
            onMouseEnter={()=>setTooltip({i,d,cx,cy})} onMouseMove={()=>setTooltip({i,d,cx,cy})}/>;
        })}
      </svg>
      {tooltip&&(()=>{
        const {d,cx,cy}=tooltip, color=SEG_COLOR[d.seg]||"#94a3b8";
        const xP=(cx/W)*100, yP=(cy/240)*100;
        return (
          <div style={{ position:"absolute", left:`${xP}%`, top:`${yP}%`,
            transform:xP>70?"translate(-110%,-110%)":"translate(10%,-110%)",
            background:"#fff", border:"0.5px solid #e2e8f0", borderRadius:6,
            padding:"8px 12px", fontSize:11, pointerEvents:"none", zIndex:10,
            whiteSpace:"nowrap", boxShadow:"0 2px 8px rgba(0,0,0,.10)", minWidth:160 }}>
            <div style={{ fontWeight:600, marginBottom:4, color:"#1e293b" }}>{d.nom}</div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block" }}/>
              <span style={{ color:"#64748b" }}>{SEG_LABEL[d.seg]||d.seg}</span>
            </div>
            <div style={{ color:"#64748b" }}>Fidélité : <strong style={{ color:"#1d4ed8", fontFamily:"monospace" }}>{(d.x||0).toFixed(1)}</strong></div>
            <div style={{ color:"#64748b" }}>Risque : <strong style={{ color:pc(d.y||0), fontFamily:"monospace" }}>{((d.y||0)*100).toFixed(1)}%</strong></div>
          </div>
        );
      })()}
    </div>
  );
};

export default function App() {
  const D=window.__D||{}, K=D.kpis||{}, S=D.segments||{}, T10=D.top10_risque||[],
    Q=D.seuils_rfm||{}, M=D.model_metrics||{}, CD=D.cashflow_mensuel||[],
    DD=D.dso_mensuel||[], RT=D.risque_par_taille||[], FH=D.fhist||[],
    MS=D.matrice_sante||[], SPS=D.score_par_segment||[],
    ALL_C=D.all_clients||[], FACS=D.factures_par_client||{};

  const scatterData=MS.map(c=>({
    x:parseFloat(c.score_fidelite)||0, y:parseFloat(c.prob_retard_moy)||0,
    nom:c.nom_client, seg:c.segment_rfm,
  }));

  const mapClient=c=>({
    fk_soc:c.fk_soc, nom:c.nom_client, ttc:c.ca_total, p:c.prob_retard_moy,
    ipr:c.ipr_total, rfm:c.segment_rfm, fid:c.score_fidelite, taille:c.taille||"—",
    st:gst(c.prob_retard_moy), anom:c.is_anomalie===1,
    ret:c.prob_retard_moy>0.436?Math.round(c.prob_retard_moy*35):0,
  });

  const clients=T10.map(mapClient);
  const allClients=ALL_C.length>0?ALL_C.map(mapClient):clients;
  const nCrit=K.nb_critiques||0, nRisk=K.nb_risque||0;
  const nSain=K.nb_sain||((K.nb_clients||0)-nCrit-nRisk);
  const nCritF=K.nb_critiques_fact||0, nRiskF=K.nb_risque_fact||0, nAnom=K.nb_anomalies||0;

  const SEG_ORDER=["Champion","Fidele","A Surveiller","En Danger","Perdu"];
  const RFMSEGS=SEG_ORDER.map(k=>({
    k, nm:SEG_LABEL[k]||k, n:S[k]||0,
    pct:K.nb_clients>0?Math.round((S[k]||0)/K.nb_clients*1000)/10:0,
    col:SEG_COLOR[k],
  }));
  const spsData=SPS.length?SPS:SEG_ORDER.map((k,i)=>({
    segment:SEG_LABEL[k]||k, score_moyen:[18,32,51,68,83][i],
  }));

  const [tab,setTab]=useState("ov");
  const [srch,setSrch]=useState("");
  const [filt,setFilt]=useState("ALL");
  const [sortKey,setSortKey]=useState("ipr");
  const [sortDir,setSortDir]=useState("desc");
  const [ovSortKey,setOvSortKey]=useState("ipr");
  const [ovSortDir,setOvSortDir]=useState("desc");
  const [ovShowAll,setOvShowAll]=useState(false);
  const [modal,setModal]=useState(null);
  const [drillClient,setDrillClient]=useState(null);
  const [relLoading,setRelLoading]=useState(false);
  const [relDone,setRelDone]=useState({});

  const today=new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
  const toggleSort=k=>{if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortKey(k);setSortDir("desc");}};
  const ovToggleSort=k=>{if(ovSortKey===k)setOvSortDir(d=>d==="asc"?"desc":"asc");else{setOvSortKey(k);setOvSortDir("desc");}};

  const exportXLSX=data=>{
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>{
      const XLSX=window.XLSX;
      const ws_data=[
        ["Client","Taille","CA total (MAD)","Prob. retard %","IPR","Fidélité","Segment","Statut","Anomalie"],
        ...data.map(c=>[c.nom,c.taille,Math.round(c.ttc),parseFloat((c.p*100).toFixed(1)),
          parseFloat(c.ipr.toFixed(2)),c.fid,c.rfm,c.st,c.anom?"OUI":"NON"])
      ];
      const ws=XLSX.utils.aoa_to_sheet(ws_data);
      ws['!cols']=[30,10,16,14,8,10,14,10,10].map(w=>({wch:w}));
      data.forEach((c,i)=>{
        const row=i+2, stCell=`H${row}`, prCell=`D${row}`;
        const stC=c.st==="CRITIQUE"?"FFDC2626":c.st==="RISQUE"?"FFD97706":"FF16A34A";
        const prC=c.p>=0.8?"FFDC2626":c.p>=0.436?"FFD97706":"FF16A34A";
        if(!ws[stCell])ws[stCell]={v:c.st,t:"s"};
        if(!ws[prCell])ws[prCell]={v:parseFloat((c.p*100).toFixed(1)),t:"n"};
        ws[stCell].s={font:{color:{rgb:stC},bold:true}};
        ws[prCell].s={font:{color:{rgb:prC},bold:true}};
      });
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,"Clients Scoring");
      XLSX.writeFile(wb,"clients_scoring.xlsx");
    };
    if(!window.XLSX)document.head.appendChild(s); else s.onload();
  };

  const sortVal=(c,key)=>{
    if(key==="nom")return c.nom.toLowerCase();
    if(key==="taille")return c.taille;
    if(key==="ttc")return c.ttc; if(key==="p")return c.p;
    if(key==="ipr")return c.ipr; if(key==="fid")return c.fid;
    if(key==="rfm")return c.rfm; if(key==="ret")return c.ret;
    if(key==="st")return["CRITIQUE","RISQUE","SAIN"].indexOf(c.st);
    return 0;
  };

  const rows=clients
    .filter(c=>c.nom.toLowerCase().includes(srch.toLowerCase())&&
      (filt==="ALL"||c.st===filt||(filt==="ANOM"&&c.anom)))
    .sort((a,b)=>{const av=sortVal(a,sortKey),bv=sortVal(b,sortKey);
      if(av<bv)return sortDir==="asc"?-1:1; if(av>bv)return sortDir==="asc"?1:-1; return 0;});

  const ovClientsSorted=[...allClients].sort((a,b)=>{
    const av=sortVal(a,ovSortKey),bv=sortVal(b,ovSortKey);
    if(av<bv)return ovSortDir==="asc"?-1:1; if(av>bv)return ovSortDir==="asc"?1:-1; return 0;});
  const ovClients=ovShowAll?ovClientsSorted:ovClientsSorted.slice(0,10);

  const handleRelance=async c=>{
    setRelLoading(true);
    try{
      await fetch("http://localhost:5000/api/scoring/relance",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({fk_soc:c.fk_soc,nom_client:c.nom,ca_total:c.ttc,prob_retard_moy:c.p}),
      });
      setRelDone(prev=>({...prev,[c.fk_soc]:true}));
    }catch(e){console.error(e);}
    setRelLoading(false);
    const sujet=encodeURIComponent(`Relance paiement — ${c.nom}`);
    const corps=encodeURIComponent(`Bonjour,\n\nNous vous contactons concernant vos factures en retard.\n\nClient : ${c.nom}\nEncours : ${fmt(c.ttc)} MAD\nProbabilité retard : ${(c.p*100).toFixed(1)}%\n\nMerci de régulariser votre situation dans les meilleurs délais.\n\nCordialement`);
    window.open(`mailto:?subject=${sujet}&body=${corps}`);
    setModal(null);
  };

  const TABS=[
    {id:"ov",lb:"Aperçu général"},
    {id:"rp",lb:"Risk Pipeline",bdg:nCrit>0?nCrit:null,bc:"#dc2626"},
    {id:"rfm",lb:"Fidélité RFM",bdg:nAnom>0?nAnom:null,bc:"#7c3aed"},
    {id:"fc",lb:"Prévisions"},
    {id:"ai",lb:"Modèle IA"},
  ];

  const css={
    root:{fontFamily:"system-ui,-apple-system,sans-serif",fontSize:13,color:"#1e293b",background:"#f8fafc",minHeight:"100vh"},
    topbar:{display:"flex",alignItems:"center",gap:12,padding:"8px 18px",background:"#fff",borderBottom:"0.5px solid #e2e8f0",flexWrap:"wrap"},
    logoBox:{width:30,height:30,borderRadius:6,background:"#1d4ed8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
    logoTxt:{color:"#fff",fontSize:12,fontWeight:500},
    tabs:{display:"flex",gap:0,borderBottom:"0.5px solid #e2e8f0",background:"#fff",padding:"0 18px",overflowX:"auto"},
    tab:{padding:"9px 14px",fontSize:12,fontWeight:400,color:"#64748b",cursor:"pointer",borderBottom:"2px solid transparent",whiteSpace:"nowrap",background:"none",border:"none"},
    tabOn:{color:"#1d4ed8",fontWeight:500,borderBottom:"2px solid #1d4ed8"},
    content:{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12},
    kpiRow:{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10},
    row2:{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10},
    row2b:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},
    row3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10},
    row4:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10},
    row5:{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:10},
    alert:{background:"#fef2f2",border:"0.5px solid #fca5a5",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,fontSize:11,color:"#7f1d1d",flexWrap:"wrap"},
    table:{width:"100%",borderCollapse:"collapse"},
    th:{fontSize:10,fontWeight:500,color:"#64748b",padding:"6px 8px",borderBottom:"0.5px solid #e2e8f0",textAlign:"left",whiteSpace:"nowrap"},
    td:{fontSize:11,padding:"7px 8px",borderBottom:"0.5px solid #f1f5f9",color:"#1e293b",verticalAlign:"middle"},
    footer:{fontSize:10,color:"#94a3b8",marginTop:8,borderTop:"0.5px solid #f1f5f9",paddingTop:6},
    mono:{fontFamily:"ui-monospace,monospace",fontSize:11},
    btnRel:{fontSize:10,padding:"3px 10px",color:"#1d4ed8",borderRadius:4,border:"0.5px solid #93c5fd",background:"#eff6ff",cursor:"pointer"},
    btnRelDone:{fontSize:10,color:"#16a34a",fontWeight:700},
    modal:{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"},
    modalBox:{background:"#fff",borderRadius:12,padding:"24px 28px",minWidth:400,maxWidth:500,border:"0.5px solid #e2e8f0"},
  };

  const thSort=(label,key)=>(
    <th style={{...css.th,cursor:key?"pointer":"default",userSelect:"none"}} onClick={()=>key&&toggleSort(key)}>
      <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
        {label}
        {key&&<span style={{fontSize:9,color:sortKey===key?"#1d4ed8":"#cbd5e1"}}>
          {sortKey===key?(sortDir==="asc"?"▲":"▼"):"⇅"}
        </span>}
      </span>
    </th>
  );
  const thOvSort=(label,key)=>(
    <th style={{...css.th,cursor:key?"pointer":"default",userSelect:"none"}} onClick={()=>key&&ovToggleSort(key)}>
      <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
        {label}
        {key&&<span style={{fontSize:9,color:ovSortKey===key?"#1d4ed8":"#cbd5e1"}}>
          {ovSortKey===key?(ovSortDir==="asc"?"▲":"▼"):"⇅"}
        </span>}
      </span>
    </th>
  );

  return (
    <div style={css.root}>
      <div style={css.topbar}>
        <div style={css.logoBox}><span style={css.logoTxt}>IA</span></div>
        <div>
          <div style={{fontSize:14,fontWeight:500}}>Scoring IA — Crédit Risk</div>
          <div style={{fontSize:10,color:"#64748b"}}>Module Dolibarr · Analyse & Prévisions</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,color:"#64748b",display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#16a34a",display:"inline-block"}}/>
            API connectée
          </span>
          <Badge color="#185FA5" bg="#eff6ff">{K.nb_factures||0} factures</Badge>
          <Badge color="#374151" bg="#f8fafc">{today}</Badge>
        </div>
      </div>

      <div style={css.tabs}>
        {TABS.map(t=>(
          <button key={t.id} style={{...css.tab,...(tab===t.id?css.tabOn:{})}} onClick={()=>setTab(t.id)}>
            {t.lb}
            {t.bdg!=null&&<span style={{marginLeft:5,background:t.bc,color:"#fff",fontSize:9,fontWeight:600,padding:"1px 5px",borderRadius:20}}>{t.bdg}</span>}
          </button>
        ))}
      </div>

      <div style={css.content}>
        {nCrit>0&&(
          <div style={css.alert}>
            <Badge color="#fff" bg="#dc2626">ALERTE</Badge>
            <strong>{nCrit} clients CRITIQUE</strong>
            <span>· {nRisk} à RISQUE · Exposition {fmtM(K.exposition_risque||0)}M MAD · {nAnom} anomalies</span>
            <button onClick={()=>{setTab("rp");setFilt("CRITIQUE");}}
              style={{marginLeft:"auto",padding:"4px 12px",borderRadius:4,border:"0.5px solid #fca5a5",background:"#fff",cursor:"pointer",fontSize:11,color:"#b91c1c"}}>
              Voir clients critiques →
            </button>
          </div>
        )}

        <div style={css.kpiRow}>
          <KpiCard label="Exposition risque"  value={fmtM(K.exposition_risque||0)+"M MAD"} sub={`${K.pct_risque||0}% du CA`}  color="#dc2626"/>
          <KpiCard label="Créances >90j"       value={(K.bad_debt_ratio||0)+"%"}            sub={fmt(K.bad_debt||0)+" MAD"}    color="#d97706"/>
          <KpiCard label="CA sécurisé IA"      value={fmtM(K.ca_securise||0)+"M MAD"}       sub="Estimation relances"          color="#16a34a"/>
          <KpiCard label="Forecast M+1"        value={fmtM(K.forecast_m1||0)+"M MAD"}       sub="Régression linéaire"          color="#1d4ed8"/>
          <KpiCard label="DSO moyen"            value={(K.dso_moyen||0)+" j"}               sub="Norme B2B : 30j"              color="#7c3aed"/>
          <KpiCard label="Clients / Factures"   value={`${K.nb_clients||0} / ${K.nb_factures||0}`} sub={`${nAnom} anomalies`} color="#0e7490"/>
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab==="ov"&&(
          <>
            <Panel title="Matrice santé client — Fidélité vs Probabilité de retard"
              meta={<>{SEG_ORDER.map(k=>(
                <span key={k} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#64748b"}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:SEG_COLOR[k]}}/>
                  {SEG_LABEL[k]||k}
                </span>
              ))}</>}>
              <MatriceSante scatterData={scatterData}/>
            </Panel>

            <div style={css.row2}>
              <Panel title="Cash-flow mensuel — 12 derniers mois"
                meta={<>
                  <span style={{fontSize:10,color:"#94a3b8",display:"flex",alignItems:"center",gap:3}}><span style={{display:"inline-block",width:18,height:2,background:"#94a3b8"}}/> Facturé</span>
                  <span style={{fontSize:10,color:"#16a34a",display:"flex",alignItems:"center",gap:3}}><span style={{display:"inline-block",width:18,height:2,background:"#16a34a"}}/> Encaissé</span>
                  <span style={{fontSize:10,color:"#1d4ed8",display:"flex",alignItems:"center",gap:3}}><span style={{display:"inline-block",width:18,height:2,background:"#1d4ed8"}}/> Sécurisé IA</span>
                </>}>
                <ResponsiveContainer width="100%" height={165}>
                  <AreaChart data={CD} margin={{top:4,right:4,bottom:0,left:0}}>
                    <defs>
                      <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/><stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.15}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.1}/><stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="m" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false} interval={0}/>
                    <YAxis tick={{fontSize:9,fill:"#94a3b8",fontFamily:"monospace"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}k`}/>
                    <Tooltip content={<Tooltip2 unit="k MAD"/>}/>
                    <Area type="monotone" dataKey="theo" name="Facturé"     stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gT)" dot={false}/>
                    <Area type="monotone" dataKey="enc"  name="Encaissé"    stroke="#16a34a" strokeWidth={2}   fill="url(#gE)" dot={false}/>
                    <Area type="monotone" dataKey="sec"  name="Sécurisé IA" stroke="#1d4ed8" strokeWidth={1.5} strokeDasharray="3 2" fill="url(#gS)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>

              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <Panel title="Statut clients" style={{flex:1}}>
                  {[{l:"CRITIQUE",n:nCrit,pct:parseFloat((nCrit/(K.nb_clients||1)*100).toFixed(1)),c:"#dc2626"},
                    {l:"RISQUE",  n:nRisk,pct:parseFloat((nRisk/(K.nb_clients||1)*100).toFixed(1)),c:"#d97706"},
                    {l:"SAIN",   n:nSain,pct:parseFloat((nSain/(K.nb_clients||1)*100).toFixed(1)),c:"#16a34a"},
                  ].map(s=>(
                    <div key={s.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"0.5px solid #f1f5f9"}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:s.c,flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:500,minWidth:60}}>{s.l}</span>
                      <div style={{flex:1}}><PBar pct={Math.min(100,s.pct*3)} color={s.c}/></div>
                      <span style={{fontSize:11,fontWeight:600,color:s.c,minWidth:22,textAlign:"right"}}>{s.n}</span>
                      <span style={{fontSize:10,color:"#94a3b8",minWidth:32,textAlign:"right"}}>{s.pct}%</span>
                    </div>
                  ))}
                  <div style={{fontSize:9,color:"#94a3b8",marginTop:6}}>Par prob_retard_moy · seuil 0.436</div>
                </Panel>
                <Panel title="Segments RFM" style={{flex:1}}>
                  {RFMSEGS.map(s=><SegRow key={s.k} color={s.col} name={s.nm} pct={s.pct} n={s.n}/>)}
                </Panel>
              </div>
            </div>

            <Panel
              title={`${ovShowAll?"Tous les clients":"Top 10 clients"} — IPR prioritaire`}
              meta={<>
                <Badge color="#dc2626" bg="#fef2f2">{nCrit} CRITIQUE</Badge>
                <Badge color="#d97706" bg="#fffbeb">{nRisk} RISQUE</Badge>
                <Badge color="#16a34a" bg="#f0fdf4">{nSain} SAIN</Badge>
                <button onClick={()=>setOvShowAll(v=>!v)} style={{fontSize:10,padding:"3px 10px",borderRadius:4,border:"0.5px solid #e2e8f0",background:"#fff",cursor:"pointer",color:"#64748b"}}>
                  {ovShowAll?`▲ Top 10`:`▼ Tout afficher (${allClients.length})`}
                </button>
                <button onClick={()=>exportXLSX(ovClientsSorted)} style={{fontSize:10,padding:"3px 10px",borderRadius:4,border:"0.5px solid #93c5fd",background:"#eff6ff",cursor:"pointer",color:"#1d4ed8"}}>
                  ↓ Export Excel
                </button>
              </>}>
              <div style={{overflowX:"auto"}}>
                <table style={css.table}>
                  <thead><tr><th style={css.th}>#</th>{thOvSort("Client","nom")}{thOvSort("Taille","taille")}{thOvSort("CA total","ttc")}{thOvSort("Prob. retard","p")}{thOvSort("IPR","ipr")}{thOvSort("Fidélité","fid")}{thOvSort("Segment","rfm")}{thOvSort("Statut","st")}<th style={css.th}>Action</th></tr></thead>
                  <tbody>
                    {ovClients.map((c,i)=>(
                      <tr key={c.fk_soc} style={{background:c.anom?"#fffbeb":"transparent"}}>
                        <td style={{...css.td,color:"#94a3b8",fontSize:10}}>{String(i+1).padStart(2,"0")}</td>
                        <td style={css.td}><div style={{fontWeight:500}}>{c.nom}</div>{c.anom&&<Badge color="#854f09" bg="#fef3c7">⚠ anomalie</Badge>}</td>
                        <td style={css.td}><Badge color="#374151" bg="#f8fafc">{c.taille}</Badge></td>
                        <td style={{...css.td,...css.mono}}>{fmt(c.ttc)} MAD</td>
                        <td style={{...css.td,minWidth:110}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <PBar pct={c.p*100} color={pc(c.p)} w="50px"/>
                            <span style={{...css.mono,color:pc(c.p),fontWeight:700}}>{fmtP(c.p)}</span>
                          </div>
                        </td>
                        <td style={css.td}><span style={{...css.mono,fontWeight:700,color:c.ipr>8?"#dc2626":c.ipr>6?"#d97706":"#16a34a"}}>{c.ipr.toFixed(1)}</span></td>
                        <td style={css.td}>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <PBar pct={c.fid} color={c.fid>70?"#1d4ed8":c.fid>50?"#16a34a":c.fid>30?"#d97706":"#dc2626"} w="36px"/>
                            <span style={{...css.mono,fontWeight:700}}>{c.fid}</span>
                          </div>
                        </td>
                        <td style={css.td}><SegBadge seg={c.rfm}/></td>
                        <td style={css.td}><StatBadge st={c.st}/></td>
                        <td style={css.td}>
                          {c.st!=="SAIN"&&(relDone[c.fk_soc]?<span style={css.btnRelDone}>✓ Envoyé</span>:<button style={css.btnRel} onClick={()=>setModal(c)}>Relancer</button>)}
                          <button style={{fontSize:10,padding:"2px 8px",color:"#0e7490",borderRadius:4,border:"0.5px solid #a5f3fc",background:"#ecfeff",cursor:"pointer",marginLeft:4}} onClick={()=>setDrillClient(c)}>⊕ Détail</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={css.footer}>{ovShowAll?`${allClients.length} clients affichés`:"Top 10 par IPR"} · Tri : <strong style={{color:"#1d4ed8"}}>{ovSortKey}</strong> {ovSortDir==="asc"?"↑":"↓"} · CRITIQUE ≥ 0.80 · RISQUE ≥ 0.436</div>
            </Panel>
          </>
        )}

        {/* ══ RISK PIPELINE ══ */}
        {tab==="rp"&&(
          <>
            <div style={css.row4}>
              {[{l:"Total clients",v:K.nb_clients||0,c:"#1d4ed8",s:"Population complète"},{l:"Clients critiques",v:nCrit,c:"#dc2626",s:"prob moy ≥ 0.80"},{l:"Clients à risque",v:nRisk,c:"#d97706",s:"prob moy ≥ 0.436"},{l:"Clients sains",v:nSain,c:"#16a34a",s:"prob moy < 0.436"}]
                .map(k=><KpiCard key={k.l} label={k.l} value={k.v} sub={k.s} color={k.c}/>)}
            </div>
            <div style={css.row4}>
              {[{l:"Total factures",v:K.nb_factures||0,c:"#1d4ed8",s:"Toutes factures"},{l:"Factures critiques",v:nCritF,c:"#dc2626",s:"prob ≥ 0.80 ou retard payé >30j"},{l:"Factures à risque",v:nRiskF,c:"#d97706",s:"prob ≥ 0.436 ou retard payé >5j"},{l:"Anomalies IsoForest",v:nAnom,c:"#7c3aed",s:`${((nAnom/(K.nb_factures||1))*100).toFixed(1)}% des factures`}]
                .map(k=><KpiCard key={k.l} label={k.l} value={k.v} sub={k.s} color={k.c}/>)}
            </div>

            <div style={css.row3}>
              <Panel title="DSO mensuel — tendance réelle" meta={<span style={{fontSize:10,color:"#d97706",fontWeight:500}}>Moy. {K.dso_moyen||0}j</span>}>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={DD} margin={{top:4,right:4,bottom:0,left:0}}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="m" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false} interval={0}/><YAxis tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tooltip2 unit="j"/>}/>
                    <ReferenceLine y={K.dso_moyen} stroke="rgba(220,38,38,.3)" strokeDasharray="3 2" label={{value:`Moy ${K.dso_moyen}j`,position:"insideTopRight",fontSize:9,fill:"#dc2626"}}/>
                    <Line type="monotone" dataKey="v" name="DSO" stroke="#d97706" strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Risque de retard par taille">
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={RT} layout="vertical" margin={{top:4,right:8,bottom:0,left:0}}>
                    <CartesianGrid stroke="#f1f5f9" horizontal={false}/><XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis dataKey="t" type="category" width={88} tick={{fontSize:11,fill:"#334155"}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tooltip2 unit="%"/>}/>
                    <Bar dataKey="v" name="Risque" radius={[0,3,3,0]}>{RT.map((e,i)=><Cell key={i} fill={e.v>60?"#dc2626":e.v>40?"#d97706":"#16a34a"}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Encaissé vs Facturé — 12 mois" meta={<><span style={{fontSize:10,color:"#94a3b8",display:"flex",alignItems:"center",gap:3}}><span style={{width:14,height:2,background:"#cbd5e1",display:"inline-block"}}/> Facturé</span><span style={{fontSize:10,color:"#16a34a",display:"flex",alignItems:"center",gap:3}}><span style={{width:14,height:2,background:"#16a34a",display:"inline-block"}}/> Encaissé</span></>}>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={CD} margin={{top:4,right:4,bottom:0,left:0}}>
                    <defs>
                      <linearGradient id="gRPT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.08}/><stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gRPE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.15}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="m" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false} interval={0}/><YAxis tick={{fontSize:9,fill:"#94a3b8",fontFamily:"monospace"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}k`}/>
                    <Tooltip content={<Tooltip2 unit="k MAD"/>}/>
                    <Area type="monotone" dataKey="theo" name="Facturé"  stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gRPT)" dot={false}/>
                    <Area type="monotone" dataKey="enc"  name="Encaissé" stroke="#16a34a" strokeWidth={2}   fill="url(#gRPE)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            <Panel title={`Risk Pipeline — ${rows.length} client(s) affiché(s)`}
              meta={<>
                {["ALL","CRITIQUE","RISQUE","SAIN","ANOM"].map(f=>(
                  <button key={f} style={{fontSize:10,padding:"3px 9px",borderRadius:20,cursor:"pointer",border:"0.5px solid #e2e8f0",background:filt===f?"#1d4ed8":"#fff",color:filt===f?"#fff":"#64748b"}} onClick={()=>setFilt(f)}>{f}</button>
                ))}
                <input type="text" placeholder="Rechercher..." value={srch} onChange={e=>setSrch(e.target.value)} style={{fontSize:11,padding:"4px 10px",border:"0.5px solid #e2e8f0",borderRadius:6,outline:"none",width:160}}/>
              </>}>
              <div style={{overflowX:"auto"}}>
                <table style={css.table}>
                  <thead><tr><th style={css.th}>#</th>{thSort("Client","nom")}{thSort("Taille","taille")}{thSort("CA total","ttc")}{thSort("Prob. retard","p")}{thSort("IPR","ipr")}{thSort("Fidélité","fid")}{thSort("Segment","rfm")}{thSort("Retard est.","ret")}{thSort("Statut","st")}<th style={css.th}>Action</th></tr></thead>
                  <tbody>
                    {rows.map((c,i)=>(
                      <tr key={c.fk_soc} style={{background:c.anom?"#fffbeb":"transparent"}}>
                        <td style={{...css.td,color:"#94a3b8",fontSize:10}}>{String(i+1).padStart(2,"0")}</td>
                        <td style={css.td}><strong>{c.nom}</strong>{c.anom&&<span style={{marginLeft:4}}><Badge color="#854f09" bg="#fef3c7">⚠ ANOM</Badge></span>}</td>
                        <td style={css.td}><Badge color="#374151" bg="#f8fafc">{c.taille}</Badge></td>
                        <td style={{...css.td,...css.mono}}>{fmt(c.ttc)}</td>
                        <td style={{...css.td,minWidth:110}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}><PBar pct={c.p*100} color={pc(c.p)} w="50px"/><span style={{...css.mono,color:pc(c.p),fontWeight:700}}>{fmtP(c.p)}</span></div>
                        </td>
                        <td style={css.td}><span style={{...css.mono,fontWeight:700,color:c.ipr>8?"#dc2626":c.ipr>6?"#d97706":"#16a34a"}}>{c.ipr.toFixed(1)}</span></td>
                        <td style={css.td}><div style={{display:"flex",alignItems:"center",gap:5}}><PBar pct={c.fid} color={c.fid>70?"#1d4ed8":c.fid>50?"#16a34a":c.fid>30?"#d97706":"#dc2626"} w="36px"/><span style={{...css.mono,fontWeight:700}}>{c.fid}</span></div></td>
                        <td style={css.td}><SegBadge seg={c.rfm}/></td>
                        <td style={css.td}><span style={{...css.mono,fontWeight:700,color:c.ret>0?"#dc2626":"#94a3b8"}}>{c.ret>0?`+${c.ret}j`:"—"}</span></td>
                        <td style={css.td}><StatBadge st={c.st}/></td>
                        <td style={css.td}>
                          {c.st!=="SAIN"&&(relDone[c.fk_soc]?<span style={css.btnRelDone}>✓ Envoyé</span>:<button style={css.btnRel} onClick={()=>setModal(c)}>Relancer</button>)}
                          <button style={{fontSize:10,padding:"2px 8px",color:"#0e7490",borderRadius:4,border:"0.5px solid #a5f3fc",background:"#ecfeff",cursor:"pointer",marginLeft:4}} onClick={()=>setDrillClient(c)}>⊕ Détail</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={css.footer}>Tri actif : <strong style={{color:"#1d4ed8"}}>{sortKey}</strong> {sortDir==="asc"?"↑":"↓"} · Statut client = classification par prob_retard_moy · {K.nb_clients} clients total</div>
            </Panel>
          </>
        )}

        {/* ══ RFM ══ */}
        {tab==="rfm"&&(
          <>
            <div style={css.row5}>{RFMSEGS.map(s=><KpiCard key={s.k} label={s.nm} value={s.n} sub={`${s.pct}%`} color={s.col} accent={<PBar pct={Math.min(100,s.pct*3.5)} color={s.col}/>}/>)}</div>
            <div style={css.row2b}>
              <Panel title="Score fidélité moyen par segment">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={spsData} margin={{top:10,right:10,bottom:10,left:0}}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="segment" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tooltip2 unit="/100"/>}/>
                    <Bar dataKey="score_moyen" name="Score moyen" radius={[3,3,0,0]}>
                      {spsData.map((d,i)=>{const seg=SEG_ORDER.find(s=>SEG_LABEL[s]===d.segment||s===d.segment);return <Cell key={i} fill={SEG_COLOR[seg]||"#94a3b8"}/>;})}</Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={css.footer}>Score 0–100 · calculé par formule RFM pondérée</div>
              </Panel>
              <Panel title="Distribution score fidélité par segment">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={FH} margin={{top:10,right:10,bottom:10,left:0}}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="r" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><Tooltip/>
                    <Bar dataKey="pe" name="Perdu"        stackId="a" fill={SEG_COLOR.Perdu}/>
                    <Bar dataKey="da" name="En Danger"    stackId="a" fill={SEG_COLOR["En Danger"]}/>
                    <Bar dataKey="su" name="À Surveiller" stackId="a" fill={SEG_COLOR["A Surveiller"]}/>
                    <Bar dataKey="fi" name="Fidèle"       stackId="a" fill={SEG_COLOR.Fidele}/>
                    <Bar dataKey="ch" name="Champion"     stackId="a" fill={SEG_COLOR.Champion} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>
            <div style={css.row2b}>
              <Panel title="Seuils quantiles — API live">
                <table style={css.table}>
                  <thead><tr>{["Segment","Score min","Score max","Clients"].map(h=><th key={h} style={css.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[{sg:"Champion",mn:Q.q85,mx:100,n:S["Champion"]||0,c:SEG_COLOR.Champion},{sg:"Fidèle",mn:Q.q65,mx:Q.q85,n:S["Fidele"]||0,c:SEG_COLOR.Fidele},{sg:"À surveiller",mn:Q.q25,mx:Q.q65,n:S["A Surveiller"]||0,c:SEG_COLOR["A Surveiller"]},{sg:"En danger",mn:Q.q10,mx:Q.q25,n:S["En Danger"]||0,c:SEG_COLOR["En Danger"]},{sg:"Perdu",mn:0,mx:Q.q10,n:S["Perdu"]||0,c:SEG_COLOR.Perdu}]
                      .map(s=>(
                        <tr key={s.sg}>
                          <td style={css.td}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:s.c}}/><strong>{s.sg}</strong></div></td>
                          <td style={{...css.td,...css.mono,color:"#64748b"}}>{s.mn}</td><td style={{...css.td,...css.mono,color:"#64748b"}}>{s.mx}</td>
                          <td style={{...css.td,...css.mono,fontWeight:700,color:s.c}}>{s.n}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div style={css.footer}>q10={Q.q10} · q25={Q.q25} · q65={Q.q65} · q85={Q.q85}</div>
              </Panel>
              <Panel title="Clients — Top 10 IPR">
                <div style={{overflowX:"auto"}}>
                  <table style={css.table}>
                    <thead><tr>{["Client","Fidélité","Prob. retard","Segment","Statut"].map(h=><th key={h} style={css.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {clients.map((c,i)=>(
                        <tr key={i}>
                          <td style={css.td}><strong>{c.nom}</strong></td>
                          <td style={css.td}><div style={{display:"flex",alignItems:"center",gap:5}}><PBar pct={c.fid} color={c.fid>70?"#1d4ed8":c.fid>50?"#16a34a":c.fid>30?"#d97706":"#dc2626"} w="40px"/><span style={{...css.mono,fontWeight:700}}>{c.fid}</span></div></td>
                          <td style={{...css.td,...css.mono,color:pc(c.p),fontWeight:700}}>{fmtP(c.p)}</td>
                          <td style={css.td}><SegBadge seg={c.rfm}/></td>
                          <td style={css.td}><StatBadge st={c.st}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          </>
        )}

        {/* ══ FORECAST ══ */}
        {tab==="fc"&&(
          <>
            <div style={css.row4}>
              {[{l:"Forecast M+1",v:fmtM(K.forecast_m1||0)+"M MAD",c:"#1d4ed8",s:"Régression linéaire"},{l:"Forecast M+2",v:fmtM(K.forecast_m2||0)+"M MAD",c:"#7c3aed",s:"Régression linéaire"},{l:"DSO moyen",v:(K.dso_moyen||0)+" j",c:"#d97706",s:"Norme B2B : 30j"},{l:"Bad Debt Ratio",v:(K.bad_debt_ratio||0)+"%",c:"#dc2626",s:fmt(K.bad_debt||0)+" MAD"}]
                .map(k=><KpiCard key={k.l} label={k.l} value={k.v} sub={k.s} color={k.c}/>)}
            </div>
            <Panel title="Cash-flow — 12 mois (kMAD)" meta={<><span style={{fontSize:10,color:"#94a3b8"}}>Facturé</span><span style={{fontSize:10,color:"#16a34a"}}>Encaissé réel</span><span style={{fontSize:10,color:"#1d4ed8"}}>Sécurisé IA</span></>}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={CD} margin={{top:4,right:12,bottom:0,left:10}}>
                  <defs>
                    <linearGradient id="gFc1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/><stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gFc2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.15}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gFc3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.1}/><stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="m" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} interval={0}/><YAxis tick={{fontSize:9,fill:"#94a3b8",fontFamily:"monospace"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}k`}/>
                  <Tooltip content={<Tooltip2 unit="k MAD"/>}/>
                  <Area type="monotone" dataKey="theo" name="Facturé"     stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gFc1)" dot={false}/>
                  <Area type="monotone" dataKey="enc"  name="Encaissé"    stroke="#16a34a" strokeWidth={2}   fill="url(#gFc2)" dot={false}/>
                  <Area type="monotone" dataKey="sec"  name="Sécurisé IA" stroke="#1d4ed8" strokeWidth={1.5} strokeDasharray="3 2" fill="url(#gFc3)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
            <div style={css.row2b}>
              <Panel title="DSO — tendance mensuelle" meta={<span style={{fontSize:10,color:"#d97706"}}>Moy. {K.dso_moyen||0}j</span>}>
                <ResponsiveContainer width="100%" height={165}>
                  <LineChart data={DD} margin={{top:4,right:4,bottom:0,left:0}}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="m" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} interval={0}/><YAxis tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tooltip2 unit="j"/>}/>
                    <ReferenceLine y={K.dso_moyen} stroke="rgba(220,38,38,.3)" strokeDasharray="3 2" label={{value:`Moy ${K.dso_moyen}j`,position:"insideTopRight",fontSize:9,fill:"#dc2626"}}/>
                    <Line type="monotone" dataKey="v" name="DSO" stroke="#d97706" strokeWidth={2} dot={{r:3,fill:"#d97706"}}/>
                  </LineChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Résumé forecast">
                <table style={css.table}>
                  <thead><tr>{["Période","Prévision CA","DSO est.","Bad Debt"].map(h=><th key={h} style={css.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[{p:"M+1",v:fmtM(K.forecast_m1||0)+"M",dso:K.dso_moyen||0,bd:(K.bad_debt_ratio||0)+"%"},{p:"M+2",v:fmtM(K.forecast_m2||0)+"M",dso:((K.dso_moyen||0)+2).toFixed(1),bd:((K.bad_debt_ratio||0)+0.2).toFixed(1)+"%"}]
                      .map(r=>(<tr key={r.p}><td style={css.td}><strong style={css.mono}>{r.p}</strong></td><td style={{...css.td,...css.mono,color:"#1d4ed8",fontWeight:700}}>{r.v} MAD</td><td style={{...css.td,...css.mono,color:"#d97706",fontWeight:700}}>{r.dso}j</td><td style={{...css.td,...css.mono,color:"#dc2626",fontWeight:700}}>{r.bd}</td></tr>))}
                  </tbody>
                </table>
                <div style={css.footer}>LinearRegression · {K.nb_factures} factures · seuil 0.436</div>
              </Panel>
            </div>
            <Panel title="Risque de retard par taille d'entreprise">
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={RT} layout="vertical" margin={{top:4,right:20,bottom:0,left:60}}>
                  <CartesianGrid stroke="#f1f5f9" horizontal={false}/><XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis dataKey="t" type="category" width={80} tick={{fontSize:11,fill:"#334155"}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tooltip2 unit="%"/>}/>
                  <Bar dataKey="v" name="Risque" radius={[0,3,3,0]}>{RT.map((e,i)=><Cell key={i} fill={e.v>60?"#dc2626":e.v>40?"#d97706":"#16a34a"}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </>
        )}

        {/* ══ AI MODEL ══ */}
        {tab==="ai"&&(
          <>
            <div style={css.row5}>
              {[{l:"AUC-ROC",v:M.auc?M.auc.toFixed(3):"0.805",c:"#dc2626"},{l:"F1-Score",v:M.f1?M.f1.toFixed(3):"0.740",c:"#1d4ed8"},{l:"Recall",v:M.recall?(M.recall*100).toFixed(1)+"%":"82.8%",c:"#7c3aed"},{l:"Précision",v:M.precision?(M.precision*100).toFixed(1)+"%":"66.9%",c:"#16a34a"},{l:"Seuil opt.",v:"0.436",c:"#d97706"}]
                .map(k=><KpiCard key={k.l} label={k.l} value={k.v} color={k.c}/>)}
            </div>
            <div style={css.row2b}>
              <Panel title="Importance des variables">
                {[{n:"tx_succes_hist",v:22,c:"#dc2626"},{n:"nb_defauts_hist",v:18,c:"#dc2626"},{n:"tendance_retard",v:15,c:"#0e7490"},{n:"encours_client",v:12,c:"#1d4ed8"},{n:"variation_ca_client",v:9,c:"#7c3aed"},{n:"nb_factures_3m",v:8,c:"#1d4ed8"},{n:"total_ttc",v:7,c:"#7c3aed"},{n:"mois_critique",v:5,c:"#d97706"}]
                  .map((f,i)=>(
                    <div key={f.n} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:"0.5px solid #f8fafc"}}>
                      <span style={{...css.mono,color:"#94a3b8",minWidth:16,fontSize:10}}>{String(i+1).padStart(2,"0")}</span>
                      <span style={{...css.mono,fontSize:11,flex:1,color:"#334155"}}>{f.n}</span>
                      <div style={{width:120}}><PBar pct={(f.v/22)*100} color={f.c}/></div>
                      <span style={{...css.mono,fontWeight:700,color:f.c,minWidth:28,textAlign:"right",fontSize:10}}>{f.v}%</span>
                    </div>
                  ))}
              </Panel>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <Panel title="Métriques détaillées" style={{flex:1}}>
                  {[{l:"AUC-ROC",v:M.auc||0.805,c:"#dc2626"},{l:"F1-Score",v:M.f1||0.740,c:"#1d4ed8"},{l:"Recall",v:M.recall||0.828,c:"#7c3aed"},{l:"Précision",v:M.precision||0.669,c:"#16a34a"},{l:"MCC",v:M.mcc||0.526,c:"#d97706"},{l:"Accuracy",v:M.accuracy||0.756,c:"#0e7490"}]
                    .map(m=>(
                      <div key={m.l} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:"0.5px solid #f8fafc"}}>
                        <span style={{fontSize:11,color:"#64748b",flex:1}}>{m.l}</span>
                        <div style={{width:80}}><PBar pct={m.v*100} color={m.c}/></div>
                        <span style={{...css.mono,fontWeight:700,color:m.c,minWidth:40,textAlign:"right"}}>{m.v.toFixed(3)}</span>
                      </div>
                    ))}
                </Panel>
                <Panel title="Architecture" style={{flex:1}}>
                  <table style={css.table}>
                    <tbody>
                      {[["Algorithme","Random Forest"],["Calibration","Isotonique CV=3"],["Anomalies","IsoForest 4% (fit=payées)"],["Split","Temporel 80/20"],["Anti-Leakage","Expanding window"],["Seuil","0.436"],["Retard CRITIQUE payé",">30j"],["Retard RISQUE payé",">5j"],["Factures",""+(K.nb_factures||0)],["Clients",""+(K.nb_clients||0)]]
                        .map(([k,v])=>(<tr key={k}><td style={{...css.td,color:"#64748b",fontSize:11,width:"55%"}}>{k}</td><td style={{...css.td,...css.mono,fontWeight:600}}>{v}</td></tr>))}
                    </tbody>
                  </table>
                </Panel>
              </div>
            </div>
            <Panel title="Matrice de confusion — données test">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:480}}>
                {[{l:"Vrais Négatifs (TN)",v:M.vrai_negatifs||2499,c:"#16a34a",bg:"#f0fdf4",desc:"Sain prédit Sain"},{l:"Faux Positifs (FP)",v:M.faux_positifs||1049,c:"#d97706",bg:"#fffbeb",desc:"Sain prédit Risque"},{l:"Faux Négatifs (FN)",v:M.faux_negatifs||440,c:"#dc2626",bg:"#fef2f2",desc:"Risque prédit Sain"},{l:"Vrais Positifs (TP)",v:M.vrai_positifs||2120,c:"#1d4ed8",bg:"#eff6ff",desc:"Risque prédit Risque"}]
                  .map(s=>(<div key={s.l} style={{background:s.bg,borderRadius:6,padding:"10px 14px",border:`0.5px solid ${s.c}30`}}><div style={{fontSize:10,color:"#64748b",marginBottom:2}}>{s.l}</div><div style={{fontSize:20,fontWeight:500,color:s.c,fontFamily:"monospace"}}>{s.v.toLocaleString()}</div><div style={{fontSize:10,color:"#94a3b8"}}>{s.desc}</div></div>))}
              </div>
              <div style={css.footer}>Seuil de décision : 0.436 · Split temporel 80/20</div>
            </Panel>
          </>
        )}
      </div>

      {/* ══ MODALE DRILL-DOWN ══ */}
      {drillClient&&(()=>{
        const c=drillClient;
        const facs=(FACS[String(c.fk_soc)]||[]).sort((a,b)=>new Date(b.datef)-new Date(a.datef));
        const probCurve=[...facs].reverse().map((f,i)=>({i:i+1,p:Math.round(f.prob_retard*1000)/10}));
        return (
          <div style={css.modal} onClick={()=>setDrillClient(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,padding:"24px 28px",width:"min(860px,95vw)",maxHeight:"85vh",overflowY:"auto",border:"0.5px solid #e2e8f0",display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:500,color:"#1e293b"}}>{c.nom}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2,display:"flex",gap:8}}>
                    <SegBadge seg={c.rfm}/><StatBadge st={c.st}/>
                    <Badge color="#374151" bg="#f8fafc">{c.taille}</Badge>
                    {c.anom&&<Badge color="#854f09" bg="#fef3c7">⚠ anomalie</Badge>}
                  </div>
                </div>
                <button onClick={()=>setDrillClient(null)} style={{background:"none",border:"none",color:"#94a3b8",fontSize:18,cursor:"pointer"}}>✕</button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[{l:"CA total",v:fmt(c.ttc)+" MAD",col:"#1d4ed8"},{l:"Prob. retard",v:fmtP(c.p),col:pc(c.p)},{l:"IPR",v:c.ipr.toFixed(2),col:c.ipr>8?"#dc2626":c.ipr>6?"#d97706":"#16a34a"},{l:"Fidélité",v:c.fid+"/100",col:c.fid>70?"#1d4ed8":c.fid>40?"#16a34a":"#d97706"}]
                  .map(k=>(<div key={k.l} style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",borderTop:`2.5px solid ${k.col}`}}><div style={{fontSize:10,color:"#64748b",marginBottom:2}}>{k.l}</div><div style={{fontSize:16,fontWeight:500,color:k.col,fontFamily:"monospace"}}>{k.v}</div></div>))}
              </div>

              {probCurve.length>1&&(
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:"#1e293b",marginBottom:8}}>Évolution probabilité de retard — {facs.length} factures</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={probCurve} margin={{top:4,right:8,bottom:0,left:0}}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false}/><XAxis dataKey="i" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false} label={{value:"Factures (chrono →)",position:"insideBottomRight",fontSize:9,fill:"#94a3b8",offset:-4}}/><YAxis domain={[0,100]} tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                      <Tooltip content={<Tooltip2 unit="%"/>}/>
                      <ReferenceLine y={43.6} stroke="#d97706" strokeDasharray="4 3" strokeWidth={1}/><ReferenceLine y={80} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1}/>
                      <Line type="monotone" dataKey="p" name="Prob. retard" stroke={pc(c.p)} strokeWidth={2} dot={{r:3,fill:pc(c.p)}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div>
                <div style={{fontSize:12,fontWeight:500,color:"#1e293b",marginBottom:8}}>Factures ({facs.length})</div>
                <div style={{overflowX:"auto",maxHeight:260,overflowY:"auto"}}>
                  <table style={{...css.table,fontSize:11}}>
                    <thead style={{position:"sticky",top:0,background:"#fff",zIndex:1}}>
                      <tr>{["Réf","Facturée","Échéance","Montant TTC","Prob.","Retard","DSO","Payée","Statut","Anom."].map(h=><th key={h} style={css.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {facs.map((f,i)=>{
                        const retard=Number(f.retard_jours_reel)||0;
                        const dso=Number(f.dso_depuis_echeance)||Number(f.dso_facture)||0;
                        const enRetard=f.paye===0&&retard>0;
                        return (
                          <tr key={i} style={{background:f.is_anomalie?"#fffbeb":"transparent"}}>
                            <td style={{...css.td,fontFamily:"monospace",fontSize:10}}>{f.ref||f.rowid}</td>
                            <td style={{...css.td,color:"#64748b"}}>{f.datef}</td>
                            <td style={{...css.td,color:enRetard?"#dc2626":"#64748b",fontWeight:enRetard?600:400}}>{f.date_lim_reglement||"—"}</td>
                            <td style={{...css.td,fontFamily:"monospace"}}>{fmt(f.total_ttc)}</td>
                            <td style={css.td}><span style={{fontFamily:"monospace",fontWeight:700,color:pc(f.prob_retard)}}>{(f.prob_retard*100).toFixed(1)}%</span></td>

                            {/* ── FIX colonne Retard ──
                                impayé + retard > 0  → "+Xj en cours" coloré
                                payé  + retard > 0   → "+Xj retard payé" gris
                                payé  + retard ≤ 0   → "À l'heure" vert  ← NOUVEAU
                                pas encore échu       → "—"
                            */}
                            <td style={css.td}>
                              {f.paye===0&&retard>0
                                ?<span style={{fontFamily:"monospace",fontWeight:700,color:retard>90?"#dc2626":retard>30?"#d97706":"#f59e0b"}}>+{Math.round(retard)}j en cours</span>
                                :f.paye===1&&retard>0
                                  ?<span style={{fontFamily:"monospace",color:"#94a3b8",fontSize:10}}>+{Math.round(retard)}j retard payé</span>
                                  :f.paye===1
                                    ?<span style={{color:"#16a34a",fontSize:10,fontWeight:500}}>À l'heure</span>
                                    :<span style={{color:"#94a3b8"}}>—</span>
                              }
                            </td>

                            <td style={{...css.td,fontFamily:"monospace",color:dso>60?"#dc2626":dso>30?"#d97706":"#64748b"}}>{dso>0?`${Math.round(dso)}j`:"—"}</td>
                            <td style={css.td}><span style={{fontSize:10,padding:"1px 6px",borderRadius:20,fontWeight:500,background:f.paye?"#f0fdf4":"#fef2f2",color:f.paye?"#15803d":"#dc2626"}}>{f.paye?"Oui":"Non"}</span></td>
                            <td style={css.td}><span style={{fontSize:10,padding:"1px 6px",borderRadius:20,fontWeight:500,background:f.statut_risque==="CRITIQUE"?"#fef2f2":f.statut_risque==="RISQUE"?"#fffbeb":"#f0fdf4",color:f.statut_risque==="CRITIQUE"?"#dc2626":f.statut_risque==="RISQUE"?"#d97706":"#16a34a"}}>{f.statut_risque}</span></td>
                            <td style={css.td}>{f.is_anomalie?<Badge color="#854f09" bg="#fef3c7">⚠</Badge>:"—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:"0.5px solid #f1f5f9",paddingTop:12}}>
                {c.st!=="SAIN"&&<button onClick={()=>{setDrillClient(null);setModal(c);}} style={{padding:"7px 16px",borderRadius:6,border:"0.5px solid #93c5fd",background:"#eff6ff",color:"#1d4ed8",cursor:"pointer",fontSize:12}}>Relancer ce client</button>}
                <button onClick={()=>setDrillClient(null)} style={{padding:"7px 16px",borderRadius:6,border:"0.5px solid #e2e8f0",background:"#fff",color:"#64748b",cursor:"pointer",fontSize:12}}>Fermer</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ MODALE RELANCE ══ */}
      {modal&&(
        <div style={css.modal} onClick={()=>setModal(null)}>
          <div style={css.modalBox} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:500}}>Confirmer la relance</div>
              <button onClick={()=>setModal(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"#94a3b8",fontSize:16,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>Cette action sera enregistrée dans Dolibarr (actioncomm)</div>
            <div style={{background:"#f8fafc",borderRadius:6,padding:"10px 14px",marginBottom:14}}>
              {[["Client",modal.nom],["Encours total",fmt(modal.ttc)+" MAD"],["Prob. retard",(modal.p*100).toFixed(1)+"%"],["Statut",modal.st],["Segment RFM",SEG_LABEL[modal.rfm]||modal.rfm]]
                .map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid #e2e8f0"}}><span style={{color:"#64748b",fontSize:11}}>{k}</span><span style={{fontWeight:600,fontSize:11,fontFamily:"monospace",color:k==="Prob. retard"?pc(modal.p):k==="Statut"?ST_COLOR[modal.st]:"#1e293b"}}>{v}</span></div>))}
            </div>
            <div style={{background:"#eff6ff",borderRadius:6,padding:"8px 12px",marginBottom:14,fontSize:11,color:"#1e3a8a"}}>✓ Enregistrement dans Dolibarr · ✓ Email pré-rempli ouvert</div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setModal(null)} style={{padding:"7px 16px",borderRadius:6,border:"0.5px solid #e2e8f0",background:"#fff",color:"#64748b",cursor:"pointer",fontSize:12}}>Annuler</button>
              <button onClick={()=>handleRelance(modal)} disabled={relLoading} style={{padding:"7px 18px",borderRadius:6,border:"none",background:relLoading?"#94a3b8":"#1d4ed8",color:"#fff",cursor:relLoading?"not-allowed":"pointer",fontSize:12,fontWeight:500}}>
                {relLoading?"Envoi...":"Confirmer →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}