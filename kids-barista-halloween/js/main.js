/* =========================================================
   Kids バリスタ体験 〜ハロウィン ver.〜
   ※ 文言・クイズは js/content.js で書き換えます
   ========================================================= */
(function () {
  'use strict';

  var C = window.CONTENT || { TEXT: {}, QUIZ: [], STEPS_FRAPPUCCINO: [] };
  var T = C.TEXT || {};
  var STORE_KEY = 'kids-barista-halloween';
  var SCREENS = ['start', 'flow', 'frap', 'deco', 'tumbler', 'draw', 'record'];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     共通
     ========================================================= */
  var store = {
    get: function () {
      try { return JSON.parse(window.localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
    },
    set: function (v) {
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    clear: function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
    }
  };

  function freshState() {
    return { name: '', screen: 'start', stamps: [false, false, false, false], visitedRecord: false,
             frapStep: 0, deco: [], decoImg: '', drawImg: '', quiz: { i: 0, score: 0, done: false } };
  }
  var state = Object.assign(freshState(), store.get() || {});
  function save() {
    if (!store.set(state)) {
      // 画像が大きくて入らないときは、画像だけあきらめて保存しなおす
      var lite = Object.assign({}, state, { decoImg: '', drawImg: '' });
      store.set(lite);
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // {漢字|かんじ} → <ruby>
  function ruby(text) {
    return esc(text || '')
      .replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>')
      .replace(/&lt;br&gt;/g, '<br>');
  }
  // canvas 用（ふりがなを外す）
  function plain(text) { return String(text || '').replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1'); }
  function displayName() { return state.name ? state.name + (C.HONORIFIC || '') : (C.NO_NAME || 'キッズバリスタさん'); }
  function withName(text) { return String(text || '').split('{name}').join(displayName()); }
  function withNameHtml(text) { return ruby(text).split('{name}').join(esc(displayName())); }

  function vibrate(p) {
    if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* noop */ } }
  }

  function download(dataUrl, filename) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); }, 0);
  }

  // SVGのsymbolを、canvasで描ける1枚のSVGにする
  function symbolSvg(id) {
    var sym = document.getElementById(id);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + sym.getAttribute('viewBox') + '">' + sym.innerHTML + '</svg>';
  }
  function loadSvg(id) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(symbolSvg(id));
    });
  }
  function loadImg(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }
  // Webフォントを待つ（通信が無いときは待ちすぎない）
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var p = Promise.all([
      document.fonts.load('40px "Mochiy Pop One"'),
      document.fonts.load('700 30px "M PLUS Rounded 1c"')
    ]).catch(function () {});
    return Promise.race([p, new Promise(function (r) { setTimeout(r, 1500); })]);
  }
  var POP = '"Mochiy Pop One", "M PLUS Rounded 1c", sans-serif';
  var ROUND = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrapText(ctx, text, x, y, maxW, lineH) {
    var line = '';
    var lines = [];
    Array.from(text).forEach(function (ch) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
      else line += ch;
    });
    if (line) lines.push(line);
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lineH); });
    return lines.length;
  }

  /* ---------- 追加のSVG素材（ホイップ・チョコチップ・カップ） ---------- */
  function addSymbols() {
    var sprite = document.querySelector('svg[style*="display:none"]');
    var extra =
      '<symbol id="s-whip" viewBox="0 0 100 100">' +
        '<path d="M14 70q-6-16 10-22-2-16 16-18 6-14 20-8 16-4 20 12 16 4 10 22 10 14-6 20H22q-14-2-8-6z" fill="#fff" stroke="#EADFD0" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M30 52q10 6 20 0M48 38q8 6 18 0" fill="none" stroke="#EADFD0" stroke-width="3" stroke-linecap="round"/>' +
      '</symbol>' +
      '<symbol id="s-chips" viewBox="0 0 100 100">' +
        '<g fill="#3A1F10"><path d="M30 30q8-14 16 0 2 8-8 9-10-1-8-9z"/><path d="M58 40q8-14 16 0 2 8-8 9-10-1-8-9z"/><path d="M36 62q8-14 16 0 2 8-8 9-10-1-8-9z"/><path d="M64 70q7-12 14 0 2 7-7 8-9-1-7-8z"/><path d="M20 52q6-10 12 0 1 6-6 7-7-1-6-7z"/></g>' +
        '<g fill="#fff" opacity=".35"><circle cx="36" cy="30" r="2"/><circle cx="64" cy="40" r="2"/><circle cx="42" cy="62" r="2"/></g>' +
      '</symbol>' +
      '<symbol id="s-cup" viewBox="0 0 300 400">' +
        '<defs><linearGradient id="g-mocha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A4A2C"/><stop offset="1" stop-color="#4A2A17"/></linearGradient></defs>' +
        '<path d="M168 20 l-16 120" stroke="#6B3FA0" stroke-width="14" stroke-linecap="round"/>' +
        '<path d="M168 20 l-16 120" stroke="#F08A24" stroke-width="14" stroke-linecap="round" stroke-dasharray="14 14"/>' +
        '<path d="M58 130 Q60 70 150 70 Q240 70 242 130 Z" fill="#fff" fill-opacity=".55" stroke="#fff" stroke-width="4"/>' +
        '<path d="M54 130 H246 L224 372 Q222 386 208 386 H92 Q78 386 76 372 Z" fill="url(#g-mocha)"/>' +
        '<g fill="#2C170B"><circle cx="100" cy="170" r="5"/><circle cx="170" cy="190" r="5"/><circle cx="130" cy="240" r="5"/><circle cx="200" cy="260" r="4"/><circle cx="110" cy="300" r="5"/><circle cx="180" cy="330" r="4"/><circle cx="150" cy="290" r="3"/></g>' +
        '<path d="M54 130 H246 L224 372 Q222 386 208 386 H92 Q78 386 76 372 Z" fill="none" stroke="#fff" stroke-width="5" stroke-opacity=".8"/>' +
        '<path d="M48 124 H252 V138 H48 Z" fill="#fff" fill-opacity=".85"/>' +
        '<path d="M76 150 L92 360" stroke="#fff" stroke-opacity=".35" stroke-width="10" stroke-linecap="round"/>' +
      '</symbol>';
    sprite.insertAdjacentHTML('beforeend', extra);
  }

  /* =========================================================
     画面の文言・プレースホルダー
     ========================================================= */
  function fillTexts() {
    document.querySelectorAll('[data-t]').forEach(function (el) {
      var v = T[el.getAttribute('data-t')];
      if (typeof v === 'string') el.innerHTML = withNameHtml(v);
    });
    var input = document.querySelector('[data-name-input]');
    input.placeholder = T.name_placeholder || '';
  }

  function setupPlaceholders() {
    document.querySelectorAll('.ph img').forEach(function (img) {
      var box = img.closest('.ph');
      var src = img.getAttribute('src');
      box.setAttribute('data-file', src);
      var probe = new Image();
      probe.onerror = function () { box.classList.add('is-missing'); };
      probe.src = src;
    });
  }

  /* =========================================================
     紙ふぶき（canvas）
     ========================================================= */
  var confetti = (function () {
    var cv = document.querySelector('[data-confetti]');
    var ctx = cv.getContext('2d');
    var parts = [];
    var raf = null;
    var colors = ['#F08A24', '#6B3FA0', '#F5C542', '#1E5B3A', '#FF8FA3', '#ffffff'];
    function resize() {
      var d = window.devicePixelRatio || 1;
      cv.width = window.innerWidth * d;
      cv.height = window.innerHeight * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    function loop() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      parts.forEach(function (p) {
        p.vy += 0.12; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
        ctx.fillStyle = p.c;
        if (p.star) {
          ctx.beginPath();
          for (var i = 0; i < 10; i++) {
            var rr = i % 2 ? p.s * .45 : p.s;
            var a = i * Math.PI / 5;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath(); ctx.fill();
        } else {
          ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        }
        ctx.restore();
      });
      parts = parts.filter(function (p) { return p.life > 0 && p.y < window.innerHeight + 40; });
      if (parts.length) raf = window.requestAnimationFrame(loop);
      else { raf = null; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    }
    return function burst(n) {
      vibrate([40, 30, 60]);
      if (reduceMotion) return;
      resize();
      var w = window.innerWidth;
      for (var i = 0; i < (n || 120); i++) {
        parts.push({
          x: w / 2 + (Math.random() - .5) * w * .3, y: window.innerHeight * .35,
          vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 4,
          r: Math.random() * 6, vr: (Math.random() - .5) * .3,
          s: 8 + Math.random() * 8, c: colors[i % colors.length],
          star: Math.random() < .2, life: 110 + Math.random() * 60
        });
      }
      if (!raf) raf = window.requestAnimationFrame(loop);
    };
  })();

  /* =========================================================
     ポップアップ
     ========================================================= */
  var lastFocus = null;
  function openModal(name) {
    var m = document.querySelector('[data-modal="' + name + '"]');
    if (!m) return;
    lastFocus = document.activeElement;
    m.hidden = false;
    document.body.classList.add('is-modal');
    var f = m.querySelector('button');
    if (f) f.focus();
    if (name === 'quiz') renderQuiz();
    if (name === 'memory' && !memory.started) memory.start();
  }
  function closeModal(m) {
    m.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('is-modal');
    if (lastFocus) lastFocus.focus();
  }
  function setupModals() {
    document.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { openModal(b.getAttribute('data-open')); });
    });
    document.querySelectorAll('.modal').forEach(function (m) {
      m.addEventListener('click', function (e) {
        if (e.target === m || e.target.closest('[data-close]')) closeModal(m);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.querySelectorAll('.modal:not([hidden])');
      if (open.length) closeModal(open[open.length - 1]);
    });
  }

  /* =========================================================
     画面の切りかえ・すすみぐあい・スタンプ
     ========================================================= */
  function show(name) {
    if (SCREENS.indexOf(name) < 0) name = 'start';
    state.screen = name;
    if (name === 'record') state.visitedRecord = true;
    save();
    document.querySelectorAll('[data-screen]').forEach(function (s) { s.hidden = s.getAttribute('data-screen') !== name; });
    var pct = Math.round(SCREENS.indexOf(name) / (SCREENS.length - 1) * 100);
    var bar = document.querySelector('[data-progress]');
    bar.setAttribute('aria-valuenow', pct);
    document.querySelector('[data-progress-fill]').style.width = pct + '%';
    window.scrollTo(0, 0);
    renderFlow();
    if (name === 'deco') renderDeco();
    if (name === 'draw') draw.resize();
    if (name === 'record') renderRecord();
  }

  function renderStamps(popIndex) {
    document.querySelectorAll('[data-stamps] .stamp').forEach(function (el, i) {
      el.classList.toggle('is-on', !!state.stamps[i]);
      el.classList.toggle('is-pop', i === popIndex);
      el.setAttribute('aria-label', (i + 1) + 'こめ：' + (state.stamps[i] ? 'ゲット' : 'まだ'));
    });
    document.querySelectorAll('[data-stamp]').forEach(function (b) {
      b.classList.toggle('is-done', !!state.stamps[Number(b.getAttribute('data-stamp'))]);
    });
  }
  function renderFlow() {
    document.querySelectorAll('[data-flow]').forEach(function (card) {
      var i = Number(card.getAttribute('data-flow'));
      var done = i < 3 ? state.stamps[i] : state.visitedRecord;
      card.classList.toggle('is-done', !!done);
    });
  }
  function award(i) {
    if (state.stamps[i]) return;
    state.stamps[i] = true;
    save();
    renderStamps(i);
    renderFlow();
    var msgs = T.stamp_msg || [];
    document.querySelector('[data-stamp-msg]').innerHTML = ruby(msgs[i] || '');
    openModal('stamp');
    confetti(140);
  }

  function setupNav() {
    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (state.screen === 'start') {
          state.name = document.querySelector('[data-name-input]').value.trim().slice(0, 12);
          fillTexts();
        }
        show(b.getAttribute('data-go'));
      });
    });
    document.querySelectorAll('[data-stamp]').forEach(function (b) {
      b.addEventListener('click', function () { award(Number(b.getAttribute('data-stamp'))); });
    });
    var input = document.querySelector('[data-name-input]');
    input.value = state.name;
    input.addEventListener('input', function () { state.name = input.value.trim().slice(0, 12); save(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
  }

  /* =========================================================
     ① フラペチーノの作り方
     ========================================================= */
  function renderFrapSteps() {
    var box = document.querySelector('[data-frap-steps]');
    var steps = C.STEPS_FRAPPUCCINO || [];
    if (!steps.length) {
      box.innerHTML = '<p class="steps__empty"><svg aria-hidden="true"><use href="#s-ghost"/></svg><span>' + ruby(T.frap_empty) + '</span></p>';
      return;
    }
    var i = Math.min(state.frapStep, steps.length - 1);
    box.innerHTML =
      '<p class="steps__no">ステップ ' + (i + 1) + ' / ' + steps.length + '</p>' +
      '<p class="steps__text">' + ruby(steps[i]) + '</p>' +
      '<div class="steps__nav">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-fs="-1"' + (i === 0 ? ' disabled' : '') + '>まえへ</button>' +
        '<button type="button" class="btn btn--orange btn--sm" data-fs="1"' + (i === steps.length - 1 ? ' disabled' : '') + '>つぎへ</button>' +
      '</div>';
    box.querySelectorAll('[data-fs]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.frapStep = Math.max(0, Math.min(steps.length - 1, i + Number(b.getAttribute('data-fs'))));
        save();
        renderFrapSteps();
      });
    });
  }

  /* =========================================================
     ミニゲーム① デコレーション
     ========================================================= */
  var STICKERS = [
    { id: 'whip', sym: 's-whip', label: 'ホイップ' },
    { id: 'chips', sym: 's-chips', label: 'チョコチップ' },
    { id: 'ghost', sym: 's-ghost', label: 'にっこりおばけ' },
    { id: 'bat', sym: 's-bat', label: 'こうもり' },
    { id: 'pumpkin', sym: 's-pumpkin', label: 'かぼちゃ' },
    { id: 'star', sym: 's-star', label: 'ほし' }
  ];
  function stickerSym(id) {
    for (var i = 0; i < STICKERS.length; i++) if (STICKERS[i].id === id) return STICKERS[i].sym;
    return 's-star';
  }
  var decoStage, decoLayer;
  function setupDeco() {
    decoStage = document.querySelector('[data-deco-stage]');
    decoLayer = document.querySelector('[data-deco-stickers]');
    document.querySelector('[data-deco-cup]').innerHTML = '<svg aria-hidden="true"><use href="#s-cup"/></svg>';
    var pal = document.querySelector('[data-palette]');
    STICKERS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<svg aria-hidden="true"><use href="#' + s.sym + '"/></svg>' + s.label;
      b.addEventListener('click', function () {
        state.deco.push({ t: s.id, x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.45, k: Date.now() + Math.random() });
        save();
        renderDeco(true);
        resetDecoDone();
      });
      pal.appendChild(b);
    });
    document.querySelector('[data-deco-clear]').addEventListener('click', function () {
      state.deco = [];
      save();
      renderDeco();
      resetDecoDone();
    });
    document.querySelector('[data-deco-finish]').addEventListener('click', finishDeco);
    document.querySelector('[data-deco-save]').addEventListener('click', function () {
      makeDecoPng().then(function (url) { download(url, 'halloween-frappuccino.png'); });
    });
  }
  function resetDecoDone() {
    document.querySelector('[data-deco-done]').hidden = true;
    document.querySelector('[data-deco-save]').hidden = true;
  }
  function renderDeco(animateLast) {
    decoLayer.innerHTML = '';
    state.deco.forEach(function (d, idx) {
      var el = document.createElement('div');
      el.className = 'sticker' + (animateLast && idx === state.deco.length - 1 ? ' is-new' : '');
      el.style.left = (d.x * 100) + '%';
      el.style.top = (d.y * 100) + '%';
      el.innerHTML = '<svg aria-hidden="true"><use href="#' + stickerSym(d.t) + '"/></svg>';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'シール');
      bindSticker(el, d);
      decoLayer.appendChild(el);
    });
  }
  var lastTap = { k: null, t: 0 };
  var zTop = 10;
  function bindSticker(el, d) {
    var start = null;
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY, moved: false };
      el.classList.add('is-drag');
      // いちばん上に（DOMを並べかえるとポインターのキャプチャが外れるので z-index で）
      el.style.zIndex = ++zTop;
    });
    el.addEventListener('pointermove', function (e) {
      if (!start) return;
      if (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 6) start.moved = true;
      if (!start.moved) return;
      var r = decoStage.getBoundingClientRect();
      d.x = Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width));
      d.y = Math.max(0.05, Math.min(0.95, (e.clientY - r.top) / r.height));
      el.style.left = (d.x * 100) + '%';
      el.style.top = (d.y * 100) + '%';
    });
    function end() {
      if (!start) return;
      el.classList.remove('is-drag');
      var moved = start.moved;
      start = null;
      // いちばん上に表示したシールを、保存のじゅんばんでも いちばん上に
      var idx = state.deco.indexOf(d);
      if (idx > -1) { state.deco.splice(idx, 1); state.deco.push(d); }
      if (!moved) {
        var now = Date.now();
        if (lastTap.k === d.k && now - lastTap.t < 400) {
          // 2かいタップで けす
          state.deco.splice(state.deco.indexOf(d), 1);
          el.classList.add('is-bye');
          setTimeout(function () { renderDeco(); }, reduceMotion ? 0 : 240);
          lastTap = { k: null, t: 0 };
          vibrate(20);
        } else {
          lastTap = { k: d.k, t: now };
        }
      }
      save();
      resetDecoDone();
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  function finishDeco() {
    makeDecoPng().then(function (url) {
      state.decoImg = url;
      save();
    });
    var done = document.querySelector('[data-deco-done]');
    done.innerHTML = withNameHtml(T.deco_done);
    done.hidden = false;
    document.querySelector('[data-deco-save]').hidden = false;
    confetti(160);
  }
  function makeDecoPng() {
    var W = 720, H = 1040, stageH = 960;
    return fontsReady().then(function () {
      var ids = ['s-cup'].concat(state.deco.map(function (d) { return stickerSym(d.t); }));
      return Promise.all(ids.map(loadSvg));
    }).then(function (imgs) {
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      var g = ctx.createRadialGradient(W / 2, stageH * .4, 0, W / 2, stageH * .4, W);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#FFF6E8'); g.addColorStop(1, '#F7E4C8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (imgs[0]) ctx.drawImage(imgs[0], 0, 0, W, stageH);
      state.deco.forEach(function (d, i) {
        var img = imgs[i + 1];
        var s = W * 0.22;
        if (img) ctx.drawImage(img, d.x * W - s / 2, d.y * stageH - s / 2, s, s);
      });
      ctx.fillStyle = '#F08A24';
      ctx.fillRect(0, stageH, W, H - stageH);
      ctx.fillStyle = '#fff';
      ctx.font = '40px ' + POP;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(plain(withName(T.deco_done)), W / 2, stageH + (H - stageH) / 2, W - 40);
      return cv.toDataURL('image/png');
    });
  }

  /* =========================================================
     ミニゲーム② タンブラー したがきボード
     ========================================================= */
  var PENS = [
    { c: '#F08A24', n: 'オレンジ' },
    { c: '#6B3FA0', n: 'むらさき' },
    { c: '#2B2B2B', n: 'くろ' },
    { c: '#1E5B3A', n: 'みどり' },
    { c: '#F5C542', n: 'きいろ' }
  ];
  var SIZES = [0.016, 0.042];
  // タンブラーの形（キャンバスの幅・高さに対する割合）
  var TUMBLER = { x: 0.2, y: 0.14, w: 0.6, h: 0.8, r: 0.1, lidY: 0.05, lidH: 0.09 };

  var draw = (function () {
    var cv, ctx, W = 0, H = 0;
    var strokes = [];
    var cur = null;
    var pen = 0, size = 0;

    function bodyPath(c, w, h) {
      roundRect(c, TUMBLER.x * w, TUMBLER.y * h, TUMBLER.w * w, TUMBLER.h * h, TUMBLER.r * w);
    }
    function paint(c, w, h, list) {
      c.fillStyle = '#EFE6F8';
      c.fillRect(0, 0, w, h);
      // ふた
      roundRect(c, (TUMBLER.x + 0.02) * w, TUMBLER.lidY * h, (TUMBLER.w - 0.04) * w, TUMBLER.lidH * h + 0.02 * h, 0.03 * w);
      c.fillStyle = '#6B3FA0';
      c.fill();
      // 本体
      bodyPath(c, w, h);
      c.fillStyle = '#ffffff';
      c.fill();
      c.save();
      bodyPath(c, w, h);
      c.clip();
      list.forEach(function (s) { strokeLine(c, s, w, h); });
      c.restore();
      bodyPath(c, w, h);
      c.lineWidth = 0.012 * w;
      c.strokeStyle = '#C9B6E0';
      c.stroke();
    }
    function strokeLine(c, s, w, h) {
      c.strokeStyle = s.c;
      c.fillStyle = s.c;
      c.lineWidth = s.w * w;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (s.p.length === 1) {
        c.beginPath();
        c.arc(s.p[0][0] * w, s.p[0][1] * h, s.w * w / 2, 0, Math.PI * 2);
        c.fill();
        return;
      }
      c.beginPath();
      c.moveTo(s.p[0][0] * w, s.p[0][1] * h);
      for (var i = 1; i < s.p.length; i++) c.lineTo(s.p[i][0] * w, s.p[i][1] * h);
      c.stroke();
    }
    function redraw() { if (W) paint(ctx, W, H, strokes); }
    function resize() {
      var r = cv.getBoundingClientRect();
      if (!r.width) return;
      var d = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      redraw();
    }
    function pos(e) {
      var r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    }
    function setup() {
      cv = document.querySelector('[data-draw-canvas]');
      ctx = cv.getContext('2d');
      cv.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        cur = { c: PENS[pen].c, w: SIZES[size], p: [pos(e)] };
        strokes.push(cur);
        redraw();
      });
      cv.addEventListener('pointermove', function (e) {
        if (!cur) return;
        e.preventDefault();
        cur.p.push(pos(e));
        redraw();
      });
      function end() { cur = null; }
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      // iOS で描いている間にページが動かないように
      cv.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

      var pens = document.querySelector('[data-pens]');
      PENS.forEach(function (p, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pen';
        b.style.setProperty('--c', p.c);
        b.setAttribute('aria-label', p.n);
        b.setAttribute('aria-pressed', i === pen ? 'true' : 'false');
        b.addEventListener('click', function () {
          pen = i;
          pens.querySelectorAll('.pen').forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        });
        pens.appendChild(b);
      });
      document.querySelectorAll('[data-size]').forEach(function (b) {
        b.addEventListener('click', function () {
          size = Number(b.getAttribute('data-size'));
          document.querySelectorAll('[data-size]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        });
      });
      document.querySelector('[data-draw-undo]').addEventListener('click', function () { strokes.pop(); redraw(); });
      document.querySelector('[data-draw-clear]').addEventListener('click', function () { strokes = []; redraw(); });
      document.querySelector('[data-draw-save]').addEventListener('click', function () {
        var url = toPng();
        state.drawImg = url;
        save();
        download(url, 'halloween-tumbler.png');
        confetti(100);
      });
      window.addEventListener('resize', function () { if (state.screen === 'draw') resize(); });
    }
    function toPng() {
      var w = 720, h = 960;
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      paint(c.getContext('2d'), w, h, strokes);
      return c.toDataURL('image/png');
    }
    return { setup: setup, resize: resize };
  })();

  /* =========================================================
     きょうのきろく（カードを canvas で描いて画像にする）
     ========================================================= */
  function renderRecord() {
    var img = document.querySelector('[data-record-img]');
    makeRecordPng().then(function (url) { img.src = url; });
  }
  function makeRecordPng() {
    var W = 720;
    var hasArt = !!(state.decoImg || state.drawImg);
    var H = hasArt ? 1180 : 900;
    return fontsReady().then(function () {
      return Promise.all([loadSvg('s-pumpkin'), loadSvg('s-ghost'), loadSvg('s-bat'), loadSvg('s-star'), loadImg(state.decoImg), loadImg(state.drawImg)]);
    }).then(function (im) {
      var pumpkin = im[0], ghost = im[1], bat = im[2], star = im[3], deco = im[4], drawn = im[5];
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      // 背景
      ctx.fillStyle = '#FBF3E6';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(240,138,36,.14)';
      for (var y = 20; y < H; y += 44) for (var x = (y / 44 % 2) * 22 + 10; x < W; x += 44) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
      // ふち
      roundRect(ctx, 16, 16, W - 32, H - 32, 36);
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#F08A24';
      ctx.stroke();
      // ガーランド
      var cols = ['#F08A24', '#6B3FA0', '#F5C542'];
      for (var i = 0; i < 9; i++) {
        var gx = 60 + i * 75;
        ctx.fillStyle = cols[i % 3];
        ctx.beginPath(); ctx.moveTo(gx, 34); ctx.lineTo(gx + 44, 34); ctx.lineTo(gx + 22, 84); ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      // タイトル
      ctx.fillStyle = '#6B3FA0';
      ctx.font = '30px ' + POP;
      ctx.fillText('Kids バリスタ体験 〜ハロウィン ver.〜', W / 2, 140, W - 80);
      ctx.fillStyle = '#F08A24';
      ctx.font = '56px ' + POP;
      ctx.fillText(plain(T.record_title), W / 2, 214);
      // なまえ入りメッセージ
      ctx.fillStyle = '#1E5B3A';
      ctx.font = '36px ' + POP;
      var n = wrapText(ctx, plain(withName(T.record_msg)), W / 2, 290, W - 120, 52);
      var yy = 290 + n * 52 + 10;
      // スタンプ
      var got = state.stamps.filter(Boolean).length;
      ctx.fillStyle = '#6E5B4C';
      ctx.font = '700 28px ' + ROUND;
      ctx.fillText('かぼちゃスタンプ  ' + got + ' / 4', W / 2, yy + 20);
      for (var s = 0; s < 4; s++) {
        var cx = W / 2 + (s - 1.5) * 140, cy = yy + 110;
        ctx.beginPath(); ctx.arc(cx, cy, 58, 0, 7);
        ctx.fillStyle = state.stamps[s] ? '#FFF1E0' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = state.stamps[s] ? '#F08A24' : '#EAD9C2';
        ctx.stroke();
        if (pumpkin) {
          ctx.globalAlpha = state.stamps[s] ? 1 : 0.15;
          ctx.drawImage(pumpkin, cx - 46, cy - 46, 92, 92);
          ctx.globalAlpha = 1;
        }
      }
      yy += 200;
      // さくひん
      if (hasArt) {
        var arts = [];
        if (deco) arts.push({ img: deco, label: 'フラペチーノ' });
        if (drawn) arts.push({ img: drawn, label: 'タンブラーのしたがき' });
        var aw = arts.length === 1 ? 300 : 260, ah = aw * 4 / 3;
        var gap = 40, total = arts.length * aw + (arts.length - 1) * gap;
        arts.forEach(function (a, k) {
          var ax = (W - total) / 2 + k * (aw + gap);
          ctx.save();
          roundRect(ctx, ax, yy, aw, ah, 20);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.clip();
          var r = Math.min(aw / a.img.width, ah / a.img.height);
          ctx.drawImage(a.img, ax + (aw - a.img.width * r) / 2, yy + (ah - a.img.height * r) / 2, a.img.width * r, a.img.height * r);
          ctx.restore();
          roundRect(ctx, ax, yy, aw, ah, 20);
          ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke();
          ctx.fillStyle = '#6E5B4C';
          ctx.font = '700 24px ' + ROUND;
          ctx.fillText(a.label, ax + aw / 2, yy + ah + 34);
        });
        yy += ah + 60;
      } else {
        if (ghost) ctx.drawImage(ghost, W / 2 - 190, yy, 130, 130);
        if (pumpkin) ctx.drawImage(pumpkin, W / 2 - 65, yy - 10, 150, 150);
        if (bat) ctx.drawImage(bat, W / 2 + 90, yy + 10, 110, 110);
        yy += 160;
      }
      if (star) { ctx.drawImage(star, 40, H - 150, 70, 70); ctx.drawImage(star, W - 110, H - 170, 60, 60); }
      // 日付・店名
      var d = new Date();
      ctx.fillStyle = '#6E5B4C';
      ctx.font = '700 24px ' + ROUND;
      ctx.fillText(d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(), W / 2, H - 92);
      ctx.font = '700 18px ' + ROUND;
      ctx.fillText(T.footer_store || '', W / 2, H - 58, W - 120);
      return cv.toDataURL('image/png');
    });
  }

  /* =========================================================
     まちじかんクイズ
     ========================================================= */
  function renderQuiz() {
    var box = document.querySelector('[data-quiz]');
    var Q = C.QUIZ || [];
    var qs = state.quiz;
    if (!Q.length) { box.innerHTML = '<p class="modal__text">クイズは じゅんびちゅうだよ</p>'; return; }
    if (qs.i >= Q.length) {
      box.innerHTML =
        '<div class="quiz__end">' +
          '<svg aria-hidden="true"><use href="#s-pumpkin"/></svg>' +
          '<p class="quiz__score">' + ruby((T.quiz_score || '{n}もん せいかい！').split('{n}').join(qs.score)) + '</p>' +
          '<p class="small">' + Q.length + 'もんちゅう</p>' +
          '<button type="button" class="btn btn--orange" data-quiz-again>もういちど</button>' +
        '</div>';
      box.querySelector('[data-quiz-again]').addEventListener('click', function () {
        state.quiz = { i: 0, score: 0, done: qs.done };
        save();
        renderQuiz();
      });
      return;
    }
    var q = Q[qs.i];
    var html =
      '<div class="quiz">' +
        '<p class="quiz__no">もんだい ' + (qs.i + 1) + ' / ' + Q.length + '</p>' +
        '<p class="quiz__q">' + ruby(q.q) + '</p>' +
        '<div class="quiz__choices">';
    q.choices.forEach(function (c, k) {
      html += '<button type="button" class="choice" data-choice="' + (k + 1) + '"><span class="choice__no">' + (k + 1) + '</span><span>' + ruby(c) + '</span></button>';
    });
    html += '</div><div data-quiz-after></div></div>';
    box.innerHTML = html;
    var quiz = box.querySelector('.quiz');
    box.querySelectorAll('[data-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        var pick = Number(b.getAttribute('data-choice'));
        var ok = pick === Number(q.answer);
        quiz.classList.add('is-answered');
        box.querySelector('[data-choice="' + q.answer + '"]').classList.add('is-correct');
        if (!ok) b.classList.add('is-wrong');
        if (ok) { qs.score++; confetti(90); } else vibrate(30);
        qs.i++;
        var last = qs.i >= Q.length;
        if (last && !qs.done) qs.done = true;
        save();
        var after = box.querySelector('[data-quiz-after]');
        after.innerHTML =
          '<p class="quiz__result ' + (ok ? 'is-ok' : 'is-ng') + '">' + (ok ? 'せいかい！' : 'おしい！') + '</p>' +
          (q.note ? '<p class="quiz__note">' + ruby(q.note) + '</p>' : '') +
          '<button type="button" class="btn btn--orange" data-quiz-next>' + (last ? 'けっかを みる' : 'つぎの もんだい') + '</button>';
        var next = after.querySelector('[data-quiz-next]');
        next.focus();
        next.addEventListener('click', function () {
          renderQuiz();
          if (last) award(3);
        });
      });
    });
  }

  /* =========================================================
     おばけ しんけいすいじゃく
     ========================================================= */
  var memory = (function () {
    var ICONS = ['s-pumpkin', 's-ghost', 's-bat', 's-hat', 's-cat', 's-frap'];
    var NAMES = ['かぼちゃ', 'おばけ', 'こうもり', 'まじょのぼうし', 'ねこ', 'フラペチーノ'];
    var level = 'normal';
    var open = [], lock = false, flips = 0, matched = 0, pairs = 0;
    var grid, countEl, clearEl;
    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    function start() {
      api.started = true;
      pairs = level === 'easy' ? 3 : 6;
      var cols = level === 'easy' ? 3 : 4;
      open = []; lock = false; flips = 0; matched = 0;
      countEl.textContent = '0';
      clearEl.hidden = true;
      grid.style.setProperty('--cols', cols);
      grid.classList.toggle('is-easy', level === 'easy');
      var picks = shuffle(ICONS.map(function (_, i) { return i; })).slice(0, pairs);
      var deck = shuffle(picks.concat(picks));
      grid.innerHTML = '';
      deck.forEach(function (k, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'card-m';
        b.dataset.k = k;
        b.setAttribute('aria-label', (i + 1) + 'まいめ のカード');
        b.innerHTML =
          '<span class="card-m__in">' +
            '<span class="card-m__face card-m__back"><svg aria-hidden="true"><use href="#s-star"/></svg></span>' +
            '<span class="card-m__face card-m__front"><svg aria-hidden="true"><use href="#' + ICONS[k] + '"/></svg></span>' +
          '</span>';
        b.addEventListener('click', function () { flip(b); });
        grid.appendChild(b);
      });
    }
    function flip(b) {
      if (lock || b.classList.contains('is-open') || b.classList.contains('is-matched')) return;
      b.classList.add('is-open');
      b.setAttribute('aria-label', NAMES[b.dataset.k]);
      flips++;
      countEl.textContent = flips;
      open.push(b);
      if (open.length < 2) return;
      var a = open[0], c = open[1];
      open = [];
      if (a.dataset.k === c.dataset.k) {
        a.classList.add('is-matched'); c.classList.add('is-matched');
        vibrate(25);
        matched++;
        if (matched === pairs) {
          clearEl.hidden = false;
          confetti(160);
        }
      } else {
        lock = true;
        setTimeout(function () {
          a.classList.remove('is-open'); c.classList.remove('is-open');
          a.setAttribute('aria-label', 'カード'); c.setAttribute('aria-label', 'カード');
          lock = false;
        }, 900);
      }
    }
    function setup() {
      grid = document.querySelector('[data-mem-grid]');
      countEl = document.querySelector('[data-mem-count]');
      clearEl = document.querySelector('[data-mem-clear]');
      document.querySelectorAll('[data-level]').forEach(function (b) {
        b.addEventListener('click', function () {
          level = b.getAttribute('data-level');
          document.querySelectorAll('[data-level]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          start();
        });
      });
      document.querySelector('[data-mem-restart]').addEventListener('click', start);
    }
    var api = { setup: setup, start: start, started: false };
    return api;
  })();

  /* =========================================================
     さいしょからやりなおす
     ========================================================= */
  function setupReset() {
    document.querySelector('[data-reset]').addEventListener('click', function () {
      store.clear();
      state = freshState();
      document.querySelector('[data-name-input]').value = '';
      closeModal(document.querySelector('[data-modal="reset"]'));
      fillTexts();
      renderStamps();
      renderFrapSteps();
      resetDecoDone();
      memory.started = false;
      show('start');
    });
    document.querySelector('[data-record-save]').addEventListener('click', function () {
      makeRecordPng().then(function (url) { download(url, 'kids-barista-record.png'); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    addSymbols();
    fillTexts();
    setupPlaceholders();
    setupModals();
    setupNav();
    setupDeco();
    draw.setup();
    memory.setup();
    setupReset();
    renderFrapSteps();
    renderStamps();
    show(state.screen);
  });
})();
