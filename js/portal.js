/* Portal-specific transport. Existing builder transport remains unchanged. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('login-dialog');
  const url = window.RCM_PORTAL_CONFIG?.apiUrl || '';
  let token = '';
  let expiryTimer;
  let generation = 0;
  function request(payload) {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) return Promise.reject(new Error('Lecturer sign-in is not connected yet. The Question Builder is available without portal sign-in.'));
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const frame = document.createElement('iframe');
      frame.name = 'portal_' + requestId; frame.hidden = true; frame.title = 'Portal service response';
      const form = document.createElement('form');
      form.method = 'POST'; form.action = url; form.target = frame.name; form.hidden = true;
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = 'payload'; input.value = JSON.stringify({ ...payload, requestId }); form.append(input);
      const finish = (error, data) => { clearTimeout(timer); window.removeEventListener('message', receive); form.remove(); frame.remove(); error ? reject(error) : resolve(data); };
      const receive = event => {
        let origin;
        try { origin = new URL(event.origin); } catch { return; }
        if (origin.protocol !== 'https:' || !(origin.hostname === 'script.google.com' || origin.hostname === 'script.googleusercontent.com' || origin.hostname.endsWith('.googleusercontent.com'))) return;
        const msg = event.data;
        if (msg?.type !== 'RCM_SECURE_RESPONSE' || msg.requestId !== requestId) return;
        msg.data?.success ? finish(null, msg.data) : finish(new Error(msg.data?.error || 'Unable to complete this request.'));
      };
      const timer = setTimeout(() => finish(new Error('The service did not respond. Check your connection and try again.')), 30000);
      window.addEventListener('message', receive); document.body.append(frame, form); form.submit(); input.value = '';
    });
  }
  function notice(text) { $('portal-status').textContent = text; $('portal-status').hidden = !text; }
  function showLogin() {
    $('login-message').textContent = url ? '' : 'Lecturer sign-in is being connected. You can use the Question Builder now.';
    $('login-submit').disabled = !url;
    dialog.showModal();
  }
  $('open-login').addEventListener('click', showLogin);
  $('courses-login').addEventListener('click', showLogin);
  $('close-login').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { $('lecturer-code').value = ''; });
  function reset() {
    generation++; token = ''; clearTimeout(expiryTimer);
    $('welcome-title').textContent = 'Welcome to your portal.';
    $('welcome-copy').textContent = 'Prepare your papers. Manage your courses. Keep your academic work moving.';
    $('session-label').textContent = 'RCM Academic Portal';
    $('open-login').hidden = false; $('logout').hidden = true;
    $('course-list').replaceChildren(); $('course-list').hidden = true; $('course-empty').hidden = false;
    $('courses-description').textContent = 'Your courses will appear here after you sign in.';
  }
  function renderUser(user) {
    $('welcome-title').textContent = 'Welcome, ' + user.name + '.';
    $('welcome-copy').textContent = 'Lecturer workspace · ' + user.email;
    $('session-label').textContent = user.session || 'Session not configured';
    $('open-login').hidden = true; $('logout').hidden = false;
    $('courses-description').textContent = user.courses.length ? 'Your assignments for ' + (user.session || 'the configured session') + '. Score entry is being connected.' : 'No courses are assigned to your account. Contact the academic office.';
    $('course-empty').hidden = true; $('course-list').hidden = false;
    $('course-list').replaceChildren(...user.courses.map(course => {
      const card = document.createElement('article'); card.className = 'course-card';
      const code = document.createElement('span'); code.className = 'course-code'; code.textContent = course.code;
      const title = document.createElement('h3'); title.textContent = course.title;
      const meta = document.createElement('p'); meta.textContent = [course.programme, course.level, 'Semester ' + course.semester].join(' · ');
      const status = document.createElement('p'); status.textContent = 'Assigned · Result submission not yet connected';
      card.append(code, title, meta, status); return card;
    }));
  }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('login-submit'); button.disabled = true; button.textContent = 'Signing in…';
    const current = ++generation;
    $('login-message').textContent = '';
    try {
      const data = await request({ action: 'portal.login', email: $('lecturer-email').value.trim(), code: $('lecturer-code').value });
      if (current !== generation) return;
      token = data.token; renderUser(data.user); dialog.close(); notice('Signed in. Your assigned courses are shown below.');
      expiryTimer = setTimeout(() => { reset(); notice('Your session has expired. Please sign in again.'); }, Math.max(0, data.expires - Date.now()));
    } catch (error) { if (current === generation) $('login-message').textContent = error.message; }
    finally { $('lecturer-code').value = ''; button.disabled = !url; button.textContent = 'Sign in'; }
  });
  $('logout').addEventListener('click', async () => {
    const oldToken = token; reset(); notice('Signed out.');
    if (oldToken) { try { await request({ action: 'portal.logout', token: oldToken }); } catch { notice('Signed out on this page. The server session will expire automatically.'); } }
  });
  // Tokens and access codes remain in memory, never localStorage or URLs.
})();
