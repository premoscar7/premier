/* ============================================================
   Sync — ซิงค์ข้อมูลพ่อ-แม่ ผ่าน Google Sheet (Apps Script Web App)
   รวมข้อมูล (merge) ระหว่างเครื่อง — ไม่ทับกัน เพื่อกันข้อมูลหาย
   ซิงค์แบบ near-realtime ด้วยการ poll ทุก ~3 วินาที + push เมื่อแก้
   ============================================================ */

/* ---- รวม 2 ชุดข้อมูล โดยไม่ทำให้ข้อมูลหาย (union arrays by id) ---- */
function _syncUnionById(a, b) {
  const out = Array.isArray(a) ? a.slice() : [];
  const seen = new Set(out.map(x => x && x.id));
  (Array.isArray(b) ? b : []).forEach(x => { if (x && x.id && !seen.has(x.id)) { out.push(x); seen.add(x.id); } });
  return out;
}
function _syncMergeProfile(a, b) {
  a = a || {}; b = b || {};
  const out = {}; const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.forEach(k => {
    const av = a[k], bv = b[k];
    out[k] = (av === undefined || av === "" || av === null) ? bv : av; // เครื่องนี้ชนะ แต่ถ้าว่างใช้ของคลาวด์
  });
  return out;
}
function _syncMergeChild(a, b) {
  const out = { id: a.id || b.id };
  out.profile = _syncMergeProfile(a.profile, b.profile);
  ["growth", "memories", "sizes", "appointments", "temps", "meds", "shopping", "letters", "quotes", "feeds", "sleeps", "diapers"]
    .forEach(k => { out[k] = _syncUnionById(a[k], b[k]); });
  out.teeth = Object.assign({}, b.teeth || {}, a.teeth || {});
  out.milestones = Object.assign({}, b.milestones || {}, a.milestones || {});
  const ah = a.healthInfo || {}, bh = b.healthInfo || {};
  out.healthInfo = Object.keys(ah).some(k => ah[k]) ? ah : bh;
  return out;
}
function mergeSnapshots(local, remote) {
  if (!remote || !Array.isArray(remote.children)) return local;
  if (!local || !Array.isArray(local.children)) return remote;
  const lById = {}; local.children.forEach(c => lById[c.id] = c);
  const rById = {}; remote.children.forEach(c => rById[c.id] = c);
  const ids = [];
  local.children.forEach(c => { if (!ids.includes(c.id)) ids.push(c.id); });
  remote.children.forEach(c => { if (!ids.includes(c.id)) ids.push(c.id); });
  const children = ids.map(id => {
    const l = lById[id], r = rById[id];
    return (l && r) ? _syncMergeChild(l, r) : (l || r);
  });
  return { v: 2, children, _seeded: !!(local._seeded || remote._seeded) };
}

const Sync = {
  url: "", code: "", ready: false, applying: false, status: "off",
  _timer: null, _poll: null, _lastJSON: "",

  cfg() {
    const c = window.BK_CONFIG || {};
    return { url: (c.sheetUrl || localStorage.getItem("bk.sheetUrl") || "").trim() };
  },
  configured() { return !!this.cfg().url; },
  _onSync() { return typeof App !== "undefined" && App.route === "sync"; },

  init() {
    const c = window.BK_CONFIG || {};
    // ถ้าฝังค่าไว้ในโค้ด (sheetUrl + familyCode) → แชร์อัตโนมัติให้ทุกคนที่เปิดลิงก์
    const autoShare = !!((c.sheetUrl || "").trim() && (c.familyCode || "").trim());
    this.code = ((c.familyCode || "").trim()) || localStorage.getItem("bk.familyCode") || "";
    this.url = this.cfg().url;
    const on = localStorage.getItem("bk.syncOn") === "1";
    if (this.url && this.code && (autoShare || on)) {
      this.connect(this.code, { silent: true });
    }
  },
  saveUrl(u) { localStorage.setItem("bk.sheetUrl", (u || "").trim()); this.url = this.cfg().url; },

  async _get() {
    const r = await fetch(this.url + "?code=" + encodeURIComponent(this.code) + "&t=" + Date.now());
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json(); // { data: {...} | null }
  },
  async _post() {
    // ใช้ content-type text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script
    const body = JSON.stringify({ code: this.code, data: Store.snapshot() });
    const r = await fetch(this.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  },

  async connect(code, opts = {}) {
    code = (code || "").trim();
    if (!code) { alert("กรุณาใส่รหัสครอบครัว"); return; }
    this.url = this.cfg().url;
    if (!this.url) { alert("ยังไม่ได้ใส่ลิงก์ Google Sheet (Web App URL)"); return; }
    this.code = code;
    this.status = "connecting";
    if (this._onSync()) render();

    let remote = null;
    try { const j = await this._get(); remote = j && j.data; }
    catch (e) {
      this.status = "error";
      alert("เชื่อมต่อไม่สำเร็จ:\n" + (e.message || e) + "\n\nตรวจสอบลิงก์ Web App และตั้งค่า Deploy เป็น “Anyone”");
      if (typeof render === "function") render();
      return;
    }

    // รวมข้อมูลเครื่องนี้กับคลาวด์ (ไม่ทับกัน — กันข้อมูลหาย) แล้วอัปผลลัพธ์ขึ้น
    const merged = mergeSnapshots(Store.snapshot(), remote);
    this.applying = true;
    Store.applySnapshot(merged);
    this.applying = false;
    this._lastJSON = remote ? JSON.stringify(remote) : "";

    this.ready = true;
    this.status = "on";
    localStorage.setItem("bk.familyCode", code);
    localStorage.setItem("bk.syncOn", "1");
    await this._push(true); // ส่งข้อมูลที่รวมแล้วขึ้นคลาวด์
    this._startPoll();
    if (typeof render === "function") render();
  },

  _startPoll() {
    clearInterval(this._poll);
    this._poll = setInterval(async () => {
      if (!this.ready || this.applying) return;
      try {
        const j = await this._get();
        const remote = j && j.data;
        if (remote) {
          const rj = JSON.stringify(remote);
          if (rj !== JSON.stringify(Store.snapshot()) && rj !== this._lastJSON) this.applyRemote(remote);
        }
        if (this.status === "error") { this.status = "on"; if (this._onSync()) render(); }
      } catch (e) { this.status = "error"; if (this._onSync()) render(); }
    }, 3000);
  },

  applyRemote(data) {
    this._lastJSON = JSON.stringify(data);
    const merged = mergeSnapshots(Store.snapshot(), data);
    const mergedStr = JSON.stringify(merged);
    if (mergedStr === JSON.stringify(Store.snapshot())) return; // ไม่มีอะไรใหม่
    this.applying = true;
    Store.applySnapshot(merged);
    this.applying = false;
    if (typeof render === "function") render();
    // ถ้าผลรวมมีมากกว่าที่คลาวด์มี → ส่งขึ้นให้คลาวด์ตามทัน
    if (mergedStr !== this._lastJSON) this.schedulePush();
  },

  schedulePush() {
    if (!this.ready || this.applying) return;
    this.status = "syncing";
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._push(), 600);
    if (this._onSync()) render();
  },

  async _push(silent) {
    if (!this.url || !this.code) return;
    const payload = JSON.stringify(Store.snapshot());
    if (payload === this._lastJSON) { this.status = "on"; return; }
    try {
      await this._post();
      this._lastJSON = payload;
      this.status = "on";
    } catch (e) {
      this.status = "error";
      if (!silent) console.warn("sync push failed", e);
    }
    if (this._onSync()) render();
  },

  disconnect() {
    this.ready = false; this.status = "off";
    clearInterval(this._poll);
    localStorage.setItem("bk.syncOn", "0");
    if (typeof render === "function") render();
  },
  hasData(d) {
    if (!d) return false;
    const arr = Array.isArray(d.children) ? d.children : (d.profile ? [d] : []);
    return arr.some(c => c && ((c.profile && c.profile.birthDate) ||
      (c.growth && c.growth.length) || (c.memories && c.memories.length) ||
      (c.teeth && Object.keys(c.teeth).length) || (c.milestones && Object.keys(c.milestones).length) ||
      (c.letters && c.letters.length) || (c.quotes && c.quotes.length)));
  },
};
