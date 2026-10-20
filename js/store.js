/* ============================================================
   Store — จัดการข้อมูลทั้งหมดใน localStorage
   รองรับลูกหลายคน: root.children[] โดย Store.data = ลูกที่กำลังเลือกอยู่
   ============================================================ */
const KEY = "babykids.v1";

/* ฟิลด์ข้อมูลของลูก 1 คน */
const CHILD_FIELDS = {
  profile: { name: "", gender: "boy", birthDate: "", photo: "", dadHeight: "", momHeight: "", gestWeeks: "", gestDays: "", dueDate: "", driveFolder: "" },
  growth: [],        // {id, date, weight, height, head}
  milestones: {},    // { milestoneId: {done, date} }
  shopping: [],       // {id, name, cat, qty, bought}
  appointments: [],   // {id, date, time, title, place, note, done, isVaccine}
  temps: [],          // {id, time, value, note}
  meds: [],           // {id, time, name, dose, note}
  memories: [],       // {id, date, title, note, photo}
  teeth: {},          // { toothId: "YYYY-MM-DD" }
  healthInfo: {},     // บัตรสุขภาพ
  sizes: [],          // {id, date, clothing, shoe, diaper, note}
  vaccines: [],       // {id, date, name, photo, note} — สมุดบันทึกวัคซีนที่ฉีดแล้ว
  letters: [],        // {id, date, title, body}
  quotes: [],         // {id, date, text, note}
  feeds: [], sleeps: [], diapers: [],  // (เดิม — เก็บไว้เพื่อความเข้ากันได้)
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

function newChild(base) {
  const c = clone(CHILD_FIELDS);
  if (base) {
    Object.keys(base).forEach(k => { if (k !== "id" && k !== "_seeded") c[k] = base[k]; });
    c.profile = { ...CHILD_FIELDS.profile, ...(base.profile || {}) };
  }
  c.id = (base && base.id) || uid();
  return c;
}
function seedChild(child) {
  if (child.shopping && child.shopping.length) return;
  SHOPPING_TEMPLATE.forEach(group => group.items.forEach(name => {
    child.shopping.push({ id: uid(), name, cat: group.cat, qty: 1, bought: false });
  }));
}

const Store = {
  root: null, data: null, activeId: "",

  load() {
    let parsed = null;
    try { const raw = localStorage.getItem(KEY); parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }

    if (parsed && Array.isArray(parsed.children)) {
      this.root = { v: 2, children: parsed.children.map(c => newChild(c)), _seeded: !!parsed._seeded };
    } else if (parsed) {
      // ย้ายข้อมูลรูปแบบเดิม (ลูกคนเดียว) → เป็น children[0]
      this.root = { v: 2, children: [newChild(parsed)], _seeded: !!parsed._seeded };
    } else {
      this.root = { v: 2, children: [], _seeded: false };
    }
    if (this.root.children.length === 0) {
      const c = newChild(); seedChild(c); this.root.children.push(c); this.root._seeded = true;
    }
    this.activeId = localStorage.getItem("bk.activeChild") || this.root.children[0].id;
    if (!this.root.children.find(c => c.id === this.activeId)) this.activeId = this.root.children[0].id;
    this._point();
    return this.data;
  },
  _point() { this.data = this.root.children.find(c => c.id === this.activeId) || this.root.children[0]; },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.root));
      localStorage.setItem("bk.activeChild", this.activeId);
    } catch (e) {
      alert("บันทึกข้อมูลไม่สำเร็จ — พื้นที่จัดเก็บอาจเต็ม");
    }
    if (typeof Sync !== "undefined" && Sync.ready && !Sync.applying) Sync.schedulePush();
  },
  _persistLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(this.root)); localStorage.setItem("bk.activeChild", this.activeId); } catch (e) { }
  },

  /* ---- children ---- */
  children() { return this.root.children; },
  addChild(name) {
    const c = newChild(); c.profile.name = name || ""; seedChild(c);
    this.root.children.push(c); this.activeId = c.id; this._point(); this.save();
    return c;
  },
  switchChild(id) {
    if (this.root.children.find(c => c.id === id)) {
      this.activeId = id; this._point();
      localStorage.setItem("bk.activeChild", id); // เฉพาะเครื่องนี้ (ไม่ซิงค์)
    }
  },
  renameChild(id, name) {
    const c = this.root.children.find(x => x.id === id);
    if (c) { c.profile.name = name; this.save(); }
  },
  removeChild(id) {
    if (this.root.children.length <= 1) return false;
    this.root.children = this.root.children.filter(c => c.id !== id);
    if (this.activeId === id) this.activeId = this.root.children[0].id;
    this._point(); this.save();
    return true;
  },

  /* ---- profile ---- */
  setProfile(p) { this.data.profile = { ...this.data.profile, ...p }; this.save(); },

  /* ---- generic list helpers (ทำงานกับลูกที่เลือกอยู่) ---- */
  add(list, obj) {
    const item = { id: uid(), ...obj };
    this.data[list].unshift(item);
    this.save();
    return item;
  },
  update(list, id, patch) {
    const i = this.data[list].findIndex(x => x.id === id);
    if (i >= 0) { this.data[list][i] = { ...this.data[list][i], ...patch }; this.save(); }
  },
  remove(list, id) {
    this.data[list] = this.data[list].filter(x => x.id !== id);
    this.save();
  },

  /* ---- milestones ---- */
  toggleMilestone(id) {
    const cur = this.data.milestones[id];
    if (cur && cur.done) delete this.data.milestones[id];
    else this.data.milestones[id] = { done: true, date: new Date().toISOString() };
    this.save();
  },

  /* ---- seed ---- */
  seedIfNeeded() {
    if (this.root._seeded) return;
    seedChild(this.data);
    this.root._seeded = true;
    this.save();
  },

  seedVaccines() {
    if (!this.data.profile.birthDate) return 0;
    const birth = new Date(this.data.profile.birthDate);
    let added = 0;
    VACCINE_SCHEDULE.forEach(v => {
      const d = new Date(birth);
      d.setMonth(d.getMonth() + v.atMonth);
      const dateStr = d.toISOString().slice(0, 10);
      const title = "วัคซีน: " + v.name;
      if (!this.data.appointments.some(a => a.title === title)) {
        this.data.appointments.push({ id: uid(), date: dateStr, time: "", title, place: "", note: "นัดวัคซีนตามเกณฑ์", done: false, isVaccine: true });
        added++;
      }
    });
    this.save();
    return added;
  },

  /* ---- sync snapshot (ทั้งครอบครัว — ไม่รวม activeId) ---- */
  snapshot() { return { v: 2, children: this.root.children, _seeded: this.root._seeded }; },
  applySnapshot(obj) {
    if (!obj) return;
    if (Array.isArray(obj.children)) {
      this.root = { v: 2, children: obj.children.map(c => newChild(c)), _seeded: !!obj._seeded };
    } else if (obj.profile) {
      this.root = { v: 2, children: [newChild(obj)], _seeded: !!obj._seeded };
    } else return;
    if (this.root.children.length === 0) { const c = newChild(); seedChild(c); this.root.children.push(c); }
    if (!this.root.children.find(c => c.id === this.activeId)) this.activeId = this.root.children[0].id;
    this._point();
    this._persistLocal();
  },

  /* ---- export / import / reset ---- */
  exportJSON() { return JSON.stringify(this.root, null, 2); },
  importJSON(text) {
    const obj = JSON.parse(text);
    this.applySnapshot(obj);
    this.save();
  },
  reset() {
    this.root = { v: 2, children: [], _seeded: true };
    const c = newChild(); seedChild(c);
    this.root.children.push(c); this.activeId = c.id; this._point();
    this.save();
  },
};
