/* ===========================================================
   Portfolio guide: a small 3D toy character that welcomes visitors,
   says one short line per section, opens the chat, and can be dragged.
   Placeholder model is built in code; drop a rigged .glb at
   img/guide/guide.glb and add <meta name="guide-model" content="img/guide/guide.glb">
   to swap it in. If WebGL is missing the guide never starts and the
   normal chat hint stays.
=========================================================== */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var html = document.documentElement;

  function store(area, k, v) {
    try { var s = window[area]; if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch (e) { return null; }
    return null;
  }
  var local = function (k, v) { return store('localStorage', k, v); };
  var sess = function (k, v) { return store('sessionStorage', k, v); };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  /* Lines the guide says. Scripted on purpose: instant, free, and every claim is on the page. */
  var TIPS = {
    profile: 'This is Raj. AI/ML Engineer, MSc at Warwick, and builder of agentic systems.',
    experience: 'Two years eight months at H&B Infotech, from intern to AI Engineer.',
    education: 'My MSc in Applied AI at Warwick is in here.',
    projects: 'Six systems. Try the 3D wall, and open an architecture panel to trace the flow.',
    papers: 'Four preprints on SSRN, all under review.',
    research: 'Looking for a PhD? These are the questions I want to work on.',
    dissertation: 'My dissertation on AI in life cycle assessment. The figures at a glance are the real numbers.',
    skills: 'Select a skill to see which projects use it.',
    certifications: 'Certified in deep learning, NLP, and generative AI.',
    'ask-ai': 'Ask me anything about my portfolio!',
    contact: 'Say hello. I am open to AI/ML roles and PhD positions.'
  };

  var PROJECT_INFO = {
    'project-semibot': 'SemiBot: agentic RAG for semiconductor analysis. Real-time data meets LLM reasoning.',
    'project-goldbot': 'GoldBot: forecasts gold prices with regime-aware ML plus a chat interface.',
    'project-silverbot': 'SilverBot: same agentic pipeline as GoldBot, tuned for the silver market.',
    'project-hallucination-detector': 'Hallucination Detector: catches when LLMs make things up using multi-source checks.',
    'project-hitl-email-agent': 'HITL Email Agent: drafts and sends emails with human approval in the loop.',
    'project-retail-research-assistant': 'Retail Research Assistant: retrieves and synthesises retail market reports with RAG.'
  };

  function start() {
    if (!window.THREE || local('guide-off') === '1') { if (local('guide-off') === '1') mountRestore(); return; }
    var T = window.THREE, test = document.createElement('canvas'), gl = null;
    try { gl = test.getContext('webgl') || test.getContext('experimental-webgl'); } catch (e) {}
    if (!gl) return;

    // track visits for analytics; tips fire every session on scroll
    if (!sess('guide-counted')) { sess('guide-counted', '1'); local('guide-visits', String((parseInt(local('guide-visits') || '0', 10) || 0) + 1)); }

    var root = mk('div', 'guide'), cv = mk('canvas', 'guide-cv'), bubble = mk('div', 'guide-bubble'), sr = mk('div', 'guide-sr'), x = mk('button', 'guide-x', '×');
    root.id = 'guide'; root.setAttribute('role', 'complementary'); root.setAttribute('aria-label', 'Portfolio guide');
    cv.setAttribute('tabindex', '0'); cv.setAttribute('role', 'button'); cv.setAttribute('aria-label', 'Guide. Press Enter to open the chat.');
    bubble.setAttribute('aria-hidden', 'true'); sr.setAttribute('aria-live', 'polite');
    x.type = 'button'; x.setAttribute('aria-label', 'Hide the guide');
    root.appendChild(bubble); root.appendChild(cv); root.appendChild(x); root.appendChild(sr);
    document.body.appendChild(root); html.classList.add('has-guide');

    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { root.remove(); html.classList.remove('has-guide'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    /* ---------- the character (placeholder) ---------- */
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(28, 1 / 1.05, 0.1, 50), stage = new T.Group(); scene.add(stage);
    cam.position.set(0, 0.25, 10.6); cam.lookAt(0, 0.15, 0);
    scene.add(new T.AmbientLight(0xffffff, 0.8)); var sun = new T.DirectionalLight(0xffffff, 0.75); sun.position.set(2.5, 3.5, 5); scene.add(sun);
    var ramp = new T.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, T.LuminanceFormat); ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true;
    var INK = 0x3b2f2a, sphere = new T.SphereGeometry(1, 28, 20);
    function toon(c) { return new T.MeshToonMaterial({ color: c, gradientMap: ramp }); }
    function blob(parent, color, p, s, o) {
      var g = new T.Group(), m = new T.Mesh(sphere, toon(color));
      g.add(m);
      if (!o || o.outline !== false) { var ol = new T.Mesh(sphere, new T.MeshBasicMaterial({ color: INK, side: T.BackSide })); ol.scale.setScalar(1.06); g.add(ol); }
      g.position.set(p[0], p[1], p[2]); g.scale.set(s[0], s[1], s[2]); if (o && o.rot) g.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
      parent.add(g); return g;
    }
    var rig = { root: new T.Group(), head: new T.Group(), body: null, armR: new T.Group(), armL: new T.Group(), sprout: new T.Group(), eyes: [], mouth: null, glb: false };
    stage.add(rig.root);
    var SKIN = 0xd9c4a5, CAP = 0x3a6b4f, SCARF = 0xc94b3a, HAIR = 0x3a2a1a;
    /* body — wider, sturdier */
    rig.body = blob(rig.root, SKIN, [0, -0.62, 0], [0.7, 0.72, 0.64]);
    blob(rig.root, 0xe8d5b8, [0, -0.58, 0.48], [0.42, 0.44, 0.2], { outline: false }); /* belly highlight */
    blob(rig.root, SKIN, [-0.32, -1.22, 0.15], [0.28, 0.18, 0.36]); blob(rig.root, SKIN, [0.32, -1.22, 0.15], [0.28, 0.18, 0.36]); /* feet */
    /* scarf wrapped around neck */
    var scarfRing = new T.Mesh(new T.TorusGeometry(0.48, 0.1, 8, 24), toon(SCARF));
    scarfRing.position.set(0, -0.05, 0.08); scarfRing.rotation.x = Math.PI / 2; rig.root.add(scarfRing);
    var scarfTail = blob(rig.root, SCARF, [0.35, -0.25, 0.32], [0.1, 0.22, 0.08], { rot: [0.15, 0, -0.4] });
    rig.head.position.set(0, 0.5, 0); rig.root.add(rig.head);
    /* head — slightly wider than tall for a boy jaw */
    blob(rig.head, SKIN, [0, 0.05, 0], [0.9, 0.78, 0.82]);
    /* messy hair tufts */
    blob(rig.head, HAIR, [0, 0.55, 0.15], [0.7, 0.28, 0.55], { outline: false }); /* top */
    blob(rig.head, HAIR, [-0.45, 0.42, 0.3], [0.25, 0.18, 0.2], { outline: false, rot: [0, 0, 0.3] }); /* left tuft */
    blob(rig.head, HAIR, [0.5, 0.44, 0.25], [0.22, 0.2, 0.18], { outline: false, rot: [0, 0, -0.35] }); /* right tuft */
    blob(rig.head, HAIR, [0.15, 0.65, 0.28], [0.16, 0.14, 0.14], { outline: false, rot: [0, 0, -0.2] }); /* cowlick */
    /* flat cap */
    var capBrim = new T.Mesh(new T.CylinderGeometry(0.65, 0.72, 0.08, 16, 1, false, 0, Math.PI), toon(CAP));
    capBrim.position.set(0, 0.52, 0.45); capBrim.rotation.x = -0.35; rig.head.add(capBrim);
    var capTop = blob(rig.head, CAP, [0, 0.62, 0.05], [0.68, 0.22, 0.58]);
    [-1, 1].forEach(function (sx) {
      /* eyes — slightly flatter (wider than tall) for a determined look */
      var e = blob(rig.head, 0x1a1210, [sx * 0.3, 0.06, 0.74], [0.1, 0.1, 0.06], { outline: false }); rig.eyes.push(e);
      blob(e, 0xffffff, [0.28, 0.32, 0.85], [0.3, 0.22, 0.28], { outline: false });
      /* thicker eyebrows — angled inward slightly for confidence */
      var brow = new T.Mesh(new T.BoxGeometry(0.18, 0.045, 0.04), new T.MeshBasicMaterial({ color: HAIR }));
      brow.position.set(sx * 0.3, 0.2, 0.76); brow.rotation.z = sx * -0.18; rig.head.add(brow);
    });
    blob(rig.head, 0x8a5440, [0, -0.04, 0.84], [0.04, 0.03, 0.03], { outline: false }); /* nose */
    /* confident grin — wider, asymmetric */
    rig.mouth = new T.Mesh(new T.TorusGeometry(0.08, 0.018, 6, 14, Math.PI * 0.7), new T.MeshBasicMaterial({ color: 0x5a3328 }));
    rig.mouth.position.set(0.02, -0.14, 0.8); rig.mouth.rotation.z = Math.PI + 0.15; rig.head.add(rig.mouth);
    /* no sprout — keep the group for animation compat but leave it empty */
    rig.sprout.position.set(0, 0.8, 0); rig.head.add(rig.sprout);
    [[rig.armL, -1], [rig.armR, 1]].forEach(function (a) {
      a[0].position.set(a[1] * 0.66, -0.38, 0.05); rig.root.add(a[0]);
      blob(a[0], SKIN, [a[1] * 0.1, -0.26, 0], [0.19, 0.32, 0.19], { rot: [0, 0, a[1] * 0.22] });
    });
    rig.armL.rotation.z = 0.15; rig.armR.rotation.z = -0.15;

    /* optional real model */
    var metaModel = document.querySelector('meta[name="guide-model"]');
    function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
    if (metaModel && metaModel.content) {
      fetch(metaModel.content).then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(); }).then(function (buf) {
        if (new DataView(buf).getUint32(0, true) !== 0x46546C67) throw 0;
        return (T.GLTFLoader ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js')).then(function () { return buf; });
      }).then(function (buf) {
        new T.GLTFLoader().parse(buf, '', function (gltf) {
          var m = gltf.scene, box = new T.Box3().setFromObject(m), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3()), k = 3.3 / (size.y || 1);
          var holder = new T.Group(); m.position.sub(ctr); holder.add(m); holder.scale.setScalar(k); holder.position.y = -1.3 + (size.y * k) / 2;
          stage.remove(rig.root);
          var find = function (re) { var f = null; m.traverse(function (o) { if (!f && re.test(o.name || '')) f = o; }); return f; };
          rig = { root: holder, head: find(/head/i), body: null, armR: find(/arm.?r|right.?arm/i), armL: null, sprout: null, eyes: [], mouth: null, glb: true };
          stage.add(holder);
          if (gltf.animations && gltf.animations.length) { mixer = new T.AnimationMixer(m); var idle = gltf.animations.filter(function (c) { return /idle/i.test(c.name); })[0] || gltf.animations[0]; mixer.clipAction(idle).play(); }
          dirty = true;
        }, function () {});
      }).catch(function () {});
    }
    var mixer = null;

    /* ---------- placement, drag ---------- */
    var W = 150, H = 158, anchored = true, drag = null, panel = document.getElementById('chatPanel'), pos = { x: 0, y: 0 };
    function size() { W = window.innerWidth <= 560 ? 108 : 150; H = Math.round(W * 1.05); root.style.width = W + 'px'; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
    function panelOpen() { return panel && panel.classList.contains('is-open'); }
    function place() {
      var vw = window.innerWidth, vh = window.innerHeight;
      root.classList.toggle('guide-away', panelOpen() && vw < 760);
      if (anchored) {
        pos.x = vw - W - 84; pos.y = vh - H - 12;
        if (panelOpen() && vw >= 760) pos.x = vw - 24 - 380 - 12 - W;
      }
      pos.x = clamp(pos.x, 4, Math.max(4, vw - W - 4)); pos.y = clamp(pos.y, 4, Math.max(4, vh - H - 4));
      root.style.left = pos.x + 'px'; root.style.top = pos.y + 'px';
      root.classList.toggle('bl', pos.x + W / 2 < vw / 2); root.classList.toggle('below', pos.y < 110);
    }
    size(); place();
    window.addEventListener('resize', function () { size(); place(); dirty = true; });
    if (panel && window.MutationObserver) new MutationObserver(place).observe(panel, { attributes: true, attributeFilter: ['class'] });

    var vx = 0, tilt = 0, dropAt = -1;
    cv.addEventListener('pointerdown', function (e) { drag = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false, lx: e.clientX }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) { drag.moved = true; anchored = false; root.classList.add('is-drag'); }
      if (drag.moved) { pos.x = drag.ox + dx; pos.y = drag.oy + dy; vx = e.clientX - drag.lx; drag.lx = e.clientX; place(); dirty = true; }
    });
    function detectDrop() {
      var cx = pos.x + W / 2, cy = pos.y + H / 2;
      root.style.pointerEvents = 'none';
      var el = document.elementFromPoint(cx, cy);
      root.style.pointerEvents = '';
      if (!el) return;
      var node = el;
      while (node && node !== document.body) {
        if (node.id && PROJECT_INFO[node.id]) { say(PROJECT_INFO[node.id], { replace: true, interrupt: true, hop: true }); return; }
        if (node.id === 'projectWall') { say('Drop me on a project card below to hear about it!', { replace: true, interrupt: true }); return; }
        node = node.parentElement;
      }
    }
    function release(e) {
      if (!drag) return; var moved = drag.moved; drag = null; root.classList.remove('is-drag'); dropAt = performance.now(); dirty = true;
      if (!moved && e && e.type === 'pointerup') { wave(); openChat(); }
      if (moved) detectDrop();
    }
    cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', function () { release(null); });
    cv.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wave(); openChat(); } });
    x.addEventListener('click', function () { local('guide-off', '1'); root.remove(); html.classList.remove('has-guide'); mountRestore(); });
    bubble.addEventListener('click', function () { openChat(); });

    function inView(el) { if (!el) return false; var r = el.getBoundingClientRect(), vh = window.innerHeight; return r.top < vh * 0.6 && r.bottom > vh * 0.3; }
    function openChat() {
      var ask = document.getElementById('ask-ai'), inp = document.getElementById('askInput'), fab = document.getElementById('chatFab');
      if (inView(ask) && inp) { inp.focus({ preventScroll: true }); return; }
      if (fab && !fab.classList.contains('is-hidden')) fab.click();
    }

    /* ---------- speech ---------- */
    var queue = [], busy = false, hideT = 0, typeT = 0, speaking = false;
    function say(text, o) {
      o = o || {};
      if (o.replace) queue = [];
      queue.push({ text: text, ms: o.ms || 5200, wave: !!o.wave, hop: !!o.hop });
      if (!busy) pump(); else if (o.interrupt) { clearTimeout(hideT); clearInterval(typeT); busy = false; pump(); }
    }
    function pump() {
      var item = queue.shift(); if (!item) { busy = false; bubble.classList.remove('is-on'); speaking = false; dirty = true; return; }
      busy = true; bubble.textContent = ''; bubble.classList.add('is-on'); sr.textContent = item.text;
      if (item.wave) wave(); if (item.hop) hop();
      var i = 0; speaking = true; clearInterval(typeT);
      var finish = function () { speaking = false; dirty = true; hideT = setTimeout(function () { bubble.classList.remove('is-on'); setTimeout(pump, 350); }, item.ms); };
      if (reduce) { bubble.textContent = item.text; finish(); return; }
      typeT = setInterval(function () { i++; bubble.textContent = item.text.slice(0, i); if (i >= item.text.length) { clearInterval(typeT); finish(); } }, 28);
    }

    /* ---------- section tips and welcome ---------- */
    var tipTimer = 0;
    function checkTips() {
      clearTimeout(tipTimer);
      tipTimer = setTimeout(function () {
        if (document.visibilityState !== 'visible') return;
        var vh = window.innerHeight, best = null;
        Object.keys(TIPS).forEach(function (id) {
          var el = document.getElementById(id); if (!el || sess('guide-tip-' + id)) return;
          var r = el.getBoundingClientRect();
          if (r.top < vh * 0.55 && r.bottom > vh * 0.25) best = id;
        });
        if (best) { sess('guide-tip-' + best, '1'); say(TIPS[best], { replace: true, interrupt: true, hop: best === 'ask-ai' }); }
      }, 350);
    }
    window.addEventListener('scroll', checkTips, { passive: true });
    if (!sess('guide-welcomed')) {
      sess('guide-welcomed', '1');
      setTimeout(function () { say("Hi, welcome to Raj's portfolio!", { wave: true, ms: 3200 }); say("I'm your guide. Click me to chat, or drag me around.", { ms: 5200 }); }, 1300);
    } else {
      setTimeout(checkTips, 900);
    }

    /* ---------- animation ---------- */
    var t0 = performance.now(), last = 0, dirty = true, blinkAt = t0 + 2500, blinkUntil = 0, waveAt = -1, hopAt = -1, look = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
    function wave() { waveAt = performance.now(); dirty = true; }
    function hop() { hopAt = performance.now(); dirty = true; }
    window.addEventListener('pointermove', function (e) {
      var r = root.getBoundingClientRect(); tgt.x = clamp((e.clientX - (r.left + r.width / 2)) / 420, -1, 1); tgt.y = clamp((e.clientY - (r.top + r.height / 2)) / 420, -1, 1);
      if (reduce) return; dirty = true;
    }, { passive: true });
    document.addEventListener('visibilitychange', function () { dirty = true; });

    function frame(now) {
      requestAnimationFrame(frame);
      if (document.hidden || !root.isConnected) return;
      if (now - last < 33) return; var dt = Math.min(0.1, (now - last) / 1000); last = now;
      var t = (now - t0) / 1000, r = rig, moving = !reduce || dirty;
      if (!moving) return;
      look.x += (tgt.x - look.x) * 0.12; look.y += (tgt.y - look.y) * 0.12;
      var lift = reduce ? 0 : Math.sin(t * 2.2) * 0.05, breath = reduce ? 0 : Math.sin(t * 2.2) * 0.018;
      var h = hopAt > 0 ? (now - hopAt) / 520 : 2; if (h >= 0 && h < 1) lift += Math.sin(h * Math.PI) * 0.55; else if (h >= 1) hopAt = -1;
      var dropK = dropAt > 0 ? (now - dropAt) / 700 : 2, squash = 0; if (dropK < 1) squash = Math.sin(dropK * Math.PI * 3) * (1 - dropK) * 0.12; else dropAt = -1;
      var dragging = !!(drag && drag.moved);
      tilt += ((dragging ? clamp(-vx * 0.03, -0.45, 0.45) : 0) - tilt) * 0.2; vx *= 0.85;
      stage.rotation.z = tilt; stage.position.y = lift + (dragging ? 0.25 : 0);
      stage.scale.set(1 - squash * 0.6, 1 + squash + breath, 1 - squash * 0.6);
      if (r.head) { r.head.rotation.y = look.x * 0.45 * (reduce ? 0 : 1); r.head.rotation.x = look.y * 0.25 * (reduce ? 0 : 1); }
      if (!r.glb) {
        if (r.sprout.children.length) r.sprout.rotation.z = reduce ? 0 : Math.sin(t * 1.7) * 0.22 + tilt * 0.8;
        if (now > blinkAt) { blinkUntil = now + 130; blinkAt = now + 3000 + Math.random() * 3000; }
        var by = now < blinkUntil ? 0.15 : 1; r.eyes.forEach(function (e) { e.scale.y = 0.1 * by; });
        r.mouth.scale.y = speaking && !reduce ? 0.6 + Math.abs(Math.sin(t * 16)) * 1.1 : 1;
        var w = waveAt > 0 ? (now - waveAt) / 1800 : 2, up = 0, wig = 0;
        if (w >= 0 && w < 1) { up = Math.sin(Math.min(1, w * 6) * Math.PI / 2) * (w > 0.85 ? (1 - w) / 0.15 : 1); wig = Math.sin(w * Math.PI * 9) * 0.35 * up; } else if (w >= 1) waveAt = -1;
        r.armR.rotation.z = -0.15 - up * 2.5 + wig + (dragging ? -1.2 : 0); r.armL.rotation.z = 0.15 + (dragging ? 1.2 : 0);
      } else if (r.armR && waveAt > 0) {
        var gw = (now - waveAt) / 1500; if (gw < 1) r.armR.rotation.z = Math.sin(gw * Math.PI * 8) * 0.4; else waveAt = -1;
      }
      if (mixer) mixer.update(dt);
      renderer.render(scene, cam); dirty = false;
    }
    requestAnimationFrame(frame);
  }

  function mountRestore() {
    if (document.getElementById('guideBack')) return;
    var b = mk('button', 'guide-back', 'Show guide'); b.id = 'guideBack'; b.type = 'button';
    b.addEventListener('click', function () { local('guide-off', '0'); b.remove(); start(); });
    document.body.appendChild(b);
  }

  function boot() { if (window.THREE) start(); else { window.addEventListener('load', function () { start(); }); } }
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
