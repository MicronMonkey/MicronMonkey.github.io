/* 挺光連署 — page logic: language switcher, signature form, signatory list. */
(function () {
  'use strict';

  /* ── settings ──────────────────────────────────────────────
   * endpoint: leave '' for the local test mode (signatures stay in this
   * browser). Paste a deployed Google Apps Script web-app URL (see
   * apps-script.gs in this folder) to collect real, shared signatures. */
  var CONFIG = { endpoint: '', turnstileSiteKey: '', goal: 10000 };

  var URL_ = 'https://micronmonkey.github.io/stand-with-micron-workers/';
  var KEY = 'swmw.signatures.v1';
  var SIGNED_KEY = 'swmw.signed.v1';
  var LANG_KEY = 'swmw.lang';
  var ROLES = ['current', 'overseas', 'former', 'family', 'semi', 'worker', 'student', 'public', 'shareholder'];
  var SITES = ['none', 'tc', 'ty', 'other', 'us', 'jp', 'sg', 'my', 'cn', 'in', 'abroad'];
  var FILTERS = [
    { id: 'all', label: 'filter.all', match: null },
    { id: 'current', label: 'role.current', match: ['current'] },
    { id: 'overseas', label: 'filter.overseas', match: ['overseas'] },
    { id: 'former', label: 'role.former', match: ['former'] },
    { id: 'family', label: 'role.family', match: ['family'] },
    { id: 'sup', label: 'filter.sup', match: ['semi', 'worker', 'student', 'public', 'shareholder'] }
  ];
  var LIVE = !!CONFIG.endpoint;

  var $ = function (id) { return document.getElementById(id); };
  var LANGS = window.SWMW_LANGS || [{ code: 'zh-Hant', name: '繁體中文' }];
  var DICT = window.SWMW_I18N || {};
  var zh = DICT['zh-Hant'] = DICT['zh-Hant'] || {};
  var lang = 'zh-Hant';
  var state = { list: [], count: 0, filter: 'all', q: '' };

  /* ── i18n ─────────────────────────────────────────────── */
  // Read the Traditional Chinese baseline straight from the markup.
  each('[data-i18n]', function (el) {
    var k = el.getAttribute('data-i18n');
    if (!(k in zh)) zh[k] = el.tagName === 'TITLE' ? el.textContent : el.innerHTML;
  });
  each('[data-i18n-ph]', function (el) { zh[el.getAttribute('data-i18n-ph')] = el.getAttribute('placeholder'); });
  each('[data-i18n-aria]', function (el) { zh[el.getAttribute('data-i18n-aria')] = zh[el.getAttribute('data-i18n-aria')] || el.getAttribute('aria-label'); });
  each('[data-i18n-content]', function (el) { zh[el.getAttribute('data-i18n-content')] = el.getAttribute('content'); });

  function t(k, vars) {
    var s = (DICT[lang] && DICT[lang][k] != null) ? DICT[lang][k] : (zh[k] != null ? zh[k] : k);
    if (vars) for (var v in vars) s = s.replace('{' + v + '}', vars[v]);
    return s;
  }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function supported(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return code;
    return null;
  }
  function locale() { return { 'zh-Hant': 'zh-TW', 'zh-Hans': 'zh-CN' }[lang] || lang; }
  function detect() {
    var p = new URLSearchParams(location.search).get('lang');
    if (supported(p)) return p;
    try { var s = localStorage.getItem(LANG_KEY); if (supported(s)) return s; } catch (e) {}
    var navs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < navs.length; i++) {
      var n = (navs[i] || '').toLowerCase();
      if (/^zh-(cn|sg|hans|my)/.test(n)) return supported('zh-Hans') || 'zh-Hant';
      if (n.indexOf('zh') === 0) return 'zh-Hant';
      if (n.indexOf('ja') === 0) return 'ja';
      if (n.indexOf('ko') === 0) return 'ko';
      if (n.indexOf('en') === 0) return 'en';
    }
    return 'zh-Hant';
  }

  function applyLang(code, persist) {
    lang = supported(code) || 'zh-Hant';
    document.documentElement.lang = lang;
    each('[data-i18n]', function (el) {
      var k = el.getAttribute('data-i18n');
      if (el.tagName === 'TITLE') { document.title = t(k); return; }
      el.innerHTML = t(k);
    });
    each('[data-i18n-ph]', function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    each('[data-i18n-aria]', function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    each('[data-i18n-content]', function (el) { el.setAttribute('content', t(el.getAttribute('data-i18n-content'))); });
    var cur = LANGS.filter(function (l) { return l.code === lang; })[0];
    $('langName').textContent = cur ? cur.name + (lang === 'en' ? ' / 繁體中文' : ' / English') : lang;
    each('#langMenu button', function (b) { b.setAttribute('aria-checked', String(b.dataset.lang === lang)); });
    fillSelects();
    renderChips();
    setMode();
    renderCount(false);
    renderList();
    updatePrivacy();
    updateSecurity();
    if (persist) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
      var u = new URL(location.href);
      if (lang === 'zh-Hant') u.searchParams.delete('lang'); else u.searchParams.set('lang', lang);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  }

  /* ── language dropdown (top right) ────────────────────── */
  var menu = $('langMenu'), btn = $('langBtn');
  LANGS.forEach(function (l) {
    var li = document.createElement('li'); li.setAttribute('role', 'none');
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.dataset.lang = l.code; b.lang = l.code;
    b.innerHTML = '<span></span><small></small>';
    b.firstChild.textContent = l.name;
    b.lastChild.textContent = l.code === 'en' ? '' : l.en;
    b.addEventListener('click', function () { applyLang(l.code, true); closeMenu(); btn.focus(); });
    li.appendChild(b); menu.appendChild(li);
  });
  function openMenu() {
    menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    var cur = menu.querySelector('[aria-checked=true]') || menu.querySelector('button');
    cur.focus();
  }
  function closeMenu() { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function () { menu.classList.contains('open') ? closeMenu() : openMenu(); });
  document.addEventListener('click', function (e) { if (!$('lang').contains(e.target)) closeMenu(); });
  menu.addEventListener('keydown', function (e) {
    var items = Array.prototype.slice.call(menu.querySelectorAll('button'));
    var i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { closeMenu(); if (e.key === 'Escape') btn.focus(); }
  });
  btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(); } });

  /* ── form selects / chips ─────────────────────────────── */
  function fillSelects() {
    var site = $('site'), sv = site.value;
    var selected = document.querySelector('input[name="role"]:checked');
    var rv = selected ? selected.value : '';
    $('roleChoices').textContent = '';
    ROLES.forEach(function (r) {
      var label = document.createElement('label'); label.className = 'role-choice';
      var input = document.createElement('input'); input.type = 'radio'; input.name = 'role'; input.value = r; input.required = true; input.checked = rv === r;
      var text = document.createElement('span'); text.textContent = t('role.' + r);
      input.addEventListener('change', updatePrivacy);
      label.appendChild(input); label.appendChild(text); $('roleChoices').appendChild(label);
    });
    site.length = 0;
    SITES.forEach(function (s) { site.add(new Option(t('site.' + s), s === 'none' ? '' : s)); });
    site.value = sv;
  }
  function renderChips() {
    var box = $('chips'); box.textContent = '';
    FILTERS.forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = t(f.label);
      b.setAttribute('aria-pressed', String(state.filter === f.id));
      b.addEventListener('click', function () { state.filter = f.id; renderChips(); renderList(); });
      box.appendChild(b);
    });
  }

  /* ── data ─────────────────────────────────────────────── */
  function loadLocal() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function saveLocal(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function hasSigned() { try { return localStorage.getItem(SIGNED_KEY) === '1'; } catch (e) { return false; } }

  function refresh() {
    if (!LIVE) {
      state.list = loadLocal().slice().reverse();
      state.count = state.list.length;
      renderCount(true); renderList();
      return Promise.resolve();
    }
    return fetch(CONFIG.endpoint + (CONFIG.endpoint.indexOf('?') < 0 ? '?' : '&') + 'action=list', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.count = +d.count || 0;
        state.list = Array.isArray(d.signatures) ? d.signatures : [];
        renderCount(true); renderList();
      })
      .catch(function () { /* keep previous state */ });
  }

  /* ── rendering ────────────────────────────────────────── */
  var shown = 0;
  function renderCount(animate) {
    var target = state.count, el = $('heroCount');
    var fmt = function (n) { return n.toLocaleString(locale()); };
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === shown) {
      el.textContent = fmt(target); shown = target;
    } else {
      var from = shown, start = performance.now(), dur = 900;
      (function step(now) {
        var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(from + (target - from) * e));
        if (p < 1) requestAnimationFrame(step); else shown = target;
      })(start);
    }
    $('goalBar').style.width = Math.min(100, target / CONFIG.goal * 100) + '%';
    $('goalTxt').textContent = t('count.goal', { n: fmt(CONFIG.goal) });
  }
  function setMode() {
    var tag = $('liveTag'), note = $('modeNote');
    $('submit').textContent = t(LIVE ? 'form.submit_live' : 'form.submit');
    tag.className = 'live ' + (LIVE ? 'on' : 'off');
    tag.textContent = LIVE ? t('count.live') : t('count.local');
    if (LIVE) {
      note.className = 'note info';
      note.lastElementChild.innerHTML = t('form.live');
      $('listSub').textContent = t('list.sub_live');
      $('clear').hidden = true;
    }
  }
  function renderList() {
    var ul = $('sigs'); ul.textContent = '';
    var f = FILTERS.filter(function (x) { return x.id === state.filter; })[0];
    var q = state.q.toLowerCase();
    var items = state.list.filter(function (s) {
      if (f && f.match && (!(s.pub === true && s.pubRole === true) || f.match.indexOf(s.role) < 0)) return false;
      if (q) {
        var hay = ((s.pub === true && s.name ? s.name : '') + ' ' + (s.pub === true && s.pubMsg === true ? s.msg || '' : '')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    }).slice(0, 300);
    if (!items.length) {
      var e = document.createElement('li'); e.className = 'empty';
      e.textContent = state.list.length ? t('list.nomatch') : t('list.empty');
      ul.appendChild(e); return;
    }
    items.forEach(function (s) {
      var li = document.createElement('li'), who = document.createElement('div');
      who.className = 'who';
      var n = document.createElement('span');
      n.textContent = (s.pub === true && s.name) ? s.name : t('list.anon');
      who.appendChild(n);
      if (s.pub === true && s.title) badge(who, s.title, 'alt');
      if (s.pub === true && s.pubRole === true && ROLES.indexOf(s.role) >= 0) badge(who, t('role.' + s.role), '');
      if (s.pub === true && s.pubRole === true && SITES.indexOf(s.site) > 0) badge(who, t('site.' + s.site), 'alt');
      if (s.t) {
        var w = document.createElement('span'); w.className = 'when';
        w.textContent = new Date(s.t).toLocaleDateString(locale());
        who.appendChild(w);
      }
      li.appendChild(who);
      if (s.pub === true && s.pubMsg === true && s.msg) { var m = document.createElement('p'); m.className = 'msg'; m.textContent = s.msg; li.appendChild(m); }
      ul.appendChild(li);
    });
  }
  function badge(parent, text, cls) {
    var b = document.createElement('span'); b.className = 'badge ' + cls; b.textContent = text; parent.appendChild(b);
  }

  /* ── form ─────────────────────────────────────────────── */
  $('sign').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = $('err'), name = $('nm').value.trim(), role = (document.querySelector('input[name="role"]:checked') || {}).value, pub = $('pub').checked;
    if (!role) { err.textContent = t('err.role'); $('roleChoices').querySelector('input').focus(); return; }
    if (!name) { err.textContent = t('err.name'); $('nm').focus(); return; }
    if (!$('email').checkValidity() || !$('email').value.trim()) { err.textContent = t('err.email'); $('email').focus(); return; }
    if (LIVE && (!CONFIG.turnstileSiteKey || !securityToken)) { err.textContent = t('security.required'); return; }
    if (!$('agree').checked) { err.textContent = t('err.agree'); $('agree').focus(); return; }
    if (LIVE && hasSigned()) { err.textContent = t('err.dup'); return; }
    err.textContent = '';
    var sig = { title: $('jobTitle').value.trim().slice(0,80), email: $('email').value.trim(), pubRole: pub && $('pubRole').checked, pubMsg: pub && $('pubMsg').checked, token: securityToken, agree: true, name: name.slice(0, 40), role: role, site: $('site').value, msg: $('msg').value.trim().slice(0, 200), pub: pub, t: Date.now(), lang: lang };
    var form = this, submit = $('submit');

    function done() {
      form.reset(); fillSelects(); updatePrivacy(); resetSecurity();
      toast(t(LIVE ? 'toast.signed' : 'toast.demo'));
      $('signers').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (!LIVE) {
      var list = loadLocal(); list.push(publicSignature(sig));
      if (!saveLocal(list)) { err.textContent = t('err.store'); return; }
      refresh(); done(); return;
    }
    submit.disabled = true; submit.textContent = t('form.sending');
    // Require a readable server acknowledgement. Opaque no-cors responses are not success.
    fetch(CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(sig) })
      .then(function (r) { if (!r.ok) throw new Error('network'); return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error || 'rejected');
        try { localStorage.setItem(SIGNED_KEY, '1'); } catch (e) {}
        done(); return refresh();
      })
      .catch(function () { err.textContent = t('err.net'); resetSecurity(); })
      .then(function () { submit.disabled = false; submit.textContent = t(LIVE ? 'form.submit_live' : 'form.submit'); });

  });

  $('q').addEventListener('input', function () { state.q = this.value.trim(); renderList(); });
  $('clear').addEventListener('click', function () {
    if (!loadLocal().length) { toast(t('toast.none')); return; }
    if (confirm(t('confirm.clear'))) { try { localStorage.removeItem(KEY); } catch (e) {} refresh(); toast(t('toast.cleared')); }
  });

  $('copyMsg').addEventListener('click', function () {
    var txt = $('solMsg').textContent + ' ' + URL_ + (lang === 'zh-Hant' ? '' : '?lang=' + lang);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(function () { toast(t('toast.msgcopied')); }, function () { prompt(t('share.prompt'), txt); });
    } else prompt(t('share.prompt'), txt);
  });

  /* ── share / toast ────────────────────────────────────── */
  var toastT;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2400);
  }
  each('[data-share]', function (b) {
    b.addEventListener('click', function () {
      var link = URL_ + (lang === 'zh-Hant' ? '' : '?lang=' + lang);
      var data = { title: document.title, text: t('share.text'), url: link };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      var fallback = function () { prompt(t('share.prompt'), link); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(data.text + ' ' + link).then(function () { toast(t('toast.copied')); }, fallback);
      } else fallback();
    });
  });


  var securityToken = '', widgetId = null;
  function publicSignature(s) {
    return {t:s.t, pub:s.pub === true, name:s.pub ? s.name : '', title:s.pub ? s.title : '',
      pubRole:s.pub && s.pubRole, role:s.pub && s.pubRole ? s.role : '', site:s.pub && s.pubRole ? s.site : '',
      pubMsg:s.pub && s.pubMsg, msg:s.pub && s.pubMsg ? s.msg : ''};
  }
  function updatePrivacy() {
    var pub = $('pub').checked, selected = document.querySelector('input[name="role"]:checked');
    $('pubRole').disabled = !pub || !selected; $('pubMsg').disabled = !pub;
    if (!pub) $('pubMsg').checked = false;
    var lines = [pub ? ($('nm').value.trim() || t('form.name')) : t('list.anon')];
    if (pub && $('jobTitle').value.trim()) lines.push($('jobTitle').value.trim());
    if (pub && selected && $('pubRole').checked) {
      lines.push(t('role.' + selected.value));
      if ($('site').value) lines.push(t('site.' + $('site').value));
    }
    if (pub && $('pubMsg').checked && $('msg').value.trim()) lines.push($('msg').value.trim());
    $('publicPreview').textContent = lines.join('\n');
    $('msgCount').textContent = $('msg').value.length + ' / 200';
  }
  function updateSecurity() {
    $('securityStatus').textContent = t(!LIVE ? 'security.demo' : (!CONFIG.turnstileSiteKey ? 'security.off' : securityToken ? 'security.ok' : 'security.required'));
  }
  function resetSecurity() {
    securityToken = '';
    if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    updateSecurity();
  }
  if (LIVE && CONFIG.turnstileSiteKey) {
    window.swmwTurnstileReady = function () {
      widgetId = window.turnstile.render('#turnstile', {
        sitekey:CONFIG.turnstileSiteKey, action:'sign', theme:'dark',
        callback:function(token){securityToken=token;updateSecurity();},
        'expired-callback':function(){securityToken='';updateSecurity();},
        'error-callback':function(){securityToken='';updateSecurity();}
      });
    };
    var script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=swmwTurnstileReady&render=explicit';
    script.async = true; script.onerror = function(){securityToken='';updateSecurity();};
    document.head.appendChild(script);
  }
  $('sign').addEventListener('input', updatePrivacy);
  $('sign').addEventListener('change', updatePrivacy);

  /* ── boot ─────────────────────────────────────────────── */
  applyLang(detect(), false);
  refresh();
  if (LIVE) setInterval(function () { if (!document.hidden) refresh(); }, 30000);
})();
