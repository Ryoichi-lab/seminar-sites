/* =========================================================
   コーヒーセミナー 〜クリスマス編〜
   ========================================================= */
(function () {
  'use strict';

  var MEMO_KEY = 'christmas-seminar-memo';
  var BLENDS = [
    { id: 'cb',     name: 'クリスマスブレンド' },
    { id: 'blonde', name: 'クリスマスブロンドロースト' },
    { id: 'esp',    name: 'クリスマスブレンドエスプレッソロースト' }
  ];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- localStorage（使えない環境でも落とさない） ---------- */
  var store = {
    get: function (key) {
      try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
  };

  /* ---------- 画像プレースホルダー ---------- */
  function setupPlaceholders() {
    document.querySelectorAll('.ph img').forEach(function (img) {
      var box = img.closest('.ph');
      var src = img.getAttribute('src');
      box.setAttribute('data-file', src);
      var probe = new Image();
      probe.onerror = function () { box.classList.add('is-missing'); };
      probe.src = src;
    });

    var hero = document.querySelector('[data-hero-bg]');
    if (hero) {
      var src = hero.getAttribute('data-hero-bg');
      var bg = new Image();
      bg.onload = function () {
        // CSS変数経由だと url() が css/ 基準で解決されるため、直接指定する
        hero.style.backgroundImage = 'url("' + src + '")';
        hero.classList.add('has-image');
      };
      bg.src = src;
    }
  }

  /* ---------- 降る雪 ---------- */
  function setupSnow() {
    var box = document.querySelector('[data-snow]');
    if (!box || reduceMotion) return;
    for (var i = 0; i < 28; i++) {
      var crystal = i % 7 === 0;
      var f = document.createElement('span');
      var size = crystal ? 14 + Math.random() * 8 : 3 + Math.random() * 4;
      var dur = 10 + Math.random() * 10;
      f.className = 'flake' + (crystal ? ' flake--crystal' : '');
      f.style.left = (Math.random() * 100) + '%';
      f.style.width = f.style.height = size + 'px';
      f.style.animationDuration = dur + 's';
      f.style.animationDelay = (-Math.random() * dur) + 's';
      f.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
      f.style.setProperty('--o', (0.5 + Math.random() * 0.4).toFixed(2));
      if (crystal) f.innerHTML = '<svg><use href="#d-snow"/></svg>';
      box.appendChild(f);
    }
  }

  /* ---------- フェードイン ＋ 演出のトリガー ---------- */
  function setupReveal() {
    var items = document.querySelectorAll('.fade, [data-custom]');
    function show(el) { el.classList.add(el.hasAttribute('data-custom') ? 'is-shown' : 'is-visible'); }
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(show);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 固定進捗ナビ ---------- */
  function setupProgress() {
    var nav = document.querySelector('[data-progress]');
    if (!nav) return;
    var fill = nav.querySelector('[data-progress-fill]');
    var links = Array.prototype.slice.call(nav.querySelectorAll('[data-nav]'));
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute('data-nav')); });
    var hero = document.querySelector('.hero');
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var vh = window.innerHeight;
      var max = document.documentElement.scrollHeight - vh;
      nav.classList.toggle('is-shown', y > hero.offsetHeight * 0.6);
      fill.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
      var probe = y + vh * 0.4;
      var current = -1;
      sections.forEach(function (sec, i) { if (sec && sec.offsetTop <= probe) current = i; });
      links.forEach(function (a, i) {
        a.classList.toggle('is-active', i === current);
        a.classList.toggle('is-done', i < current);
        if (i === current) a.setAttribute('aria-current', 'step');
        else a.removeAttribute('aria-current');
      });
    }
    function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- 3種のタブ ＋ 横スワイプ ---------- */
  function setupTabs(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var track = root.querySelector('[data-tab-track]');
    var panels = Array.prototype.slice.call(track.children);
    var index = 0;

    function select(i, scroll) {
      index = Math.max(0, Math.min(panels.length - 1, i));
      tabs.forEach(function (t, n) {
        t.setAttribute('aria-selected', n === index ? 'true' : 'false');
        t.tabIndex = n === index ? 0 : -1;
      });
      if (scroll) {
        track.scrollTo({ left: panels[index].offsetLeft - panels[0].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }

    tabs.forEach(function (t, n) {
      t.addEventListener('click', function () { select(n, true); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          select(next, true);
          tabs[next].focus();
        }
      });
    });

    var timer;
    track.addEventListener('scroll', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var step = panels[1] ? panels[1].offsetLeft - panels[0].offsetLeft : track.clientWidth;
        var i = Math.round(track.scrollLeft / step);
        if (i !== index) select(i, false);
      }, 80);
    }, { passive: true });

    window.addEventListener('resize', function () {
      track.scrollLeft = panels[index].offsetLeft - panels[0].offsetLeft;
    });
    select(0, false);
  }

  /* ---------- エイジド コーヒーのアコーディオン ---------- */
  function setupAccordion() {
    document.querySelectorAll('[data-accordion]').forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.classList.toggle('is-open', open);
      });
    });
  }

  /* ---------- ステッパー ---------- */
  function setupStepper(root) {
    var track = root.querySelector('[data-step-track]');
    var steps = Array.prototype.slice.call(track.children);
    var nowEl = root.querySelector('[data-step-now]');
    var dotsEl = root.querySelector('[data-step-dots]');
    var prev = root.querySelector('[data-step-prev]');
    var next = root.querySelector('[data-step-next]');
    var index = 0;

    var dots = steps.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'ステップ' + (i + 1));
      b.addEventListener('click', function () { go(i); });
      dotsEl.appendChild(b);
      return b;
    });

    function render() {
      nowEl.textContent = index + 1;
      dots.forEach(function (d, i) {
        if (i === index) d.setAttribute('aria-current', 'step');
        else d.removeAttribute('aria-current');
      });
      prev.disabled = index === 0;
      next.disabled = index === steps.length - 1;
      steps.forEach(function (s, i) { s.setAttribute('aria-hidden', i === index ? 'false' : 'true'); });
    }
    function go(i) {
      index = Math.max(0, Math.min(steps.length - 1, i));
      track.scrollTo({ left: index * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
      render();
    }
    prev.addEventListener('click', function () { go(index - 1); });
    next.addEventListener('click', function () { go(index + 1); });

    var timer;
    track.addEventListener('scroll', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== index) { index = i; render(); }
      }, 80);
    }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });
    window.addEventListener('resize', function () { track.scrollLeft = index * track.clientWidth; });
    render();
  }

  /* ---------- 3種比較メモ ＋ 比較カード ---------- */
  function setupMemo() {
    var form = document.querySelector('[data-memo]');
    if (!form) return;
    var tabs = Array.prototype.slice.call(form.querySelectorAll('[data-memo-tab]'));
    var panel = form.querySelector('[data-memo-panel]');
    var ranges = Array.prototype.slice.call(panel.querySelectorAll('input[type="range"]'));
    var chips = Array.prototype.slice.call(panel.querySelectorAll('.chip'));
    var free = panel.querySelector('textarea');
    var favs = Array.prototype.slice.call(form.querySelectorAll('input[name="favorite"]'));
    var status = form.querySelector('[data-memo-status]');
    var result = document.querySelector('[data-result]');

    function blank() { return { acidity: 3, body: 3, aroma: 3, words: [], free: '' }; }
    var data = store.get(MEMO_KEY) || {};
    BLENDS.forEach(function (b) { if (!data[b.id]) data[b.id] = blank(); });
    var current = 'cb';

    function paint(range) {
      panel.querySelector('[data-out="' + range.name + '"]').textContent = range.value;
      range.style.setProperty('--fill', ((range.value - range.min) / (range.max - range.min) * 100) + '%');
    }

    // パネルの色と中身を選択中のブレンドに切り替える
    function load(id) {
      current = id;
      var d = data[id];
      panel.className = 'memo__panel is-' + id;
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-memo-tab') === id ? 'true' : 'false'); });
      ranges.forEach(function (r) { r.value = d[r.name]; paint(r); });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', d.words.indexOf(c.textContent) > -1 ? 'true' : 'false'); });
      free.value = d.free;
    }

    function capture() {
      var d = data[current];
      ranges.forEach(function (r) { d[r.name] = Number(r.value); });
      d.words = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
                     .map(function (c) { return c.textContent; });
      d.free = free.value.trim();
      var fav = favs.filter(function (f) { return f.checked; })[0];
      data.favorite = fav ? fav.value : '';
      store.set(MEMO_KEY, data);
    }

    function dots(n) {
      var s = '';
      for (var i = 1; i <= 5; i++) s += '<i' + (i <= n ? ' class="on"' : '') + '></i>';
      return s;
    }
    function esc(t) {
      var d = document.createElement('div');
      d.textContent = t;
      return d.innerHTML;
    }

    function renderCard() {
      var rows = result.querySelector('[data-result-rows]');
      rows.innerHTML = BLENDS.map(function (b) {
        var d = data[b.id];
        var isFav = data.favorite === b.id;
        return '<div class="rc is-' + b.id + (isFav ? ' is-fav' : '') + '">' +
          (isFav ? '<span class="rc__fav"><svg><use href="#i-star"/></svg>いちばん好き</span>' : '') +
          '<p class="rc__name">' + b.name + '</p>' +
          '<div class="rc__scores">' +
            '<span class="rc__score">酸味<span class="rc__dots">' + dots(d.acidity) + '</span></span>' +
            '<span class="rc__score">コク<span class="rc__dots">' + dots(d.body) + '</span></span>' +
            '<span class="rc__score">香り<span class="rc__dots">' + dots(d.aroma) + '</span></span>' +
          '</div>' +
          '<ul class="rc__words">' + d.words.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
          '<p class="rc__free">' + esc(d.free) + '</p>' +
        '</div>';
      }).join('');
      var now = new Date(data.savedAt || Date.now());
      result.querySelector('[data-result-date]').textContent =
        now.getFullYear() + '.' + (now.getMonth() + 1) + '.' + now.getDate();
      result.hidden = false;
    }

    // 初期表示（保存済みなら復元）
    favs.forEach(function (f) { f.checked = f.value === data.favorite; });
    load('cb');
    if (data.savedAt) renderCard();

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { capture(); load(t.getAttribute('data-memo-tab')); });
    });
    form.addEventListener('input', function (e) {
      if (e.target.type === 'range') paint(e.target);
      capture();
    });
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        capture();
      });
    });
    form.addEventListener('change', capture);

    form.querySelector('[data-memo-save]').addEventListener('click', function () {
      capture();
      data.savedAt = new Date().toISOString();
      status.textContent = store.set(MEMO_KEY, data)
        ? 'この端末に保存しました'
        : 'この環境では保存できませんでしたが、比較カードは表示できます';
      renderCard();
      result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupPlaceholders();
    setupSnow();
    setupReveal();
    setupProgress();
    document.querySelectorAll('[data-tabs]').forEach(setupTabs);
    setupAccordion();
    document.querySelectorAll('[data-stepper]').forEach(setupStepper);
    setupMemo();
  });
})();
