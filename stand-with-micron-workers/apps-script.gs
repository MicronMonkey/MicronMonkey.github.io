/**
 * 挺光連署 — optional shared signature backend (Google Apps Script).
 *
 * 1. Create a Google Sheet, then Extensions → Apps Script, paste this file.
 * 2. Deploy → New deployment → Web app; Execute as: Me; Who has access: Anyone.
 * 3. Copy the /exec URL into CONFIG.endpoint in app.js.
 *
 * Stored columns: time, name, role, site, message, public, lang.
 * Names of people who chose not to be shown are never returned by doGet.
 */
var SHEET = 'signatures';
var ROLES = ['current', 'overseas', 'former', 'family', 'semi', 'worker', 'student', 'public'];
var SITES = ['', 'tc', 'ty', 'other', 'us', 'jp', 'sg', 'my', 'cn', 'in', 'abroad'];

function sheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['time', 'name', 'role', 'site', 'message', 'public', 'lang', 'hidden']);
  }
  return sh;
}

function clean_(v, max) {
  // Strip control chars and leading formula characters (prevents spreadsheet formula injection).
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/^[=+\-@]+/, '').trim().slice(0, max);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents || '{}');
    var role = ROLES.indexOf(d.role) >= 0 ? d.role : '';
    if (!role) return json_({ ok: false });
    var site = SITES.indexOf(d.site) >= 0 ? d.site : '';
    sheet_().appendRow([new Date(), clean_(d.name, 40), role, site, clean_(d.msg, 200), d.pub !== false, clean_(d.lang, 8), false]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  var rows = sheet_().getDataRange().getValues().slice(1);
  var visible = rows.filter(function (r) { return r[7] !== true; });
  var recent = visible.slice(-300).reverse().map(function (r) {
    return { t: new Date(r[0]).getTime(), name: r[5] ? r[1] : '', pub: !!r[5], role: r[2], site: r[3], msg: r[4] };
  });
  return json_({ count: visible.length, signatures: recent });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
