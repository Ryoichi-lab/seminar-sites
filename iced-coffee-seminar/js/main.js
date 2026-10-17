/* =========================================================
   コーヒーセミナー 〜アイスコーヒー編〜
   ========================================================= */

/* ---------- COFFEEクイズの設定（後から入力） ----------
   CORRECT_ANSWER : 正解の番号（1=氷 / 2=間 / 3=常夏）。未定の間は null
   EXPLANATION    : 正解のあとに表示する解説文 */
var CORRECT_ANSWER = null;
var EXPLANATION = "";

(function () {
  'use strict';

  var MEMO_KEY = 'iced-coffee-seminar-memo';
  var BLENDS = [
    { id: 'iced', name: 'アイスコーヒーブレンド' },
    { id: 'kati', name: 'カティカティブレンド' }
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

  /* ---------- フェードイン ＋ バーの演出 ---------- */
  function setupReveal() {
    var items = document.querySelectorAll('.fade, [data-roast]');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
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

  /* ---------- タブ（楽しみ方） ---------- */
  function setupTabs(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        select(n);
        n.focus();
      });
    });
    select(tabs[0]);
  }

  /* ---------- COFFEEクイズ ---------- */
  function setupQuiz() {
    var quiz = document.querySelector('[data-quiz]');
    if (!quiz) return;
    var choices = Array.prototype.slice.call(quiz.querySelectorAll('[data-choice]'));
    var result = quiz.querySelector('[data-quiz-result]');
    var exp = quiz.querySelector('[data-quiz-exp]');

    choices.forEach(function (btn) {
      btn.addEventListener('click', function () {
        choices.forEach(function (c) { c.classList.remove('is-picked'); });

        // 正解が未設定の間は、どれを選んでも発表待ちのメッセージ
        if (CORRECT_ANSWER === null) {
          btn.classList.add('is-picked');
          result.className = 'quiz__result is-pending';
          result.textContent = '答えはセミナーで発表します！';
          return;
        }

        var correct = quiz.querySelector('[data-choice="' + CORRECT_ANSWER + '"]');
        var ok = btn === correct;
        correct.classList.add('is-correct');
        if (!ok) btn.classList.add('is-wrong');
        quiz.classList.add('is-locked');
        result.className = 'quiz__result' + (ok ? '' : ' is-wrong');
        result.textContent = ok ? '正解！' : 'おしい！';
        if (EXPLANATION) {
          exp.textContent = EXPLANATION;
          exp.hidden = false;
        }
      });
    });
  }

  /* ---------- 何杯分？（★の数） ---------- */
  function setupCups() {
    var root = document.querySelector('[data-cups]');
    if (!root) return;
    var btns = Array.prototype.slice.call(root.querySelectorAll('[data-cups-n]'));
    var stars = Array.prototype.slice.call(root.querySelectorAll('.cups__star'));
    var wrap = root.querySelector('[data-cups-stars]');
    function set(n) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', Number(b.getAttribute('data-cups-n')) === n ? 'true' : 'false'); });
      stars.forEach(function (s, i) {
        var on = i < n;
        var was = s.classList.contains('is-on');
        s.classList.toggle('is-on', on);
        if (on && !was) {
          s.classList.remove('is-pop');
          void s.offsetWidth; // アニメーションを再生し直す
          s.classList.add('is-pop');
        }
      });
      wrap.setAttribute('aria-label', n + '杯分：' + '★'.repeat(n));
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { set(Number(b.getAttribute('data-cups-n'))); });
    });
    set(1);
  }

  /* ---------- 蒸らしタイマー ---------- */
  function setupTimer(root) {
    var total = Number(root.getAttribute('data-timer')) || 30;
    var okAt = Number(root.getAttribute('data-timer-ok')) || 20;
    var ring = root.querySelector('[data-timer-ring]');
    var num = root.querySelector('[data-timer-num]');
    var btn = root.querySelector('[data-timer-btn]');
    var msg = root.querySelector('[data-timer-msg]');
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
      if (total - remain >= okAt && !root.classList.contains('is-ok')) {
        root.classList.add('is-ok');
        msg.textContent = 'そろそろOK';
      }
      if (remain <= 0) { finish(); return; }
      raf = window.requestAnimationFrame(tick);
    }
    function reset() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
      root.classList.remove('is-running', 'is-ok', 'is-done');
      msg.textContent = '';
      draw(total);
      btn.textContent = label;
    }
    function finish() {
      raf = null;
      root.classList.remove('is-running', 'is-ok');
      root.classList.add('is-done');
      msg.textContent = '蒸らし終了！';
      btn.textContent = 'もう一度';
      if (navigator.vibrate) {
        try { navigator.vibrate([200, 100, 200]); } catch (e) { /* noop */ }
      }
    }
    btn.addEventListener('click', function () {
      if (raf) { reset(); return; }
      reset();
      root.classList.add('is-running');
      endAt = Date.now() + total * 1000;
      btn.textContent = 'リセット';
      tick();
    });
    draw(total);
  }

  /* ---------- 比較メモ ＋ 比較カード ---------- */
  function setupMemo() {
    var form = document.querySelector('[data-memo]');
    if (!form) return;
    var tabs = Array.prototype.slice.call(form.querySelectorAll('[data-memo-tab]'));
    var panel = form.querySelector('[data-memo-panel]');
    var ranges = Array.prototype.slice.call(panel.querySelectorAll('input[type="range"]'));
    var chips = Array.prototype.slice.call(panel.querySelectorAll('.chip'));
    var free = panel.querySelector('textarea');
    var favs = Array.prototype.slice.call(form.querySelectorAll('[data-fav]'));
    var status = form.querySelector('[data-memo-status]');
    var result = document.querySelector('[data-result]');

    function blank() { return { acidity: 3, body: 3, aroma: 3, words: [], free: '' }; }
    var data = store.get(MEMO_KEY) || {};
    BLENDS.forEach(function (b) { if (!data[b.id]) data[b.id] = blank(); });
    var current = 'iced';

    function paint(range) {
      panel.querySelector('[data-out="' + range.name + '"]').textContent = range.value;
      range.style.setProperty('--fill', ((range.value - range.min) / (range.max - range.min) * 100) + '%');
    }
    function load(id) {
      current = id;
      var d = data[id];
      panel.className = 'memo__panel is-' + id;
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-memo-tab') === id ? 'true' : 'false'); });
      ranges.forEach(function (r) { r.value = d[r.name]; paint(r); });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', d.words.indexOf(c.textContent) > -1 ? 'true' : 'false'); });
      free.value = d.free;
    }
    function paintFav() {
      favs.forEach(function (f) { f.setAttribute('aria-pressed', f.getAttribute('data-fav') === data.favorite ? 'true' : 'false'); });
    }
    function capture() {
      var d = data[current];
      ranges.forEach(function (r) { d[r.name] = Number(r.value); });
      d.words = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
                     .map(function (c) { return c.textContent; });
      d.free = free.value.trim();
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
      result.querySelector('[data-result-rows]').innerHTML = BLENDS.map(function (b) {
        var d = data[b.id];
        var isFav = data.favorite === b.id;
        return '<div class="rc is-' + b.id + (isFav ? ' is-fav' : '') + '">' +
          (isFav ? '<span class="rc__fav">♥ 好きだったのはこっち</span>' : '') +
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

    load('iced');
    paintFav();
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
    favs.forEach(function (f) {
      f.addEventListener('click', function () {
        data.favorite = f.getAttribute('data-fav');
        paintFav();
        capture();
      });
    });
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
    setupReveal();
    setupProgress();
    document.querySelectorAll('[data-stepper]').forEach(setupStepper);
    document.querySelectorAll('[data-tabs]').forEach(setupTabs);
    setupQuiz();
    setupCups();
    document.querySelectorAll('[data-timer]').forEach(setupTimer);
    setupMemo();
  });
})();
