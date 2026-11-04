/* Parallax depth layers on scroll.
   Section numbers drift slower, titles drift slightly faster,
   and decorative shapes float behind sections at their own rate.
   Uses rAF-throttled scroll — no libraries. */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var nums = [].slice.call(document.querySelectorAll('.section-num'));
  var titles = [].slice.call(document.querySelectorAll('.section-title'));
  var sections = [].slice.call(document.querySelectorAll('.section'));

  var shapes = [];
  var DEFS = [
    { size: 120, opacity: 0.04, speed: -0.08, x: '82%', y: 55 },
    { size: 80,  opacity: 0.05, speed: -0.06, x: '8%',  y: 35 },
    { size: 55,  opacity: 0.04, speed: -0.1,  x: '88%', y: 25, diamond: true },
    { size: 100, opacity: 0.03, speed: -0.07, x: '6%',  y: 60 },
    { size: 50,  opacity: 0.05, speed: -0.09, x: '78%', y: 72, diamond: true },
    { size: 70,  opacity: 0.04, speed: -0.05, x: '15%', y: 80 }
  ];

  sections.forEach(function (sec, i) {
    if (i >= DEFS.length) return;
    var d = DEFS[i], el = document.createElement('div');
    el.className = 'parallax-shape';
    el.style.cssText = 'position:absolute;pointer-events:none;z-index:0;'
      + 'width:' + d.size + 'px;height:' + d.size + 'px;'
      + 'left:' + d.x + ';top:' + d.y + '%;'
      + 'background:var(--indigo);opacity:' + d.opacity + ';'
      + 'border-radius:' + (d.diamond ? '4px' : '50%') + ';'
      + (d.diamond ? 'transform:rotate(45deg);' : '') + 'will-change:transform;';
    sec.appendChild(el);
    shapes.push({ el: el, sec: sec, speed: d.speed, rot: d.diamond ? 'rotate(45deg) ' : '' });
  });

  var ticking = false;

  function update() {
    ticking = false;
    var vh = window.innerHeight;

    nums.forEach(function (el) {
      var sec = el.parentElement;
      if (!sec) return;
      var r = sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) { el.style.transform = ''; return; }
      el.style.transform = 'translateY(' + ((r.top - vh * 0.5) * 0.06) + 'px)';
    });

    titles.forEach(function (el) {
      if (!el.classList.contains('in-view') && el.classList.contains('reveal')) return;
      var sec = el.closest('.section');
      if (!sec) return;
      var r = sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) { el.style.transform = ''; return; }
      el.style.transform = 'translateY(' + ((r.top - vh * 0.5) * -0.035) + 'px)';
    });

    shapes.forEach(function (s) {
      var r = s.sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      s.el.style.transform = s.rot + 'translateY(' + ((r.top - vh * 0.5) * s.speed) + 'px)';
    });
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
