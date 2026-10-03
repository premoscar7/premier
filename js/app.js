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
function ageText() {
  const a = ageData(); if (!a) return "";
  const birth = a.birth, now = new Date();
  let y = now.getFullYear() - birth.getFullYear(), m = now.getMonth() - birth.getMonth(), d = now.getDate() - birth.getDate();
  if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  if (y > 0) return `${y} ปี ${m} เดือน`;
  if (m > 0) return `${m} เดือน ${d} วัน`;
  return `${d} วัน`;
}
function ageMonthsAt(dateStr) {
  const bd = Store.data.profile.birthDate; if (!bd) return 0;
  return (new Date(dateStr) - new Date(bd)) / (86400000 * 30.4375);
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
  { id: "log", icon: "📒", label: "บันทึก" },
  { id: "growth", icon: "📈", label: "เติบโต" },
  { id: "dev", icon: "🎯", label: "พัฒนาการ" },
  { id: "more", icon: "🧸", label: "เพิ่มเติม" },
];
function go(route) { App.route = route; render(); window.scrollTo(0, 0); }

function renderNav() {
  const activeTab = ["shopping", "appt", "profile", "settings", "health", "summary", "diary"].includes(App.route) ? "more" : App.route;
  document.getElementById("nav").innerHTML = TABS.map(t =>
    `<button class="${t.id === activeTab ? "active" : ""}" onclick="go('${t.id}')">
       <span class="ne">${t.icon}</span><span>${t.label}</span>
     </button>`).join("");
}

function render() {
  const r = App.route;
  let html = "";
  if (r === "home") html = viewHome();
  else if (r === "log") html = viewLog();
  else if (r === "growth") html = viewGrowth();
  else if (r === "dev") html = viewDev();
  else if (r === "more") html = viewMore();
  else if (r === "shopping") html = viewShopping();
  else if (r === "appt") html = viewAppt();
  else if (r === "profile") html = viewProfile();
  else if (r === "settings") html = viewSettings();
  else if (r === "health") html = viewHealth();
  else if (r === "summary") html = viewSummary();
  else if (r === "diary") html = viewDiary();
  appEl().innerHTML = html;
  renderNav();
  document.getElementById("fab").style.display =
    ["profile", "settings", "summary"].includes(r) ? "none" : "grid";
}

/* ==================================================================
   HEADER
   ================================================================== */
function topbar(title) {
  return `<div class="topbar">
    <div class="logo"><span class="giraffe">🦒</span>Baby<span class="k">Kids</span></div>
    <div class="spacer"></div>
    <button class="icon-btn" onclick="go('settings')" aria-label="ตั้งค่า">⚙️</button>
  </div>`;
}

/* ==================================================================
   HOME
   ================================================================== */
function viewHome() {
  const p = Store.data.profile;
  if (!p.birthDate) return topbar() + onboarding();

  const a = ageData();
  const today = dayKey(new Date());
  const feedsToday = Store.data.feeds.filter(f => dayKey(f.time) === today);
  const diapersToday = Store.data.diapers.filter(d => dayKey(d.time) === today);
  const peeToday = diapersToday.filter(d => d.type === "pee" || d.type === "both").length;
  const poopToday = diapersToday.filter(d => d.type === "poop" || d.type === "both").length;
  const sleepsToday = Store.data.sleeps.filter(s => dayKey(s.start) === today);
  const sleepMs = sleepsToday.reduce((sum, s) => sum + (s.end ? (new Date(s.end) - new Date(s.start)) : 0), 0);
  const lastFeed = Store.data.feeds[0];

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
      <div class="hero-row">
        ${avatar}
        <div>
          <h2>${esc(p.name || "ลูกน้อย")}</h2>
          <div class="age">🎂 อายุ ${ageText()} · ${stage.label}</div>
        </div>
      </div>
    </div>

    <div class="section-title">⚡ บันทึกด่วน</div>
    <div class="quick-grid">
      <button class="quick milk" onclick="sheetFeed()"><span class="e">🍼</span>กินนม</button>
      <button class="quick sleep" onclick="sheetSleep()"><span class="e">😴</span>การนอน</button>
      <button class="quick diaper" onclick="sheetDiaper()"><span class="e">💩</span>ผ้าอ้อม</button>
      <button class="quick grow" onclick="sheetGrowth()"><span class="e">📏</span>ชั่ง/วัด</button>
    </div>

    ${feverAlertHome()}

    <div class="section-title">📊 วันนี้</div>
    <div class="stat-grid">
      <div class="stat"><div class="label">🍼 มื้อนม</div><div class="value">${feedsToday.length} <small>มื้อ</small></div></div>
      <div class="stat"><div class="label">😴 นอนรวม</div><div class="value">${sleepMs ? dur(sleepMs).split(" ")[0] : 0} <small>${sleepMs ? dur(sleepMs).replace(/^\S+\s/, "") : "ชม."}</small></div></div>
      <div class="stat"><div class="label">💩 ผ้าอ้อม (ครั้ง)</div><div class="value" style="font-size:21px">💧 ${peeToday} <small style="color:var(--ink-soft)">·</small> 💩 ${poopToday}</div></div>
      <div class="stat"><div class="label">⏰ นมล่าสุด</div><div class="value" style="font-size:18px">${lastFeed ? fmtTime(lastFeed.time) : "—"}</div></div>
    </div>

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
  const ageM = a.months;

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
  const menu = [
    ["diary", "📸", "ไดอารี่ความทรงจำ", Store.data.memories.length ? `${Store.data.memories.length} ความทรงจำ` : "เก็บภาพ & โมเมนต์พิเศษ"],
    ["health", "🌡️", "สุขภาพ (ไข้ & ยา)", maxTemp ? `ไข้วันนี้สูงสุด ${maxTemp}°C` : "บันทึกอุณหภูมิ & ยา/วิตามิน"],
    ["summary", "📊", "สรุปรายสัปดาห์", "ดูแพตเทิร์นนม นอน ผ้าอ้อม 7 วัน"],
    ["shopping", "🛒", "ของต้องซื้อให้ลูก", `เหลือ ${shopLeft} รายการ`],
    ["appt", "🩺", "นัดหมอ & วัคซีน", `${apptLeft} นัดที่กำลังจะถึง`],
    ["profile", "👶", "ข้อมูลลูกน้อย", Store.data.profile.name || "ยังไม่ได้ตั้งค่า"],
    ["settings", "⚙️", "ตั้งค่า & สำรองข้อมูล", "ส่งออก/นำเข้าข้อมูล"],
  ];
  return topbar() + `<div class="screen">
    <h2>🧸 เพิ่มเติม</h2>
    <div class="card" style="padding:6px 16px">
      ${menu.map(m => `<div class="list-item" style="cursor:pointer" onclick="go('${m[0]}')">
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
      <button class="btn block" onclick="saveProfile()">💾 บันทึกข้อมูล</button>
    </div>
  </div>`;
}
function setGender(g) {
  const nameEl = $("#pf-name"), birthEl = $("#pf-birth");
  const patch = { gender: g };
  if (nameEl) patch.name = nameEl.value.trim();
  if (birthEl && birthEl.value) patch.birthDate = birthEl.value;
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
  Store.setProfile({ name, birthDate: birth });
  alert("บันทึกเรียบร้อย 💛");
  go("home");
}

/* ---- Settings ---- */
function viewSettings() {
  return topbar() + `<div class="screen">
    <div class="flex between"><h2>⚙️ ตั้งค่า</h2><button class="btn ghost sm" onclick="go('more')">‹ กลับ</button></div>
    <div class="card">
      <h3>💾 สำรอง & กู้คืนข้อมูล</h3>
      <p class="small muted">ข้อมูลเก็บในเครื่องนี้เท่านั้น แนะนำให้ส่งออกเก็บไว้เป็นระยะ หรือใช้ย้ายไปอีกเครื่อง</p>
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
  if (r === "health") {
    return openSheet("➕ บันทึกสุขภาพ", `
      <div class="quick-grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <button class="quick milk" style="background:#FFECEC" onclick="closeSheet();sheetTemp()"><span class="e">🌡️</span>วัดไข้</button>
        <button class="quick grow" onclick="closeSheet();sheetMed()"><span class="e">💊</span>ให้ยา/วิตามิน</button>
      </div>`);
  }
  // default quick chooser
  openSheet("➕ บันทึกด่วน", `
    <div class="quick-grid" style="grid-template-columns:repeat(2,1fr);gap:12px">
      <button class="quick milk" onclick="closeSheet();sheetFeed()"><span class="e">🍼</span>กินนม</button>
      <button class="quick sleep" onclick="closeSheet();sheetSleep()"><span class="e">😴</span>การนอน</button>
      <button class="quick diaper" onclick="closeSheet();sheetDiaper()"><span class="e">💩</span>ผ้าอ้อม</button>
      <button class="quick grow" onclick="closeSheet();sheetGrowth()"><span class="e">📏</span>ชั่ง/วัด</button>
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
