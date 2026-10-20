/* ============================================================
   Baby Kids — Google Apps Script (v2)
   ทำ 3 อย่าง: (1) ซิงค์ข้อมูลพ่อ-แม่  (2) อ่านรูป/วิดีโอจากโฟลเดอร์ Drive
   (3) อัปรูปจากแอปขึ้น Drive
   ------------------------------------------------------------
   วิธีอัปเดต (ของเดิมมีอยู่แล้ว):
   1) เปิด Apps Script เดิม → ลบโค้ดเก่าทั้งหมด → วางโค้ดนี้แทน → บันทึก
   2) Deploy → Manage deployments (จัดการการทำให้ใช้งานได้)
      → กดดินสอ ✏️ แก้ deployment เดิม → Version: New version → Deploy
      (วิธีนี้ลิงก์ /exec เดิมไม่เปลี่ยน ไม่ต้องแก้ในแอป)
   3) จะมีหน้าขอสิทธิ์ Drive เพิ่ม → อนุญาต (Authorize) อีกครั้ง
   ============================================================ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === "drive") return driveList_(p.folder);
  // ---- ซิงค์ข้อมูล (เดิม) ----
  var code = (p.code || "").trim();
  var row = findRow_(code);
  var data = null;
  if (row) { var raw = sheet_().getRange(row, 2).getValue(); data = raw ? JSON.parse(raw) : null; }
  return json_({ data: data });
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (err) { }
  if (body.action === "upload") return driveUpload_(body);
  // ---- ซิงค์ข้อมูล (เดิม) ----
  var code = (body.code || "").trim();
  if (!code) return json_({ error: "no code" });
  var sh = sheet_();
  var row = findRow_(code);
  var now = new Date().toISOString();
  var dataStr = JSON.stringify(body.data);
  if (row) { sh.getRange(row, 2).setValue(dataStr); sh.getRange(row, 3).setValue(now); }
  else { sh.appendRow([code, dataStr, now]); }
  return json_({ ok: true, updated: now });
}

/* ---- อ่านรูป/วิดีโอในโฟลเดอร์ ---- */
function driveList_(folderId) {
  if (!folderId) return json_({ error: "no folder" });
  try {
    var folder = DriveApp.getFolderById(folderId);
    var it = folder.getFiles();
    var out = [];
    while (it.hasNext()) {
      var f = it.next();
      var mt = f.getMimeType() || "";
      var isImg = mt.indexOf("image/") === 0;
      var isVid = mt.indexOf("video/") === 0;
      if (!isImg && !isVid) continue;
      try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) { }
      var id = f.getId();
      out.push({
        id: id,
        name: f.getName(),
        type: isVid ? "video" : "image",
        date: f.getLastUpdated().toISOString(),
        thumb: "https://lh3.googleusercontent.com/d/" + id + "=w600",
        view: "https://drive.google.com/file/d/" + id + "/view"
      });
    }
    out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return json_({ files: out });
  } catch (err) { return json_({ error: String(err) }); }
}

/* ---- อัปไฟล์จากแอปขึ้นโฟลเดอร์ ---- */
function driveUpload_(body) {
  try {
    var folder = DriveApp.getFolderById(body.folder);
    var bytes = Utilities.base64Decode(body.dataB64);
    var blob = Utilities.newBlob(bytes, body.mime || "application/octet-stream", body.name || ("baby-" + Date.now()));
    var f = folder.createFile(blob);
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) { }
    return json_({ ok: true, id: f.getId() });
  } catch (err) { return json_({ error: String(err) }); }
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName("data") || ss.insertSheet("data");
}
function findRow_(code) {
  if (!code) return 0;
  var sh = sheet_(); var last = sh.getLastRow();
  if (last < 1) return 0;
  var vals = sh.getRange(1, 1, last, 1).getValues();
  for (var i = 0; i < vals.length; i++) { if (String(vals[i][0]) === code) return i + 1; }
  return 0;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
