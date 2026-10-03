/* ============================================================
   Baby Kids — Google Apps Script สำหรับซิงค์ข้อมูลพ่อ-แม่
   ------------------------------------------------------------
   วิธีใช้:
   1) สร้าง Google Sheet ใหม่ (ชีตเปล่า)
   2) เมนู Extensions → Apps Script
   3) ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้แทน → กดบันทึก (ไอคอนดิสก์)
   4) กด Deploy → New deployment → เลือก type = Web app
        - Execute as: Me
        - Who has access: Anyone
      → Deploy → อนุญาตสิทธิ์ (Authorize)
   5) คัดลอก "Web app URL" (ลงท้าย /exec) ไปวางในแอป Baby Kids
   ============================================================ */

function doGet(e) {
  var code = ((e && e.parameter && e.parameter.code) || "").trim();
  var row = findRow_(code);
  var data = null;
  if (row) {
    var raw = sheet_().getRange(row, 2).getValue();
    data = raw ? JSON.parse(raw) : null;
  }
  return json_({ data: data });
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (err) { }
  var code = (body.code || "").trim();
  if (!code) return json_({ error: "no code" });
  var sh = sheet_();
  var row = findRow_(code);
  var now = new Date().toISOString();
  var dataStr = JSON.stringify(body.data);
  if (row) {
    sh.getRange(row, 2).setValue(dataStr);
    sh.getRange(row, 3).setValue(now);
  } else {
    sh.appendRow([code, dataStr, now]);
  }
  return json_({ ok: true, updated: now });
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName("data") || ss.insertSheet("data");
}

function findRow_(code) {
  if (!code) return 0;
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 1) return 0;
  var vals = sh.getRange(1, 1, last, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === code) return i + 1;
  }
  return 0;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
