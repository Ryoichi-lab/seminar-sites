/* =========================================================
   コーヒーセミナー 〜コーヒーを始めよう編〜
   ========================================================= */
(function () {
  'use strict';

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
      box.setAttribute('data-file', img.getAttribute('src'));
      var probe = new Image();
      probe.onerror = function () { box.classList.add('is-missing'); };
      probe.src = img.getAttribute('src');
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

  /* ---------- スクロール時のフェードイン ---------- */
  function setupFade() {
    var items = document.querySelectorAll('.fade');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
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

      // 画面の上から 40% の位置にあるセクションを「現在地」とする
      var probe = y + vh * 0.4;
      var current = -1;
      sections.forEach(function (sec, i) {
        if (sec && sec.offsetTop <= probe) current = i;
      });
      links.forEach(function (a, i) {
        a.classList.toggle('is-active', i === current);
        a.classList.toggle('is-done', i < current);
        if (i === current) a.setAttribute('aria-current', 'step');
        else a.removeAttribute('aria-current');
      });
    }

    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- ステッパー（横スワイプ ＋ 次へ/戻る） ---------- */
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

    // スワイプ後の位置からステップ番号を同期
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

    window.addEventListener('resize', function () {
      track.scrollLeft = index * track.clientWidth;
    });

    render();
  }

  /* ---------- テイスティングメモ ---------- */
  function setupMemo(form) {
    var key = form.getAttribute('data-memo');
    var status = form.querySelector('[data-memo-status]');
    var ranges = form.querySelectorAll('input[type="range"]');
    var words = form.querySelector('textarea');
    var saved = store.get(key);
    var saveTimer;

    function paint(range) {
      var out = form.querySelector('[data-out="' + range.name + '"]');
      if (out) out.textContent = range.value;
      var pct = (range.value - range.min) / (range.max - range.min) * 100;
      range.style.setProperty('--fill', pct + '%');
    }

    if (saved) {
      ranges.forEach(function (r) { if (saved[r.name]) r.value = saved[r.name]; });
      if (typeof saved.words === 'string') words.value = saved.words;
    }
    ranges.forEach(paint);

    function save() {
      var data = { words: words.value };
      ranges.forEach(function (r) { data[r.name] = r.value; });
      status.textContent = store.set(key, data)
        ? 'この端末に保存しました'
        : 'この環境では保存できません（入力はそのまま使えます）';
    }

    form.addEventListener('input', function (e) {
      if (e.target.type === 'range') paint(e.target);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 400);
    });
  }

  /* ---------- 蒸らしタイマー ---------- */
  function setupTimer(root) {
    var total = Number(root.getAttribute('data-timer')) || 30;
    var ring = root.querySelector('[data-timer-ring]');
    var num = root.querySelector('[data-timer-num]');
    var btn = root.querySelector('[data-timer-btn]');
    var circumference = 2 * Math.PI * Number(ring.getAttribute('r'));
    var raf = null;
    var endAt = 0;
    var label = btn.textContent;

    ring.style.strokeDasharray = circumference;

    function draw(remain) {
      num.textContent = Math.ceil(remain);
      ring.style.strokeDashoffset = circumference * (1 - remain / total);
    }

    function tick() {
      var remain = Math.max(0, (endAt - Date.now()) / 1000);
      draw(remain);
      if (remain <= 0) { finish(); return; }
      raf = window.requestAnimationFrame(tick);
    }

    function reset() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
      root.classList.remove('is-running', 'is-done');
      draw(total);
      btn.textContent = label;
    }

    function finish() {
      raf = null;
      root.classList.remove('is-running');
      root.classList.add('is-done');
      btn.textContent = 'もう一度';
      if (navigator.vibrate) {
        try { navigator.vibrate([200, 100, 200]); } catch (e) { /* noop */ }
      }
    }

    btn.addEventListener('click', function () {
      if (raf) { reset(); return; }            // 計測中 → リセット
      root.classList.remove('is-done');
      root.classList.add('is-running');
      endAt = Date.now() + total * 1000;
      btn.textContent = 'リセット';
      tick();
    });

    draw(total);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupPlaceholders();
    setupFade();
    setupProgress();
    document.querySelectorAll('[data-stepper]').forEach(setupStepper);
    document.querySelectorAll('[data-memo]').forEach(setupMemo);
    document.querySelectorAll('[data-timer]').forEach(setupTimer);
  });
})();
