/* ===== InsuredMine frontend logic ===== */
const $ = (s) => document.querySelector(s);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
let HISTORY = [];

async function jget(url){ const r = await fetch(url); if(!r.ok) throw new Error(url); return r.json(); }

// ---- init ----------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  // month dropdown
  const ms = $("#inMonth");
  MONTHS.forEach((m,i)=>{ const o=document.createElement("option"); o.value=i+1; o.textContent=`${i+1} — ${m}`; ms.appendChild(o); });
  ms.value = 4;

  $("#plotImg").src = "/api/plot";
  $("#btnPredict").addEventListener("click", doPredict);
  $("#btnExtract").addEventListener("click", doExtract);
  $("#btnSample").addEventListener("click", loadSample);

  try { await loadMetrics(); } catch(e){ $("#statusBadge").textContent="● offline"; }
  try { await loadSample(); } catch(e){}
});

// ---- Section A: metrics + hero stats + chart -----------------------------
async function loadMetrics(){
  const m = await jget("/api/metrics");
  $("#statModel").textContent   = m.selected_model;
  $("#statSamples").textContent = m.n_samples;
  $("#statFixed").textContent   = m.outliers_repaired;
  const sel = m.models.find(x=>x.name===m.selected_model);
  $("#statR2").textContent = sel ? sel.r2_fit.toFixed(2) : "—";

  const tb = $("#metricsTbl tbody"); tb.innerHTML="";
  m.models.forEach(x=>{
    const tr=document.createElement("tr");
    if(x.name===m.selected_model) tr.className="sel";
    const cv = x.r2_cv>=0 ? `<span class="badge-pos">${x.r2_cv}</span>` : `<span class="badge-neg">${x.r2_cv}</span>`;
    tr.innerHTML=`<td>${x.name}</td><td>${x.r2_fit}</td><td>${x.mae_pct_fit}</td><td>${cv}</td>`;
    tb.appendChild(tr);
  });

  HISTORY = m.history;
  drawChart(HISTORY, null);
}

// ---- SVG line chart of premium share -------------------------------------
function drawChart(history, pred){
  const W=460,H=190,P={l:34,r:14,t:14,b:26};
  const xs=history.map((_,i)=>i);
  const pts = pred ? history.concat([{date:pred.label, actual_pct:null, pred:pred.pct}]) : history;
  const vals = history.map(d=>d.actual_pct).concat(pred?[pred.pct]:[]);
  const min=Math.min(...vals)*0.95, max=Math.max(...vals)*1.05;
  const n = pts.length;
  const X=i=> P.l + (W-P.l-P.r)*(i/(n-1||1));
  const Y=v=> P.t + (H-P.t-P.b)*(1-(v-min)/(max-min||1));

  let path="", dots="";
  history.forEach((d,i)=>{ path += (i?"L":"M")+X(i).toFixed(1)+","+Y(d.actual_pct).toFixed(1)+" ";
    dots += `<circle cx="${X(i)}" cy="${Y(d.actual_pct)}" r="2.6" fill="#2563eb"/>`; });

  let predMark="";
  if(pred){ const i=n-1; predMark=`
    <circle cx="${X(i)}" cy="${Y(pred.pct)}" r="6" fill="#06b6d4" stroke="#fff" stroke-width="2"/>
    <text x="${X(i)}" y="${Y(pred.pct)-12}" text-anchor="middle" font-size="11" font-weight="700" fill="#0891b2">${pred.pct.toFixed(1)}%</text>`; }

  // gridlines
  let grid="";
  for(let g=0;g<=3;g++){ const v=min+(max-min)*g/3, y=Y(v);
    grid+=`<line x1="${P.l}" y1="${y}" x2="${W-P.r}" y2="${y}" stroke="#eef2f9"/>
           <text x="4" y="${y+3}" font-size="9" fill="#94a3b8">${v.toFixed(1)}</text>`; }
  // x labels (every ~3rd)
  let xlab="";
  history.forEach((d,i)=>{ if(i%3===0) xlab+=`<text x="${X(i)}" y="${H-8}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.date.slice(2)}</text>`; });

  $("#chart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    ${grid}
    <path d="${path}" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linejoin="round"/>
    ${dots}${predMark}${xlab}
  </svg>`;
}

// ---- predictor -----------------------------------------------------------
async function doPredict(){
  const year=+$("#inYear").value, month=+$("#inMonth").value;
  const btn=$("#btnPredict"); btn.disabled=true; btn.textContent="Predicting…";
  try{
    const r = await jget(`/api/predict?year=${year}&month=${month}`);
    $("#predPct").textContent = r.predicted_pct.toFixed(2);
    $("#predAbs").textContent = "₹ "+Number(r.predicted_premium).toLocaleString("en-IN");
    $("#predMeta").textContent = `Model: ${r.model} · ${MONTHS[month-1]} ${year}`;
    $("#predResult").hidden=false;
    drawChart(HISTORY, {label:`${year}-${month}`, pct:r.predicted_pct});
  }catch(e){ alert("Prediction failed: "+e.message); }
  btn.disabled=false; btn.textContent="Predict premium";
}

// ---- extraction ----------------------------------------------------------
async function loadSample(){
  const r = await jget("/api/sample-ocr");
  $("#ocrText").value = r.text.trim();
}
async function doExtract(){
  const text=$("#ocrText").value;
  const btn=$("#btnExtract"); btn.disabled=true; btn.textContent="Extracting…";
  try{
    const r = await fetch("/api/extract",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text})});
    const data = await r.json();
    renderPeople(data.people);
    const c=$("#extractCount"); c.hidden=false; c.textContent=`${data.count} found`;
  }catch(e){ $("#extractOut").innerHTML=`<p class="muted">Error: ${e.message}</p>`; }
  btn.disabled=false; btn.textContent="Extract entities";
}
function fld(v){ return v==null||v==="" ? '<span class="null">null</span>' : v; }
function renderPeople(people){
  if(!people.length){ $("#extractOut").innerHTML='<p class="muted">No records found.</p>'; return; }
  $("#extractOut").innerHTML = people.map(p=>{
    const name=[p.first_name,p.middle_name,p.last_name].filter(Boolean).join(" ")||"Unknown";
    return `<div class="person">
      <div class="person__name">${name}</div>
      <dl class="person__grid">
        <dt>Email</dt><dd>${fld(p.email)}</dd>
        <dt>Phone</dt><dd>${fld(p.phone_number)}</dd>
        <dt>DOB</dt><dd>${fld(p.date_of_birth)}</dd>
        <dt>Address</dt><dd>${fld(p.address)}</dd>
        <dt>Marital</dt><dd>${fld(p.marital_status)}</dd>
      </dl></div>`;
  }).join("");
}
