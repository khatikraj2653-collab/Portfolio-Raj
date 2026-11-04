/* Magnetic cursor — buttons and links pull toward the mouse when nearby.
   Touch devices and reduced-motion users are excluded. */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var PULL = 0.35;
  var RADIUS = 60;
  var EASE = 0.15;

  var targets = [];
  var raf = null;
  var mx = -9999, my = -9999;

  function gather() {
    targets = [];
    var els = document.querySelectorAll(
      'a, button, .btn-cv, .btn-outline, .badge, .hero-socials a, .back-to-top, .rail-nav a, .entry-links a'
    );
    for (var i = 0; i < els.length; i++) {
      targets.push({ el: els[i], dx: 0, dy: 0 });
    }
  }

  function tick() {
    raf = null;
    var any = false;

    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var r = t.el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = mx - cx;
      var dy = my - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);

      var tx = 0, ty = 0;
      if (dist < RADIUS) {
        var strength = (1 - dist / RADIUS) * PULL;
        tx = dx * strength;
        ty = dy * strength;
      }

      t.dx += (tx - t.dx) * EASE;
      t.dy += (ty - t.dy) * EASE;

      if (Math.abs(t.dx) > 0.15 || Math.abs(t.dy) > 0.15) {
        t.el.style.transform = 'translate(' + t.dx.toFixed(1) + 'px,' + t.dy.toFixed(1) + 'px)';
        any = true;
      } else if (t.dx !== 0 || t.dy !== 0) {
        t.dx = 0;
        t.dy = 0;
        t.el.style.transform = '';
      }
    }

    if (any) raf = requestAnimationFrame(tick);
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    schedule();
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    mx = -9999;
    my = -9999;
    schedule();
  });

  gather();
  if (window.MutationObserver) {
    new MutationObserver(function () { setTimeout(gather, 200); })
      .observe(document.body, { childList: true, subtree: true });
  }
})();
