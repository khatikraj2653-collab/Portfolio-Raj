/* 3D neural-network particle hero.
   Floating nodes + connecting lines behind the hero text.
   Reacts to mouse. Uses Three.js r128 loaded via CDN. */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var hero = document.getElementById('profile');
  if (!hero) return;

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  function init() {
    var T = window.THREE;
    if (!T) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'hero-particles-cv';
    hero.insertBefore(canvas, hero.firstChild);

    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
    catch (e) { canvas.remove(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(50, 2, 0.1, 100);
    cam.position.z = 18;

    var COUNT = 45;
    var CONNECT_DIST = 3.0;
    var MOUSE_RADIUS = 5;
    var MOUSE_STRENGTH = 0.8;

    var positions = [];
    var velocities = [];
    var basePositions = [];

    for (var i = 0; i < COUNT; i++) {
      var x = (Math.random() - 0.5) * 22;
      var y = (Math.random() - 0.5) * 14;
      var z = (Math.random() - 0.5) * 5;
      positions.push(x, y, z);
      basePositions.push(x, y, z);
      velocities.push(
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.004
      );
    }

    var nodeGeo = new T.BufferGeometry();
    nodeGeo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));

    function getColors() {
      var indigo = cssVar('--indigo') || '#22326B';
      var gold = cssVar('--gold') || '#BD8B00';
      var faint = cssVar('--faint') || '#767A84';
      var line = cssVar('--line') || '#D3CEC0';
      return { indigo: indigo, gold: gold, faint: faint, line: line };
    }

    var colors = getColors();
    var nodeMat = new T.PointsMaterial({
      color: new T.Color(colors.indigo),
      size: 0.22,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    });
    var nodes = new T.Points(nodeGeo, nodeMat);
    scene.add(nodes);

    var maxLines = COUNT * COUNT;
    var linePos = new Float32Array(maxLines * 6);
    var lineColors = new Float32Array(maxLines * 6);
    var lineGeo = new T.BufferGeometry();
    lineGeo.setAttribute('position', new T.BufferAttribute(linePos, 3));
    lineGeo.setAttribute('color', new T.BufferAttribute(lineColors, 3));
    lineGeo.setDrawRange(0, 0);

    var lineMat = new T.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22
    });
    var lines = new T.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    var cIndigo = new T.Color(colors.indigo);
    var cGold = new T.Color(colors.gold);

    var mx = 9999, my = 9999;
    var mouse3d = new T.Vector3(9999, 9999, 0);

    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      my = -((e.clientY - r.top) / r.height) * 2 + 1;
      mouse3d.set(mx * 12, my * 7, 0);
    });
    hero.addEventListener('mouseleave', function () {
      mx = 9999; my = 9999;
      mouse3d.set(9999, 9999, 0);
    });

    function updateColors() {
      colors = getColors();
      nodeMat.color.set(colors.indigo);
      cIndigo.set(colors.indigo);
      cGold.set(colors.gold);
    }

    if (window.MutationObserver) {
      new MutationObserver(updateColors).observe(
        document.documentElement,
        { attributes: true, attributeFilter: ['data-theme'] }
      );
    }

    var visible = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
      }, { rootMargin: '100px' }).observe(hero);
    }

    function resize() {
      var w = hero.offsetWidth;
      var h = Math.min(hero.offsetHeight, window.innerHeight);
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }

    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(hero);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();

    var posArr = nodeGeo.attributes.position.array;

    (function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;

      for (var i = 0; i < COUNT; i++) {
        var ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

        posArr[ix] += velocities[ix];
        posArr[iy] += velocities[iy];
        posArr[iz] += velocities[iz];

        var dx = posArr[ix] - basePositions[ix];
        var dy = posArr[iy] - basePositions[iy];
        var dz = posArr[iz] - basePositions[iz];
        velocities[ix] -= dx * 0.0004;
        velocities[iy] -= dy * 0.0004;
        velocities[iz] -= dz * 0.0004;

        velocities[ix] *= 0.998;
        velocities[iy] *= 0.998;
        velocities[iz] *= 0.998;

        if (mouse3d.x < 100) {
          var mdx = posArr[ix] - mouse3d.x;
          var mdy = posArr[iy] - mouse3d.y;
          var dist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (dist < MOUSE_RADIUS && dist > 0.01) {
            var force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_STRENGTH * 0.003;
            velocities[ix] += (mdx / dist) * force;
            velocities[iy] += (mdy / dist) * force;
          }
        }
      }
      nodeGeo.attributes.position.needsUpdate = true;

      var lc = 0;
      var lp = lineGeo.attributes.position.array;
      var lcol = lineGeo.attributes.color.array;

      for (var a = 0; a < COUNT; a++) {
        for (var b = a + 1; b < COUNT; b++) {
          var ax = posArr[a * 3], ay = posArr[a * 3 + 1], az = posArr[a * 3 + 2];
          var bx = posArr[b * 3], by = posArr[b * 3 + 1], bz = posArr[b * 3 + 2];
          var ddx = ax - bx, ddy = ay - by, ddz = az - bz;
          var d2 = ddx * ddx + ddy * ddy + ddz * ddz;
          if (d2 < CONNECT_DIST * CONNECT_DIST) {
            var off = lc * 6;
            lp[off] = ax; lp[off + 1] = ay; lp[off + 2] = az;
            lp[off + 3] = bx; lp[off + 4] = by; lp[off + 5] = bz;

            var t = Math.sqrt(d2) / CONNECT_DIST;
            var r = cIndigo.r + (cGold.r - cIndigo.r) * t;
            var g = cIndigo.g + (cGold.g - cIndigo.g) * t;
            var bl = cIndigo.b + (cGold.b - cIndigo.b) * t;
            lcol[off] = r; lcol[off + 1] = g; lcol[off + 2] = bl;
            lcol[off + 3] = r; lcol[off + 4] = g; lcol[off + 5] = bl;
            lc++;
          }
        }
      }
      lineGeo.setDrawRange(0, lc * 2);
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;

      renderer.render(scene, cam);
    })();
  }

  function boot() {
    if (window.THREE) { init(); return; }
    window.addEventListener('load', function () { setTimeout(init, 100); });
    setTimeout(function () { if (window.THREE) init(); }, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
