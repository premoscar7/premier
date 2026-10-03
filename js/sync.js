/* ============================================================
   Sync — ซิงค์ข้อมูลพ่อ-แม่ ผ่าน Google Sheet (Apps Script Web App)
   เก็บข้อมูลทั้งก้อนไว้ 1 แถว ต่อ 1 "รหัสครอบครัว" (last-write-wins)
   ซิงค์แบบ near-realtime ด้วยการ poll ทุก ~3 วินาที + push ทันทีเมื่อแก้
   ============================================================ */
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
    this.code = localStorage.getItem("bk.familyCode") || "";
    this.url = this.cfg().url;
    if (localStorage.getItem("bk.syncOn") === "1" && this.code && this.url) {
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
    const body = JSON.stringify({ code: this.code, data: Store.data });
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

    const localHas = this.hasData(Store.data);
    if (remote && this.hasData(remote)) {
      const same = JSON.stringify(remote) === JSON.stringify(Store.data);
      if (!opts.silent && localHas && !same) {
        const useCloud = confirm(
          "พบข้อมูลในคลาวด์อยู่แล้ว (จากอีกเครื่อง)\n\n" +
          "• กด “ตกลง” = ใช้ข้อมูลจากคลาวด์ (ข้อมูลในเครื่องนี้จะถูกแทนที่)\n" +
          "• กด “ยกเลิก” = ส่งข้อมูลเครื่องนี้ขึ้นแทนข้อมูลในคลาวด์"
        );
        if (useCloud) this.applyRemote(remote);
        else await this._push(true);
      } else {
        this.applyRemote(remote);
      }
    } else {
      await this._push(true); // คลาวด์ยังว่าง → อัปข้อมูลเครื่องนี้ขึ้นเป็นตัวตั้งต้น
    }

    this.ready = true;
    this.status = "on";
    localStorage.setItem("bk.familyCode", code);
    localStorage.setItem("bk.syncOn", "1");
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
          if (rj !== JSON.stringify(Store.data) && rj !== this._lastJSON) this.applyRemote(remote);
        }
        if (this.status === "error") { this.status = "on"; if (this._onSync()) render(); }
      } catch (e) { this.status = "error"; if (this._onSync()) render(); }
    }, 3000);
  },

  applyRemote(data) {
    const incoming = JSON.stringify(data);
    if (incoming === JSON.stringify(Store.data)) return;
    this.applying = true;
    Store.data = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DATA)), data);
    Store.save();
    this.applying = false;
    this._lastJSON = incoming;
    if (typeof render === "function") render();
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
    const payload = JSON.stringify(Store.data);
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
    return !!(d && ((d.feeds && d.feeds.length) || (d.sleeps && d.sleeps.length) ||
      (d.diapers && d.diapers.length) || (d.growth && d.growth.length) ||
      (d.memories && d.memories.length) || (d.temps && d.temps.length) ||
      (d.meds && d.meds.length) || (d.profile && d.profile.birthDate)));
  },
};
