/* =========================================================
   コーヒーセミナー クイック編
   クリスマス ブレンド × クランベリー ブリス バー（30分）
   ========================================================= */
(function () {
  'use strict';

  var MEMO_KEY = 'xmas-quick-seminar-memo';
  var ITEMS = [
    { key: 'spice', name: 'スパイス感' },
    { key: 'sweet', name: '甘み' },
    { key: 'fresh', name: 'さわやかさ' }
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
  }

  /* ---------- フェードイン ＋「どうして合うの？」の寄ってくる演出 ---------- */
  function setupReveal() {
    var items = document.querySelectorAll('.fade, [data-match]');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
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

  /* ---------- アコーディオン ---------- */
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

  /* ---------- ペアリングメモ ---------- */
  // コーヒーだけ／合わせたあと を項目ごとに2本の棒で並べる
  function diffHtml(data) {
    var rows = ITEMS.map(function (it) {
      var b = data.before[it.key];
      var a = data.after[it.key];
      return '<div class="diff__row">' +
        '<p class="diff__name">' + it.name + '</p>' +
        '<div class="diff__bars">' +
          '<div class="diff__bar diff__bar--before"><span class="diff__track"><span class="diff__fill" style="width:' + (b / 5 * 100) + '%"></span></span><span>' + b + '</span></div>' +
          '<div class="diff__bar diff__bar--after"><span class="diff__track"><span class="diff__fill" style="width:' + (a / 5 * 100) + '%"></span></span><span>' + a + '</span></div>' +
        '</div>' +
      '</div>';
    }).join('');
    return rows + '<p class="diff__legend"><span class="lg-before">コーヒーだけ</span><span class="lg-after">合わせたあと</span></p>';
  }

  function setupMemo() {
    var form = document.querySelector('[data-memo]');
    if (!form) return;
    var tabs = Array.prototype.slice.call(form.querySelectorAll('[data-memo-tab]'));
    var panel = form.querySelector('[data-memo-panel]');
    var ranges = Array.prototype.slice.call(panel.querySelectorAll('input[type="range"]'));
    var chips = Array.prototype.slice.call(form.querySelectorAll('.chip'));
    var free = form.querySelector('textarea');
    var diff = form.querySelector('[data-diff]');
    var status = form.querySelector('[data-memo-status]');
    var result = document.querySelector('[data-result]');

    function blank() { return { spice: 3, sweet: 3, fresh: 3 }; }
    var data = store.get(MEMO_KEY) || {};
    if (!data.before) data.before = blank();
    if (!data.after) data.after = blank();
    if (!Array.isArray(data.words)) data.words = [];
    if (typeof data.free !== 'string') data.free = '';
    var current = 'before';

    function paint(range) {
      panel.querySelector('[data-out="' + range.name + '"]').textContent = range.value;
      range.style.setProperty('--fill', ((range.value - range.min) / (range.max - range.min) * 100) + '%');
    }
    function load(which) {
      current = which;
      panel.classList.toggle('is-after', which === 'after');
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-memo-tab') === which ? 'true' : 'false'); });
      ranges.forEach(function (r) { r.value = data[which][r.name]; paint(r); });
    }
    function save() { return store.set(MEMO_KEY, data); }
    function renderDiff() { diff.innerHTML = diffHtml(data); }

    function renderCard() {
      result.querySelector('[data-result-diff]').innerHTML = diffHtml(data);
      var words = result.querySelector('[data-result-words]');
      words.innerHTML = '';
      data.words.forEach(function (w) {
        var li = document.createElement('li');
        li.textContent = w;
        words.appendChild(li);
      });
      result.querySelector('[data-result-free]').textContent = data.free;
      var d = new Date(data.savedAt || Date.now());
      result.querySelector('[data-result-date]').textContent = d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate();
      result.hidden = false;
    }

    // 初期表示（保存済みなら復元）
    chips.forEach(function (c) { c.setAttribute('aria-pressed', data.words.indexOf(c.textContent) > -1 ? 'true' : 'false'); });
    free.value = data.free;
    load('before');
    renderDiff();
    if (data.savedAt) renderCard();

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { load(t.getAttribute('data-memo-tab')); });
    });
    ranges.forEach(function (r) {
      r.addEventListener('input', function () {
        paint(r);
        data[current][r.name] = Number(r.value);
        renderDiff();
        save();
      });
    });
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        data.words = chips.filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; })
                          .map(function (x) { return x.textContent; });
        save();
      });
    });
    free.addEventListener('input', function () { data.free = free.value.trim(); save(); });

    form.querySelector('[data-memo-save]').addEventListener('click', function () {
      data.free = free.value.trim();
      data.savedAt = new Date().toISOString();
      status.textContent = save()
        ? 'この端末に保存しました'
        : 'この環境では保存できませんでしたが、メモカードは表示できます';
      renderCard();
      result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupPlaceholders();
    setupReveal();
    setupProgress();
    document.querySelectorAll('[data-stepper]').forEach(setupStepper);
    setupAccordion();
    setupMemo();
  });
})();
