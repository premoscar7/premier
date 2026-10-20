/* ============================================================
   Sync — ซิงค์ข้อมูลพ่อ-แม่ ผ่าน Google Sheet (Apps Script Web App)
   รวมข้อมูล (merge) ระหว่างเครื่อง — ไม่ทับกัน เพื่อกันข้อมูลหาย
   ซิงค์แบบ near-realtime ด้วยการ poll ทุก ~3 วินาที + push เมื่อแก้
   ============================================================ */

/* ---- รวมฟิลด์ของรายการ id เดียวกัน: เครื่องนี้ชนะ แต่ถ้าว่างใช้ของอีกเครื่อง
   (ทำให้ค่าที่เพิ่งเติม เช่น ลิงก์รูปบน Drive วิ่งไปเห็นอีกเครื่องได้) ---- */
function _syncMergeItem(a, b) {
  a = a || {}; b = b || {};
  const out = {}; const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.forEach(k => {
    const av = a[k], bv = b[k];
    out[k] = (av === undefined || av === "" || av === null) ? bv : av;
  });
  return out;
}
/* ---- รวม 2 ชุดข้อมูล โดยไม่ทำให้ข้อมูลหาย (union arrays by id + merge fields) ---- */
function _syncUnionById(a, b) {
  const map = {}, order = [];
  (Array.isArray(a) ? a : []).forEach(x => { if (x && x.id) { map[x.id] = x; order.push(x.id); } });
  (Array.isArray(b) ? b : []).forEach(x => {
    if (!x || !x.id) return;
    if (map[x.id]) map[x.id] = _syncMergeItem(map[x.id], x);
    else { map[x.id] = x; order.push(x.id); }
  });
  return order.map(id => map[id]);
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
  out.del = Object.assign({}, b.del || {}, a.del || {});   // รวมรายการที่ถูกลบจากทั้งสองเครื่อง
  ["growth", "memories", "sizes", "vaccines", "appointments", "temps", "meds", "shopping", "letters", "quotes", "feeds", "sleeps", "diapers"]
    .forEach(k => { out[k] = _syncUnionById(a[k], b[k]).filter(x => x && !out.del[x.id]); }); // ตัดที่ถูกลบออก
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

/* ---- canonical form: เรียง key + เรียง array ตาม id ให้เหมือนกันทุกเครื่อง (กันลูปซิงค์) ---- */
function _syncSortDeep(x) {
  if (Array.isArray(x)) {
    const arr = x.map(_syncSortDeep);
    if (arr.length && arr.every(i => i && typeof i === "object" && "id" in i)) {
      arr.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    }
    return arr;
  }
  if (x && typeof x === "object") {
    const out = {};
    Object.keys(x).sort().forEach(k => { out[k] = _syncSortDeep(x[k]); });
    return out;
  }
  return x;
}
function _syncCanon(snap) { try { return JSON.stringify(_syncSortDeep(snap)); } catch (e) { return ""; } }

/* ---- ตัดรูป base64 ออกก่อนซิงค์ (กันเกินลิมิตช่อง Google Sheet) — รูปใช้ Drive แทน ---- */
function _syncLite(snap) {
  var s;
  try { s = JSON.parse(JSON.stringify(snap || { v: 2, children: [] })); } catch (e) { return { v: 2, children: [] }; }
  (s.children || []).forEach(function (c) {
    if (c.profile) c.profile.photo = "";
    (c.memories || []).forEach(function (m) { if (m) m.photo = ""; });
    (c.vaccines || []).forEach(function (v) { if (v) v.photo = ""; });
  });
  return s;
}

/* ---- เครื่องนี้ยังว่างอยู่ไหม (ยังไม่ได้กรอกข้อมูลลูก) ---- */
function _syncIsEmpty(snap) {
  try {
    var kids = (snap && snap.children) || [];
    return !kids.some(function (c) {
      var p = c.profile || {};
      if (p.name || p.birthDate || p.photo) return true;
      var lists = ["growth", "memories", "vaccines", "appointments", "temps", "meds", "letters", "quotes", "sizes"];
      if (lists.some(function (k) { return (c[k] || []).length; })) return true;
      if (Object.keys(c.milestones || {}).length || Object.keys(c.teeth || {}).length) return true;
      return false;
    });
  } catch (e) { return false; }
}

const Sync = {
  url: "", code: "", ready: false, applying: false, status: "off",
  _timer: null, _poll: null, _lastCanon: "",

  cfg() {
    const c = window.BK_CONFIG || {};
    return { url: (c.sheetUrl || localStorage.getItem("bk.sheetUrl") || "").trim() };
  },
  configured() { return !!this.cfg().url; },
  _onSync() { return typeof App !== "undefined" && App.route === "sync"; },

  init() {
    // ต้องล็อกอินด้วยรหัสครอบครัวก่อน (เซสชันอยู่ได้ 1 สัปดาห์) — ไม่มีแชร์อัตโนมัติแล้ว
    this.url = this.cfg().url;
    const code = (localStorage.getItem("bk.familyCode") || "").trim();
    const at = parseInt(localStorage.getItem("bk.loginAt") || "0", 10);
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const valid = code && at && (Date.now() - at < WEEK);
    if (valid && this.url) {
      this.code = code;
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
    const body = JSON.stringify({ code: this.code, data: _syncLite(Store.snapshot()) });
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

    // ถ้าเครื่องนี้ยังว่าง (เพิ่งเปิด/รีเซ็ต) แต่คลาวด์มีข้อมูล → ดึงลงมาเฉยๆ ไม่ push
    // (กันเครื่องใหม่เขียนข้อมูลเปล่าๆ เพิ่มลงในชุดที่มีอยู่ของคนอื่น)
    const localSnap = Store.snapshot();
    const localEmpty = _syncIsEmpty(localSnap);
    const remoteHas = remote && !_syncIsEmpty(remote);
    const merged = (localEmpty && remoteHas) ? remote : mergeSnapshots(localSnap, remote);
    this.applying = true;
    Store.applySnapshot(merged);
    this.applying = false;
    this._lastCanon = _syncCanon(_syncLite(merged));

    this.ready = true;
    this.status = "on";
    localStorage.setItem("bk.familyCode", code);
    localStorage.setItem("bk.syncOn", "1");
    if (!(localEmpty && remoteHas)) await this._push(true); // ส่งขึ้นคลาวด์เฉพาะตอนเรามีข้อมูลจะเพิ่ม
    this._startPoll();
    this._safeRender();
  },

  // ไม่ render ตอนกำลังพิมพ์/เปิดฟอร์มอยู่ (กันข้อมูลที่พิมพ์หาย + กันกระพริบ)
  _formActive() {
    try {
      const sheet = document.getElementById("sheet-root");
      if (sheet && sheet.innerHTML.trim() !== "") return true;
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true;
    } catch (e) { }
    return false;
  },
  _safeRender() { if (typeof render === "function" && !this._formActive()) render(); },

  _startPoll() {
    clearInterval(this._poll);
    this._poll = setInterval(async () => {
      if (!this.ready || this.applying || this._formActive()) return; // หยุด poll ตอนกำลังพิมพ์
      try {
        const j = await this._get();
        const remote = j && j.data;
        if (remote) {
          const rc = _syncCanon(remote);
          if (rc !== _syncCanon(_syncLite(Store.snapshot())) && rc !== this._lastCanon) this.applyRemote(remote);
          else this._lastCanon = rc;
        }
        if (this.status === "error") { this.status = "on"; if (this._onSync()) render(); }
      } catch (e) { this.status = "error"; if (this._onSync()) render(); }
    }, 3000);
  },

  applyRemote(data) {
    this._lastCanon = _syncCanon(data); // data จากคลาวด์เป็น lite อยู่แล้ว
    const localCanon = _syncCanon(_syncLite(Store.snapshot()));
    const merged = mergeSnapshots(Store.snapshot(), data);
    const mergedCanon = _syncCanon(_syncLite(merged));
    if (mergedCanon === localCanon) {
      // เครื่องนี้มีครบแล้ว — ถ้าคลาวด์ยังไม่ครบ ค่อยส่งขึ้นให้ตามทัน
      if (mergedCanon !== this._lastCanon) this.schedulePush();
      return;
    }
    this.applying = true;
    Store.applySnapshot(merged);
    this.applying = false;
    this._safeRender();
    if (mergedCanon !== this._lastCanon) this.schedulePush();
  },

  schedulePush() {
    if (!this.ready || this.applying) return;
    this.status = "syncing";
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._push(), 700);
    if (this._onSync() && !this._formActive()) render();
  },

  async _push(silent) {
    if (!this.url || !this.code) return;
    const canon = _syncCanon(_syncLite(Store.snapshot()));
    if (canon === this._lastCanon) { this.status = "on"; return; }
    try {
      await this._post();
      this._lastCanon = canon;
      this.status = "on";
    } catch (e) {
      this.status = "error";
      if (!silent) console.warn("sync push failed", e);
    }
    if (this._onSync() && !this._formActive()) render();
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
