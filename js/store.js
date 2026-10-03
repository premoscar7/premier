/* ============================================================
   Store — จัดการข้อมูลทั้งหมดใน localStorage
   ============================================================ */
const KEY = "babykids.v1";

const DEFAULT_DATA = {
  profile: { name: "", gender: "boy", birthDate: "", photo: "" },
  feeds: [],       // {id, time, type, amount, side, note}
  sleeps: [],      // {id, start, end, note}
  diapers: [],     // {id, time, type, note}
  growth: [],      // {id, date, weight, height, head}
  milestones: {},  // { milestoneId: {done, date} }
  shopping: [],    // {id, name, cat, qty, bought}
  appointments: [],// {id, date, time, title, place, note, done}
  temps: [],       // {id, time, value, note}
  meds: [],        // {id, time, name, dose, note}
  memories: [],    // {id, date, title, note, photo}
  _seeded: false,
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const Store = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? { ...structuredClone(DEFAULT_DATA), ...JSON.parse(raw) } : structuredClone(DEFAULT_DATA);
    } catch (e) {
      this.data = structuredClone(DEFAULT_DATA);
    }
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      alert("บันทึกข้อมูลไม่สำเร็จ — พื้นที่จัดเก็บอาจเต็ม");
    }
    // ส่งขึ้นคลาวด์ถ้าเปิดซิงค์อยู่
    if (typeof Sync !== "undefined" && Sync.ready && !Sync.applying) Sync.schedulePush();
  },

  /* ---- profile ---- */
  setProfile(p) { this.data.profile = { ...this.data.profile, ...p }; this.save(); },

  /* ---- generic list helpers ---- */
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

  /* ---- seed ของใช้เริ่มต้น + วัคซีน ---- */
  seedIfNeeded() {
    if (this.data._seeded) return;
    // ของใช้
    if (this.data.shopping.length === 0) {
      SHOPPING_TEMPLATE.forEach(group => {
        group.items.forEach(name => {
          this.data.shopping.push({ id: uid(), name, cat: group.cat, qty: 1, bought: false });
        });
      });
    }
    this.data._seeded = true;
    this.save();
  },

  /* ---- สร้างนัดวัคซีนจากวันเกิด ---- */
  seedVaccines() {
    if (!this.data.profile.birthDate) return 0;
    const birth = new Date(this.data.profile.birthDate);
    let added = 0;
    VACCINE_SCHEDULE.forEach(v => {
      const d = new Date(birth);
      d.setMonth(d.getMonth() + v.atMonth);
      const dateStr = d.toISOString().slice(0, 10);
      const title = "วัคซีน: " + v.name;
      const exists = this.data.appointments.some(a => a.title === title);
      if (!exists) {
        this.data.appointments.push({
          id: uid(), date: dateStr, time: "", title,
          place: "", note: "นัดวัคซีนตามเกณฑ์", done: false, isVaccine: true,
        });
        added++;
      }
    });
    this.save();
    return added;
  },

  /* ---- export / import / reset ---- */
  exportJSON() { return JSON.stringify(this.data, null, 2); },
  importJSON(text) {
    const obj = JSON.parse(text);
    this.data = { ...structuredClone(DEFAULT_DATA), ...obj };
    this.save();
  },
  reset() {
    this.data = structuredClone(DEFAULT_DATA);
    this.save();
  },
};
