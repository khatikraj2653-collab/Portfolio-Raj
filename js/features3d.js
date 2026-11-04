/* ===========================================================
   Portfolio extras: skills constellation, 3D project wall,
   architecture flow tracer, dissertation at a glance.
   Each block is progressive enhancement: if WebGL or JS fails,
   the original static content stays exactly as it was.
=========================================================== */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888'; }
  function pal() {
    return { bg: cssVar('--bg'), alt: cssVar('--bg-alt'), ink: cssVar('--ink'), muted: cssVar('--muted'), faint: cssVar('--faint'),
      line: cssVar('--line'), indigo: cssVar('--indigo'), gold: cssVar('--gold'), green: cssVar('--green') };
  }
  function onTheme(cb) { if (window.MutationObserver) new MutationObserver(cb).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); }
  function whenFonts(cb) { var p = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve(); p.then(cb); }
  function threeReady(cb) {
    var done = false;
    function go() { if (done || !window.THREE) return; done = true; whenFonts(cb); }
    if (window.THREE) go(); else { window.addEventListener('load', go); setTimeout(go, 4000); }
  }
  function watchVisible(el, cb) {
    if (!window.IntersectionObserver) { cb(true); return; }
    new IntersectionObserver(function (en) { cb(en[0].isIntersecting); }, { rootMargin: '120px' }).observe(el);
  }
  function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function textSprite(T, text, o) {
    var fs = o.px * 2, c = document.createElement('canvas'), x = c.getContext('2d');
    var font = o.weight + ' ' + fs + 'px ' + o.family;
    x.font = font; var w = Math.ceil(x.measureText(text).width) + 20; c.width = w; c.height = fs + 20;
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (o.halo) { x.lineJoin = 'round'; x.lineWidth = 8; x.strokeStyle = o.halo; x.strokeText(text, w / 2, c.height / 2 + 1); }
    x.fillStyle = o.color; x.fillText(text, w / 2, c.height / 2 + 1);
    var tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter;
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(o.h * w / c.height, o.h, 1); sp.renderOrder = 5; return sp;
  }
  function disposeSprite(sp) { if (sp.material.map) sp.material.map.dispose(); sp.material.dispose(); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  /* ---------- 1. Skills constellation ---------- */
  var HUBS = [
    { id: 'semibot', label: 'SemiBot', href: '#project-semibot' },
    { id: 'goldbot', label: 'GoldBot', href: '#project-goldbot' },
    { id: 'silverbot', label: 'SilverBot', href: '#project-silverbot' },
    { id: 'halluc', label: 'Hallucination Detector', href: '#project-hallucination-detector' },
    { id: 'hitl', label: 'HITL Email Agent', href: '#project-hitl-email-agent' },
    { id: 'retail', label: 'Retail Research', href: '#project-retail-research-assistant' },
    { id: 'diss', label: 'Dissertation', href: '#dissertation' }
  ];
  var ALL6 = ['semibot', 'goldbot', 'silverbot', 'halluc', 'hitl', 'retail'];
  /* Hand-checked against each project's own page text, README and requirements, not scraped from tags. */
  var LINKS = {
    'LangGraph': ALL6,
    'LangChain': ['semibot', 'goldbot', 'silverbot', 'retail'],
    'RAG': ['semibot', 'goldbot', 'silverbot', 'halluc'],
    'FAISS': ['semibot', 'goldbot', 'silverbot', 'halluc'],
    'Agentic AI': ALL6,
    'Python': ALL6.concat(['diss']),
    'Streamlit': ALL6,
    'FastAPI': ['hitl'],
    'GenAI': ALL6.concat(['diss']),
    'Pandas': ['retail'],
    'SQL / SQLite': ['semibot', 'goldbot', 'hitl', 'retail'],
    'Statistical Testing': ['semibot', 'silverbot', 'halluc', 'diss'],
    'Streamlit Community Cloud': ['semibot', 'goldbot', 'silverbot', 'halluc', 'retail'],
    'LLM Evaluation': ['halluc', 'diss'],
    'HuggingFace Transformers (NLI)': ['halluc'],
    'scikit-learn': ['diss'],
    'LangSmith': ['semibot'],
    'MCP (Model Context Protocol)': ['goldbot', 'silverbot']
  };

  function initConstellation(T) {
    var host = document.getElementById('constellation'), cv = document.getElementById('constCv'), info = document.getElementById('constInfo');
    if (!host || !cv || !info) return;
    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { host.classList.add('nogl'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var chips = [].slice.call(document.querySelectorAll('.skill-grid span'));
    var skillNames = chips.map(function (c) { return c.textContent.trim(); });
    var hubById = {}; HUBS.forEach(function (h) { hubById[h.id] = h; });

    var rnd = mulberry(7), nodes = [], byId = {}, edges = [];
    function addNode(n) { nodes.push(n); byId[n.id] = n; return n; }
    var RH = 3.5;
    HUBS.forEach(function (h, i) {
      var y = 1 - 2 * (i + 0.5) / HUBS.length, r = Math.sqrt(1 - y * y), phi = i * 2.399963;
      addNode({ id: 'h:' + h.id, hub: true, label: h.label, href: h.href, key: h.id, p: new T.Vector3(Math.cos(phi) * r * RH, y * RH, Math.sin(phi) * r * RH), r: 0.2, fixed: true });
    });
    var loose = [], unl = 0, unlTotal = skillNames.filter(function (s) { return !(LINKS[s] && LINKS[s].length); }).length;
    skillNames.forEach(function (s) {
      var links = LINKS[s] || [], n;
      if (links.length) {
        var c = new T.Vector3(); links.forEach(function (k) { c.add(byId['h:' + k].p); }); c.multiplyScalar(1 / links.length);
        n = addNode({ id: 's:' + s, hub: false, label: s, links: links, p: c.add(new T.Vector3((rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6)), r: 0.085 });
        loose.push(n);
        links.forEach(function (k) { edges.push({ a: n.id, b: 'h:' + k }); });
      } else {
        var y2 = 1 - 2 * (unl + 0.5) / Math.max(unlTotal, 1), r2 = Math.sqrt(1 - y2 * y2), ph = unl * 2.399963 + 0.7; unl++;
        addNode({ id: 's:' + s, hub: false, label: s, links: [], p: new T.Vector3(Math.cos(ph) * r2 * 5.3, y2 * 5.3, Math.sin(ph) * r2 * 5.3), r: 0.075, fixed: true });
      }
    });
    for (var it = 0; it < 500; it++) {
      loose.forEach(function (n) {
        var f = new T.Vector3(), d, len;
        n.links.forEach(function (k) { d = byId['h:' + k].p.clone().sub(n.p); len = d.length() || 1; f.addScaledVector(d, (len - 2.2) / len * 0.02); });
        nodes.forEach(function (m) {
          if (m === n) return; d = n.p.clone().sub(m.p); len = d.length() || 0.01;
          var min = m.hub ? 1.1 : 1.2; if (len < min) f.addScaledVector(d, (min - len) / len * 0.2);
        });
        f.addScaledVector(n.p, -0.004); n.p.add(f); if (n.p.length() > 3.3) n.p.setLength(3.3);
      });
    }

    var scene = new T.Scene(), cam = new T.PerspectiveCamera(38, 2, 0.1, 100), group = new T.Group(); scene.add(group);
    var nodeGeo = new T.SphereGeometry(1, 18, 14), hitMeshes = [], P = pal();
    nodes.forEach(function (n) {
      var color = n.hub ? P.indigo : (n.links.length ? P.gold : P.faint);
      n.mesh = new T.Mesh(nodeGeo, new T.MeshBasicMaterial({ color: color, transparent: true }));
      n.mesh.position.copy(n.p); n.mesh.scale.setScalar(n.r); group.add(n.mesh);
      var hit = new T.Mesh(nodeGeo, new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.copy(n.p); hit.scale.setScalar(n.hub ? 0.42 : 0.3); hit.userData.id = n.id; group.add(hit); hitMeshes.push(hit);
    });
    var pos = new Float32Array(edges.length * 6);
    edges.forEach(function (e, i) { var a = byId[e.a].p, b = byId[e.b].p; pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); });
    var baseGeo = new T.BufferGeometry(); baseGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
    var baseLines = new T.LineSegments(baseGeo, new T.LineBasicMaterial({ color: P.muted, transparent: true, opacity: 0.3 })); group.add(baseLines);
    var hiLines = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: P.gold, transparent: true, opacity: 1 })); group.add(hiLines);

    function buildLabels() {
      var p = pal();
      nodes.forEach(function (n) {
        if (n.sp) { group.remove(n.sp); disposeSprite(n.sp); }
        n.sp = textSprite(T, n.label, n.hub
          ? { px: 17, h: 0.34, weight: '600', family: "Fraunces, Georgia, serif", color: p.ink, halo: p.bg }
          : { px: 13, h: 0.25, weight: '500', family: "'IBM Plex Mono', monospace", color: p.muted, halo: p.bg });
        n.sp.position.copy(n.p).add(new T.Vector3(0, n.hub ? 0.42 : 0.26, 0)); group.add(n.sp);
      });
      var c = pal();
      nodes.forEach(function (n) { n.mesh.material.color.set(n.hub ? c.indigo : (n.links.length ? c.gold : c.faint)); });
      baseLines.material.color.set(c.muted); hiLines.material.color.set(c.gold);
      apply();
    }

    var selected = null, hover = null, need = true, visible = false;
    function effective() { return selected || hover; }
    function litSet(id) { var lit = {}; if (id) { lit[id] = 1; edges.forEach(function (e) { if (e.a === id || e.b === id) { lit[e.a] = 1; lit[e.b] = 1; } }); } return lit; }
    function apply() {
      var id = effective(), lit = litSet(id);
      nodes.forEach(function (n) {
        var on = !id || lit[n.id];
        n.mesh.material.opacity = on ? 1 : 0.16;
        n.sp.material.opacity = n.hub ? (on ? 1 : 0.25) : (n.links.length ? (id && lit[n.id] ? 1 : 0) : (on ? 0.8 : 0.1));
        n.mesh.scale.setScalar(n.r * (n.id === id ? 1.55 : 1));
      });
      var sel = edges.filter(function (e) { return id && (e.a === id || e.b === id); }), arr = new Float32Array(sel.length * 6);
      sel.forEach(function (e, i) { var a = byId[e.a].p, b = byId[e.b].p; arr.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); });
      hiLines.geometry.dispose(); hiLines.geometry = new T.BufferGeometry(); hiLines.geometry.setAttribute('position', new T.BufferAttribute(arr, 3));
      baseLines.material.opacity = id ? 0.07 : 0.3;
      chips.forEach(function (c) { var nid = 's:' + c.textContent.trim(); c.classList.toggle('sel', !!id && lit[nid] === 1); c.setAttribute('aria-pressed', selected === nid ? 'true' : 'false'); });
      need = true;
    }
    function names(ids) { return ids.map(function (k) { return hubById[k].label; }); }
    function renderInfo() {
      var id = effective(); info.textContent = '';
      if (!id) { info.appendChild(mk('span', 'ci-hint', 'Select a skill or a project to see how they connect. Drag to rotate.')); return; }
      var n = byId[id];
      info.appendChild(mk('strong', null, n.label));
      if (n.hub) {
        var sk = edges.filter(function (e) { return e.b === id; }).map(function (e) { return byId[e.a].label; });
        info.appendChild(document.createTextNode(' · connects to ' + sk.length + ' skills: ' + sk.join(', ') + '. '));
        var a = mk('a', null, 'Jump to ' + (n.key === 'diss' ? 'dissertation' : 'project') + ' ↓'); a.href = n.href; info.appendChild(a);
      } else if (n.links.length) {
        info.appendChild(document.createTextNode(' · used in ' + n.links.length + (n.links.length === 1 ? ' project: ' : ' projects: ')));
        n.links.forEach(function (k, i) { var a = mk('a', null, hubById[k].label); a.href = hubById[k].href; info.appendChild(a); if (i < n.links.length - 1) info.appendChild(document.createTextNode(', ')); });
      } else {
        info.appendChild(document.createTextNode(' · a working tool, not tied to a single project card.'));
      }
    }
    function setSel(id) { selected = (selected === id) ? null : id; apply(); renderInfo(); }

    chips.forEach(function (c) {
      c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0'); c.setAttribute('aria-pressed', 'false'); c.classList.add('clickable');
      var go = function () { setSel('s:' + c.textContent.trim()); };
      c.addEventListener('click', go); c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    var ry = 0.5, rx = 0.28, tRY = 0.5, tRX = 0.28, dragging = false, lastX = 0, lastY = 0, moved = 0, idleAt = 0;
    var ray = new T.Raycaster(), ptr = new T.Vector2();
    function pick(e) {
      var r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, cam); var hit = ray.intersectObjects(hitMeshes, false)[0]; return hit ? hit.object.userData.id : null;
    }
    cv.addEventListener('pointerdown', function (e) { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (x) {} cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', function (e) {
      if (dragging) { var dx = e.clientX - lastX, dy = e.clientY - lastY; moved += Math.abs(dx) + Math.abs(dy); tRY += dx * 0.006; tRX = Math.max(-0.7, Math.min(0.9, tRX + dy * 0.004)); lastX = e.clientX; lastY = e.clientY; need = true; return; }
      var id = pick(e); if (id !== hover) { hover = id; apply(); if (!selected) renderInfo(); } cv.style.cursor = id ? 'pointer' : 'grab';
    });
    function up(e) { dragging = false; cv.style.cursor = 'grab'; idleAt = performance.now() + 3000; if (moved < 5) { var id = pick(e); if (id) setSel(id); else if (selected) setSel(selected); } }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', function () { dragging = false; });
    cv.addEventListener('pointerleave', function () { if (hover) { hover = null; apply(); if (!selected) renderInfo(); } });

    function resize() {
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      var f = Math.tan(19 * Math.PI / 180), need1 = 7.3 / (f * Math.min(cam.aspect, 1.4)), d = Math.max(need1, 12); cam.position.set(0, 0, d); need = true;
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
    watchVisible(host, function (v) { visible = v; if (v) need = true; });
    onTheme(function () { buildLabels(); });
    buildLabels(); renderInfo(); resize();

    var last = performance.now();
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!reduce && !dragging && !selected && !hover && now > idleAt) { tRY += dt * 0.16; need = true; }
      var nry = ry + (tRY - ry) * 0.14, nrx = rx + (tRX - rx) * 0.14;
      if (Math.abs(nry - ry) > 1e-4 || Math.abs(nrx - rx) > 1e-4) need = true; ry = nry; rx = nrx;
      if (need) { group.rotation.set(rx, ry, 0); renderer.render(scene, cam); need = false; }
    })(last);
  }

  /* ---------- 2. 3D project wall ---------- */
  function initWall(T) {
    var host = document.getElementById('projectWall'), cv = document.getElementById('wallCv');
    if (!host || !cv) return;
    var entries = [].slice.call(document.querySelectorAll('#projects .entry'));
    if (!entries.length) return;
    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { host.classList.add('nogl'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;

    var data = entries.map(function (el) {
      var img = el.querySelector('.entry-thumb'), demo = el.querySelector('.link-demo');
      return { el: el, id: el.id, title: (el.querySelector('h3') || {}).textContent || '', src: img ? img.currentSrc || img.src : '',
        badges: [].slice.call(el.querySelectorAll('.badge')).map(function (b) { return b.textContent.trim(); }),
        host: demo ? demo.hostname : '', image: null, state: null };
    });
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(32, 3, 0.1, 100), group = new T.Group(); scene.add(group);
    scene.add(new T.AmbientLight(0xffffff, 0.95)); var key = new T.DirectionalLight(0xffffff, 0.45); key.position.set(-3, 4, 8); scene.add(key);
    var CW = 2.4, CH = 1.55, N = data.length, R = 9, STEP = 0.3, cards = [];
    var geo = new T.BoxGeometry(CW, CH, 0.06);

    function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
    function paint(d) {
      var p = pal(), c = document.createElement('canvas'), W = 720, H = Math.round(720 * CH / CW), x;
      c.width = W; c.height = H; x = c.getContext('2d');
      x.fillStyle = p.alt; x.fillRect(0, 0, W, H);
      var ih = Math.round(H * 0.64);
      if (d.image && d.image.naturalWidth) {
        var iw = d.image.naturalWidth, ihh = d.image.naturalHeight, s = Math.max(W / iw, ih / ihh), sw = W / s, sh = ih / s;
        x.drawImage(d.image, (iw - sw) / 2, (ihh - sh) / 2, sw, sh, 0, 0, W, ih);
      } else { x.fillStyle = p.line; x.fillRect(0, 0, W, ih); }
      x.fillStyle = p.line; x.fillRect(0, ih, W, 3);
      x.fillStyle = p.ink; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
      var fs = 40; x.font = '600 ' + fs + 'px Fraunces, Georgia, serif'; while (x.measureText(d.title).width > W - 56 && fs > 24) { fs -= 2; x.font = '600 ' + fs + 'px Fraunces, Georgia, serif'; }
      x.fillText(d.title, 28, ih + 58);
      var bx = 28; x.font = "500 20px 'IBM Plex Mono', monospace";
      d.badges.forEach(function (b) {
        var w = x.measureText(b.toUpperCase()).width + 26; x.lineWidth = 2; x.strokeStyle = b === 'Live' ? p.green : (b === 'Flagship' ? p.gold : p.faint);
        rr(x, bx, ih + 78, w, 34, 17); x.stroke(); x.fillStyle = x.strokeStyle; x.fillText(b.toUpperCase(), bx + 13, ih + 102); bx += w + 10;
      });
      if (d.state === 'up' || d.state === 'down') {
        x.fillStyle = d.state === 'up' ? p.green : '#C2362B'; x.beginPath(); x.arc(W - 36, ih + 95, 10, 0, 7); x.fill();
        x.fillStyle = p.muted; x.font = "500 17px 'IBM Plex Mono', monospace"; x.textAlign = 'right'; x.fillText(d.state === 'up' ? 'RESPONDING' : 'UNREACHABLE', W - 56, ih + 101);
      }
      var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
    }
    function build() {
      var p = pal();
      cards.forEach(function (c) { group.remove(c.mesh); c.mesh.material.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); });
      cards = data.map(function (d, i) {
        var th = (i - (N - 1) / 2) * STEP, edge = new T.MeshBasicMaterial({ color: new T.Color(p.line) }), face = new T.MeshBasicMaterial({ map: paint(d) });
        var m = new T.Mesh(geo, [edge, edge, edge, edge, face, edge.clone()]);
        m.position.set(R * Math.sin(th), 0, R * (1 - Math.cos(th))); m.rotation.y = -th; m.userData = { i: i, lift: 0, base: m.position.clone() };
        group.add(m); return { mesh: m, d: d };
      });
      need = true;
    }
    var need = true, visible = false, hover = -1, px = 0, tpx = 0, downAt = null;
    data.forEach(function (d) { if (!d.src) return; var im = new Image(); im.onload = function () { d.image = im; build(); }; im.src = d.src; });
    fetch('/api/status').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.monitors) return; var any = false;
      data.forEach(function (d) { var s = j.monitors[d.host]; if (s === 'up' || s === 'down') { d.state = s; any = true; } }); if (any) build();
    }).catch(function () {});

    var ray = new T.Raycaster(), ptr = new T.Vector2();
    function pick(e) {
      var r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      scene.updateMatrixWorld(true); cam.updateMatrixWorld(true);
      ray.setFromCamera(ptr, cam); var hit = ray.intersectObjects(cards.map(function (c) { return c.mesh; }), false)[0]; return hit ? hit.object.userData.i : -1;
    }
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(); tpx = ((e.clientX - r.left) / r.width) * 2 - 1;
      var i = pick(e); if (i !== hover) { hover = i; cv.style.cursor = i >= 0 ? 'pointer' : 'default'; } need = true;
    });
    cv.addEventListener('pointerleave', function () { hover = -1; tpx = 0; need = true; });
    cv.addEventListener('pointerdown', function (e) { downAt = { x: e.clientX, y: e.clientY, i: pick(e) }; });
    cv.addEventListener('pointerup', function (e) {
      if (!downAt) return; var moved = Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y), i = pick(e);
      if (moved < 6 && i >= 0 && i === downAt.i) {
        var el = data[i].el; el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
        history.replaceState(null, '', '#' + el.id);
      }
      downAt = null;
    });

    function resize() {
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      var f = Math.tan(16 * Math.PI / 180), span = ((N - 1) * STEP > 0 ? R * Math.sin(((N - 1) / 2) * STEP) * 2 : 0) + CW + 3.4;
      var d = Math.max(span / (2 * f * cam.aspect), 11); cam.position.set(0, 0.35, d + 0.6); cam.lookAt(0, -0.05, 0.6); need = true;
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
    watchVisible(host, function (v) { visible = v; if (v) need = true; });
    onTheme(build); build(); resize();

    (function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      var moving = false;
      px += (tpx - px) * 0.08; if (Math.abs(tpx - px) > 0.002) moving = true;
      cards.forEach(function (c, i) {
        var target = i === hover ? 1 : 0, m = c.mesh, u = m.userData;
        u.lift += (target - u.lift) * 0.16; if (Math.abs(target - u.lift) > 0.003) moving = true;
        m.position.z = u.base.z + u.lift * 0.55; m.position.y = u.lift * 0.08; m.scale.setScalar(1 + u.lift * 0.07);
      });
      if (moving || need) { group.rotation.y = reduce ? 0 : px * -0.1; renderer.render(scene, cam); need = false; }
    })();
  }

  /* ---------- 3. Architecture flow tracer ---------- */
  function initTracer() {
    [].slice.call(document.querySelectorAll('.demo-details')).forEach(function (details) {
      var wrap = details.querySelector('.arch-wrap'), svg = wrap && wrap.querySelector('.arch-svg'); if (!svg) return;
      var shapes = [].slice.call(svg.querySelectorAll('rect.arch-box, rect.arch-key'));
      var nodes = shapes.map(function (r) { var els = [r], n = r.nextElementSibling; while (n && n.tagName.toLowerCase() === 'text') { els.push(n); n = n.nextElementSibling; } return els; });
      var bar = mk('div', 'trace-bar'), btn = mk('button', 'trace-btn', 'Trace flow'); btn.type = 'button';
      var note = mk('span', 'trace-note', ''); note.setAttribute('aria-live', 'polite'); bar.appendChild(btn); bar.appendChild(note); wrap.parentNode.insertBefore(bar, wrap);
      var timer = null;
      function clear() { svg.classList.remove('tracing'); nodes.forEach(function (g) { g.forEach(function (e) { e.classList.remove('lit'); }); }); }
      btn.addEventListener('click', function () {
        if (timer) { clearInterval(timer); timer = null; }
        clear(); if (reduce) { svg.classList.add('tracing'); nodes.forEach(function (g) { g.forEach(function (e) { e.classList.add('lit'); }); }); note.textContent = ''; return; }
        svg.classList.add('tracing'); var i = 0; btn.disabled = true;
        timer = setInterval(function () {
          if (i > 0) nodes[i - 1].forEach(function (e) { e.classList.remove('now'); });
          if (i >= nodes.length) { clearInterval(timer); timer = null; btn.disabled = false; note.textContent = 'Done'; setTimeout(function () { clear(); note.textContent = ''; }, 1600); return; }
          nodes[i].forEach(function (e) { e.classList.add('lit', 'now'); }); note.textContent = 'Step ' + (i + 1) + ' of ' + nodes.length; i++;
        }, 520);
      });
    });
  }

  /* ---------- 4. Dissertation at a glance ---------- */
  function initGlance() {
    var root = document.getElementById('dissGlance'); if (!root) return;
    var dots = root.querySelector('.dg-dots');
    if (dots && !dots.children.length) {
      var rnd = mulberry(11), TARGETS = 7;
      for (var i = 0; i < 68; i++) {
        var d = mk('i'), col = i % 12, row = Math.floor(i / 12), tgt = i % TARGETS;
        d.style.left = (4 + col * 8) + '%'; d.style.top = (6 + row * 15) + '%';
        d.style.setProperty('--x1', (9 + tgt * 13.7 + (rnd() - 0.5) * 7).toFixed(1) + '%');
        d.style.setProperty('--y1', (50 + (rnd() - 0.5) * 34).toFixed(1) + '%');
        dots.appendChild(d);
      }
    }
    function count(el) {
      var to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), t0 = performance.now(), dur = reduce ? 0 : 1100;
      (function step(now) { var k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3), v = to * e;
        el.textContent = (el.dataset.pre || '') + v.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (el.dataset.suf || '');
        if (k < 1) requestAnimationFrame(step); })(t0);
    }
    function play() { root.classList.add('in'); [].slice.call(root.querySelectorAll('[data-count]')).forEach(count); }
    if (!window.IntersectionObserver) { play(); } else {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); play(); } }, { threshold: 0.25 }); io.observe(root);
    }
    if (window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce) {
      [].slice.call(root.querySelectorAll('.dg-card')).forEach(function (el) {
        el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          el.classList.add('hot'); el.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg'); });
        el.addEventListener('pointerleave', function () { el.classList.remove('hot'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
      });
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    initTracer(); initGlance();
    threeReady(function () { var T = window.THREE; try { initConstellation(T); } catch (e) { console.warn('constellation', e); } try { initWall(T); } catch (e) { console.warn('wall', e); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
