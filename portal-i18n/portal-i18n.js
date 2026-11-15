/* MicronMonkey portal — single-language view with a language switcher, share bar and
 * language detection. Content stays in the HTML; this script swaps visible text at runtime:
 *  - .u-zh / .u-en pairs and "中文 / English" strings show only the chosen side;
 *  - other Chinese text uses the English table or Simplified Chinese conversion in data.js;
 *  - text added later by the page's own scripts (counts, sync status) is translated too. */
(function () {
  'use strict';
  var D = window.PORTAL_I18N || { en: {}, zhHant: {}, zhHans: {}, charmap: {} };
  var CFG = window.PORTAL_I18N_CONFIG || {};
  var LANGS = [{ code: 'zh-Hant', name: '繁體中文' }, { code: 'zh-Hans', name: '简体中文' }, { code: 'en', name: 'English' },
               { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' }, { code: 'hi', name: 'हिन्दी' }];
  var FULL = { ja: 1, ko: 1, hi: 1 }; // translated from the Chinese text
  var KEY = 'mm.portal.lang';
  var CJK = /[一-鿿]/;
  var SPLIT = /^(.*[一-鿿].*?)\s+\/\s+([^一-鿿]+)$/;
  var ATTRS = ['title', 'aria-label', 'alt', 'placeholder'];
  var lang = 'zh-Hant';
  var origText = new WeakMap(), origAttr = new WeakMap(), applied = new WeakMap();

  function supported(c) { return LANGS.some(function (l) { return l.code === c; }) ? c : null; }
  function detect() {
    var q = new URLSearchParams(location.search).get('lang');
    if (supported(q)) return q;
    try { var s = localStorage.getItem(KEY); if (supported(s)) return s; } catch (e) {}
    var navs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < navs.length; i++) {
      var n = String(navs[i] || '').toLowerCase();
      if (/^zh-(cn|sg|my|hans)/.test(n)) return 'zh-Hans';
      if (n.indexOf('zh') === 0) return 'zh-Hant';
      if (n.indexOf('ja') === 0) return 'ja';
      if (n.indexOf('ko') === 0) return 'ko';
      if (n.indexOf('hi') === 0) return 'hi';
      if (n) return 'en';
    }
    return 'zh-Hant';
  }
  function ui(k) { return FULL[lang] ? D[lang][k] : lang === 'en' ? D.en[k] : lang === 'zh-Hans' ? (D.zhHans[k] || hans(D.zhHant[k] || '')) : D.zhHant[k]; }
  function hans(t) { var out = ''; for (var i = 0; i < t.length; i++) out += D.charmap[t[i]] || t[i]; return out; }

  // Translate one string (whitespace preserved around it).
  function tr(raw) {
    var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    var t = raw.trim().replace(/\s+/g, ' ');
    if (!t || !CJK.test(t)) return raw;
    var m = t.match(SPLIT), out = t;
    if (m) {
      if (lang === 'en') {
        var pre = m[1].match(/^[^一-鿿A-Za-z0-9]*/)[0];
        out = (pre && m[2].indexOf(pre.trim()) !== 0 ? pre : '') + m[2];
      } else out = m[1];
    }
    if ((lang === 'en' || FULL[lang]) && CJK.test(out)) {
      var table = D[lang];
      if (table[out] != null) out = table[out];
      else out = pieces(rule(out), table);
    } else if (lang === 'zh-Hans') {
      out = D.zhHans[out] || hans(out);
    }
    return lead + out + trail;
  }
  // Text with live numbers: whole-string patterns first …
  var RULES = [
    [/^([\d,]+|—)\s*天$/, { en: '$1 days', ja: '$1日', ko: '$1일', hi: '$1 दिन' }],
    [/^約\s*([\d,]+\+?)$/, { en: 'About $1', ja: '約 $1', ko: '약 $1', hi: 'लगभग $1' }],
    [/^目標\s*([\d,]+)\s*人$/, { en: 'Goal: $1', ja: '目標 $1人', ko: '목표 $1명', hi: 'लक्ष्य $1' }],
    [/^目前\s*([\d,]+)\s*人報名$/, { en: '$1 signed up', ja: '現在 $1人が登録', ko: '현재 $1명 신청', hi: 'अब तक $1 पंजीकरण' }],
    [/^([\d,]+)\s*份$/, { en: '$1', ja: '$1件', ko: '$1건', hi: '$1' }]
  ];
  function rule(t) {
    for (var i = 0; i < RULES.length; i++) { var m = t.match(RULES[i][0]); if (m) return RULES[i][1][lang].replace('$1', m[1]); }
    return t;
  }
  // … then known phrases inside a longer string (e.g. "最近同步（台灣時間）：11/15 19:30 · 每 2 分鐘自動更新").
  var phraseCache = {};
  function pieces(t, table) {
    if (!CJK.test(t)) return t;
    var keys = phraseCache[lang] || (phraseCache[lang] = Object.keys(table).filter(function (k) { return k.length > 1 && CJK.test(k) && k.indexOf('ui.') && k.indexOf('meta.'); }).sort(function (a, b) { return b.length - a.length; }));
    for (var i = 0; i < keys.length && CJK.test(t); i++) if (t.indexOf(keys[i]) >= 0) t = t.split(keys[i]).join(table[keys[i]]);
    t = t.replace(/([\d,]+)\s*份/g, function (_, n) { return rule(n + '份'); });
    return t;
  }
  function skip(el) {
    if (!el || el.closest('script,style,noscript,#mmTopbar .mm-lang-menu')) return true;
    if (el.closest('.u-en,.float-label-en,body [lang="en"]')) return true; // not <html lang>, which follows the chosen language
    if (lang === 'en' && el.closest('.u-zh,.float-label-zh')) return true; // hidden in English (its .u-en twin shows)
    return false;
  }
  function doText(n) {
    if (!origText.has(n) || applied.get(n) !== n.nodeValue) origText.set(n, n.nodeValue);
    var src = origText.get(n);
    if (!CJK.test(src) || skip(n.parentElement)) { if (n.nodeValue !== src) { n.nodeValue = src; } applied.set(n, src); return; }
    var v = tr(src);
    applied.set(n, v);
    if (n.nodeValue !== v) n.nodeValue = v;
  }
  function doAttrs(el) {
    var store = origAttr.get(el) || {};
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var cur = el.getAttribute(a);
      if (!(a in store) || store['_' + a] !== cur) store[a] = cur;
      var v = CJK.test(store[a]) ? tr(store[a]) : store[a];
      store['_' + a] = v;
      if (cur !== v) el.setAttribute(a, v);
    });
    origAttr.set(el, store);
  }
  function walk(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) doText(n);
    if (root.nodeType === 1) {
      if (root.matches('[title],[aria-label],[alt],[placeholder]')) doAttrs(root);
      root.querySelectorAll('[title],[aria-label],[alt],[placeholder]').forEach(doAttrs);
    }
  }

  var observer = new MutationObserver(function (list) {
    observer.disconnect();
    list.forEach(function (m) {
      if (m.type === 'characterData') { if (applied.get(m.target) !== m.target.nodeValue) doText(m.target); }
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(function (n) { if (n.nodeType === 3) doText(n); else if (n.nodeType === 1) walk(n); });
    });
    observe();
  });
  function observe() { observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }

  function apply(code, persist) {
    lang = supported(code) || 'zh-Hant';
    var root = document.documentElement;
    root.lang = lang; root.setAttribute('data-portal-lang', lang);
    observer.disconnect();
    walk(document.body);
    if (!origText.has(document)) origText.set(document, document.title);
    document.title = tr(origText.get(document));
    var desc = document.querySelector('meta[name="description"]');
    if (desc) { if (!desc.dataset.zh) desc.dataset.zh = desc.content; desc.content = lang === 'zh-Hant' ? desc.dataset.zh : ui('meta.desc'); }
    paintBar();
    observe();
    if (persist) {
      try { localStorage.setItem(KEY, lang); } catch (e) {}
      var u = new URL(location.href);
      if (lang === 'zh-Hant') u.searchParams.delete('lang'); else u.searchParams.set('lang', lang);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  }

  /* ── top bar: title, language menu, share buttons ── */
  function shareURL() { return (CFG.share && CFG.share[lang]) || location.href.split('#')[0]; }
  function icon(path, fill) { return '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"' + (fill ? ' fill="currentColor"' : ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + '><path d="' + path + '"/></svg>'; }
  function buildBar() {
    var bar = document.createElement('div');
    bar.id = 'mmTopbar';
    bar.innerHTML =
      '<div class="mm-row"><a class="mm-brand" href="#top" aria-label="top"><span class="mm-logo" aria-hidden="true">🐵</span><span class="mm-title"></span></a>' +
      '<div class="mm-lang"><button type="button" class="mm-lang-btn" aria-haspopup="true" aria-expanded="false">' +
      icon('M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM2.5 12h19M12 2.5c2.8 3 2.8 16 0 19M12 2.5c-2.8 3-2.8 16 0 19') +
      '<span class="mm-lang-name"></span><svg width="11" height="7" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none"/></svg></button>' +
      '<ul class="mm-lang-menu" role="menu"></ul></div></div>' +
      '<div class="mm-share" role="group">' +
      '<a data-net="fb" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><b>f</b></a>' +
      '<a data-net="line" target="_blank" rel="noopener noreferrer" aria-label="LINE"><b>LINE</b></a>' +
      '<a data-net="x" target="_blank" rel="noopener noreferrer" aria-label="X"><b>𝕏</b></a>' +
      '<button type="button" data-net="ig" aria-label="Instagram"><b>IG</b></button>' +
      '<a data-net="wa" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="mm-wa">' + icon('M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z', true) + '</a>' +
      '<button type="button" data-net="copy" class="mm-copy">' + icon('M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1') + '<span class="mm-copy-label"></span></button>' +
      '</div><div class="mm-toast" role="status" aria-live="polite"></div>';
    document.body.insertBefore(bar, document.body.firstChild);
    var menu = bar.querySelector('.mm-lang-menu'), btn = bar.querySelector('.mm-lang-btn');
    LANGS.forEach(function (l) {
      var li = document.createElement('li'); li.setAttribute('role', 'none');
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.dataset.lang = l.code; b.lang = l.code; b.textContent = l.name;
      b.addEventListener('click', function () { close(); apply(l.code, true); btn.focus(); });
      li.appendChild(b); menu.appendChild(li);
    });
    function open() { menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); (menu.querySelector('[aria-checked="true"]') || menu.querySelector('button')).focus(); }
    function close() { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () { menu.classList.contains('open') ? close() : open(); });
    document.addEventListener('click', function (e) { if (!bar.querySelector('.mm-lang').contains(e.target)) close(); });
    menu.addEventListener('keydown', function (e) {
      var items = [].slice.call(menu.querySelectorAll('button')), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Escape') { close(); btn.focus(); }
    });
    var toastT;
    function toast(msg) { var t = bar.querySelector('.mm-toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200); }
    function copy() {
      var u = shareURL();
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(u).then(function () { toast(ui('ui.copied')); }, function () { prompt('', u); });
      else prompt('', u);
    }
    bar.querySelector('[data-net="copy"]').addEventListener('click', function () {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { navigator.share({ title: document.title, url: shareURL() }).catch(function () {}); return; }
      copy();
    });
    bar.querySelector('[data-net="ig"]').addEventListener('click', function () { copy(); });
    // keep the floating nav clear of the bar
    function syncHeight() {
      // span the full width by cancelling the body padding (it differs between phone and desktop)
      var cs = getComputedStyle(document.body);
      bar.style.marginLeft = '-' + cs.paddingLeft; bar.style.marginRight = '-' + cs.paddingRight; bar.style.marginTop = '-' + cs.paddingTop;
      document.documentElement.style.setProperty('--mm-top', bar.offsetHeight + 'px');
    }
    addEventListener('resize', syncHeight); syncHeight();
    return bar;
  }
  var bar;
  function paintBar() {
    if (!bar) return;
    bar.querySelector('.mm-title').textContent = ui('ui.title');
    bar.querySelector('.mm-lang-name').textContent = LANGS.filter(function (l) { return l.code === lang; })[0].name;
    bar.querySelector('.mm-lang-btn').setAttribute('aria-label', ui('ui.lang'));
    bar.querySelector('.mm-share').setAttribute('aria-label', ui('ui.share'));
    bar.querySelector('.mm-copy-label').textContent = ui('ui.share');
    bar.querySelectorAll('.mm-lang-menu button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.lang === lang)); });
    var u = encodeURIComponent(shareURL()), txt = encodeURIComponent(ui('ui.title'));
    var href = { fb: 'https://www.facebook.com/sharer/sharer.php?u=' + u, line: 'https://social-plugins.line.me/lineit/share?url=' + u,
                 x: 'https://twitter.com/intent/tweet?url=' + u + '&text=' + txt, wa: 'https://wa.me/?text=' + txt + '%20' + u };
    Object.keys(href).forEach(function (k) { bar.querySelector('[data-net="' + k + '"]').href = href[k]; });
  }

  function boot() { bar = buildBar(); apply(detect(), false); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
