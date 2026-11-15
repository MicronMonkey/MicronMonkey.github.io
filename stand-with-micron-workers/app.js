/* 挺光連署 — page logic: language switcher, signature form, signatory list. */
(function () {
  'use strict';

  /* ── settings ──────────────────────────────────────────────
   * endpoint: leave '' for the local test mode (signatures stay in this
   * browser). Paste a deployed Google Apps Script web-app URL (see
   * apps-script.gs in this folder) to collect real, shared signatures. */
  var CONFIG = { endpoint: '', turnstileSiteKey: '' };

  var URL_ = 'https://micronmonkey.github.io/stand-with-micron-workers/';
  var DEMO = new URLSearchParams(location.search).get('demo') === '1';
  var KEY = DEMO ? 'swmw.preview.signatures.v1' : 'swmw.signatures.v1';
  var SIGNED_KEY = 'swmw.signed.v1';
  var LANG_KEY = 'swmw.lang';
  var ROLES = ['current', 'overseas', 'former', 'family', 'semi', 'worker', 'student', 'public', 'unaffiliated'];
  var SITES = ['none', 'tw', 'us', 'jp', 'sg', 'my', 'cn', 'in', 'abroad'];
  var LIVE = !!CONFIG.endpoint && !DEMO;

  var $ = function (id) { return document.getElementById(id); };
  var LANGS = window.SWMW_LANGS || [{ code: 'zh-Hant', name: '繁體中文' }];
  var DICT = window.SWMW_I18N || {};
  var zh = DICT['zh-Hant'] = DICT['zh-Hant'] || {};
  var lang = 'zh-Hant';
  var state = { list: [], count: 0, q: '', limit: 12, updatedAt: null, feedError: false };

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
    $('langName').textContent = cur ? cur.name : lang;
    each('#langMenu button', function (b) { b.setAttribute('aria-checked', String(b.dataset.lang === lang)); });
    syncPhotoRotation();
    fillSelects();
    
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

  /* ── data ─────────────────────────────────────────────── */
  function loadLocal() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function saveLocal(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function hasSigned() { try { return localStorage.getItem(SIGNED_KEY) === '1'; } catch (e) { return false; } }

  function refresh() {
    if (!LIVE) {
      state.list = loadLocal().slice().reverse().concat(demoSignatures);
      state.count = state.list.length;
      renderCount(true); renderList();
      return Promise.resolve();
    }
    return fetch(CONFIG.endpoint + (CONFIG.endpoint.indexOf('?') < 0 ? '?' : '&') + 'action=list', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('network'); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.signatures) || !Number.isFinite(+d.count)) throw new Error('invalid response');
        state.count = Number.isFinite(+d.count) ? Math.max(0, Math.floor(+d.count)) : 0;
        state.list = Array.isArray(d.signatures) ? d.signatures : [];
        state.updatedAt = new Date();
        state.feedError = false;
        renderCount(true); renderList();
      })
      .catch(function () { state.feedError = true; renderFeedStatus(); });
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
    renderLights();
    renderBreakdown();
    renderCountries();
  }
  function renderCountries() {
    var totals = {};
    SITES.slice(1).forEach(function (site) { totals[site] = 0; });
    state.list.forEach(function (signature) {
      if (signature.pub !== true || signature.pubRole !== true) return;
      var site = ['tc', 'ty', 'other'].indexOf(signature.site) >= 0 ? 'tw' : signature.site;
      if (Object.prototype.hasOwnProperty.call(totals, site)) totals[site]++;
    });
    Object.keys(totals).forEach(function (site) {
      $('country-' + site).textContent = t('country.people', { n: totals[site].toLocaleString(locale()) });
    });
  }

  function renderBreakdown() {
    var totals = { current: 0, former: 0, support: 0, other: 0 };
    state.list.forEach(function (signature) {
      if (signature.pub !== true || signature.pubRole !== true) return;
      var role = signature.role;
      if (role === 'current' || role === 'overseas') totals.current++;
      else if (role === 'former') totals.former++;
      else if (['family', 'semi', 'worker', 'student', 'public'].indexOf(role) >= 0) totals.support++;
    });
    totals.other = Math.max(0, state.count - totals.current - totals.former - totals.support);
    Object.keys(totals).forEach(function (key) {
      $('stat-' + key).textContent = totals[key].toLocaleString(locale());
    });
    renderFeedStatus();
  }

  function renderFeedStatus() {
    var el = $('feedStatus');
    var time = state.updatedAt && state.updatedAt.toLocaleTimeString(locale());
    el.dataset.state = !LIVE ? 'local' : state.feedError ? 'error' : time ? 'live' : 'waiting';
    var message = !LIVE ? t(DEMO ? 'demo.label' : 'count.local') : time ? t('dash.updated', { time: time }) : t('dash.waiting');
    if (LIVE && state.feedError) message = time ? message + ' · ' + t('dash.reconnecting') : t('dash.reconnecting');
    el.textContent = message;
  }

  function setMode() {
    var tag = $('liveTag'), note = $('modeNote');
    $('submit').textContent = t(LIVE ? 'form.submit_live' : 'form.submit');
    tag.className = 'live ' + (LIVE ? 'on' : 'off');
    tag.textContent = LIVE ? t('count.live') : t('count.local');
    if (DEMO) $('listSub').textContent = t('demo.list');
    if (LIVE) {
      note.className = 'note info';
      note.lastElementChild.innerHTML = t('form.live');
      $('listSub').textContent = t('list.sub_live');
      $('clear').hidden = true;
    }
  }
  function renderList() {
    var ul = $('sigs'); ul.textContent = '';
    var q = state.q.toLowerCase();
    var items = state.list.filter(function (s) {
      if (q) {
        var hay = ((s.pub === true && s.name ? s.name : '') + ' ' + (s.pub === true ? s.title || '' : '') + ' ' + (s.pub === true && s.pubMsg === true ? s.msg || '' : '')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    $('listResults').textContent = t('ux.results', {shown: Math.min(state.limit, items.length), total: items.length});
    $('moreSigners').hidden = items.length <= state.limit;
    $('resetSearch').hidden = !state.q;
    if (!items.length) {
      var e = document.createElement('li'); e.className = 'empty';
      e.textContent = state.list.length ? t('list.nomatch') : t('list.empty');
      ul.appendChild(e); return;
    }
    items.slice(0, state.limit).forEach(function (s) {
      var li = document.createElement('li'), who = document.createElement('div');
      who.className = 'who';
      var n = document.createElement('span');
      n.textContent = (s.pub === true && s.name) ? s.name : t('list.anon');
      who.appendChild(n);
      if (s.pub === true && s.title) badge(who, s.title, 'alt');
      if (s.pub === true && s.pubRole === true && s.role !== 'unaffiliated' && ROLES.indexOf(s.role) >= 0) badge(who, t('role.' + s.role), '');
      var site = ['tc', 'ty', 'other'].indexOf(s.site) >= 0 ? 'tw' : s.site;
      if (s.pub === true && s.pubRole === true && SITES.indexOf(site) > 0) badge(who, t('site.' + site), 'alt');
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
    if (!$('jobTitle').value.trim()) { err.textContent = t('err.title'); $('jobTitle').focus(); return; }
    if (!name) { err.textContent = t('err.name'); $('nm').focus(); return; }
    if (!$('email').checkValidity() || !$('email').value.trim()) { err.textContent = t('err.email'); $('email').focus(); return; }
    if (LIVE && (!CONFIG.turnstileSiteKey || !securityToken)) { err.textContent = t('security.required'); return; }
    if (!$('agree').checked) { err.textContent = t('err.agree'); $('agree').focus(); return; }
    if (LIVE && hasSigned()) { err.textContent = t('err.dup'); return; }
    err.textContent = '';
    var sig = { title: $('jobTitle').value.trim().slice(0,80), email: $('email').value.trim(), pubRole: pub && role !== 'unaffiliated' && $('pubRole').checked, pubMsg: pub && $('pubMsg').checked, token: securityToken, agree: true, name: name.slice(0, 40), role: role, site: $('site').value, msg: $('msg').value.trim().slice(0, 200), pub: pub, t: Date.now(), lang: lang };
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

  $('moreSigners').addEventListener('click', function () { state.limit += 12; renderList(); });
  $('resetSearch').addEventListener('click', function () { state.q = ''; state.limit = 12; $('q').value = ''; renderList(); $('q').focus(); });
  $('q').addEventListener('input', function () { state.q = this.value.trim(); state.limit = 12; renderList(); });
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
    $('pubRole').disabled = !pub || !selected || selected.value === 'unaffiliated'; $('pubMsg').disabled = !pub;
    if (!pub) $('pubMsg').checked = false;
    var lines = [pub ? ($('nm').value.trim() || t('form.name')) : t('list.anon')];
    if (pub && $('jobTitle').value.trim()) lines.push($('jobTitle').value.trim());
    if (pub && selected && selected.value !== 'unaffiliated' && $('pubRole').checked) {
      lines.push(t('role.' + selected.value));
      if ($('site').value) lines.push(t('site.' + $('site').value));
    }
    if (pub && $('pubMsg').checked && $('msg').value.trim()) lines.push($('msg').value.trim());
    $('publicPreview').textContent = lines.join('\n');
    var complete = [!!selected, !!$('nm').value.trim(), !!$('jobTitle').value.trim(), !!$('email').value.trim() && $('email').checkValidity(), $('agree').checked].filter(Boolean).length;
    $('formProgress').value = complete;
    $('formProgressText').textContent = t('ux.progress', {n: complete});
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

  function renderLights() {
    var count = Number.isFinite(Number(state.count)) ? Math.max(0, Math.floor(Number(state.count))) : 0;
    var sky = $('lightSky');
    sky.hidden = count === 0;
    $('lightEmpty').hidden = count > 0;
    $('lightMode').textContent = LIVE ? '' : t(DEMO ? 'demo.list' : 'lights.demo');
    $('lightCount').textContent = t('lights.count', {n: count.toLocaleString(locale())});
    $('lightDensity').textContent = count ? t('ux.oneLight') : '';
    if (!count) return;
    var scale = Math.min(window.devicePixelRatio || 1, 2);
    var width = sky.clientWidth, height = sky.clientHeight;
    sky.width = Math.round(width * scale);
    sky.height = Math.round(height * scale);
    var ctx = sky.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    var points = Math.min(count, 2000);
    $('lightDensity').textContent = count > 2000 ? t('ux.density') : t('ux.oneLight');
    for (var i = 0; i < points; i++) {
      var angle = i * 2.3999632297;
      var radius = Math.sqrt(i / points);
      var x = width * (.5 + .46 * radius * Math.cos(angle));
      var y = height * (.5 + .42 * radius * Math.sin(angle));
      ctx.fillStyle = i % 3 === 0 ? '#e1c8ff' : '#ffe0a2';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = points < 400 ? 8 : 0;
      ctx.beginPath();
      ctx.arc(x, y, points < 100 ? 2.8 : 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  var resizeFrame;
  window.addEventListener('resize', function () { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(renderLights); });
  var photos = Array.prototype.slice.call(document.querySelectorAll('.hero-photo'));
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var photoIndex = 0;
  var photoTimer;

  function syncPhotoRotation() {
    clearInterval(photoTimer);
    if (reducedMotion.matches || document.hidden) return;
    photoTimer = setInterval(function () {
      for (var offset = 1; offset < photos.length; offset++) {
        var next = (photoIndex + offset) % photos.length;
        if (!photos[next].complete || !photos[next].naturalWidth) continue;
        photos[photoIndex].classList.remove('is-active');
        photos[next].classList.add('is-active');
        photoIndex = next;
        break;
      }
    }, 6500);
  }

  document.addEventListener('visibilitychange', syncPhotoRotation);
  reducedMotion.addEventListener('change', syncPhotoRotation);

  function makeDemoSignatures() {
    var titles = ['設備工程師', '製程工程師', '門市人員', '物流人員', '研究生', '自由工作者', '護理師', '技術員'];
    var messages = ['跨產業一起聲援，勞工團結是大家的事。', '支持公開透明，也期待有誠意的協商。', '每位勞工都該有安心發聲的空間。', '謝謝你們讓第一線的聲音被聽見。', 'Standing with workers in Taiwan.', '支持平等對話，讓勞工參與影響自己的決定。'];
    var locations = SITES.slice(1);
    var seed = 2334;
    function pick(values) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return values[Math.floor(seed / 4294967296 * values.length)];
    }
    var now = Date.now();
    return Array.from({ length: 2334 }, function (_, index) {
      var role = pick(ROLES);
      return {
        name: 'Demo ' + String(index + 1).padStart(4, '0'),
        title: pick(titles),
        role: role,
        site: pick(locations),
        msg: pick(messages),
        pub: true,
        pubRole: role !== 'unaffiliated',
        pubMsg: true,
        t: now - index * 60000
      };
    });
  }

  var demoSignatures = DEMO ? makeDemoSignatures() : [];
  $('demoNotice').hidden = !DEMO;

  each('#pageNav a', function (link) {
    link.addEventListener('click', function () { $('pageNav').open = false; });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && $('pageNav').open) {
      $('pageNav').open = false;
      $('pageNav').querySelector('summary').focus();
    }
  });
  document.addEventListener('click', function (event) {
    if (!$('pageNav').contains(event.target)) $('pageNav').open = false;
  });

  /* ── boot ─────────────────────────────────────────────── */
  applyLang(detect(), false);
  refresh();
  if (LIVE) setInterval(function () { if (!document.hidden) refresh(); }, 30000);
})();
