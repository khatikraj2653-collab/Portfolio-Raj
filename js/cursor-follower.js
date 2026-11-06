// Cursor follower — tiny dot exactly on the mouse + larger circle that lags
// behind with smooth easing. Circle expands when hovering over any clickable
// element (links, buttons, inputs). Skips touch devices + reduced-motion.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var dot = document.createElement('div');
  var ring = document.createElement('div');
  dot.id = 'cursor-dot';
  ring.id = 'cursor-ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');

  var style = document.createElement('style');
  style.textContent =
    '#cursor-dot,#cursor-ring{position:fixed;top:0;left:0;pointer-events:none;' +
    'z-index:2147483646;border-radius:50%;transform:translate(-50%,-50%);' +
    'will-change:transform,width,height,opacity;}' +
    '#cursor-dot{width:6px;height:6px;background:var(--cf-color,#5B9BFF);' +
    'transition:opacity .2s;}' +
    '#cursor-ring{width:34px;height:34px;border:1.5px solid var(--cf-color,#5B9BFF);' +
    'transition:width .2s cubic-bezier(.2,.8,.2,1),height .2s cubic-bezier(.2,.8,.2,1),' +
    'background-color .2s,border-color .2s,opacity .2s;}' +
    '#cursor-ring.hover{width:54px;height:54px;background:rgba(91,155,255,.12);' +
    'border-color:rgba(91,155,255,.7);}' +
    '#cursor-ring.click{width:26px;height:26px;background:rgba(91,155,255,.3);}' +
    ':root[data-theme="dark"] #cursor-dot,:root[data-theme="dark"] #cursor-ring{--cf-color:#7FB0FF;}' +
    '#cursor-dot.hide,#cursor-ring.hide{opacity:0;}';
  document.head.appendChild(style);
  document.documentElement.appendChild(dot);
  document.documentElement.appendChild(ring);

  var mx = -100, my = -100;
  var rx = -100, ry = -100;    // ring position (eased toward cursor)
  var dx = -100, dy = -100;    // dot position (snaps to cursor)
  var hovering = false;
  var visible = false;

  function onMove(e) {
    mx = e.clientX;
    my = e.clientY;
    if (!visible) {
      visible = true;
      dot.classList.remove('hide');
      ring.classList.remove('hide');
      // On first move, initialize ring near cursor so it doesn't fly in from (0,0).
      rx = mx; ry = my;
    }
  }
  window.addEventListener('mousemove', onMove, { passive: true });

  // Hide when cursor leaves the viewport.
  document.addEventListener('mouseleave', function () {
    dot.classList.add('hide'); ring.classList.add('hide'); visible = false;
  });
  document.addEventListener('mouseenter', function () {
    dot.classList.remove('hide'); ring.classList.remove('hide'); visible = true;
  });

  // Click feedback — briefly shrink the ring.
  window.addEventListener('mousedown', function () { ring.classList.add('click'); });
  window.addEventListener('mouseup',   function () { ring.classList.remove('click'); });

  // Hover state: enlarge ring when over any interactive element.
  var HOVER_SELECTOR = 'a, button, [role="button"], input, textarea, select, label[for], .entry-thumb, .btn, .site-card, summary';
  function updateHover() {
    var el = document.elementFromPoint(mx, my);
    var isInteractive = !!(el && el.closest && el.closest(HOVER_SELECTOR));
    if (isInteractive !== hovering) {
      hovering = isInteractive;
      ring.classList.toggle('hover', hovering);
    }
  }

  // Pause when tab hidden.
  var animating = true;
  document.addEventListener('visibilitychange', function () {
    animating = !document.hidden;
    if (animating) requestAnimationFrame(tick);
  });

  var EASE = 0.18; // ring smoothness; lower = laggier
  function tick() {
    if (!animating) return;
    // Dot snaps to cursor instantly (sub-pixel smoothing via translate).
    dx = mx; dy = my;
    // Ring eases toward cursor.
    rx += (mx - rx) * EASE;
    ry += (my - ry) * EASE;
    dot.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0) translate(-50%,-50%)';
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
    updateHover();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
