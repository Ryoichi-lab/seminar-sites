/* =========================================================
   MARUNOUCHI HALLOWEEN BLEND
   ========================================================= */
(function () {
  'use strict';

  var MEMO_KEY = 'marunouchi-halloween-blend-memo';
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

  /* ---------- 舞い落ちる紅葉 ---------- */
  function setupLeaves() {
    var box = document.querySelector('[data-leaves]');
    if (!box || reduceMotion) return;
    var colors = ['#B5383A', '#D9913F', '#EDB572', '#B5383A', '#8E5A2B', '#C9573A', '#B5383A'];
    colors.forEach(function (color, i) {
      var leaf = document.createElement('span');
      leaf.className = 'falling-leaf';
      var size = 18 + Math.random() * 16;
      var dur = 11 + Math.random() * 8;
      leaf.style.left = (4 + i * 13 + Math.random() * 6) + '%';
      leaf.style.width = leaf.style.height = size + 'px';
      leaf.style.color = color;
      leaf.style.animationDuration = dur + 's';
      leaf.style.animationDelay = (-Math.random() * dur) + 's';
      leaf.innerHTML = '<svg aria-hidden="true"><use href="#d-leaf"/></svg>';
      leaf.firstChild.style.animationDuration = (dur / 4) + 's';
      box.appendChild(leaf);
    });
  }

  /* ---------- スクロールでふわっと出現 ---------- */
  function setupReveal() {
    var fades = document.querySelectorAll('.fade');
    var mix = document.querySelector('[data-mix]');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      fades.forEach(function (el) { el.classList.add('is-visible'); });
      if (mix) mix.classList.add('is-merged');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(entry.target === mix ? 'is-merged' : 'is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    fades.forEach(function (el) { io.observe(el); });
    if (mix) io.observe(mix);
  }

  /* ---------- 3ステップ進捗ナビ ---------- */
  function setupProgress() {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute('data-nav')); });
    var ticking = false;

    function update() {
      ticking = false;
      var probe = (window.scrollY || window.pageYOffset) + window.innerHeight * 0.4;
      var current = -1;
      sections.forEach(function (sec, i) { if (sec.offsetTop <= probe) current = i; });
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
  function setupStepper(root, onLast) {
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
      if (index === steps.length - 1 && onLast) onLast();
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

  /* ---------- テイスティングメモ ＋ 感想カード ---------- */
  function setupMemo() {
    var form = document.querySelector('[data-memo]');
    if (!form) return { reveal: function () {} };
    var ranges = Array.prototype.slice.call(form.querySelectorAll('input[type="range"]'));
    var chips = Array.prototype.slice.call(form.querySelectorAll('.chip'));
    var free = form.querySelector('textarea');
    var status = form.querySelector('[data-memo-status]');
    var result = document.querySelector('[data-result]');

    function reveal() { form.hidden = false; }

    function paint(range) {
      form.querySelector('[data-out="' + range.name + '"]').textContent = range.value;
      range.style.setProperty('--fill', ((range.value - range.min) / (range.max - range.min) * 100) + '%');
    }

    function collect() {
      var data = {
        words: chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
                    .map(function (c) { return c.textContent; }),
        free: free.value.trim(),
        date: new Date().toISOString()
      };
      ranges.forEach(function (r) { data[r.name] = Number(r.value); });
      return data;
    }

    function renderCard(data) {
      var scores = result.querySelector('[data-result-scores]');
      var words = result.querySelector('[data-result-words]');
      scores.innerHTML = '';
      ranges.forEach(function (r) {
        var row = document.createElement('div');
        var dt = document.createElement('dt');
        dt.textContent = form.querySelector('label[for="' + r.id + '"]').textContent;
        var dd = document.createElement('dd');
        dd.setAttribute('aria-label', (data[r.name] || 3) + ' / 5');
        for (var i = 1; i <= 5; i++) {
          var dot = document.createElement('i');
          if (i <= (data[r.name] || 3)) dot.className = 'on';
          dd.appendChild(dot);
        }
        row.appendChild(dt);
        row.appendChild(dd);
        scores.appendChild(row);
      });
      words.innerHTML = '';
      (data.words || []).forEach(function (w) {
        var li = document.createElement('li');
        li.textContent = w;
        words.appendChild(li);
      });
      result.querySelector('[data-result-free]').textContent = data.free || '';
      var d = new Date(data.date || Date.now());
      result.querySelector('[data-result-date]').textContent =
        d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate();
      result.hidden = false;
    }

    // 保存済みのメモを復元
    var saved = store.get(MEMO_KEY);
    if (saved) {
      ranges.forEach(function (r) { if (saved[r.name]) r.value = saved[r.name]; });
      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', (saved.words || []).indexOf(c.textContent) > -1 ? 'true' : 'false');
      });
      if (typeof saved.free === 'string') free.value = saved.free;
      reveal();
      renderCard(saved);
    }
    ranges.forEach(paint);

    form.addEventListener('input', function (e) { if (e.target.type === 'range') paint(e.target); });
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
    });

    form.querySelector('[data-memo-save]').addEventListener('click', function () {
      var data = collect();
      status.textContent = store.set(MEMO_KEY, data)
        ? 'この端末に保存しました'
        : 'この環境では保存できませんでしたが、感想カードは表示できます';
      renderCard(data);
      result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });

    var openBtn = document.querySelector('[data-open-memo]');
    if (openBtn) {
      openBtn.addEventListener('click', function (e) {
        e.preventDefault();
        reveal();
        form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    }

    return { reveal: reveal };
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupPlaceholders();
    setupLeaves();
    setupReveal();
    setupProgress();
    var memo = setupMemo();
    document.querySelectorAll('[data-stepper]').forEach(function (s) { setupStepper(s, memo.reveal); });
  });
})();
