/**
 * READ-ONLY PUBLIC GOOGLE FORM COUNT ENDPOINT
 * Form: 台灣美光記憶體企業工會 緊急撤銷授權與暫緩簽署連署書
 * Form ID is deliberately fixed: no arbitrary form IDs are accepted.
 *
 * Setup:
 *  1. Sign in with a Google account that can view responses to this form.
 *  2. Open https://script.google.com/ and create a new Apps Script project.
 *  3. Paste this file into Code.gs.
 *  4. Deploy > New deployment > Web app.
 *     Execute as: Me; Who has access: Anyone.
 *  5. Copy the generated .../exec URL into FORM_COUNT_WEBAPP_URL
 *     in index_test1.html's taichung-google-form-count-v1 script.
 *
 * Endpoint: .../exec?action=count&prefix=someCallback
 * Response: someCallback({"ok":true,"source":"google_form",
 *  "formId":"...","count":1234,"updatedAt":"2026-10-28T...Z"});
 *
 * SECURITY:
 *  - Responds ONLY with count + timing, never names, emails, answers, etc.
 *  - No POST handler, no response mutation.
 *  - Publishes aggregate raw response count, NOT verified unique people.
 *  - Caches for three minutes to limit reads of the form.
 */
const FORM_ID = '1cTxACRUTPrsZdk-fIOabrXhWkJgf65k_NPQogqddO9E';
const CACHE_KEY = 'public_form_count_20261028_v1';
const CACHE_SECONDS = 180;

function doGet(e) {
  const p = (e && e.parameter) || {};
  const prefix = String(p.prefix || '');
  // Strict JSONP callback validation avoids arbitrary JavaScript injection.
  const safeCallback = /^[A-Za-z_$][A-Za-z0-9_$]{0,79}$/.test(prefix) ? prefix : '';
  const action = String(p.action || 'count');
  let data;
  if (action !== 'count') {
    data = { ok: false };
  } else {
    try {
      data = getPublicCount_();
    } catch (_) {
      data = { ok: false, error: 'count_unavailable' };
    }
  }
  const json = JSON.stringify(data);
  if (safeCallback) {
    return ContentService.createTextOutput(safeCallback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getPublicCount_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const lock = LockService.getScriptLock();
  // Avoid many concurrent full-response reads during cache expiry.
  if (!lock.tryLock(2500)) {
    const secondTry = cache.get(CACHE_KEY);
    if (secondTry) return JSON.parse(secondTry);
    throw new Error('busy');
  }
  try {
    const secondCheck = cache.get(CACHE_KEY);
    if (secondCheck) return JSON.parse(secondCheck);
    // Reads Form responses with owner's authorization, but does not expose any response data.
    const count = FormApp.openById(FORM_ID).getResponses().length;
    const result = {
      ok: true,
      source: 'google_form',
      formId: FORM_ID,
      count: count,
      updatedAt: new Date().toISOString()
    };
    cache.put(CACHE_KEY, JSON.stringify(result), CACHE_SECONDS);
    return result;
  } finally {
    lock.releaseLock();
  }
}
