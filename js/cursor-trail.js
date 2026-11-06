// Ribbon cursor trail — flowing curve that follows the mouse and fades out.
// Skips touch devices (no cursor) and anyone with reduced-motion enabled.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return; // touch-only

  var canvas = document.createElement('canvas');
  canvas.id = 'cursor-trail';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646;';
  document.documentElement.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Ring buffer of recent mouse positions.
  var MAX_POINTS = 24;        // length of the ribbon
  var LIFETIME = 650;         // how long (ms) a point lives before vanishing
  var points = [];
  var lastMove = 0;

  window.addEventListener('mousemove', function (e) {
    var now = performance.now();
    points.push({ x: e.clientX, y: e.clientY, t: now });
    if (points.length > MAX_POINTS) points.shift();
    lastMove = now;
  }, { passive: true });

  // Pause draw when the tab is hidden, so we don't waste cycles.
  var visible = true;
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) requestAnimationFrame(draw);
  });

  // Theme-aware color: brighter indigo on dark, deeper on light.
  function getColor() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark ? '91,155,255' : '43,58,103'; // --indigo in each theme
  }

  function draw() {
    if (!visible) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var now = performance.now();
    // Drop expired points.
    while (points.length && now - points[0].t > LIFETIME) points.shift();

    if (points.length < 2) {
      requestAnimationFrame(draw);
      return;
    }

    var color = getColor();

    // Draw the ribbon as overlapping segments so width + alpha taper naturally.
    // Head = newest (thick, opaque), tail = oldest (thin, transparent).
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1];
      var b = points[i];
      var age = (now - b.t) / LIFETIME;          // 0 = newest, 1 = expiring
      var alpha = Math.max(0, 1 - age);
      var width = 2 + (1 - age) * 7;              // 9 px at head, 2 px at tail
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      // Slight quadratic curve for a smoother ribbon than straight segments.
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2;
      ctx.quadraticCurveTo(a.x, a.y, mx, my);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(' + color + ',' + alpha.toFixed(3) + ')';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Soft glowing head for extra life.
    var head = points[points.length - 1];
    var grad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 14);
    grad.addColorStop(0, 'rgba(' + color + ',0.55)');
    grad.addColorStop(1, 'rgba(' + color + ',0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 14, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
