/* ============================================================
   Baby Kids — แอปติดตามพัฒนาการลูกน้อย 🦒
   ============================================================ */
Store.load();
Store.seedIfNeeded();

const App = { route: "home", msCheckpoint: null, chartType: "weight" };

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const appEl = () => document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function nowLocal() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function fmtTime(v) { return new Date(v).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(v) { return new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short" }); }
function fmtDateFull(v) { return new Date(v).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function dayKey(v) { const d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function dur(ms) {
  const m = Math.round(ms / 60000); const h = Math.floor(m / 60);
  return h > 0 ? `${h} ชม. ${m % 60} น.` : `${m} นาที`;
}

function ageData() {
  const bd = Store.data.profile.birthDate;
  if (!bd) return null;
  const birth = new Date(bd), now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months--;
  const days = Math.floor((now - birth) / 86400000);
  return { months: Math.max(0, months), days, birth };
}
function ageTextFrom(birth) {
  const now = new Date();
  let y = now.getFullYear() - birth.getFullYear(), m = now.getMonth() - birth.getMonth(), d = now.getDate() - birth.getDate();
  if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  if (y > 0) return `${y} ปี ${m} เดือน`;
  if (m > 0) return `${m} เดือน ${d} วัน`;
  return `${d} วัน`;
}
function ageText() { const a = ageData(); return a ? ageTextFrom(a.birth) : ""; }

/* ---- อายุแก้ไข (corrected age) สำหรับเด็กคลอดก่อนกำหนด ---- */
function prematureDays() {
  const p = Store.data.profile;
  // 1) ถ้ามีวันครบกำหนดคลอด (EDD) ใช้ค่านี้ก่อน (แม่นสุด)
  if (p.dueDate && p.birthDate) {
    const diff = Math.round((new Date(p.dueDate) - new Date(p.birthDate)) / 86400000);
    return diff > 0 ? diff : 0;
  }
  // 2) ไม่งั้นคำนวณจากอายุครรภ์ตอนคลอด
  const w = +p.gestWeeks || 0, d = +p.gestDays || 0;
  if (!w || w >= 40) return 0;
  const days = 40 * 7 - (w * 7 + d);
  return days > 0 ? days : 0;
}
function isPreterm() { return prematureDays() > 0; }
function monthsBetween(birth, now) {
  let m = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) m--;
  return Math.max(0, m);
}
function correctedBirth() {
  const bd = Store.data.profile.birthDate; if (!bd) return null;
  const birth = new Date(bd);
  if (monthsBetween(birth, new Date()) >= 24) return birth; // เลิกแก้ไขเมื่ออายุจริง ≥ 2 ปี
  const p = Store.data.profile;
  if (p.dueDate) { const due = new Date(p.dueDate); if (due > birth) return due; }
  const d = new Date(birth); d.setDate(d.getDate() + prematureDays());
  return d;
}
function correctedMonths() { const cb = correctedBirth(); return cb ? monthsBetween(cb, new Date()) : 0; }
function correctedAgeText() { const cb = correctedBirth(); return cb ? ageTextFrom(cb) : ""; }

function ageMonthsAt(dateStr) {
  const cb = correctedBirth(); if (!cb) return 0;
  return (new Date(dateStr) - cb) / (86400000 * 30.4375);
}

/* ---------------- หน้าน้องตามวัย ---------------- */
function ageStage() {
  const a = ageData(); const m = a ? a.months : 0;
  if (m < 3) return { s: 0, label: "แรกเกิด" };
  if (m < 7) return { s: 1, label: "วัยทารก" };
  if (m < 12) return { s: 2, label: "วัยเริ่มคลาน" };
  if (m < 24) return { s: 3, label: "วัยเตาะแตะ" };
  if (m < 48) return { s: 4, label: "วัยเด็กเล็ก" };
  return { s: 5, label: "วัยอนุบาล" };
}
// วาดหน้าน้องการ์ตูนที่เปลี่ยนไปตามช่วงวัย (ผม/ฟัน/ตา/โบว์)
function babyFace() {
  const { s } = ageStage();
  const gender = Store.data.profile.gender;
  const skin = "#FFE0C2", hair = "#7A5230", cheek = "#FF9FB6", eye = "#5A3A1E", lip = "#D08488";

  // ผม: ยิ่งโตผมยิ่งเยอะ
  let hairEl = "";
  if (s === 0) hairEl = `<path d="M50 23 q5 -11 11 -3" stroke="${hair}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  else if (s === 1) hairEl = `<path d="M50 22 q6 -12 12 -3" stroke="${hair}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  else if (s === 2) hairEl = `<g stroke="${hair}" stroke-width="4.5" fill="none" stroke-linecap="round"><path d="M43 22 q5 -10 10 -3"/><path d="M55 22 q5 -10 10 -3"/></g>`;
  else if (s === 3) hairEl = `<path d="M24 46 q26 -32 52 0 q-26 -16 -52 0z" fill="${hair}"/>`;
  else hairEl = `<path d="M21 48 q29 -38 58 0 q-5 -17 -29 -17 q-24 0 -29 17z" fill="${hair}"/>`;

  // ตา: แรกเกิดหลับตาปริบๆ นอกนั้นลืมตา
  let eyes;
  if (s === 0) eyes = `<path d="M38 54 q4 4 8 0" stroke="${eye}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M54 54 q4 4 8 0" stroke="${eye}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  else eyes = `<g class="bk-eyes"><circle cx="42" cy="55" r="4" fill="${eye}"/><circle cx="58" cy="55" r="4" fill="${eye}"/><circle cx="43.4" cy="53.6" r="1.3" fill="#fff"/><circle cx="59.4" cy="53.6" r="1.3" fill="#fff"/></g>`;

  // ปาก: เริ่มมีฟันตอน ~7 เดือนขึ้นไป
  let mouth;
  if (s < 2) mouth = `<path d="M44 68 q6 6 12 0" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  else mouth = `<path d="M43 66 q7 10 14 0 z" fill="${lip}"/><rect x="45.5" y="67" width="9" height="3.4" rx="1" fill="#fff"/>`;

  // โบว์สำหรับเด็กหญิง
  const bow = gender === "girl"
    ? `<g><path d="M71 30 l-8 -5 v10 z" fill="#FF6B98"/><path d="M71 30 l8 -5 v10 z" fill="#FF6B98"/><circle cx="71" cy="30" r="3.4" fill="#FF8FB1"/></g>`
    : "";

  return `<svg viewBox="0 0 100 100" width="100%" height="100%" style="display:block" aria-hidden="true">
    <circle cx="22" cy="56" r="7" fill="${skin}"/><circle cx="78" cy="56" r="7" fill="${skin}"/>
    <circle cx="50" cy="55" r="30" fill="${skin}"/>
    ${hairEl}
    <circle cx="34" cy="64" r="5.5" fill="${cheek}" opacity="0.55"/>
    <circle cx="66" cy="64" r="5.5" fill="${cheek}" opacity="0.55"/>
    ${eyes}
    <path d="M48 61 q2 2 4 0" stroke="#D89B6A" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${mouth}
    ${bow}
  </svg>`;
}

/* ---------------- WHO ---------------- */
function whoAt(type, gender, month) {
  const arr = WHO[gender][type];
  month = Math.max(0, Math.min(24, month));
  const lo = Math.floor(month), hi = Math.min(24, lo + 1), f = month - lo;
  return arr[lo].map((v, i) => v + (arr[hi][i] - v) * f);
}
function whoStatus(type, value, month, gender) {
  const [p3, p50, p97] = whoAt(type, gender, month);
  let status = "อยู่ในเกณฑ์ปกติ", cls = "ok", emoji = "✅";
  if (value < p3) { status = "ต่ำกว่าเกณฑ์"; cls = "low"; emoji = "⚠️"; }
  else if (value > p97) { status = "สูงกว่าเกณฑ์"; cls = "high"; emoji = "⚠️"; }
  return { status, cls, emoji, p3, p50, p97 };
}

/* ==================================================================
   ROUTER
   ================================================================== */
const TABS = [
  { id: "home", icon: "🏠", label: "หน้าหลัก" },
  { id: "growth", icon: "📈", label: "เติบโต" },
  { id: "dev", icon: "🎯", label: "พัฒนาการ" },
  { id: "diary", icon: "📸", label: "ความทรงจำ" },
  { id: "more", icon: "🧸", label: "เพิ่มเติม" },
];
function go(route) { App.route = route; render(); window.scrollTo(0, 0); }

function renderNav() {
  const activeTab = ["shopping", "appt", "profile", "settings", "health", "teeth", "healthcard", "sync", "timeline", "sizes", "letters", "quotes", "children"].includes(App.route) ? "more" : App.route;
  document.getElementById("nav").innerHTML = TABS.map(t =>
    `<button class="${t.id === activeTab ? "active" : ""}" onclick="go('${t.id}')">
       <span class="ne">${t.icon}</span><span>${t.label}</span>
     </button>`).join("");
}

function render() {
  const r = App.route;
  let html = "";
  if (r === "home") html = viewHome();
  else if (r === "growth") html = viewGrowth();
  else if (r === "dev") html = viewDev();
  else if (r === "more") html = viewMore();
  else if (r === "shopping") html = viewShopping();
  else if (r === "appt") html = viewAppt();
  else if (r === "profile") html = viewProfile();
  else if (r === "settings") html = viewSettings();
  else if (r === "health") html = viewHealth();
  else if (r === "diary") html = viewDiary();
  else if (r === "teeth") html = viewTeeth();
  else if (r === "healthcard") html = viewHealthCard();
  else if (r === "sync") html = viewSync();
  else if (r === "timeline") html = viewTimeline();
  else if (r === "sizes") html = viewSizes();
  else if (r === "letters") html = viewLetters();
  else if (r === "quotes") html = viewQuotes();
  else if (r === "children") html = viewChildren();
  appEl().innerHTML = html;
  renderNav();
  document.getElementById("fab").style.display =
    ["profile", "settings", "sync", "teeth", "healthcard", "timeline"].includes(r) ? "none" : "grid";
}

/* ==================================================================
   HEADER
   ================================================================== */
function topbar(title) {
  const syncOn = typeof Sync !== "undefined" && Sync.ready;
  return `<div class="topbar">
    <div class="logo"><span class="giraffe">🦒</span>Baby<span class="k">Kids</span></div>
    <div class="spacer"></div>
    ${syncOn ? `<button class="icon-btn" onclick="go('sync')" title="ซิงค์เปิดอยู่" aria-label="ซิงค์">☁️</button>` : ""}
    <button class="icon-btn" onclick="go('settings')" aria-label="ตั้งค่า">⚙️</button>
  </div>`;
}

/* ==================================================================
   HOME
   ================================================================== */
function viewHome() {
  const p = Store.data.profile;
  if (!p.birthDate) return topbar() + onboarding();

  const inner = p.photo ? `<img src="${p.photo}" alt="">` : babyFace();
  const avatar = `<div class="avatar-wrap" onclick="triggerPhoto()" title="แตะเพื่อเปลี่ยนรูป">
      <div class="avatar">${inner}</div><span class="cam-badge">📷</span>
    </div>`;
  const stage = ageStage();

  const dev = analyzeDevelopment();
  const upcoming = upcomingAppt();

  return topbar() + `
  <div class="screen">
    <div class="hero">
      <span class="floaty f1">✨</span><span class="floaty f2">⭐</span><span class="floaty f3">💫</span><span class="floaty f4">✨</span>
      <div class="hero-row">
        ${avatar}
        <div style="flex:1">
          <h2>${esc(p.name || "ลูกน้อย")}</h2>
          <div class="age">🎂 อายุ${isPreterm() ? "จริง" : ""} ${ageText()}${isPreterm() ? "" : " · " + stage.label}</div>
          ${isPreterm() ? `<div class="age" style="font-size:13px;opacity:.92">✨ อายุแก้ไข ${correctedAgeText()}</div>
          <div class="age" style="font-size:12px;opacity:.85">🍼 เกิด ${fmtDate(p.birthDate)}${p.dueDate ? ` · ครบกำหนด ${fmtDate(p.dueDate)}` : ""}</div>` : ""}
        </div>
      </div>
    </div>

    ${feverAlertHome()}

    <div class="section-title">⚡ ทางลัด</div>
    <div class="quick-grid">
      <button class="quick grow" onclick="sheetGrowth()"><span class="e">📏</span>ชั่ง/วัด</button>
      <button class="quick milk" onclick="sheetMemory()"><span class="e">📸</span>ความทรงจำ</button>
      <button class="quick diaper" onclick="go('teeth')"><span class="e">🦷</span>ฟันน้ำนม</button>
      <button class="quick sleep" onclick="go('health')"><span class="e">🌡️</span>สุขภาพ</button>
    </div>

    ${growthDashboard()}

    ${dev.homeCard}

    ${upcoming ? `
    <div class="section-title">📅 นัดหมายถัดไป</div>
    <div class="card" onclick="go('appt')" style="cursor:pointer">
      <div class="list-item" style="padding:0">
        <div class="bubble appt">${upcoming.isVaccine ? "💉" : "🩺"}</div>
        <div class="body"><div class="t">${esc(upcoming.title)}</div>
          <div class="s">${fmtDateFull(upcoming.date)}${upcoming.time ? " · " + upcoming.time + " น." : ""}</div></div>
        <div class="time">${daysUntil(upcoming.date)}</div>
      </div>
    </div>` : ""}

    <div class="section-title">🎯 พัฒนาการช่วงนี้</div>
    <div class="card" onclick="go('dev')" style="cursor:pointer">
      <div class="flex between"><h3>${dev.checkpointLabel}</h3><span class="badge">${dev.pct}%</span></div>
      <div class="progress mt"><span style="width:${dev.pct}%"></span></div>
      <div class="small muted mt">ผ่านแล้ว ${dev.done}/${dev.total} ข้อ · แตะเพื่อดูทั้งหมด</div>
    </div>
  </div>`;
}

/* ---- แดชบอร์ดการเติบโตบนหน้าหลัก ---- */
function growthDashboard() {
  const gAll = [...Store.data.growth].sort((a, b) => a.date.localeCompare(b.date));
  const teethN = Object.keys(Store.data.teeth || {}).length;
  const memN = Store.data.memories.length;
  if (gAll.length === 0) {
    return `<div class="section-title">📊 แดชบอร์ด</div>
      <div class="card center" style="cursor:pointer" onclick="sheetGrowth()">
        <div style="font-size:34px">📏</div>
        <div class="t" style="font-weight:700">บันทึกน้ำหนัก-ส่วนสูงครั้งแรก</div>
        <div class="small muted">แตะเพื่อเริ่มดูแดชบอร์ดการเติบโต</div>
      </div>${miniCounts(teethN, memN)}`;
  }
  const last = gAll[gAll.length - 1], prev = gAll[gAll.length - 2], first = gAll[0];
  const gender = Store.data.profile.gender;
  const wt = +last.weight || 0, ht = +last.height || 0;
  const m = ageMonthsAt(last.date);
  const wStat = wt ? whoStatus("wt", wt, m, gender) : null;
  const hStat = ht ? whoStatus("ht", ht, m, gender) : null;
  const wDelta = (prev && prev.weight && last.weight) ? +(+last.weight - +prev.weight).toFixed(2) : null;
  const hDelta = (prev && prev.height && last.height) ? +(+last.height - +prev.height).toFixed(1) : null;
  const wGain = (first && first.weight && last.weight && first !== last) ? +(+last.weight - +first.weight).toFixed(2) : null;
  const hGain = (first && first.height && last.height && first !== last) ? +(+last.height - +first.height).toFixed(1) : null;
  const wSeries = gAll.map(x => +x.weight).filter(v => v > 0);

  return `<div class="section-title">📊 แดชบอร์ดการเติบโต</div>
    <div class="dash-grid">
      <div class="dash-card" onclick="go('growth')">
        <div class="dash-top"><span>⚖️ น้ำหนัก</span>${wStat ? `<span class="dash-pct">${wStat.emoji}</span>` : ""}</div>
        <div class="dash-val">${last.weight || "—"} <small>กก.</small></div>
        ${wDelta != null ? deltaBadge(wDelta, "กก.") : ""}
        ${wGain != null ? `<div class="dash-sub">ตั้งแต่เริ่มบันทึก ${wGain >= 0 ? "+" : ""}${wGain} กก.</div>` : ""}
        ${wStat ? `<div class="dash-sub">${wStat.status} · กลางวัยนี้ ~${wStat.p50.toFixed(1)} กก.</div>` : ""}
      </div>
      <div class="dash-card" onclick="go('growth')">
        <div class="dash-top"><span>📏 ส่วนสูง</span>${hStat ? `<span class="dash-pct">${hStat.emoji}</span>` : ""}</div>
        <div class="dash-val">${last.height || "—"} <small>ซม.</small></div>
        ${hDelta != null ? deltaBadge(hDelta, "ซม.") : ""}
        ${hGain != null ? `<div class="dash-sub">ตั้งแต่เริ่มบันทึก ${hGain >= 0 ? "+" : ""}${hGain} ซม.</div>` : ""}
        ${hStat ? `<div class="dash-sub">${hStat.status} · กลางวัยนี้ ~${hStat.p50.toFixed(0)} ซม.</div>` : ""}
      </div>
    </div>
    ${wSeries.length >= 2 ? `<div class="card" onclick="go('growth')" style="cursor:pointer">
      <div class="flex between"><h3 style="font-size:16px">📈 แนวโน้มน้ำหนัก</h3><span class="small muted">${gAll.length} ครั้ง</span></div>
      ${sparkline(wSeries, "var(--orange-d)")}
    </div>` : ""}
    ${miniCounts(teethN, memN)}`;
}
function miniCounts(teethN, memN) {
  return `<div class="stat-grid">
    <div class="stat" onclick="go('teeth')" style="cursor:pointer"><div class="label">🦷 ฟันน้ำนม</div><div class="value">${teethN} <small>/ 20 ซี่</small></div></div>
    <div class="stat" onclick="go('diary')" style="cursor:pointer"><div class="label">📸 ความทรงจำ</div><div class="value">${memN} <small>โมเมนต์</small></div></div>
  </div>`;
}
function deltaBadge(d, unit) {
  if (d == null || d === 0) return `<span class="delta flat">± 0 ${unit}</span>`;
  const up = d > 0;
  return `<span class="delta ${up ? "up" : "down"}">${up ? "▲ +" : "▼ "}${d} ${unit} <span style="opacity:.75">จากครั้งก่อน</span></span>`;
}
function sparkline(vals, color) {
  const W = 320, H = 72, pad = 8;
  const min = Math.min(...vals), max = Math.max(...vals), range = (max - min) || 1;
  const X = i => pad + i * (W - pad * 2) / (vals.length - 1);
  const Y = v => H - pad - ((v - min) / range) * (H - pad * 2);
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const area = `${pad},${H - pad} ${pts} ${(W - pad)},${H - pad}`;
  const dots = vals.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3" fill="#fff" stroke="${color}" stroke-width="2"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;margin-top:8px"><polygon points="${area}" fill="${color}" opacity="0.12"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}

function onboarding() {
  return `<div class="screen">
    <div class="card center" style="padding:28px 20px">
      <div style="font-size:60px">🦒</div>
      <h2 style="margin:8px 0">ยินดีต้อนรับสู่ Baby Kids</h2>
      <p class="muted">สมุดบันทึกดูแลลูกน้อยของพ่อแม่ 💛<br>เริ่มต้นด้วยการใส่ข้อมูลเจ้าตัวเล็กกันก่อนนะ</p>
      <button class="btn block mt" onclick="go('profile')">✨ เริ่มต้นใช้งาน</button>
    </div>
    <div class="card">
      <h3>ในแอปนี้มีอะไรบ้าง?</h3>
      <div class="list-item"><div class="bubble milk">🍼</div><div class="body"><div class="t">บันทึกการกินนม นอน ผ้าอ้อม</div><div class="s">ดูสรุปแต่ละวันได้ง่ายๆ</div></div></div>
      <div class="list-item"><div class="bubble grow">📈</div><div class="body"><div class="t">กราฟน้ำหนัก-ส่วนสูง</div><div class="s">เทียบเกณฑ์มาตรฐาน WHO</div></div></div>
      <div class="list-item"><div class="bubble diaper">🎯</div><div class="body"><div class="t">ติดตามพัฒนาการตามวัย</div><div class="s">พร้อมคำแนะนำอัจฉริยะ</div></div></div>
      <div class="list-item"><div class="bubble appt">🛒</div><div class="body"><div class="t">ของต้องซื้อ & นัดหมอ/วัคซีน</div><div class="s">ไม่พลาดทุกสิ่งสำคัญ</div></div></div>
    </div>
  </div>`;
}

function feverAlertHome() {
  const today = dayKey(new Date());
  const todayTemps = Store.data.temps.filter(t => dayKey(t.time) === today);
  if (!todayTemps.length) return "";
  const max = Math.max(...todayTemps.map(t => +t.value));
  const lv = tempLevel(max);
  if (lv.key === "normal" || lv.key === "low") return "";
  const red = lv.key === "fever" || lv.key === "high";
  return `<div class="alert ${red ? "red" : ""}" style="margin-top:12px;cursor:pointer" onclick="go('health')">
    <span class="e">${lv.emoji}</span><div><b>วันนี้ ${lv.label} (${max}°C)</b> — ${lv.advice} · แตะดูบันทึกสุขภาพ</div></div>`;
}
function daysUntil(dateStr) {
  const d = Math.ceil((new Date(dateStr + "T00:00") - new Date(new Date().toDateString())) / 86400000);
  if (d === 0) return "วันนี้";
  if (d === 1) return "พรุ่งนี้";
  if (d < 0) return `เลย ${-d} วัน`;
  return `อีก ${d} วัน`;
}
function upcomingAppt() {
  const today = dayKey(new Date());
  return Store.data.appointments
    .filter(a => !a.done && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

/* ==================================================================
   LOG (timeline)
   ================================================================== */
App.logFilter = "all";
function viewLog() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const f = App.logFilter;
  let entries = [];
  if (f === "all" || f === "milk") Store.data.feeds.forEach(x => entries.push({ ...x, _k: "milk", _t: x.time }));
  if (f === "all" || f === "sleep") Store.data.sleeps.forEach(x => entries.push({ ...x, _k: "sleep", _t: x.start }));
  if (f === "all" || f === "diaper") Store.data.diapers.forEach(x => entries.push({ ...x, _k: "diaper", _t: x.time }));
  entries.sort((a, b) => new Date(b._t) - new Date(a._t));

  const groups = {};
  entries.forEach(e => { const k = dayKey(e._t); (groups[k] = groups[k] || []).push(e); });

  const chips = [["all", "ทั้งหมด", ""], ["milk", "🍼 นม", ""], ["sleep", "😴 นอน", "teal"], ["diaper", "💩 ผ้าอ้อม", "pink"]];

  let body = "";
  if (entries.length === 0) {
    body = `<div class="card"><div class="empty"><span class="e">📝</span>ยังไม่มีบันทึก<br>แตะปุ่ม ＋ ด้านล่างเพื่อเริ่มบันทึก</div></div>`;
  } else {
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(k => {
      body += `<div class="section-title">${sameDay(k) ? "วันนี้" : fmtDateFull(k + "T00:00")}</div><div class="card">`;
      groups[k].forEach(e => body += logRow(e));
      body += `</div>`;
    });
  }

  return topbar() + `<div class="screen">
    <div class="flex between"><h2>📒 บันทึกประจำวัน</h2></div>
    <div class="chips mt" style="margin-bottom:6px">
      ${chips.map(c => `<button class="chip ${f === c[0] ? "active " + c[2] : ""}" onclick="App.logFilter='${c[0]}';render()">${c[1]}</button>`).join("")}
    </div>
    ${body}
  </div>`;
}
function sameDay(k) { return k === dayKey(new Date()); }
function logRow(e) {
  let bubble, title, sub;
  if (e._k === "milk") {
    bubble = `<div class="bubble milk">🍼</div>`;
    const t = e.type === "breast" ? "นมแม่" + (e.side ? ` (${e.side})` : "") : e.type === "bottle" ? "นมขวด" : "อาหาร";
    title = t + (e.amount ? ` · ${e.amount} ซีซี` : "");
    sub = e.note || "";
  } else if (e._k === "sleep") {
    bubble = `<div class="bubble sleep">😴</div>`;
    title = e.end ? `นอน ${dur(new Date(e.end) - new Date(e.start))}` : "กำลังหลับ 💤";
    sub = `${fmtTime(e.start)}${e.end ? " – " + fmtTime(e.end) : ""}${e.note ? " · " + e.note : ""}`;
  } else {
    bubble = `<div class="bubble diaper">${e.type === "poop" ? "💩" : e.type === "pee" ? "💧" : "💩💧"}</div>`;
    title = e.type === "poop" ? "อึ" : e.type === "pee" ? "ฉี่" : "อึ + ฉี่";
    sub = e.note || "";
  }
  const list = e._k === "milk" ? "feeds" : e._k === "sleep" ? "sleeps" : "diapers";
  return `<div class="list-item">
    ${bubble}
    <div class="body"><div class="t">${esc(title)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ""}</div>
    <div class="time">${fmtTime(e._t)}</div>
    <button class="del-btn" onclick="delItem('${list}','${e.id}')">🗑️</button>
  </div>`;
}
function delItem(list, id) { if (confirm("ลบรายการนี้?")) { Store.remove(list, id); render(); } }

/* ==================================================================
   GROWTH
   ================================================================== */
function viewGrowth() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const g = [...Store.data.growth].sort((a, b) => b.date.localeCompare(a.date));
  const latest = g[0];
  const a = ageData();
  const gender = Store.data.profile.gender;

  let statusCards = "";
  if (latest) {
    const m = ageMonthsAt(latest.date);
    if (latest.weight) {
      const s = whoStatus("wt", +latest.weight, m, gender);
      statusCards += statRow("⚖️", "น้ำหนัก", `${latest.weight} กก.`, s);
    }
    if (latest.height) {
      const s = whoStatus("ht", +latest.height, m, gender);
      statusCards += statRow("📏", "ส่วนสูง", `${latest.height} ซม.`, s);
    }
  }

  const type = App.chartType;
  const chart = g.length ? growthChart(type) :
    `<div class="empty"><span class="e">📈</span>ยังไม่มีข้อมูล<br>แตะ ＋ เพื่อบันทึกการชั่ง/วัดครั้งแรก</div>`;

  return topbar() + `<div class="screen">
    <h2>📈 การเติบโต</h2>
    ${latest ? `<div class="small muted">บันทึกล่าสุด ${fmtDate(latest.date)}</div>` : ""}
    ${statusCards ? `<div class="card mt">${statusCards}</div>` : ""}

    <div class="card">
      <div class="chips" style="margin-bottom:10px">
        <button class="chip ${type === "weight" ? "active" : ""}" onclick="App.chartType='weight';render()">⚖️ น้ำหนัก</button>
        <button class="chip ${type === "height" ? "active teal" : ""}" onclick="App.chartType='height';render()">📏 ส่วนสูง</button>
      </div>
      <div class="chart-wrap">${chart}</div>
      ${g.length ? `<div class="legend">
        <span><i class="dot" style="background:var(--orange-d)"></i> ข้อมูลของลูก</span>
        <span><i style="background:var(--teal)"></i> ค่ากลาง (P50)</span>
        <span><i style="background:#D9E8E6;height:10px;border-radius:3px"></i> เกณฑ์ปกติ (P3–P97)</span>
      </div>` : ""}
      <div class="small muted mt">* อ้างอิงเกณฑ์การเจริญเติบโต WHO 0–24 เดือน (${gender === "girl" ? "เด็กหญิง" : "เด็กชาย"})</div>
    </div>

    ${heightPredictCard()}

    <div class="section-title">ประวัติการชั่ง/วัด</div>
    <div class="card">
      ${g.length === 0 ? `<div class="empty small">ยังไม่มีข้อมูล</div>` :
      g.map(x => `<div class="list-item">
        <div class="bubble grow">📏</div>
        <div class="body"><div class="t">${x.weight ? x.weight + " กก." : ""}${x.weight && x.height ? " · " : ""}${x.height ? x.height + " ซม." : ""}</div>
          <div class="s">${fmtDateFull(x.date + "T00:00")}${x.head ? " · รอบหัว " + x.head + " ซม." : ""}</div></div>
        <button class="del-btn" onclick="delItem('growth','${x.id}')">🗑️</button>
      </div>`).join("")}
    </div>
  </div>`;
}
function statRow(emoji, label, value, s) {
  const color = s.cls === "ok" ? "var(--green)" : "var(--red)";
  return `<div class="list-item" style="border-bottom:1px dashed var(--line)">
    <div class="bubble grow">${emoji}</div>
    <div class="body"><div class="t">${label}: ${value}</div>
      <div class="s" style="color:${color}">${s.emoji} ${s.status} (ค่ากลางวัยนี้ ~${(label === "น้ำหนัก" ? s.p50.toFixed(1) + " กก." : s.p50.toFixed(0) + " ซม.")})</div></div>
  </div>`;
}

/* ---- ทำนายส่วนสูงตอนโต (mid-parental height) ---- */
function heightPredictCard() {
  const p = Store.data.profile;
  const dad = +p.dadHeight || 0, mom = +p.momHeight || 0;
  let result = "";
  if (dad && mom) {
    const mid = p.gender === "girl" ? (dad + mom - 13) / 2 : (dad + mom + 13) / 2;
    const lo = Math.round(mid - 8.5), hi = Math.round(mid + 8.5);
    result = `<div class="center" style="margin:10px 0 4px">
        <div style="font-family:var(--font-head);font-size:34px;font-weight:800;color:var(--purple)">~${Math.round(mid)} ซม.</div>
        <div class="small muted">ช่วงที่เป็นไปได้ ${lo}–${hi} ซม. (เมื่อโตเป็นผู้ใหญ่)</div>
      </div>`;
  }
  return `<div class="card">
    <h3>📏 ทำนายส่วนสูงตอนโต</h3>
    <p class="small muted">ประมาณการจากส่วนสูงพ่อ-แม่ (สูตร mid-parental height) เป็นค่าคาดการณ์คร่าวๆ</p>
    <div class="row2 mt">
      <label class="field"><span>ส่วนสูงพ่อ (ซม.)</span><input type="number" id="hp-dad" inputmode="decimal" value="${p.dadHeight || ""}" placeholder="เช่น 172"></label>
      <label class="field"><span>ส่วนสูงแม่ (ซม.)</span><input type="number" id="hp-mom" inputmode="decimal" value="${p.momHeight || ""}" placeholder="เช่น 160"></label>
    </div>
    <button class="btn purple block" onclick="saveParentHeights()">🔮 คำนวณ & บันทึก</button>
    ${result}
  </div>`;
}
function saveParentHeights() {
  const dad = $("#hp-dad").value, mom = $("#hp-mom").value;
  if (!dad || !mom) { alert("กรุณาใส่ส่วนสูงพ่อและแม่"); return; }
  Store.setProfile({ dadHeight: dad, momHeight: mom });
  render();
}

/* ==================================================================
   TEETH (ผังฟันน้ำนม)
   ================================================================== */
function viewTeeth() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const t = Store.data.teeth || {};
  const count = Object.keys(t).length;
  const tooth = (x) => {
    const on = !!t[x.id];
    return `<button class="tooth ${on ? "on" : ""}" onclick="toggleTooth('${x.id}')" title="${esc(x.name)} (${x.typ})">🦷</button>`;
  };
  const erupted = [...TEETH.upper, ...TEETH.lower].filter(x => t[x.id])
    .sort((a, b) => (t[a.id] || "").localeCompare(t[b.id] || ""));

  return topbar() + `<div class="screen">
    <div class="flex between"><h2>🦷 ผังฟันน้ำนม</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="card center">
      <div style="font-family:var(--font-head);font-size:30px;font-weight:800;color:var(--teal-d)">${count} <span style="font-size:18px;color:var(--ink-soft)">/ 20 ซี่</span></div>
      <div class="progress mt" style="max-width:260px;margin:8px auto 0"><span style="width:${count / 20 * 100}%;background:linear-gradient(90deg,var(--teal),var(--teal-d))"></span></div>
      <div class="small muted mt">แตะที่ฟันเพื่อบันทึกว่าขึ้นแล้ว (แตะซ้ำเพื่อยกเลิก)</div>
    </div>

    <div class="card">
      <div class="small muted center" style="margin-bottom:4px">ฟันบน 👆</div>
      <div class="teeth-row">${TEETH.upper.map(tooth).join("")}</div>
      <div class="teeth-divider"></div>
      <div class="teeth-row">${TEETH.lower.map(tooth).join("")}</div>
      <div class="small muted center" style="margin-top:4px">ฟันล่าง 👇</div>
    </div>

    ${erupted.length ? `<div class="section-title">ซี่ที่ขึ้นแล้ว (เรียงตามวันที่)</div>
    <div class="card">
      ${erupted.map(x => `<div class="list-item">
        <div class="bubble grow">🦷</div>
        <div class="body"><div class="t">${esc(x.name)}</div><div class="s">มักขึ้น ${x.typ}</div></div>
        <div class="time">${t[x.id] ? fmtDate(t[x.id] + "T00:00") : ""}</div>
        <button class="del-btn" onclick="toggleTooth('${x.id}')">↩️</button>
      </div>`).join("")}
    </div>` : ""}
    <div class="card small muted">ℹ️ ลำดับและอายุการขึ้นของฟันเป็นค่าเฉลี่ย เด็กแต่ละคนต่างกันได้</div>
  </div>`;
}
function toggleTooth(id) {
  const t = Store.data.teeth || (Store.data.teeth = {});
  const erupting = !t[id];
  if (erupting) t[id] = dayKey(new Date());
  else delete t[id];
  Store.save();
  render();
  if (erupting) {
    const btn = document.querySelector(`.tooth[onclick*="${id}"]`);
    if (btn) { btn.classList.add("pop"); celebrate(btn); }
  }
}

/* ==================================================================
   HEALTH CARD (บัตรสุขภาพ)
   ================================================================== */
function viewHealthCard() {
  const h = Store.data.healthInfo || {};
  const bloods = ["A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  return topbar() + `<div class="screen">
    <div class="flex between"><h2>🩺 บัตรสุขภาพ</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="card">
      <p class="small muted">ข้อมูลสำคัญไว้ดูยามจำเป็น/ฉุกเฉิน — ใส่ครั้งเดียว แก้ไขเมื่อมีการเปลี่ยนแปลง</p>
      <label class="field"><span>กรุ๊ปเลือด</span>
        <select id="hc-blood">
          <option value="">— เลือก —</option>
          ${bloods.map(b => `<option value="${b}" ${h.blood === b ? "selected" : ""}>${b}</option>`).join("")}
        </select>
      </label>
      <label class="field"><span>แพ้อาหาร / แพ้ยา</span><textarea id="hc-allergy" placeholder="เช่น แพ้นมวัว, แพ้ยาเพนิซิลลิน">${esc(h.allergy || "")}</textarea></label>
      <label class="field"><span>โรคประจำตัว / ภาวะสุขภาพ</span><textarea id="hc-condition" placeholder="เช่น หอบหืด (ถ้าไม่มีเว้นว่าง)">${esc(h.condition || "")}</textarea></label>
      <label class="field"><span>ยาที่ใช้ประจำ</span><input type="text" id="hc-meds" value="${esc(h.meds || "")}" placeholder="เช่น วิตามิน D"></label>
      <div class="row2">
        <label class="field"><span>ผู้ติดต่อฉุกเฉิน</span><input type="text" id="hc-emgname" value="${esc(h.emgName || "")}" placeholder="เช่น แม่"></label>
        <label class="field"><span>เบอร์ฉุกเฉิน</span><input type="tel" id="hc-emgphone" value="${esc(h.emgPhone || "")}" placeholder="08x-xxx-xxxx"></label>
      </div>
      <label class="field"><span>แพทย์ / โรงพยาบาลประจำ</span><input type="text" id="hc-hospital" value="${esc(h.hospital || "")}" placeholder="เช่น รพ. ... / พญ. ..."></label>
      <label class="field"><span>หมายเหตุอื่นๆ</span><textarea id="hc-note" placeholder="ข้อมูลเพิ่มเติม">${esc(h.note || "")}</textarea></label>
      <button class="btn block" onclick="saveHealthCard()">💾 บันทึกบัตรสุขภาพ</button>
    </div>
  </div>`;
}
function saveHealthCard() {
  Store.data.healthInfo = {
    blood: $("#hc-blood").value,
    allergy: $("#hc-allergy").value.trim(),
    condition: $("#hc-condition").value.trim(),
    meds: $("#hc-meds").value.trim(),
    emgName: $("#hc-emgname").value.trim(),
    emgPhone: $("#hc-emgphone").value.trim(),
    hospital: $("#hc-hospital").value.trim(),
    note: $("#hc-note").value.trim(),
  };
  Store.save();
  alert("บันทึกบัตรสุขภาพแล้ว 💛");
  go("more");
}

/* ==================================================================
   TIMELINE (ไทม์ไลน์การเติบโต — รวมทุกเหตุการณ์อัตโนมัติ)
   ================================================================== */
function viewTimeline() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const P = Store.data.profile;
  const ev = [];

  Store.data.memories.forEach(m => ev.push({ date: m.date, icon: "📸", cls: "milk", title: m.title, photo: m.photo }));
  Object.entries(Store.data.teeth || {}).forEach(([id, d]) => {
    const t = [...TEETH.upper, ...TEETH.lower].find(x => x.id === id);
    ev.push({ date: d, icon: "🦷", cls: "diaper", title: "ฟันขึ้น: " + (t ? t.name : "") });
  });
  Store.data.growth.forEach(x => ev.push({
    date: x.date, icon: "📏", cls: "grow",
    title: "ชั่ง/วัด: " + [x.weight && x.weight + " กก.", x.height && x.height + " ซม."].filter(Boolean).join(" · "),
  }));
  const msMap = {};
  MILESTONES.forEach(c => c.items.forEach(i => msMap[i.id] = { text: i.text, emoji: DOMAIN_INFO[i.domain].emoji }));
  Object.entries(Store.data.milestones || {}).forEach(([id, v]) => {
    if (v && v.done && v.date) {
      const m = msMap[id];
      ev.push({ date: dayKey(v.date), icon: m ? m.emoji : "🎯", cls: "grow", title: "พัฒนาการ: " + (m ? m.text : "") });
    }
  });
  Store.data.appointments.forEach(a => {
    if (a.done) ev.push({ date: a.date, icon: a.isVaccine ? "💉" : "🩺", cls: "appt", title: a.title });
  });
  Store.data.sizes.forEach(s => {
    const parts = [s.clothing && "เสื้อผ้า " + s.clothing, s.shoe && "รองเท้า " + s.shoe, s.diaper && "ผ้าอ้อม " + s.diaper].filter(Boolean);
    if (parts.length) ev.push({ date: s.date, icon: "👕", cls: "milk", title: "ไซส์: " + parts.join(" · ") });
  });
  if (P.birthDate) ev.push({ date: P.birthDate, icon: "🎂", cls: "appt", title: "วันเกิด " + esc(P.name || "ลูกน้อย") + " 🎉" });

  ev.sort((a, b) => b.date.localeCompare(a.date) || 0);

  let body;
  if (ev.length <= 1) {
    body = `<div class="card"><div class="empty"><span class="e">📅</span>ยังมีเรื่องราวไม่มาก<br>เริ่มบันทึกความทรงจำ ฟันน้ำนม หรือชั่งน้ำหนัก แล้วกลับมาดูไทม์ไลน์ได้เลย 💛</div></div>`;
  } else {
    body = `<div class="timeline">` + ev.map(e => {
      const age = ageTextAtDate(e.date);
      return `<div class="tl-item">
        <div class="tl-dot bubble ${e.cls}">${e.icon}</div>
        <div class="tl-card">
          <div class="tl-meta">${fmtDateFull(e.date + "T00:00")}${age ? ` · อายุ ${age}` : ""}</div>
          <div class="t">${esc(e.title)}</div>
          ${e.photo ? `<img class="mem-img" style="margin-top:8px;max-height:220px" src="${e.photo}" alt="">` : ""}
        </div>
      </div>`;
    }).join("") + `</div>`;
  }

  return topbar() + `<div class="screen">
    <div class="flex between"><h2>📅 ไทม์ไลน์การเติบโต</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="small muted" style="margin:2px 0 12px">เรื่องราวทั้งหมดของ${esc(P.name || "ลูกน้อย")} เรียงจากล่าสุด 💛</div>
    ${body}
  </div>`;
}

/* ==================================================================
   SIZES (ไซส์เสื้อผ้า-รองเท้า)
   ================================================================== */
function viewSizes() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const list = [...Store.data.sizes].sort((a, b) => b.date.localeCompare(a.date));
  const latestOf = (k) => list.find(s => s[k]);
  const cur = { clothing: latestOf("clothing"), shoe: latestOf("shoe"), diaper: latestOf("diaper") };

  const curCard = `<div class="stat-grid">
    <div class="stat"><div class="label">👕 เสื้อผ้า</div><div class="value">${cur.clothing ? esc(cur.clothing.clothing) : "—"}</div></div>
    <div class="stat"><div class="label">👟 รองเท้า</div><div class="value">${cur.shoe ? esc(cur.shoe.shoe) : "—"}</div></div>
    <div class="stat"><div class="label">🧷 ผ้าอ้อม</div><div class="value">${cur.diaper ? esc(cur.diaper.diaper) : "—"}</div></div>
    <div class="stat" onclick="sheetSize()" style="cursor:pointer;display:grid;place-items:center;background:var(--cream-2)"><div class="value" style="font-size:16px;color:var(--orange-d)">＋ อัปเดตไซส์</div></div>
  </div>`;

  const hist = list.length ? list.map(s => {
    const parts = [s.clothing && "👕 " + s.clothing, s.shoe && "👟 " + s.shoe, s.diaper && "🧷 " + s.diaper].filter(Boolean).join("  ");
    return `<div class="list-item">
      <div class="bubble milk">👕</div>
      <div class="body"><div class="t">${esc(parts)}</div><div class="s">${fmtDateFull(s.date + "T00:00")}${ageTextAtDate(s.date) ? " · อายุ " + ageTextAtDate(s.date) : ""}${s.note ? " · " + esc(s.note) : ""}</div></div>
      <button class="del-btn" onclick="delItem('sizes','${s.id}')">🗑️</button>
    </div>`;
  }).join("") : `<div class="empty small">ยังไม่มีประวัติ</div>`;

  return topbar() + `<div class="screen">
    <div class="flex between"><h2>👕 ไซส์ปัจจุบัน</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="small muted" style="margin:2px 0 10px">จดไซส์ไว้ เวลาไปซื้อเสื้อผ้า-รองเท้าจะได้ไม่ต้องเดา</div>
    ${curCard}
    <div class="section-title">ประวัติไซส์</div>
    <div class="card">${hist}</div>
  </div>`;
}
function sheetSize() {
  openSheet("👕 อัปเดตไซส์", `
    <label class="field"><span>วันที่</span><input type="date" id="sz-date" value="${dayKey(new Date())}" max="${dayKey(new Date())}"></label>
    <label class="field"><span>ไซส์เสื้อผ้า</span><input type="text" id="sz-clothing" placeholder="เช่น 80, 12-18m, M"></label>
    <label class="field"><span>ไซส์รองเท้า</span><input type="text" id="sz-shoe" placeholder="เช่น 13 ซม. / เบอร์ 22"></label>
    <label class="field"><span>ไซส์ผ้าอ้อม</span><input type="text" id="sz-diaper" placeholder="เช่น M, L, XL"></label>
    <label class="field"><span>หมายเหตุ</span><input type="text" id="sz-note" placeholder="ไม่บังคับ"></label>
    <button class="btn block" onclick="saveSize()">💾 บันทึก</button>
  `);
}
function saveSize() {
  const clothing = $("#sz-clothing").value.trim(), shoe = $("#sz-shoe").value.trim(), diaper = $("#sz-diaper").value.trim();
  if (!clothing && !shoe && !diaper) { alert("ใส่ไซส์อย่างน้อย 1 อย่าง"); return; }
  Store.add("sizes", { date: $("#sz-date").value || dayKey(new Date()), clothing, shoe, diaper, note: $("#sz-note").value.trim() });
  closeSheet(); render();
}

/* ==================================================================
   LETTERS (จดหมายถึงลูก)
   ================================================================== */
function viewLetters() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const list = [...(Store.data.letters || [])].sort((a, b) => b.date.localeCompare(a.date));
  let body;
  if (list.length === 0) {
    body = `<div class="card"><div class="empty"><span class="e">💌</span>ยังไม่มีจดหมาย<br>เขียนข้อความถึงลูกไว้ให้อ่านตอนโตกันนะ 💛</div></div>`;
  } else {
    body = list.map(l => `<div class="card">
      <div class="flex between" style="align-items:flex-start">
        <h3 style="flex:1">${esc(l.title || "ถึงลูกรัก")}</h3>
        <button class="del-btn" onclick="delItem('letters','${l.id}')">🗑️</button>
      </div>
      <div class="small muted" style="margin:2px 0 8px">📅 ${fmtDateFull(l.date + "T00:00")}${ageTextAtDate(l.date) ? " · อายุ " + ageTextAtDate(l.date) : ""}</div>
      <div style="white-space:pre-wrap;font-family:var(--font-fun);line-height:1.7">${esc(l.body)}</div>
    </div>`).join("");
  }
  return topbar() + `<div class="screen">
    <div class="flex between"><h2>💌 จดหมายถึงลูก</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="small muted" style="margin:2px 0 10px">บันทึกความรู้สึก ความหวัง คำอวยพร ไว้ให้${esc(Store.data.profile.name || "ลูก")}อ่านในวันข้างหน้า</div>
    ${body}
  </div>`;
}
function sheetLetter() {
  openSheet("💌 เขียนจดหมายถึงลูก", `
    <label class="field"><span>หัวข้อ</span><input type="text" id="lt-title" placeholder="เช่น ถึงลูกในวันเกิดขวบแรก"></label>
    <label class="field"><span>วันที่</span><input type="date" id="lt-date" value="${dayKey(new Date())}" max="${dayKey(new Date())}"></label>
    <label class="field"><span>ข้อความ</span><textarea id="lt-body" style="min-height:160px" placeholder="เขียนถึงลูก..."></textarea></label>
    <button class="btn pink block" onclick="saveLetter()">💾 บันทึกจดหมาย</button>
  `);
}
function saveLetter() {
  const body = $("#lt-body").value.trim();
  if (!body) { alert("กรุณาเขียนข้อความ"); return; }
  Store.add("letters", { title: $("#lt-title").value.trim(), date: $("#lt-date").value || dayKey(new Date()), body });
  closeSheet(); render();
}

/* ==================================================================
   QUOTES (คำพูดน่ารักของลูก)
   ================================================================== */
function viewQuotes() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const list = [...(Store.data.quotes || [])].sort((a, b) => b.date.localeCompare(a.date));
  let body;
  if (list.length === 0) {
    body = `<div class="card"><div class="empty"><span class="e">💬</span>ยังไม่มีคำพูด<br>เก็บคำพูดหรือเรื่องขำน่ารักๆ ของลูกไว้กันเถอะ 😄</div></div>`;
  } else {
    body = list.map(q => `<div class="card">
      <div class="flex between" style="align-items:flex-start">
        <div style="flex:1;font-family:var(--font-fun);font-size:18px">“${esc(q.text)}”</div>
        <button class="del-btn" onclick="delItem('quotes','${q.id}')">🗑️</button>
      </div>
      <div class="small muted" style="margin-top:6px">${fmtDateFull(q.date + "T00:00")}${ageTextAtDate(q.date) ? " · อายุ " + ageTextAtDate(q.date) : ""}${q.note ? " · " + esc(q.note) : ""}</div>
    </div>`).join("");
  }
  return topbar() + `<div class="screen">
    <div class="flex between"><h2>💬 คำพูดน่ารัก</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="small muted" style="margin:2px 0 10px">คำพูด เรื่องขำ หรือคำน่ารักๆ ที่${esc(Store.data.profile.name || "ลูก")}พูด — อ่านทีไรก็ยิ้ม 😊</div>
    ${body}
  </div>`;
}
function sheetQuote() {
  openSheet("💬 เพิ่มคำพูดน่ารัก", `
    <label class="field"><span>คำพูด/เรื่องที่ลูกพูด</span><textarea id="qt-text" placeholder="เช่น หนูรักแม่เท่าฟ้าเลย!"></textarea></label>
    <label class="field"><span>วันที่</span><input type="date" id="qt-date" value="${dayKey(new Date())}" max="${dayKey(new Date())}"></label>
    <label class="field"><span>หมายเหตุ (ไม่บังคับ)</span><input type="text" id="qt-note" placeholder="เช่น ตอนกินข้าวเย็น"></label>
    <button class="btn teal block" onclick="saveQuote()">💾 บันทึก</button>
  `);
}
function saveQuote() {
  const text = $("#qt-text").value.trim();
  if (!text) { alert("กรุณาใส่คำพูด"); return; }
  Store.add("quotes", { text, date: $("#qt-date").value || dayKey(new Date()), note: $("#qt-note").value.trim() });
  closeSheet(); render();
}

/* ==================================================================
   CHILDREN (ลูกหลายคน)
   ================================================================== */
function pickChild(id) { Store.switchChild(id); App.msCheckpoint = null; render(); }
function viewChildren() {
  const kids = Store.children();
  return topbar() + `<div class="screen">
    <div class="flex between"><h2>👨‍👩‍👧 ลูกของเรา</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="small muted" style="margin:2px 0 10px">แตะเพื่อสลับดูข้อมูลของลูกแต่ละคน</div>
    <div class="card" style="padding:6px 16px">
      ${kids.map(c => {
    const active = c.id === Store.activeId;
    const bd = c.profile.birthDate;
    let agetxt = "ยังไม่ได้ตั้งวันเกิด";
    if (bd) { const sv = Store.data; Store.data = c; agetxt = "อายุ " + ageText(); Store.data = sv; }
    return `<div class="list-item">
        <div class="bubble milk" style="cursor:pointer" onclick="pickChild('${c.id}')">${c.profile.photo ? `<img src="${c.profile.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">` : (c.profile.gender === "girl" ? "👧" : "👦")}</div>
        <div class="body" style="cursor:pointer" onclick="pickChild('${c.id}')">
          <div class="t">${esc(c.profile.name || "ลูกน้อย")} ${active ? '<span class="badge" style="background:var(--green);color:#fff">กำลังดู</span>' : ""}</div>
          <div class="s">${agetxt}</div>
        </div>
        <button class="del-btn" onclick="renameChildPrompt('${c.id}')">✏️</button>
        ${kids.length > 1 ? `<button class="del-btn" onclick="deleteChild('${c.id}')">🗑️</button>` : ""}
      </div>`;
  }).join("")}
    </div>
    <button class="btn block teal" onclick="promptAddChild()">➕ เพิ่มลูกอีกคน</button>
  </div>`;
}
function promptAddChild() {
  const name = prompt("ชื่อเล่นของลูกคนใหม่:");
  if (name === null) return;
  Store.addChild(name.trim());
  App.msCheckpoint = null;
  go("profile"); // ไปตั้งวันเกิด/เพศต่อ
}
function renameChildPrompt(id) {
  const c = Store.children().find(x => x.id === id);
  const name = prompt("เปลี่ยนชื่อเล่น:", c ? c.profile.name : "");
  if (name === null) return;
  Store.renameChild(id, name.trim());
  render();
}
function deleteChild(id) {
  const c = Store.children().find(x => x.id === id);
  if (confirm(`ลบข้อมูลของ "${c ? c.profile.name || "ลูกน้อย" : ""}" ทั้งหมด? ย้อนกลับไม่ได้`)) {
    Store.removeChild(id);
    render();
  }
}

function growthChart(type) {
  const key = type === "weight" ? "wt" : "ht";
  const gender = Store.data.profile.gender;
  const data = [...Store.data.growth]
    .map(x => ({ m: ageMonthsAt(x.date), v: +(type === "weight" ? x.weight : x.height) }))
    .filter(d => d.v > 0 && isFinite(d.m))
    .sort((a, b) => a.m - b.m);

  const W = 500, H = 300, pad = { l: 40, r: 14, t: 14, b: 30 };
  const maxDataM = data.length ? Math.max(...data.map(d => d.m)) : 0;
  const xMax = Math.max(24, Math.ceil(maxDataM));
  // y range from WHO + data
  let vals = [];
  for (let mo = 0; mo <= 24; mo++) { vals.push(WHO[gender][key][mo][0], WHO[gender][key][mo][2]); }
  data.forEach(d => vals.push(d.v));
  let yMin = Math.min(...vals), yMax = Math.max(...vals);
  const padY = (yMax - yMin) * 0.08; yMin -= padY; yMax += padY;

  const X = m => pad.l + (m / xMax) * (W - pad.l - pad.r);
  const Y = v => H - pad.b - ((v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);

  // WHO band (P3 bottom, P97 top) across 0..24
  let top = [], bot = [];
  for (let mo = 0; mo <= 24; mo++) { top.push(`${X(mo)},${Y(WHO[gender][key][mo][2])}`); bot.push(`${X(mo)},${Y(WHO[gender][key][mo][0])}`); }
  const band = `<polygon points="${top.join(" ")} ${bot.reverse().join(" ")}" fill="#D9E8E6" opacity="0.55"/>`;
  let p50 = [];
  for (let mo = 0; mo <= 24; mo++) p50.push(`${X(mo)},${Y(WHO[gender][key][mo][1])}`);
  const p50line = `<polyline points="${p50.join(" ")}" fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-dasharray="2 4"/>`;

  // grid + axes
  let grid = "";
  const yStep = niceStep((yMax - yMin) / 4);
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
    grid += `<line x1="${pad.l}" y1="${Y(v)}" x2="${W - pad.r}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/>
             <text x="${pad.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-soft)">${+v.toFixed(1)}</text>`;
  }
  let xlabels = "";
  const xStep = xMax > 24 ? 6 : 3;
  for (let mo = 0; mo <= xMax; mo += xStep) {
    xlabels += `<text x="${X(mo)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--ink-soft)">${mo}ด.</text>`;
  }

  // data line + points
  let dline = "", dots = "";
  if (data.length) {
    dline = `<polyline points="${data.map(d => `${X(d.m)},${Y(d.v)}`).join(" ")}" fill="none" stroke="var(--orange-d)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    dots = data.map(d => `<circle cx="${X(d.m)}" cy="${Y(d.v)}" r="5" fill="#fff" stroke="var(--orange-d)" stroke-width="3"/>`).join("");
  }

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">
    ${grid}${band}${p50line}${dline}${dots}${xlabels}
  </svg>`;
}
function niceStep(x) {
  const pow = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/* ==================================================================
   DEV (milestones + AI)
   ================================================================== */
function analyzeDevelopment() {
  const a = ageData();
  const ms = Store.data.milestones;
  const result = { insights: [], overdue: [], pct: 0, done: 0, total: 0, checkpointLabel: "—", homeCard: "" };
  if (!a) return result;
  const ageM = correctedMonths(); // ใช้อายุแก้ไขสำหรับเด็กคลอดก่อนกำหนด

  // current checkpoint = latest with month <= ageM (or first)
  let cp = MILESTONES[0];
  MILESTONES.forEach(c => { if (c.month <= ageM) cp = c; });
  App.msCheckpoint = App.msCheckpoint || cp.month;
  result.checkpointLabel = "ช่วง " + cp.label;

  const done = cp.items.filter(i => ms[i.id]?.done).length;
  result.done = done; result.total = cp.items.length;
  result.pct = Math.round((done / cp.items.length) * 100);

  // overdue: items from checkpoints fully passed (month <= ageM) not done
  MILESTONES.forEach(c => {
    if (c.month <= ageM) c.items.forEach(i => { if (!ms[i.id]?.done) result.overdue.push({ ...i, cpMonth: c.month, cpLabel: c.label }); });
  });
  const serious = result.overdue.filter(o => o.cpMonth <= ageM - 2);

  // ผู้ปกครองเริ่มใช้ฟีเจอร์แล้วหรือยัง (ติ๊กอย่างน้อย 1 ข้อ)
  const engaged = Object.keys(ms).length > 0;

  // build AI insights text
  const name = esc(Store.data.profile.name || "ลูกน้อย");
  let msg = `${name}อายุ ${ageText()} 🎉 `;
  if (!engaged) {
    msg += `มาเริ่มติ๊กทักษะที่น้องทำได้ในหน้านี้กันนะ แล้วผู้ช่วยจะช่วยวิเคราะห์พัฒนาการและคอยเตือนสิ่งที่ควรสังเกตให้เอง`;
  } else if (result.pct >= 80) {
    msg += `พัฒนาการช่วง${cp.label}ไปได้สวยมาก ผ่านแล้ว ${done}/${cp.items.length} ข้อ เก่งมากเลย!`;
  } else if (result.pct >= 40) {
    msg += `กำลังเรียนรู้ทักษะช่วง${cp.label} ผ่านแล้ว ${done}/${cp.items.length} ข้อ ค่อยๆ ฝึกไปด้วยกันนะ`;
  } else {
    msg += `ลองสังเกตและกระตุ้นทักษะช่วง${cp.label}เพิ่มเติมดูนะ เด็กแต่ละคนมีจังหวะของตัวเอง`;
  }

  const tag = "💡 เคล็ดลับ: " + tipFor(cp.month);

  // แจ้งเตือน (เฉพาะหน้าพัฒนาการ) — เตือนสีแดงเฉพาะเมื่อผู้ปกครองใช้งานฟีเจอร์แล้ว
  let alertHtml = "";
  if (engaged && serious.length > 0) {
    alertHtml = `<div class="alert"><span class="e">🔎</span><div>ยังมี <b>${serious.length}</b> ทักษะของช่วงวัยก่อนหน้าที่ยังไม่ได้ติ๊ก ลองทบทวนดูนะว่าน้องทำได้หรือยัง — ถ้าทำได้แล้วให้ติ๊กเพิ่ม หากมีข้อสงสัยเรื่องพัฒนาการ สามารถปรึกษากุมารแพทย์หรือพยาบาลได้ (เด็กแต่ละคนมีจังหวะต่างกัน)</div></div>`;
  } else if (!engaged) {
    alertHtml = `<div class="alert"><span class="e">👇</span><div>ติ๊กทักษะที่น้องทำได้แล้วในรายการด้านล่าง เพื่อให้ผู้ช่วยวิเคราะห์ได้แม่นยำขึ้น</div></div>`;
  }

  result.aiCard = `
    <div class="ai-card">
      <h3>🤖 ผู้ช่วยพัฒนาการ</h3>
      <p>${msg}</p>
      <span class="tag">${tag}</span>
    </div>`;
  result.alert = alertHtml;
  result.homeCard = result.aiCard; // หน้าหลักแสดงเฉพาะการ์ด AI (ไม่มีแจ้งเตือนสีแดง)
  result.currentCp = cp;
  result.serious = serious;
  result.engaged = engaged;
  return result;
}
function tipFor(month) {
  const tips = {
    2: "สบตา ยิ้ม พูดคุยเสียงสูงต่ำ และให้นอนคว่ำเล่น (tummy time) วันละน้อย",
    4: "เขย่าของเล่นให้คว้า อ่านนิทานภาพสีสด และตอบสนองเสียงอ้อแอ้ของลูก",
    6: "ให้ลองจับอาหาร ฝึกนั่ง เล่นจ๊ะเอ๋ และเรียกชื่อลูกบ่อยๆ",
    9: "เล่นซ่อนของให้หา คลานไล่จับ และชี้ชวนเรียกชื่อสิ่งของรอบตัว",
    12: "ชวนโบกมือบ๊ายบาย ชี้รูปในหนังสือ และให้ลองถือแก้วดื่มเอง",
    15: "ฝึกพูดคำสั้นๆ ซ้ำๆ ให้ช่วยงานบ้านง่ายๆ และต่อบล็อก",
    18: "ชวนชี้อวัยวะร่างกาย เล่นสมมติ และให้ใช้ช้อนตักกินเอง",
    24: "พูดเป็นวลี 2 คำ อ่านนิทานโต้ตอบ และฝึกวิ่ง-เตะบอล",
    30: "เล่าเรื่องสั้นๆ ฝึกแยกสี/รูปทรง และกระโดดสองเท้า",
    36: "ถามตอบง่ายๆ วาดรูปตามแบบ และเล่นเป็นกลุ่มกับเพื่อน",
  };
  return tips[month] || "เล่นและพูดคุยกับลูกบ่อยๆ ช่วยเสริมพัฒนาการได้ดีที่สุด";
}

function viewDev() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const dev = analyzeDevelopment();
  const ms = Store.data.milestones;
  const sel = App.msCheckpoint ?? dev.currentCp.month;
  const cp = MILESTONES.find(c => c.month === sel) || dev.currentCp;

  // group selected checkpoint by domain
  const byDom = {};
  cp.items.forEach(i => (byDom[i.domain] = byDom[i.domain] || []).push(i));
  const doneSel = cp.items.filter(i => ms[i.id]?.done).length;

  let groups = "";
  Object.keys(byDom).forEach(dom => {
    const info = DOMAIN_INFO[dom];
    groups += `<div class="card">
      <h3 style="color:${info.color}">${info.emoji} ${info.label}</h3>
      ${byDom[dom].map(i => {
      const done = ms[i.id]?.done;
      return `<div class="ms-item ${done ? "done" : ""}" onclick="toggleMs('${i.id}',event)">
          <div class="ms-check">${done ? "✓" : ""}</div>
          <div class="ms-text">${esc(i.text)}</div>
        </div>`;
    }).join("")}
    </div>`;
  });

  return topbar() + `<div class="screen">
    <h2>🎯 พัฒนาการตามวัย</h2>
    ${isPreterm() ? `<div class="alert"><span class="e">✨</span><div>น้องคลอดก่อนกำหนด — ประเมินพัฒนาการด้วย <b>อายุแก้ไข ${correctedAgeText()}</b> (ไม่ใช่อายุจริง) ซึ่งเหมาะสมกว่าจนถึงอายุประมาณ 2 ปี</div></div>` : ""}
    ${dev.aiCard}
    ${dev.alert}

    <div class="section-title">เลือกช่วงอายุ</div>
    <div class="chips" style="margin-bottom:12px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px">
      ${MILESTONES.map(c => `<button class="chip ${c.month === sel ? "active purple" : ""}" style="white-space:nowrap" onclick="App.msCheckpoint=${c.month};render()">${c.label}</button>`).join("")}
    </div>

    <div class="card">
      <div class="flex between"><h3>${cp.label}</h3><span class="badge">${doneSel}/${cp.items.length}</span></div>
      <div class="progress mt"><span style="width:${Math.round(doneSel / cp.items.length * 100)}%;background:linear-gradient(90deg,var(--purple),#6C5CE7)"></span></div>
    </div>
    ${groups}
    <div class="card small muted">
      ℹ️ รายการอ้างอิงเกณฑ์พัฒนาการ CDC/WHO เด็กแต่ละคนมีจังหวะต่างกันได้ ใช้เป็นแนวทางคร่าวๆ หากมีข้อสงสัยควรปรึกษาแพทย์
    </div>
  </div>`;
}
function toggleMs(id, ev) {
  const wasDone = Store.data.milestones[id]?.done;
  Store.toggleMilestone(id);
  if (!wasDone && ev) celebrate((ev.currentTarget && ev.currentTarget.querySelector(".ms-check")) || ev.target);
  render();
}

/* ---- คอนเฟตติฉลองความสำเร็จ ---- */
function celebrate(el) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const emojis = ["⭐", "🎉", "💛", "✨", "🌟", "💫", "🎈"];
  const box = document.createElement("div");
  box.className = "confetti";
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const ang = Math.random() * Math.PI * 2, dist = 45 + Math.random() * 70;
    s.style.left = cx + "px"; s.style.top = cy + "px";
    s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    s.style.setProperty("--dy", (Math.sin(ang) * dist - 45) + "px");
    s.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
    s.style.animationDelay = (Math.random() * 0.06) + "s";
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1200);
}

/* ==================================================================
   MORE
   ================================================================== */
function viewMore() {
  const shopLeft = Store.data.shopping.filter(s => !s.bought).length;
  const apptLeft = Store.data.appointments.filter(a => !a.done && a.date >= dayKey(new Date())).length;
  const todayTemps = Store.data.temps.filter(t => dayKey(t.time) === dayKey(new Date()));
  const maxTemp = todayTemps.length ? Math.max(...todayTemps.map(t => +t.value)) : null;
  const teethN = Object.keys(Store.data.teeth || {}).length;
  const hi = Store.data.healthInfo || {};
  const hasCard = hi.blood || hi.allergy || hi.condition || hi.emgPhone;
  const latestSize = [...Store.data.sizes].sort((a, b) => b.date.localeCompare(a.date))[0];
  const menu = [
    ["timeline", "📅", "ไทม์ไลน์การเติบโต", "ดูเรื่องราวการเติบโตทั้งหมด"],
    ["letters", "💌", "จดหมายถึงลูก", (Store.data.letters || []).length ? `${Store.data.letters.length} ฉบับ` : "เขียนถึงลูกไว้ให้อ่านตอนโต"],
    ["quotes", "💬", "คำพูดน่ารักของลูก", (Store.data.quotes || []).length ? `${Store.data.quotes.length} ประโยค` : "เก็บคำพูด/เรื่องขำไว้"],
    ["teeth", "🦷", "ผังฟันน้ำนม", teethN ? `ขึ้นแล้ว ${teethN}/20 ซี่` : "บันทึกฟันที่ขึ้นแต่ละซี่"],
    ["sizes", "👕", "ไซส์เสื้อผ้า-รองเท้า", latestSize ? `ล่าสุด ${[latestSize.clothing && "เสื้อ " + latestSize.clothing, latestSize.shoe && "รองเท้า " + latestSize.shoe].filter(Boolean).join(" · ") || "บันทึกแล้ว"}` : "จดไซส์ปัจจุบันไว้ตอนซื้อของ"],
    ["healthcard", "🩺", "บัตรสุขภาพ", hasCard ? "ดู/แก้ไขข้อมูลสุขภาพ" : "กรุ๊ปเลือด แพ้ยา/อาหาร เบอร์ฉุกเฉิน"],
    ["health", "🌡️", "สุขภาพ (ไข้ & ยา)", maxTemp ? `ไข้วันนี้สูงสุด ${maxTemp}°C` : "บันทึกอุณหภูมิ & ยา/วิตามิน"],
    ["appt", "💉", "นัดหมอ & วัคซีน", `${apptLeft} นัดที่กำลังจะถึง`],
    ["shopping", "🛒", "ของต้องซื้อให้ลูก", `เหลือ ${shopLeft} รายการ`],
    ["sync", "🔄", "ซิงค์ข้อมูลพ่อแม่", (typeof Sync !== "undefined" && Sync.ready) ? `✅ เปิดอยู่ (รหัส ${Sync.code})` : "ให้ข้อมูลตรงกันทุกเครื่อง"],
    ["profile", "👶", "ข้อมูลลูกน้อย", Store.data.profile.name || "ยังไม่ได้ตั้งค่า"],
    ["settings", "⚙️", "ตั้งค่า & สำรองข้อมูล", "ส่งออก/นำเข้าข้อมูล"],
  ];
  return topbar() + `<div class="screen">
    <h2>🧸 เพิ่มเติม</h2>
    <div class="card" style="padding:6px 16px">
      ${menu.map((m, i) => `<div class="list-item more-item" style="cursor:pointer;animation-delay:${0.03 + i * 0.05}s" onclick="go('${m[0]}')">
        <div class="bubble appt">${m[1]}</div>
        <div class="body"><div class="t">${m[2]}</div><div class="s">${esc(m[3])}</div></div>
        <div class="time">›</div>
      </div>`).join("")}
    </div>
  </div>`;
}

/* ---- Shopping ---- */
function viewShopping() {
  const items = Store.data.shopping;
  const cats = {};
  items.forEach(i => (cats[i.cat] = cats[i.cat] || []).push(i));
  const order = Object.keys(CATEGORY_EMOJI).filter(c => cats[c]).concat(Object.keys(cats).filter(c => !CATEGORY_EMOJI[c]));
  const boughtN = items.filter(i => i.bought).length;

  let body = order.map(cat => {
    const list = cats[cat];
    return `<div class="section-title">${CATEGORY_EMOJI[cat] || "🧸"} ${cat}</div>
    <div class="card">
      ${list.map(i => `<div class="shop-item ${i.bought ? "bought" : ""}">
        <div class="shop-check" onclick="toggleShop('${i.id}',event)">${i.bought ? "✓" : ""}</div>
        <div class="nm">${esc(i.name)}${i.qty > 1 ? ` <span class="badge">x${i.qty}</span>` : ""}</div>
        <button class="del-btn" onclick="delItem('shopping','${i.id}')">🗑️</button>
      </div>`).join("")}
    </div>`;
  }).join("");

  if (items.length === 0) body = `<div class="card"><div class="empty"><span class="e">🛒</span>ยังไม่มีรายการ<br>แตะ ＋ เพื่อเพิ่มของที่ต้องซื้อ</div></div>`;

  return topbar() + `<div class="screen">
    <div class="flex between"><h2>🛒 ของต้องซื้อ</h2><span class="badge">ได้แล้ว ${boughtN}/${items.length}</span></div>
    <div class="progress mt" style="margin-bottom:6px"><span style="width:${items.length ? boughtN / items.length * 100 : 0}%"></span></div>
    ${body}
  </div>`;
}
function toggleShop(id, ev) {
  const it = Store.data.shopping.find(x => x.id === id);
  const becoming = !it.bought;
  Store.update("shopping", id, { bought: becoming });
  if (becoming && ev) celebrate(ev.currentTarget || ev.target);
  render();
}

/* ---- Appointments ---- */
function viewAppt() {
  const today = dayKey(new Date());
  const appts = [...Store.data.appointments].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = appts.filter(a => !a.done && a.date >= today);
  const past = appts.filter(a => a.done || a.date < today).reverse();
  const hasVaccine = Store.data.appointments.some(a => a.isVaccine);

  const row = a => `<div class="list-item">
    <div class="bubble appt">${a.isVaccine ? "💉" : "🩺"}</div>
    <div class="body"><div class="t" ${a.done ? 'style="text-decoration:line-through;color:var(--ink-soft)"' : ""}>${esc(a.title)}</div>
      <div class="s">${fmtDateFull(a.date + "T00:00")}${a.time ? " · " + a.time + " น." : ""}${a.place ? " · " + esc(a.place) : ""}</div>
      ${a.note ? `<div class="s">📝 ${esc(a.note)}</div>` : ""}</div>
    <button class="del-btn" onclick="toggleAppt('${a.id}')">${a.done ? "↩️" : "✅"}</button>
    <button class="del-btn" onclick="delItem('appointments','${a.id}')">🗑️</button>
  </div>`;

  return topbar() + `<div class="screen">
    <h2>🩺 นัดหมอ & วัคซีน</h2>
    ${!hasVaccine && Store.data.profile.birthDate ? `<div class="alert"><span class="e">💉</span><div>สร้างตารางวัคซีนอัตโนมัติจากวันเกิดของลูกได้เลย<br><button class="btn sm teal mt" onclick="genVaccines()">➕ สร้างตารางวัคซีนตามเกณฑ์</button></div></div>` : ""}
    <div class="section-title">📅 กำลังจะถึง</div>
    <div class="card">${upcoming.length ? upcoming.map(row).join("") : `<div class="empty small">ไม่มีนัดที่กำลังจะถึง</div>`}</div>
    ${past.length ? `<div class="section-title">✔️ ผ่านไปแล้ว</div><div class="card">${past.map(row).join("")}</div>` : ""}
  </div>`;
}
function toggleAppt(id) {
  const a = Store.data.appointments.find(x => x.id === id);
  Store.update("appointments", id, { done: !a.done });
  render();
}
function genVaccines() {
  const n = Store.seedVaccines();
  alert(n > 0 ? `สร้างนัดวัคซีน ${n} รายการเรียบร้อย 💉` : "มีตารางวัคซีนอยู่แล้ว");
  render();
}

/* ---- Profile ---- */
function viewProfile() {
  const p = Store.data.profile;
  return topbar() + `<div class="screen">
    <div class="flex between"><h2>👶 ข้อมูลลูกน้อย</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="card">
      <div class="center" style="margin-bottom:10px">
        <div class="avatar-wrap" style="display:inline-block" onclick="triggerPhoto()">
          <div class="avatar" style="margin:0 auto;width:100px;height:100px;background:var(--cream-2);color:var(--ink);overflow:hidden">${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (p.birthDate ? babyFace() : "📷")}</div>
          <span class="cam-badge" style="width:30px;height:30px;font-size:15px">📷</span>
        </div>
        <div class="small muted mt">📷 แตะรูปเพื่อเพิ่ม/เปลี่ยนรูปจริง${p.photo ? "" : (p.birthDate ? " · ตอนนี้ใช้หน้าการ์ตูนตามวัย" : "")}</div>
        ${p.photo ? `<div class="mt"><button class="btn ghost sm" onclick="removePhoto()">🗑️ ลบรูป ใช้หน้าการ์ตูนตามวัย</button></div>` : ""}
      </div>
      <label class="field"><span>ชื่อเล่น</span><input type="text" id="pf-name" value="${esc(p.name)}" placeholder="เช่น น้องข้าวปั้น"></label>
      <label class="field"><span>เพศ</span>
        <div class="chips">
          <button class="chip ${p.gender === "boy" ? "active" : ""}" onclick="setGender('boy')">👦 ชาย</button>
          <button class="chip ${p.gender === "girl" ? "active pink" : ""}" onclick="setGender('girl')">👧 หญิง</button>
        </div>
      </label>
      <label class="field"><span>วันเกิด</span><input type="date" id="pf-birth" value="${p.birthDate}" max="${dayKey(new Date())}"></label>

      <div class="field" style="margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">👶 คลอดก่อนกำหนด? (ไม่บังคับ)</span>
        <div class="small muted" style="margin:2px 0 8px">ใส่ <b>วันครบกำหนดคลอด</b> เพื่อให้แอปคำนวณ "อายุแก้ไข" ที่ใช้กับเกณฑ์พัฒนาการ/น้ำหนัก (เว้นว่างถ้าคลอดตรงกำหนด)</div>
        <label class="field"><span>วันครบกำหนดคลอด (EDD)</span><input type="date" id="pf-due" value="${p.dueDate || ""}"></label>
        <div class="small muted" style="margin:-6px 0 8px">หรือใส่เป็นอายุครรภ์ตอนคลอดแทนก็ได้:</div>
        <div class="row2">
          <label class="field" style="margin-bottom:0"><span>อายุครรภ์ (สัปดาห์)</span><input type="number" id="pf-gw" inputmode="numeric" min="20" max="42" value="${p.gestWeeks || ""}" placeholder="เช่น 33"></label>
          <label class="field" style="margin-bottom:0"><span>+ วัน</span><input type="number" id="pf-gd" inputmode="numeric" min="0" max="6" value="${p.gestDays || ""}" placeholder="เช่น 4"></label>
        </div>
      </div>

      <button class="btn block" onclick="saveProfile()">💾 บันทึกข้อมูล</button>
    </div>
  </div>`;
}
function setGender(g) {
  const nameEl = $("#pf-name"), birthEl = $("#pf-birth");
  const patch = { gender: g };
  if (nameEl) patch.name = nameEl.value.trim();
  if (birthEl && birthEl.value) patch.birthDate = birthEl.value;
  if ($("#pf-gw")) patch.gestWeeks = $("#pf-gw").value;
  if ($("#pf-gd")) patch.gestDays = $("#pf-gd").value;
  if ($("#pf-due")) patch.dueDate = $("#pf-due").value;
  Store.setProfile(patch);
  go("profile");
}
function triggerPhoto() { document.getElementById("photo-input").click(); }
function removePhoto() {
  if (confirm("ลบรูปจริงและกลับไปใช้หน้าการ์ตูนตามวัย?")) { Store.setProfile({ photo: "" }); render(); }
}
function pickPhoto(ev) {
  const file = ev.target.files[0]; if (!file) { return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); const size = 320;
      const s = Math.min(img.width, img.height);
      c.width = size; c.height = size;
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      try { Store.setProfile({ photo: c.toDataURL("image/jpeg", 0.82) }); }
      catch (err) { alert("รูปใหญ่เกินไป ลองใช้รูปอื่น"); }
      ev.target.value = "";
      render();
    };
    img.onerror = () => { alert("เปิดรูปไม่สำเร็จ ลองใหม่อีกครั้ง"); ev.target.value = ""; };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function saveProfile() {
  const name = $("#pf-name").value.trim();
  const birth = $("#pf-birth").value;
  if (!birth) { alert("กรุณาใส่วันเกิดของลูกน้อย"); return; }
  const gw = $("#pf-gw") ? $("#pf-gw").value : "";
  const gd = $("#pf-gd") ? $("#pf-gd").value : "";
  const due = $("#pf-due") ? $("#pf-due").value : "";
  Store.setProfile({ name, birthDate: birth, gestWeeks: gw, gestDays: gd, dueDate: due });
  alert("บันทึกเรียบร้อย 💛");
  go("home");
}

/* ---- Settings ---- */
function viewSettings() {
  return topbar() + `<div class="screen">
    <div class="flex between"><h2>⚙️ ตั้งค่า</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="card" style="cursor:pointer" onclick="go('sync')">
      <div class="flex between"><h3>🔄 ซิงค์ข้อมูลพ่อแม่</h3><span class="time">›</span></div>
      <p class="small muted" style="margin:4px 0 0">${(typeof Sync !== "undefined" && Sync.ready) ? "✅ เปิดอยู่ — ข้อมูลตรงกันทุกเครื่อง" : "ให้มือถือพ่อ-แม่เห็นข้อมูลเดียวกันแบบเรียลไทม์"}</p>
    </div>
    <div class="card">
      <h3>📄 ออกเป็นสมุด PDF</h3>
      <p class="small muted">รวมโปรไฟล์ การเติบโต พัฒนาการ ความทรงจำ คำพูด และจดหมาย เป็นสมุดสวยๆ (เลือก "บันทึกเป็น PDF" ในหน้าพิมพ์)</p>
      <button class="btn block purple mt" onclick="exportPDF()">📄 สร้างสมุด PDF</button>
    </div>
    <div class="card">
      <h3>💾 สำรอง & กู้คืนข้อมูล</h3>
      <p class="small muted">สำรองข้อมูลลูกทุกคน แนะนำให้ส่งออกเก็บไว้เป็นระยะ หรือใช้ย้ายเครื่อง</p>
      <button class="btn block teal mt" onclick="exportData()">⬇️ ส่งออกข้อมูล (ไฟล์สำรอง)</button>
      <label class="btn block ghost mt" style="cursor:pointer">⬆️ นำเข้าข้อมูล
        <input type="file" accept="application/json" style="display:none" onchange="importData(event)">
      </label>
    </div>
    <div class="card">
      <h3>📲 ติดตั้งลงหน้าจอ</h3>
      <p class="small muted">เปิดแอปนี้ในเบราว์เซอร์ แล้วเลือก "เพิ่มลงในหน้าจอหลัก" (Add to Home Screen) เพื่อใช้งานเหมือนแอปจริง ใช้งานออฟไลน์ได้</p>
    </div>
    <div class="card">
      <h3 style="color:var(--red)">⚠️ ล้างข้อมูล</h3>
      <p class="small muted">ลบข้อมูลทั้งหมดในเครื่องนี้อย่างถาวร</p>
      <button class="btn block danger mt" onclick="resetAll()">🗑️ ล้างข้อมูลทั้งหมด</button>
    </div>
    <div class="center small muted" style="padding:10px">Baby Kids 🦒 v1.0 · ทำด้วย 💛 สำหรับคุณพ่อคุณแม่</div>
  </div>`;
}
function exportData() {
  const blob = new Blob([Store.exportJSON()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `babykids-backup-${dayKey(new Date())}.json`;
  a.click();
}

/* ---- ออกเป็นสมุด PDF (ผ่านหน้าต่างพิมพ์ของเบราว์เซอร์) ---- */
function exportPDF() {
  const p = Store.data.profile;
  if (!p.birthDate) { alert("กรุณาใส่ข้อมูลลูกก่อน"); return; }
  const name = esc(p.name || "ลูกน้อย");
  const g = [...Store.data.growth].sort((a, b) => a.date.localeCompare(b.date));
  const teethN = Object.keys(Store.data.teeth || {}).length;
  const msMap = {}; MILESTONES.forEach(c => c.items.forEach(i => msMap[i.id] = i.text));
  const ms = Store.data.milestones || {};
  const msDone = Object.keys(ms).filter(id => ms[id] && ms[id].done).map(id => msMap[id]).filter(Boolean);
  const mems = [...Store.data.memories].sort((a, b) => a.date.localeCompare(b.date));
  const letters = [...(Store.data.letters || [])].sort((a, b) => a.date.localeCompare(b.date));
  const quotes = [...(Store.data.quotes || [])].sort((a, b) => a.date.localeCompare(b.date));

  const cover = p.photo
    ? `<img class="cover" src="${p.photo}">`
    : `<div class="cover facebox">${p.gender === "girl" ? "👧" : "👶"}</div>`;

  const sect = (title, inner) => inner ? `<h2>${title}</h2>${inner}` : "";

  const growthRows = g.length ? `<table><tr><th>วันที่</th><th>น้ำหนัก</th><th>ส่วนสูง</th><th>อายุ</th></tr>${g.map(x => `<tr><td>${fmtDate(x.date)}</td><td>${x.weight ? x.weight + " กก." : "-"}</td><td>${x.height ? x.height + " ซม." : "-"}</td><td>${ageTextAtDate(x.date) || "-"}</td></tr>`).join("")}</table>` : "";

  const milestonesHtml = msDone.length ? `<ul>${msDone.map(t => `<li>✅ ${esc(t)}</li>`).join("")}</ul>` : "";

  const memsHtml = mems.map(m => `<div class="mem">
      ${m.photo ? `<img src="${m.photo}">` : ""}
      <div class="mem-t">${esc(m.title)}</div>
      <div class="mem-d">${fmtDateFull(m.date + "T00:00")}${ageTextAtDate(m.date) ? " · อายุ " + ageTextAtDate(m.date) : ""}</div>
      ${m.note ? `<div class="mem-n">${esc(m.note)}</div>` : ""}
    </div>`).join("");

  const lettersHtml = letters.map(l => `<div class="letter"><div class="mem-t">${esc(l.title || "ถึงลูกรัก")}</div><div class="mem-d">${fmtDate(l.date)}${ageTextAtDate(l.date) ? " · อายุ " + ageTextAtDate(l.date) : ""}</div><div class="letter-b">${esc(l.body)}</div></div>`).join("");

  const quotesHtml = quotes.length ? `<ul class="quotes">${quotes.map(q => `<li>“${esc(q.text)}” <span class="qd">— ${fmtDate(q.date)}${ageTextAtDate(q.date) ? ", อายุ " + ageTextAtDate(q.date) : ""}</span></li>`).join("")}</ul>` : "";

  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8">
  <title>สมุดบันทึก ${name}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Thai+2:wght@600;800&family=Sarabun:wght@400;600&family=Itim&display=swap">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Sarabun', sans-serif; color: #4a3f39; margin: 0; padding: 28px 30px; }
    h1 { font-family: 'Baloo Thai 2'; color: #F58220; font-size: 30px; margin: 6px 0; }
    h2 { font-family: 'Baloo Thai 2'; color: #2BB3AA; font-size: 20px; margin: 22px 0 8px; border-bottom: 2px solid #F2E6D6; padding-bottom: 4px; }
    .coverwrap { text-align: center; padding: 10px 0 14px; }
    .cover { width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 4px solid #FF9F43; }
    .facebox { width: 150px; height: 150px; border-radius: 50%; background: #FFF2E0; display: inline-flex; align-items: center; justify-content: center; font-size: 80px; }
    .sub { color: #988577; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border: 1px solid #eadfce; padding: 6px 8px; text-align: center; }
    th { background: #FFF7EC; }
    ul { margin: 4px 0; padding-left: 20px; } li { margin: 3px 0; font-size: 14px; }
    .mem { page-break-inside: avoid; margin: 10px 0 14px; padding-bottom: 10px; border-bottom: 1px dashed #eadfce; }
    .mem img { max-width: 100%; max-height: 300px; border-radius: 10px; display: block; margin-bottom: 6px; }
    .mem-t { font-weight: 700; font-size: 16px; }
    .mem-d { color: #988577; font-size: 13px; }
    .mem-n { margin-top: 3px; }
    .letter { page-break-inside: avoid; margin: 10px 0; }
    .letter-b { font-family: 'Itim'; white-space: pre-wrap; line-height: 1.7; margin-top: 4px; }
    .quotes li { font-family: 'Itim'; font-size: 15px; }
    .qd { color: #988577; font-size: 12px; font-family: 'Sarabun'; }
    .foot { text-align: center; color: #b7a594; font-size: 12px; margin-top: 26px; }
    @media print { body { padding: 0; } @page { margin: 16mm; } }
  </style></head><body>
    <div class="coverwrap">
      ${cover}
      <h1>สมุดบันทึกของ ${name} 🦒</h1>
      <div class="sub">${p.gender === "girl" ? "เด็กหญิง" : "เด็กชาย"} · เกิด ${fmtDateFull(p.birthDate + "T00:00")} · ปัจจุบันอายุ ${ageText()}</div>
    </div>
    ${sect("📈 การเติบโต" + (teethN ? ` · 🦷 ฟันขึ้น ${teethN}/20 ซี่` : ""), growthRows)}
    ${sect("🎯 พัฒนาการที่ทำได้ (" + msDone.length + " ข้อ)", milestonesHtml)}
    ${sect("📸 ความทรงจำ", memsHtml)}
    ${sect("💬 คำพูดน่ารัก", quotesHtml)}
    ${sect("💌 จดหมายถึงลูก", lettersHtml)}
    <div class="foot">สร้างด้วย Baby Kids 🦒 · ${fmtDateFull(dayKey(new Date()) + "T00:00")}</div>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("เบราว์เซอร์บล็อกหน้าต่างใหม่ — กรุณาอนุญาต popup แล้วลองอีกครั้ง"); return; }
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 500);
}
function importData(ev) {
  const file = ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try { Store.importJSON(e.target.result); alert("นำเข้าข้อมูลสำเร็จ 🎉"); go("home"); }
    catch { alert("ไฟล์ไม่ถูกต้อง"); }
  };
  reader.readAsText(file);
}
function resetAll() {
  if (confirm("ยืนยันลบข้อมูลทั้งหมด? การกระทำนี้ย้อนกลับไม่ได้")) {
    Store.reset(); Store.seedIfNeeded(); App.msCheckpoint = null; go("home");
  }
}

function needProfile() {
  return `<div class="screen"><div class="card center" style="padding:30px">
    <div style="font-size:50px">👶</div>
    <h3 class="mt">ยังไม่มีข้อมูลลูกน้อย</h3>
    <p class="muted">ใส่ข้อมูลลูกก่อนเริ่มใช้งานส่วนนี้นะ</p>
    <button class="btn mt" onclick="go('profile')">ไปตั้งค่าข้อมูล</button>
  </div></div>`;
}

/* ==================================================================
   SYNC (ซิงค์ข้อมูลพ่อ-แม่ ผ่านคลาวด์)
   ================================================================== */
function viewSync() {
  const S = (typeof Sync !== "undefined") ? Sync : { cfg: () => ({ url: "" }), status: "off", ready: false, code: "" };
  const url = S.cfg().url;
  const code = S.code || localStorage.getItem("bk.familyCode") || "";
  const on = S.ready;
  const statusMap = {
    off: "⚪ ยังไม่ซิงค์", connecting: "🟡 กำลังเชื่อมต่อ…",
    on: "🟢 ซิงค์แล้ว (อัปเดตทุก ~3 วิ)", syncing: "🔵 กำลังอัปเดต…", error: "🔴 เชื่อมต่อมีปัญหา",
  };
  const cfg = window.BK_CONFIG || {};
  const autoShare = !!((cfg.sheetUrl || "").trim() && (cfg.familyCode || "").trim());
  return topbar() + `<div class="screen">
    <div class="flex between"><h2>🔄 ซิงค์ข้อมูลพ่อแม่</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>

    <div class="ai-card" style="background:linear-gradient(135deg,#2BB3AA,#4ECDC4)">
      <h3>☁️ ข้อมูลตรงกันทุกเครื่อง</h3>
      <p>ให้มือถือพ่อและแม่เห็นข้อมูลเดียวกัน — กดบันทึกที่เครื่องหนึ่ง อีกเครื่องเห็นภายในไม่กี่วินาที เก็บข้อมูลไว้ใน Google Sheet ของคุณเอง (ฟรี)</p>
      <span class="tag">สถานะ: ${statusMap[S.status] || "—"}</span>
    </div>

    ${autoShare ? `<div class="alert"><span class="e">🔗</span><div><b>เปิดแชร์อัตโนมัติไว้แล้ว</b> — ทุกคนที่เปิดลิงก์เว็บนี้จะเห็นข้อมูลชุดเดียวกันแบบเรียลไทม์โดยไม่ต้องตั้งค่า (แม่แค่เปิดลิงก์ก็เห็นเลย) · ด้านล่างไว้สำหรับปรับแต่งเองเท่านั้น</div></div>` : ""}

    <div class="card">
      <h3>1️⃣ ลิงก์ Google Sheet <span class="small muted">(ทำครั้งเดียวต่อเครื่อง)</span></h3>
      <p class="small muted">วางลิงก์ Web App ที่ได้จาก Google Apps Script (ดูวิธีทำในคำแนะนำที่แชทส่งให้)</p>
      <label class="field"><span>Web App URL</span><input type="text" id="sy-url" value="${esc(url)}" placeholder="https://script.google.com/macros/s/.../exec"></label>
      <button class="btn ghost block" onclick="saveSheetUrl()">💾 บันทึกลิงก์</button>
    </div>

    <div class="card">
      <h3>2️⃣ รหัสครอบครัว</h3>
      <p class="small muted">ตั้งรหัสลับสักคำ แล้วใช้ <b>รหัสเดียวกัน</b> ทั้งมือถือพ่อและแม่ → ข้อมูลจะตรงกัน</p>
      <label class="field"><span>รหัสครอบครัว</span>
        <div class="flex gap">
          <input type="text" id="sy-code" value="${esc(code)}" placeholder="เช่น premier-family-2026" style="flex:1">
          <button class="btn ghost sm" type="button" onclick="randFamilyCode()" title="สุ่มรหัสเดายาก">🎲</button>
        </div>
      </label>
      ${on
      ? `<button class="btn danger block" onclick="disconnectSync()">⛔ หยุดซิงค์</button>`
      : `<button class="btn teal block" onclick="connectSync()">🔗 เชื่อมต่อ & เริ่มซิงค์</button>`}
    </div>

    ${on ? `<div class="alert"><span class="e">✅</span><div>กำลังซิงค์ด้วยรหัส <b>${esc(code)}</b> — เปิดแอปในมืออีกเครื่อง ใส่ลิงก์+รหัสเดียวกัน ข้อมูลจะตรงกัน</div></div>` : ""}
    <div class="card small muted">⚠️ ใครที่รู้ลิงก์ Sheet + รหัสครอบครัว จะเข้าถึงข้อมูลได้ จึงควรตั้งรหัสที่เดายากและบอกเฉพาะคนในบ้าน · ข้อมูลยังเก็บในเครื่องด้วย เน็ตหลุดก็ใช้งานต่อได้</div>
  </div>`;
}
function saveSheetUrl() {
  Sync.saveUrl($("#sy-url").value);
  alert("บันทึกลิงก์แล้ว 👍");
  render();
}
function connectSync() {
  Sync.saveUrl($("#sy-url").value);
  Sync.connect($("#sy-code").value);
}
function disconnectSync() {
  if (confirm("หยุดซิงค์กับคลาวด์? (ข้อมูลในเครื่องนี้ยังอยู่ครบ)")) Sync.disconnect();
}
function randFamilyCode() {
  const name = (Store.data.profile.name || "baby").replace(/\s+/g, "").toLowerCase().slice(0, 8) || "baby";
  const rnd = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
  const el = $("#sy-code"); if (el) el.value = `${name}-${rnd}`;
}

/* ==================================================================
   HEALTH (อุณหภูมิ + ยา/วิตามิน)
   ================================================================== */
function viewHealth() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const temps = [...Store.data.temps].sort((a, b) => new Date(b.time) - new Date(a.time));
  const meds = [...Store.data.meds].sort((a, b) => new Date(b.time) - new Date(a.time));
  const latest = temps[0];
  const lv = latest ? tempLevel(latest.value) : null;

  // รวมไทม์ไลน์ อุณหภูมิ+ยา
  let entries = temps.map(t => ({ ...t, _k: "temp" })).concat(meds.map(m => ({ ...m, _k: "med" })));
  entries.sort((a, b) => new Date(b.time) - new Date(a.time));
  const groups = {};
  entries.forEach(e => { const k = dayKey(e.time); (groups[k] = groups[k] || []).push(e); });

  let statusCard = "";
  if (latest) {
    const alarm = lv.key === "fever" || lv.key === "high";
    statusCard = `<div class="card" style="border:2px solid ${lv.color}">
      <div class="flex between">
        <div><div class="small muted">อุณหภูมิล่าสุด</div>
          <div style="font-family:var(--font-head);font-size:34px;font-weight:700;color:${lv.color}">${latest.value}°C</div>
          <div style="color:${lv.color};font-weight:600">${lv.emoji} ${lv.label}</div></div>
        <div style="font-size:48px">${lv.emoji}</div>
      </div>
      <div class="alert ${alarm ? "red" : ""}" style="margin:12px 0 0"><span class="e">💡</span><div>${lv.advice}</div></div>
    </div>`;
  }

  let timeline = "";
  const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  if (keys.length === 0) {
    timeline = `<div class="card"><div class="empty"><span class="e">🌡️</span>ยังไม่มีบันทึก<br>แตะปุ่มด้านบนเพื่อวัดไข้หรือบันทึกยา</div></div>`;
  } else {
    keys.forEach(k => {
      timeline += `<div class="section-title">${k === dayKey(new Date()) ? "วันนี้" : fmtDateFull(k + "T00:00")}</div><div class="card">`;
      groups[k].forEach(e => {
        if (e._k === "temp") {
          const l = tempLevel(e.value);
          timeline += `<div class="list-item">
            <div class="bubble" style="background:${l.color}22">🌡️</div>
            <div class="body"><div class="t" style="color:${l.color}">${e.value}°C · ${l.label}</div>${e.note ? `<div class="s">${esc(e.note)}</div>` : ""}</div>
            <div class="time">${fmtTime(e.time)}</div>
            <button class="del-btn" onclick="delItem('temps','${e.id}')">🗑️</button>
          </div>`;
        } else {
          timeline += `<div class="list-item">
            <div class="bubble" style="background:#EDE9FF">💊</div>
            <div class="body"><div class="t">${esc(e.name)}${e.dose ? ` · ${esc(e.dose)}` : ""}</div>${e.note ? `<div class="s">${esc(e.note)}</div>` : ""}</div>
            <div class="time">${fmtTime(e.time)}</div>
            <button class="del-btn" onclick="delItem('meds','${e.id}')">🗑️</button>
          </div>`;
        }
      });
      timeline += `</div>`;
    });
  }

  return topbar() + `<div class="screen">
    <h2>🌡️ สุขภาพ</h2>
    <div class="quick-grid" style="grid-template-columns:1fr 1fr;margin-top:6px">
      <button class="quick milk" style="background:#FFECEC" onclick="sheetTemp()"><span class="e">🌡️</span>วัดไข้</button>
      <button class="quick grow" onclick="sheetMed()"><span class="e">💊</span>ให้ยา/วิตามิน</button>
    </div>
    ${statusCard}
    ${timeline}
    <div class="card small muted">ℹ️ คำแนะนำเป็นข้อมูลทั่วไป หากทารกอายุน้อยกว่า 3 เดือนมีไข้ ≥ 38°C หรือมีอาการผิดปกติ ควรพบแพทย์ทันที</div>
  </div>`;
}

function sheetTemp() {
  openSheet("🌡️ วัดไข้", `
    <label class="field"><span>อุณหภูมิ (°C)</span><input type="number" id="tp-val" inputmode="decimal" step="0.1" placeholder="เช่น 37.2"></label>
    <label class="field"><span>เวลา</span><input type="datetime-local" id="tp-time" value="${nowLocal()}"></label>
    <label class="field"><span>หมายเหตุ (ไม่บังคับ)</span><input type="text" id="tp-note" placeholder="เช่น วัดใต้รักแร้ / หลังเช็ดตัว"></label>
    <button class="btn block" style="background:var(--red)" onclick="saveTemp()">💾 บันทึก</button>
  `);
}
function saveTemp() {
  const val = $("#tp-val").value;
  if (!val) { alert("กรุณาใส่อุณหภูมิ"); return; }
  Store.add("temps", { value: val, time: $("#tp-time").value || nowLocal(), note: $("#tp-note").value.trim() });
  closeSheet(); render();
  const lv = tempLevel(val);
  if (lv.key === "fever" || lv.key === "high") alert(`${lv.emoji} ${lv.label} (${val}°C)\n${lv.advice}`);
}

let medName = "";
function sheetMed() {
  medName = "";
  openSheet("💊 บันทึกยา / วิตามิน", `
    <label class="field"><span>เลือกด่วน</span>
      <div class="chips" id="med-chips">
        ${COMMON_MEDS.map(m => `<button class="chip purple-chip" onclick="selMed(this,'${esc(m)}')">${esc(m)}</button>`).join("")}
      </div>
    </label>
    <label class="field"><span>ชื่อยา/วิตามิน</span><input type="text" id="md-name" placeholder="เช่น พาราเซตามอล"></label>
    <label class="field"><span>ขนาด/ปริมาณ (ไม่บังคับ)</span><input type="text" id="md-dose" placeholder="เช่น 1.2 มล. / 1 เม็ด"></label>
    <label class="field"><span>เวลา</span><input type="datetime-local" id="md-time" value="${nowLocal()}"></label>
    <label class="field"><span>หมายเหตุ</span><input type="text" id="md-note" placeholder="เช่น หลังอาหาร"></label>
    <button class="btn purple block" onclick="saveMed()">💾 บันทึก</button>
  `);
}
function selMed(btn, name) {
  [...btn.parentNode.children].forEach(c => c.classList.remove("active", "purple"));
  btn.classList.add("active", "purple");
  const n = name === "อื่นๆ" ? "" : name;
  const el = $("#md-name"); if (el) { el.value = n; el.focus(); }
}
function saveMed() {
  const name = $("#md-name").value.trim();
  if (!name) { alert("กรุณาใส่ชื่อยา/วิตามิน"); return; }
  Store.add("meds", { name, dose: $("#md-dose").value.trim(), time: $("#md-time").value || nowLocal(), note: $("#md-note").value.trim() });
  closeSheet(); render();
}

/* ==================================================================
   SUMMARY (สรุปรายสัปดาห์)
   ================================================================== */
function last7Days() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
}
function viewSummary() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const days = last7Days();
  const dow = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  const feedPerDay = days.map(k => Store.data.feeds.filter(f => dayKey(f.time) === k).length);
  const diaperPerDay = days.map(k => Store.data.diapers.filter(d => dayKey(d.time) === k).length);
  const sleepPerDay = days.map(k => {
    const ms = Store.data.sleeps.filter(s => dayKey(s.start) === k && s.end)
      .reduce((sum, s) => sum + (new Date(s.end) - new Date(s.start)), 0);
    return +(ms / 3600000).toFixed(1);
  });
  const ccPerDay = days.map(k => Store.data.feeds.filter(f => dayKey(f.time) === k && f.type === "bottle")
    .reduce((sum, f) => sum + (+f.amount || 0), 0));

  const labels = days.map(k => dow[new Date(k + "T00:00").getDay()]);
  const avg = arr => { const v = arr.filter(x => x > 0); return v.length ? (arr.reduce((a, b) => a + b, 0) / 7) : 0; };
  const sum = arr => arr.reduce((a, b) => a + b, 0);

  const hasData = sum(feedPerDay) + sum(diaperPerDay) + sum(sleepPerDay) > 0;
  if (!hasData) {
    return topbar() + `<div class="screen"><h2>📊 สรุปรายสัปดาห์</h2>
      <div class="card"><div class="empty"><span class="e">📊</span>ยังไม่มีข้อมูลในสัปดาห์นี้<br>เริ่มบันทึกกิจวัตรของลูก แล้วกลับมาดูแพตเทิร์นได้เลย</div></div></div>`;
  }

  return topbar() + `<div class="screen">
    <h2>📊 สรุป 7 วันล่าสุด</h2>

    <div class="stat-grid" style="margin-bottom:4px">
      <div class="stat"><div class="label">🍼 เฉลี่ยมื้อนม/วัน</div><div class="value">${avg(feedPerDay).toFixed(1)} <small>มื้อ</small></div></div>
      <div class="stat"><div class="label">😴 เฉลี่ยนอน/วัน</div><div class="value">${avg(sleepPerDay).toFixed(1)} <small>ชม.</small></div></div>
      <div class="stat"><div class="label">💩 เฉลี่ยผ้าอ้อม/วัน</div><div class="value">${avg(diaperPerDay).toFixed(1)} <small>ครั้ง</small></div></div>
      <div class="stat"><div class="label">🍼 นมขวดรวม 7 วัน</div><div class="value">${sum(ccPerDay)} <small>ซีซี</small></div></div>
    </div>

    <div class="section-title">🍼 มื้อนมต่อวัน</div>
    <div class="card">${barChart(feedPerDay, labels, "var(--orange)", "มื้อ")}</div>

    <div class="section-title">😴 ชั่วโมงนอนต่อวัน</div>
    <div class="card">${barChart(sleepPerDay, labels, "var(--teal-d)", "ชม.")}</div>

    <div class="section-title">💩 ผ้าอ้อมต่อวัน</div>
    <div class="card">${barChart(diaperPerDay, labels, "var(--pink-d)", "ครั้ง")}</div>
  </div>`;
}

function barChart(values, labels, color, unit) {
  const W = 500, H = 190, pad = { l: 10, r: 10, t: 22, b: 26 };
  const n = values.length;
  const max = Math.max(1, ...values);
  const bw = (W - pad.l - pad.r) / n;
  const barW = bw * 0.56;
  const chartH = H - pad.t - pad.b;
  let bars = "";
  values.forEach((v, i) => {
    const h = max > 0 ? (v / max) * chartH : 0;
    const x = pad.l + i * bw + (bw - barW) / 2;
    const y = H - pad.b - h;
    const isToday = i === n - 1;
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(h, v > 0 ? 3 : 0)}" rx="7" fill="${color}" opacity="${isToday ? 1 : 0.75}"/>`;
    if (v > 0) bars += `<text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${v}</text>`;
    bars += `<text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--ink-soft)">${labels[i]}</text>`;
  });
  return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">${bars}</svg></div>`;
}

/* ==================================================================
   DIARY (ไดอารี่ความทรงจำ)
   ================================================================== */
function ageTextAtDate(dateStr) {
  const bd = Store.data.profile.birthDate; if (!bd) return "";
  const birth = new Date(bd), at = new Date(dateStr + "T00:00");
  if (at < birth) return "";
  let y = at.getFullYear() - birth.getFullYear(), m = at.getMonth() - birth.getMonth(), d = at.getDate() - birth.getDate();
  if (d < 0) { m--; d += new Date(at.getFullYear(), at.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  if (y > 0) return `${y} ปี ${m} เดือน`;
  if (m > 0) return `${m} เดือน ${d} วัน`;
  return `${d} วัน`;
}

function viewDiary() {
  if (!Store.data.profile.birthDate) return topbar() + needProfile();
  const mems = [...Store.data.memories].sort((a, b) => b.date.localeCompare(a.date));

  let body;
  if (mems.length === 0) {
    body = `<div class="card"><div class="empty"><span class="e">📸</span>ยังไม่มีความทรงจำ<br>แตะ ＋ เก็บโมเมนต์พิเศษครั้งแรกของลูกกันเถอะ 💛</div></div>`;
  } else {
    body = mems.map(m => {
      const age = ageTextAtDate(m.date);
      return `<div class="card mem-card">
        ${m.photo ? `<img class="mem-img" src="${m.photo}" alt="">` : ""}
        <div class="flex between" style="align-items:flex-start">
          <h3 style="flex:1">${esc(m.title)}</h3>
          <button class="del-btn" onclick="delItem('memories','${m.id}')">🗑️</button>
        </div>
        <div class="small muted" style="margin:2px 0 6px">📅 ${fmtDateFull(m.date + "T00:00")}${age ? ` · 👶 อายุ ${age}` : ""}</div>
        ${m.note ? `<div style="white-space:pre-wrap">${esc(m.note)}</div>` : ""}
      </div>`;
    }).join("");
  }

  return topbar() + `<div class="screen">
    <div class="flex between"><h2>📸 ไดอารี่ความทรงจำ</h2>${mems.length ? `<span class="badge">${mems.length} โมเมนต์</span>` : ""}</div>
    <div class="small muted" style="margin:2px 0 10px">เก็บภาพและเรื่องราวครั้งแรกของลูกไว้ดูในวันข้างหน้า 💛</div>
    ${body}
  </div>`;
}

let memPhoto = "";
function sheetMemory() {
  memPhoto = "";
  openSheet("📸 เพิ่มความทรงจำ", `
    <div class="center" style="margin-bottom:14px">
      <label style="cursor:pointer">
        <div id="mem-photo-prev" class="mem-prev">📷<div class="small muted" style="margin-top:4px">แตะเพิ่มรูป</div></div>
        <input type="file" accept="image/*" style="display:none" onchange="pickMemPhoto(event)">
      </label>
    </div>
    <label class="field"><span>ช่วงเวลาพิเศษ (เลือกด่วน)</span>
      <div class="chips" style="overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px">
        ${MEMORY_IDEAS.map(m => `<button class="chip" style="white-space:nowrap" onclick="selMemTitle(this,'${esc(m)}')">${esc(m)}</button>`).join("")}
      </div>
    </label>
    <label class="field"><span>หัวข้อ</span><input type="text" id="mem-title" placeholder="เช่น ยิ้มครั้งแรก 😊"></label>
    <label class="field"><span>วันที่</span><input type="date" id="mem-date" value="${dayKey(new Date())}" max="${dayKey(new Date())}"></label>
    <label class="field"><span>บันทึกความทรงจำ</span><textarea id="mem-note" placeholder="เล่าเรื่องราววันนั้น..."></textarea></label>
    <button class="btn pink block" onclick="saveMemory()">💾 บันทึกความทรงจำ</button>
  `);
}
function selMemTitle(btn, title) {
  [...btn.parentNode.children].forEach(c => c.classList.remove("active", "pink"));
  btn.classList.add("active", "pink");
  const el = $("#mem-title"); if (el) el.value = title;
}
function pickMemPhoto(ev) {
  const file = ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const maxD = 1000; let w = img.width, h = img.height;
      if (w > h && w > maxD) { h = h * maxD / w; w = maxD; }
      else if (h > maxD) { w = w * maxD / h; h = maxD; }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      try { memPhoto = c.toDataURL("image/jpeg", 0.8); }
      catch (err) { alert("รูปใหญ่เกินไป ลองใช้รูปอื่น"); return; }
      const prev = document.getElementById("mem-photo-prev");
      if (prev) prev.innerHTML = `<img src="${memPhoto}" alt="">`;
    };
    img.onerror = () => alert("เปิดรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function saveMemory() {
  const title = $("#mem-title").value.trim();
  if (!title) { alert("กรุณาใส่หัวข้อความทรงจำ"); return; }
  try {
    Store.add("memories", { title, date: $("#mem-date").value || dayKey(new Date()), note: $("#mem-note").value.trim(), photo: memPhoto });
  } catch (e) {
    alert("พื้นที่จัดเก็บเต็ม ลองลบรูปเก่าหรือใช้รูปเล็กลง");
    return;
  }
  memPhoto = "";
  closeSheet();
  render();
}

/* ==================================================================
   SHEETS (quick add forms)
   ================================================================== */
function openSheet(title, bodyHtml) {
  document.getElementById("sheet-root").innerHTML =
    `<div class="sheet-overlay" onclick="if(event.target===this)closeSheet()">
      <div class="sheet"><div class="grip"></div><h2>${title}</h2>${bodyHtml}</div>
    </div>`;
}
function closeSheet() { document.getElementById("sheet-root").innerHTML = ""; }

let feedType = "breast", feedSide = "ซ้าย", diaperType = "pee";
function sheetFeed() {
  feedType = "breast"; feedSide = "ซ้าย";
  openSheet("🍼 บันทึกการกินนม", `
    <label class="field"><span>ประเภท</span>
      <div class="chips" id="feed-type">
        <button class="chip active" onclick="selFeedType(this,'breast')">🤱 นมแม่</button>
        <button class="chip" onclick="selFeedType(this,'bottle')">🍼 นมขวด</button>
        <button class="chip" onclick="selFeedType(this,'solid')">🥣 อาหาร</button>
      </div>
    </label>
    <div id="feed-extra"></div>
    <label class="field"><span>เวลา</span><input type="datetime-local" id="feed-time" value="${nowLocal()}"></label>
    <label class="field"><span>บันทึกเพิ่มเติม (ไม่บังคับ)</span><input type="text" id="feed-note" placeholder="เช่น ดูดเกลี้ยงเต้า"></label>
    <button class="btn block" onclick="saveFeed()">💾 บันทึก</button>
  `);
  renderFeedExtra();
}
function selFeedType(btn, t) { feedType = t; [...btn.parentNode.children].forEach(c => c.classList.remove("active")); btn.classList.add("active"); renderFeedExtra(); }
function renderFeedExtra() {
  const el = document.getElementById("feed-extra"); if (!el) return;
  if (feedType === "breast") {
    el.innerHTML = `<label class="field"><span>ข้างที่ให้</span>
      <div class="chips" id="feed-side">
        <button class="chip ${feedSide === "ซ้าย" ? "active" : ""}" onclick="selSide(this,'ซ้าย')">⬅️ ซ้าย</button>
        <button class="chip ${feedSide === "ขวา" ? "active" : ""}" onclick="selSide(this,'ขวา')">ขวา ➡️</button>
        <button class="chip ${feedSide === "ทั้งสองข้าง" ? "active" : ""}" onclick="selSide(this,'ทั้งสองข้าง')">สองข้าง</button>
      </div></label>`;
  } else if (feedType === "bottle") {
    el.innerHTML = `<label class="field"><span>ปริมาณ (ซีซี)</span><input type="number" id="feed-amt" inputmode="numeric" placeholder="เช่น 120"></label>`;
  } else { el.innerHTML = `<label class="field"><span>เมนู/ปริมาณ</span><input type="text" id="feed-amt-text" placeholder="เช่น ข้าวบด 3 ช้อน"></label>`; }
}
function selSide(btn, s) { feedSide = s; [...btn.parentNode.children].forEach(c => c.classList.remove("active")); btn.classList.add("active"); }
function saveFeed() {
  const time = $("#feed-time").value || nowLocal();
  const note = $("#feed-note").value.trim();
  const obj = { type: feedType, time, note };
  if (feedType === "breast") obj.side = feedSide;
  else if (feedType === "bottle") obj.amount = $("#feed-amt")?.value || "";
  else obj.note = ($("#feed-amt-text")?.value || "") + (note ? " · " + note : "");
  Store.add("feeds", obj);
  closeSheet(); render();
}

function sheetSleep() {
  openSheet("😴 บันทึกการนอน", `
    <label class="field"><span>เริ่มนอน</span><input type="datetime-local" id="sl-start" value="${nowLocal()}"></label>
    <label class="field"><span>ตื่นนอน (เว้นว่างได้ถ้ายังหลับอยู่)</span><input type="datetime-local" id="sl-end"></label>
    <label class="field"><span>บันทึกเพิ่มเติม</span><input type="text" id="sl-note" placeholder="เช่น งีบกลางวัน"></label>
    <button class="btn teal block" onclick="saveSleep()">💾 บันทึก</button>
  `);
}
function saveSleep() {
  const start = $("#sl-start").value || nowLocal();
  const end = $("#sl-end").value || "";
  if (end && new Date(end) < new Date(start)) { alert("เวลาตื่นต้องหลังเวลานอน"); return; }
  Store.add("sleeps", { start, end, note: $("#sl-note").value.trim() });
  closeSheet(); render();
}

function sheetDiaper() {
  diaperType = "pee";
  openSheet("💩 บันทึกผ้าอ้อม", `
    <label class="field"><span>ประเภท</span>
      <div class="chips" id="dp-type">
        <button class="chip active pink" onclick="selDp(this,'pee')">💧 ฉี่</button>
        <button class="chip" onclick="selDp(this,'poop')">💩 อึ</button>
        <button class="chip" onclick="selDp(this,'both')">💩💧 ทั้งคู่</button>
      </div></label>
    <label class="field"><span>เวลา</span><input type="datetime-local" id="dp-time" value="${nowLocal()}"></label>
    <label class="field"><span>ลักษณะ/หมายเหตุ</span><input type="text" id="dp-note" placeholder="เช่น สีปกติ นิ่ม"></label>
    <button class="btn pink block" onclick="saveDiaper()">💾 บันทึก</button>
  `);
}
function selDp(btn, t) { diaperType = t; [...btn.parentNode.children].forEach(c => { c.classList.remove("active"); c.classList.remove("pink"); }); btn.classList.add("active", "pink"); }
function saveDiaper() {
  Store.add("diapers", { type: diaperType, time: $("#dp-time").value || nowLocal(), note: $("#dp-note").value.trim() });
  closeSheet(); render();
}

function sheetGrowth() {
  openSheet("📏 บันทึกการชั่ง/วัด", `
    <label class="field"><span>วันที่</span><input type="date" id="gr-date" value="${dayKey(new Date())}" max="${dayKey(new Date())}"></label>
    <div class="row2">
      <label class="field"><span>น้ำหนัก (กก.)</span><input type="number" id="gr-wt" inputmode="decimal" step="0.01" placeholder="เช่น 6.5"></label>
      <label class="field"><span>ส่วนสูง (ซม.)</span><input type="number" id="gr-ht" inputmode="decimal" step="0.1" placeholder="เช่น 62"></label>
    </div>
    <label class="field"><span>รอบศีรษะ (ซม.) — ไม่บังคับ</span><input type="number" id="gr-hd" inputmode="decimal" step="0.1" placeholder="เช่น 41"></label>
    <button class="btn purple block" onclick="saveGrowth()">💾 บันทึก</button>
  `);
}
function saveGrowth() {
  const wt = $("#gr-wt").value, ht = $("#gr-ht").value, hd = $("#gr-hd").value;
  if (!wt && !ht) { alert("กรุณาใส่น้ำหนักหรือส่วนสูงอย่างน้อย 1 อย่าง"); return; }
  Store.add("growth", { date: $("#gr-date").value || dayKey(new Date()), weight: wt, height: ht, head: hd });
  closeSheet(); render();
}

function sheetAppt() {
  openSheet("🩺 เพิ่มนัดหมาย", `
    <label class="field"><span>เรื่อง</span><input type="text" id="ap-title" placeholder="เช่น ตรวจสุขภาพ 6 เดือน"></label>
    <div class="row2">
      <label class="field"><span>วันที่</span><input type="date" id="ap-date" value="${dayKey(new Date())}"></label>
      <label class="field"><span>เวลา</span><input type="time" id="ap-time"></label>
    </div>
    <label class="field"><span>สถานที่</span><input type="text" id="ap-place" placeholder="เช่น รพ. ..."></label>
    <label class="field"><span>หมายเหตุ</span><input type="text" id="ap-note" placeholder="เช่น เตรียมสมุดวัคซีน"></label>
    <button class="btn block" onclick="saveAppt()">💾 บันทึก</button>
  `);
}
function saveAppt() {
  const title = $("#ap-title").value.trim();
  if (!title) { alert("กรุณาใส่เรื่องนัดหมาย"); return; }
  Store.add("appointments", { title, date: $("#ap-date").value, time: $("#ap-time").value, place: $("#ap-place").value.trim(), note: $("#ap-note").value.trim(), done: false });
  closeSheet(); render();
}

function sheetShop() {
  const cats = Object.keys(CATEGORY_EMOJI);
  openSheet("🛒 เพิ่มของต้องซื้อ", `
    <label class="field"><span>ชื่อสิ่งของ</span><input type="text" id="sh-name" placeholder="เช่น ผ้าอ้อมไซส์ M"></label>
    <label class="field"><span>หมวดหมู่</span>
      <select id="sh-cat">${cats.map(c => `<option value="${c}">${CATEGORY_EMOJI[c]} ${c}</option>`).join("")}</select>
    </label>
    <label class="field"><span>จำนวน</span><input type="number" id="sh-qty" value="1" min="1" inputmode="numeric"></label>
    <button class="btn block" onclick="saveShop()">💾 เพิ่ม</button>
  `);
}
function saveShop() {
  const name = $("#sh-name").value.trim();
  if (!name) { alert("กรุณาใส่ชื่อสิ่งของ"); return; }
  Store.add("shopping", { name, cat: $("#sh-cat").value, qty: +$("#sh-qty").value || 1, bought: false });
  closeSheet(); render();
}

/* ---- FAB (context aware) ---- */
function fabAction() {
  const r = App.route;
  if (r === "growth") return sheetGrowth();
  if (r === "shopping") return sheetShop();
  if (r === "appt") return sheetAppt();
  if (r === "dev") return go("dev");
  if (r === "diary") return sheetMemory();
  if (r === "sizes") return sheetSize();
  if (r === "letters") return sheetLetter();
  if (r === "quotes") return sheetQuote();
  if (r === "children") return promptAddChild();
  if (r === "health") {
    return openSheet("➕ บันทึกสุขภาพ", `
      <div class="quick-grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <button class="quick milk" style="background:#FFECEC" onclick="closeSheet();sheetTemp()"><span class="e">🌡️</span>วัดไข้</button>
        <button class="quick grow" onclick="closeSheet();sheetMed()"><span class="e">💊</span>ให้ยา/วิตามิน</button>
      </div>`);
  }
  // default quick chooser (ของที่นานๆ บันทึกที)
  openSheet("➕ เพิ่มบันทึก", `
    <div class="quick-grid" style="grid-template-columns:repeat(2,1fr);gap:12px">
      <button class="quick grow" onclick="closeSheet();sheetGrowth()"><span class="e">📏</span>ชั่ง/วัด</button>
      <button class="quick milk" onclick="closeSheet();sheetMemory()"><span class="e">📸</span>ความทรงจำ</button>
      <button class="quick diaper" onclick="closeSheet();go('teeth')"><span class="e">🦷</span>ฟันน้ำนม</button>
      <button class="quick sleep" onclick="closeSheet();go('health')"><span class="e">🌡️</span>สุขภาพ</button>
    </div>
  `);
}
document.getElementById("fab").addEventListener("click", fabAction);
document.getElementById("photo-input").addEventListener("change", pickPhoto);

/* ---- service worker ---- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { }));
}

/* ---- start ---- */
render();
if (typeof Sync !== "undefined") { try { Sync.init(); } catch (e) { } }
