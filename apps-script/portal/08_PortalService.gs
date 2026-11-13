/* Read-only lecturer access service. Add to a COPY of the exam backend first. */
function portalTable_(name) {
  const id = PropertiesService.getScriptProperties().getProperty('PORTAL_SCORE_SPREADSHEET_ID');
  if (!id) throw new Error('Lecturer access has not been configured.');
  const sheet = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet) throw new Error('Missing portal table: ' + name);
  const rows = sheet.getDataRange().getValues();
  const headers = (rows.shift() || []).map(String);
  const required = { Lecturers: ['Email', 'Name', 'Active', 'AccessCode'], Courses: ['CourseCode', 'Title', 'Programme', 'Level/Set', 'Semester', 'LecturerEmail'], Config: ['Key', 'Value', 'Note'] };
  if ((required[name] || []).some(function (h) { return headers.indexOf(h) < 0; })) throw new Error('Portal table headers need review: ' + name);
  return rows.filter(function (r) { return r.some(function (v) { return v !== ''; }); }).map(function (r) {
    const obj = {}; headers.forEach(function (h, i) { obj[h] = r[i]; }); return obj;
  });
}
function portalText_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function portalHash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function portalLecturer_(email) {
  return portalTable_('Lecturers').filter(function (r) { return portalText_(r.Email).toLowerCase() === email && portalText_(r.Active).toUpperCase() === 'TRUE'; })[0];
}
function portalBootstrap_(email) {
  const lecturer = portalLecturer_(email);
  if (!lecturer) throw new Error('Your lecturer access is no longer active.');
  const config = portalTable_('Config');
  const sessionRow = config.filter(function (r) { return portalText_(r.Key) === 'CURRENT_SESSION'; })[0];
  const courses = portalTable_('Courses').filter(function (r) { return portalText_(r.LecturerEmail).toLowerCase().split(/[,;\s]+/).indexOf(email) >= 0; }).map(function (r) {
    return { code: portalText_(r.CourseCode), title: portalText_(r.Title), programme: portalText_(r.Programme), level: portalText_(r['Level/Set']), semester: portalText_(r.Semester) };
  });
  // No roles are inferred from email or accepted from the client.
  return { name: portalText_(lecturer.Name) || email, email: email, role: 'Lecturer', session: sessionRow ? portalText_(sessionRow.Value) : '', courses: courses };
}
function portalLogin_(data) {
  const email = portalText_(data.email).toLowerCase();
  const code = portalText_(data.code);
  if (!email || email.length > 254 || !code || code.length > 128) throw new Error('Enter your lecturer email and access code.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let user;
  try {
    const props = PropertiesService.getScriptProperties();
    const now = Date.now();
    const all = props.getProperties();
    Object.keys(all).filter(function (k) { return k.indexOf('PORTAL_ATTEMPTS_') === 0; }).forEach(function (k) {
      if (JSON.parse(all[k]).expires <= now) props.deleteProperty(k);
    });
    const key = 'PORTAL_ATTEMPTS_' + portalHash_(email);
    const raw = props.getProperty(key);
    const attempt = raw ? JSON.parse(raw) : { count: 0, expires: now + 900000 };
    if (attempt.count >= 5) throw new Error('Too many sign-in attempts. Try again in 15 minutes.');
    // Count before checking so unexpected service failures cannot bypass throttling.
    attempt.count++; props.setProperty(key, JSON.stringify(attempt));
    const lecturer = portalLecturer_(email);
    if (!lecturer || !portalText_(lecturer.AccessCode) || portalHash_(portalText_(lecturer.AccessCode)) !== portalHash_(code)) throw new Error('Email or access code not recognised.');
    user = portalBootstrap_(email);
    props.deleteProperty(key);
  } finally { lock.releaseLock(); }
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const expires = Date.now() + 3600000;
  CacheService.getScriptCache().put('portal_session_' + portalHash_(token), JSON.stringify({ email: email, expires: expires }), 3600);
  return { success: true, token: token, expires: expires, user: user };
}
function portalRoute_(data) {
  if (data.action === 'portal.login') return portalLogin_(data);
  const token = portalText_(data.token);
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error('Session expired. Please sign in again.');
  const cache = CacheService.getScriptCache();
  const key = 'portal_session_' + portalHash_(token);
  const raw = cache.get(key);
  if (!raw) throw new Error('Session expired. Please sign in again.');
  const session = JSON.parse(raw);
  if (session.expires <= Date.now()) { cache.remove(key); throw new Error('Session expired. Please sign in again.'); }
  if (data.action === 'portal.logout') { cache.remove(key); return { success: true }; }
  if (data.action === 'portal.bootstrap') return { success: true, user: portalBootstrap_(session.email) };
  throw new Error('Unknown portal action.');
}
function portalResponse_(data, requestId) {
  const origin = PropertiesService.getScriptProperties().getProperty('PORTAL_FRONTEND_ORIGIN') || '';
  if (!/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(origin) && !/^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin)) throw new Error('Configure PORTAL_FRONTEND_ORIGIN before enabling lecturer sign-in.');
  let result;
  try { result = portalRoute_(data); }
  catch (error) { result = { success: false, error: error.message || 'Lecturer access is unavailable.' }; }
  const message = JSON.stringify({ type: 'RCM_SECURE_RESPONSE', requestId: String(requestId || ''), data: result }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage(' + message + ', ' + JSON.stringify(origin) + ');</script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
