/* ==========================================================================
   BurnFX — flamethrower mode.
   Hold (or tap) on any text: a flame stream ignites the letters, they glow,
   char, break off and fall as ash. Fire spreads along the text by itself.
   "Restore" (or switching the mode off) brings every letter back.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const lite = root.classList.contains('lite');
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const MAX_BURNING = lite ? 110 : 260;   // letters on fire at the same time
  const MAX_PARTS = lite ? 240 : 620;     // fire / smoke particles
  const STREAM_RATE = lite ? 5 : 10;      // flame particles per frame while firing
  const DPR = Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.5);

  // text we never burn: UI chrome, live-updating widgets, the marquee
  const SKIP = 'script,style,svg,canvas,textarea,input,select,.nav,.palette,.mobile-menu,.intro,.warp-card,.toast,' +
    '.flamer,.burn-hud,.shot-hud,.marquee,.debate__feed,.log,.lb,[data-clock],[data-count],.cursor';
  const BLOCK = 'p,h1,h2,h3,h4,h5,li,dt,dd,a,button,.chip,.stat__label,.split,small,label,.case__meta,.tk__top,.cred__year,.idcard__top,.status';

  let on = false, firing = false, burnt = 0;
  let tx = window.innerWidth * 0.45, ty = window.innerHeight * 0.45;
  const letters = [];
  const burning = new Set();
  const parts = [];

  /* ---------------- letters: split text into spans on demand ---------------- */
  function caretNode(x, y) {
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r && r.startContainer; }
    if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p && p.offsetNode; }
    return null;
  }
  function blockAt(x, y) {
    const n = caretNode(x, y);
    if (!n) return null;
    const el = n.nodeType === 3 ? n.parentElement : n;
    if (!el || !el.closest('#main') || el.closest(SKIP)) return null;
    if (el.classList.contains('bl')) return el.parentElement.closest(BLOCK) || el.parentElement;
    return el.closest(BLOCK) || el;
  }
  function split(block) {
    if (!block || block.dataset.burnSplit) return;
    block.dataset.burnSplit = '1';
    const list = [];
    if (block.classList.contains('split')) {
      block.querySelectorAll('.char').forEach((c) => list.push(c));
    } else {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const p = n.parentElement;
          if (!n.nodeValue.trim() || !p || p.classList.contains('bl') || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const n of nodes) {
        const frag = document.createDocumentFragment();
        for (const ch of n.nodeValue) {
          if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); continue; }
          const s = document.createElement('span');
          s.className = 'bl'; s.textContent = ch;
          frag.appendChild(s); list.push(s);
        }
        n.parentNode.replaceChild(frag, n);
      }
    }
    const start = letters.length;
    list.forEach((el, k) => letters.push({ el, block, i: start + k, start, end: start + list.length, state: 0, t: 0, x: 0, y: 0, w: 0, h: 0 }));
    measure(start, letters.length);
  }
  function measure(from = 0, to = letters.length) {
    const sx = window.scrollX, sy = window.scrollY;
    for (let i = from; i < to; i++) {
      const l = letters[i];
      if (l.state === 3 || !l.el.isConnected) continue;
      const r = l.el.getBoundingClientRect();
      l.x = r.left + sx; l.y = r.top + sy; l.w = r.width; l.h = r.height;
    }
  }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => measure(), 200); });

  /* ---------------- burning ---------------- */
  function igniteAt(x, y, R) {
    for (const [ox, oy] of [[0, 0], [R * 0.6, 0], [-R * 0.6, 0], [0, R * 0.55], [0, -R * 0.55]]) split(blockAt(x + ox, y + oy));
    const px = x + window.scrollX, py = y + window.scrollY, R2 = R * R;
    const now = performance.now();
    for (const l of letters) {
      if (l.state) continue;
      const dx = l.x + l.w / 2 - px, dy = l.y + l.h / 2 - py;
      if (dx * dx + dy * dy < R2) ignite(l, now);
    }
  }
  function ignite(l, now) {
    if (l.state || burning.size >= MAX_BURNING || !l.el.isConnected) return;
    l.state = 1; l.t = now; l.spread = false;
    l.fire = rand(420, 900); l.char = rand(300, 600);
    l.el.classList.add('bl--fire');
    burning.add(l);
  }
  function spread(l, now) {
    const i = l.i;
    for (const d of [-1, 1, -2, 2]) {
      const n = letters[i + d];
      if (n && n.block === l.block && Math.random() < (Math.abs(d) === 1 ? 0.9 : 0.4)) ignite(n, now);
    }
    // climb to the line above / below within the same block
    if (Math.random() < 0.45) {
      for (let k = Math.max(l.start, i - 90); k < Math.min(l.end, i + 90); k++) {
        const n = letters[k];
        if (n.state || Math.abs(n.x - l.x) > 12) continue;
        const dy = n.y - l.y;
        if (Math.abs(dy) > 6 && Math.abs(dy) < l.h * 1.8) { ignite(n, now); break; }
      }
    }
    // occasionally leap upward into the next block, like real fire climbing
    const vy = l.y - window.scrollY;
    if (Math.random() < 0.06 && vy > 0 && vy < window.innerHeight) igniteAt(l.x - window.scrollX + l.w / 2, vy - l.h * 1.1, 14);
  }
  function drop(l) {
    l.state = 3;
    burning.delete(l);
    burnt++;
    const vx = l.x - window.scrollX, vy = l.y - window.scrollY;
    l.el.classList.remove('bl--fire', 'bl--char');
    l.el.classList.add('bl--gone');
    if (vy > -80 && vy < window.innerHeight + 80) {
      const cs = getComputedStyle(l.el);
      const c = document.createElement('span');
      c.className = 'burn-clone';
      c.textContent = l.el.textContent;
      c.style.cssText = `left:${vx}px;top:${vy}px;height:${l.h}px;line-height:${l.h}px;` +
        `font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};letter-spacing:${cs.letterSpacing};`;
      layer().appendChild(c);
      const fall = window.innerHeight - vy + 80, dx = rand(-70, 70), rot = rand(-260, 260);
      const anim = c.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.25}px, ${-rand(4, 16)}px) rotate(${rot * 0.15}deg) scale(1)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${dx}px, ${fall}px) rotate(${rot}deg) scale(.55)`, opacity: 0 }
      ], { duration: rand(1100, 1900), easing: 'cubic-bezier(.4,0,.85,.55)', fill: 'forwards' });
      anim.onfinish = () => c.remove();
      for (let k = 0; k < (lite ? 1 : 3); k++) addPart(vx + rand(0, l.w), vy + l.h * 0.6, rand(-30, 30), rand(-60, -10), 1, rand(0.6, 1.1), rand(3, 7));
    }
    crackle();
    updateHud();
  }

  /* ---------------- fire canvas + particles ---------------- */
  let cv, ctx, W = 0, H = 0, raf = 0, lastT = performance.now(), lastIgnite = 0, glow = 0;
  const sprites = [];
  function ensureCanvas() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.className = 'fire-canvas'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    ctx = cv.getContext('2d');
    // pre-rendered soft sprites: hot core → yellow → orange → red, plus smoke
    const stops = [['#ffffff', '#fff3b0'], ['#fff1a8', '#ffb02e'], ['#ffb02e', '#ff5a12'], ['#ff6a1a', '#b31d05'], ['#7a7066', '#3a342e']];
    for (const [a, b] of stops) {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, a); grd.addColorStop(0.45, b); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      sprites.push(s);
    }
    size();
    window.addEventListener('resize', size);
  }
  function size() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  let layerEl;
  const layer = () => {
    if (!layerEl) { layerEl = document.createElement('div'); layerEl.className = 'burn-layer'; layerEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(layerEl); }
    return layerEl;
  };
  // kind: 0 flame, 1 smoke/ash
  function addPart(x, y, vx, vy, kind, life, sz, grow = 1) {
    if (parts.length >= MAX_PARTS) return;
    parts.push({ x, y, vx, vy, kind, life, age: 0, sz, grow });
  }
  const wake = () => { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); } };

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    aim(dt);

    // flame stream from the nozzle
    if (firing) {
      const [nx, ny] = tip();
      const dx = tx - nx, dy = ty - ny, dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist, uy = dy / dist;
      for (let i = 0; i < STREAM_RATE; i++) {
        const sp = rand(760, 1050), a = rand(-0.07, 0.07);
        const vx = (ux * Math.cos(a) - uy * Math.sin(a)) * sp, vy = (ux * Math.sin(a) + uy * Math.cos(a)) * sp;
        const travel = dist / sp;
        addPart(nx + rand(-2, 2), ny + rand(-2, 2), vx, vy, 0, travel * rand(0.95, 1.15) + rand(0.15, 0.35), rand(3, 6), travel);
      }
      if (now - lastIgnite > 70) { lastIgnite = now; igniteAt(tx, ty, coarse ? 36 : 30); }
      glow = Math.min(1, glow + dt * 6);
    } else glow = Math.max(0, glow - dt * 4);

    // burning letters: flicker flames on top, then char, then fall
    const sx = window.scrollX, sy = window.scrollY;
    let emitBudget = lite ? 18 : 45;
    for (const l of burning) {
      const age = now - l.t;
      if (l.state === 1 && !l.spread && age > 170) { l.spread = true; spread(l, now); }
      if (l.state === 1 && age > l.fire) { l.state = 2; l.el.classList.replace('bl--fire', 'bl--char'); }
      else if (l.state === 2 && age > l.fire + l.char) { drop(l); continue; }
      const vy = l.y - sy;
      if (emitBudget > 0 && vy > -20 && vy < H + 20 && Math.random() < (l.state === 1 ? 0.5 : 0.18)) {
        emitBudget--;
        addPart(l.x - sx + rand(0, l.w), vy + l.h * rand(0.2, 0.6), rand(-12, 12), rand(-120, -50), l.state === 1 ? 0 : 1, rand(0.3, 0.6), rand(3, l.state === 1 ? 9 : 6));
      }
    }
    if (burning.size && Math.random() < Math.min(0.5, burning.size / 60)) crackle(true);

    // draw
    ctx.clearRect(0, 0, W, H);
    if (glow > 0.01) {
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 140);
      g.addColorStop(0, `rgba(255,150,40,${0.28 * glow})`); g.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = g; ctx.fillRect(tx - 140, ty - 140, 280, 280);
    }
    // smoke first (normal blend), then flames (additive)
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalCompositeOperation = pass === 0 ? 'source-over' : 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (pass === 0) {
          p.age += dt;
          if (p.age >= p.life) { parts.splice(i, 1); continue; }
          if (p.kind === 0 && p.age > p.grow) { p.vx *= 0.9; p.vy = p.vy * 0.9 - 420 * dt; } // splash, then rise
          else if (p.kind === 1) { p.vx *= 0.98; p.vy -= 30 * dt; }
          p.x += p.vx * dt; p.y += p.vy * dt;
        }
        const t = p.age / p.life;
        if ((pass === 0) !== (p.kind === 1)) continue;
        let spr, size, alpha;
        if (p.kind === 1) { spr = sprites[4]; size = p.sz * (1 + t * 3); alpha = 0.22 * (1 - t); }
        else {
          spr = sprites[t < 0.12 ? 0 : t < 0.35 ? 1 : t < 0.65 ? 2 : 3];
          size = p.sz * (1 + t * 4.5); alpha = 0.9 * (1 - t);
        }
        ctx.globalAlpha = alpha;
        ctx.drawImage(spr, p.x - size, p.y - size, size * 2, size * 2);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    if (on || parts.length || burning.size) raf = requestAnimationFrame(frame);
  }

  /* ---------------- the flamethrower ---------------- */
  let gun, gunAngle = -2.4;
  const PIV = [70, 62], TIP = [234, 57];
  function buildGun() {
    if (gun) return;
    gun = document.createElement('div');
    gun.className = 'flamer'; gun.setAttribute('aria-hidden', 'true');
    gun.innerHTML = `
<svg class="flamer__gun" viewBox="0 0 250 104" width="250" height="104">
  <defs>
    <linearGradient id="fmMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8a95"/><stop offset=".45" stop-color="#3a3a42"/><stop offset="1" stop-color="#55555e"/></linearGradient>
    <linearGradient id="fmTank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a3d"/><stop offset=".5" stop-color="#e2470f"/><stop offset="1" stop-color="#9c2c06"/></linearGradient>
    <linearGradient id="fmDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2b31"/><stop offset="1" stop-color="#121215"/></linearGradient>
  </defs>
  <path d="M38 84 C 36 102, 112 102, 118 74" fill="none" stroke="#1a1a1e" stroke-width="7" stroke-linecap="round"/>
  <rect x="14" y="38" width="62" height="46" rx="20" fill="url(#fmTank)" stroke="#5a1a03" stroke-width="1.5"/>
  <rect x="22" y="44" width="46" height="5" rx="2.5" fill="#ffb27a" opacity=".55"/>
  <rect x="30" y="38" width="4" height="46" fill="#5a1a03" opacity=".5"/><rect x="56" y="38" width="4" height="46" fill="#5a1a03" opacity=".5"/>
  <rect x="62" y="45" width="92" height="28" rx="9" fill="url(#fmMetal)" stroke="#1c1c20" stroke-width="1.5"/>
  <rect x="70" y="51" width="44" height="5" rx="2.5" fill="#ff5b1f"/>
  <path d="M86 71 l-9 27 h17 l7 -27z" fill="url(#fmDark)"/>
  <rect x="150" y="50" width="70" height="15" rx="5" fill="url(#fmMetal)" stroke="#1c1c20" stroke-width="1.2"/>
  <rect x="162" y="49" width="5" height="17" rx="1.5" fill="#26262b"/><rect x="176" y="49" width="5" height="17" rx="1.5" fill="#26262b"/><rect x="190" y="49" width="5" height="17" rx="1.5" fill="#26262b"/>
  <rect x="154" y="64" width="11" height="22" rx="3.5" fill="url(#fmDark)"/>
  <rect x="216" y="45" width="18" height="25" rx="4" fill="url(#fmDark)" stroke="#ff5b1f" stroke-width="1.4"/>
  <g class="flamer__pilot"><path d="M234 57 q9 -7 16 0 q-7 7 -16 0z" fill="#ffb02e"/><path d="M234 57 q6 -3.5 10 0 q-4 3.5 -10 0z" fill="#8fd0ff"/></g>
</svg>`;
    document.body.appendChild(gun);
  }
  const gunScale = () => (window.innerWidth < 600 ? 0.72 : 1);
  const pivot = () => (window.innerWidth < 600
    ? [window.innerWidth * 0.64, window.innerHeight - 18]
    : [window.innerWidth - 150, window.innerHeight - 28]);
  function aim(dt) {
    if (!gun || !on) return;
    const [px, py] = pivot();
    const target = Math.atan2(ty - py, tx - px);
    let d = target - gunAngle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    gunAngle += d * Math.min(1, dt * 14);
    const s = gunScale(), flip = Math.cos(gunAngle) < 0 ? -1 : 1;
    gun.style.transform = `translate(${px - PIV[0]}px, ${py - PIV[1]}px) rotate(${gunAngle}rad) scale(${s}, ${s * flip})`;
  }
  function tip() {
    const [px, py] = pivot();
    const s = gunScale(), flip = Math.cos(gunAngle) < 0 ? -1 : 1;
    const lx = (TIP[0] - PIV[0]) * s, ly = (TIP[1] - PIV[1]) * s * flip;
    const c = Math.cos(gunAngle), sn = Math.sin(gunAngle);
    return [px + lx * c - ly * sn, py + lx * sn + ly * c];
  }

  /* ---------------- sound: roar while firing + crackle ---------------- */
  let roar = null;
  function roarStart() {
    const A = window.GlassFX && window.GlassFX.audio();
    if (!A || roar) return;
    const { ctx: ac, master, noise } = A;
    const t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 900; bp.Q.value = 0.8;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.08);
    const src2 = ac.createBufferSource(); src2.buffer = noise; src2.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2600; hp.Q.value = 0.9;
    const g2 = ac.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
    src.connect(bp); bp.connect(g); g.connect(master);
    src2.connect(hp); hp.connect(g2); g2.connect(master);
    src.start(t, rand(0, 1)); src2.start(t, rand(0, 1));
    roar = { ac, src, src2, g, g2 };
  }
  function roarStop() {
    if (!roar) return;
    const { ac, src, src2, g, g2 } = roar;
    const t = ac.currentTime;
    for (const gg of [g, g2]) { gg.gain.cancelScheduledValues(t); gg.gain.setValueAtTime(gg.gain.value || 0.0001, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); }
    src.stop(t + 0.2); src2.stop(t + 0.2);
    roar = null;
  }
  function crackle(soft) {
    const A = window.GlassFX && window.GlassFX.audio();
    if (!A) return;
    const { ctx: ac, master, noise } = A;
    const t = ac.currentTime + rand(0, 0.05);
    const src = ac.createBufferSource(); src.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = rand(1800, 5200);
    const g = ac.createGain(); const dur = rand(0.008, 0.035);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(soft ? rand(0.04, 0.1) : rand(0.08, 0.18), t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, rand(0, 1.2)); src.stop(t + dur + 0.02);
  }

  /* ---------------- input ---------------- */
  const excluded = (t) => !(t instanceof Element) || t.closest('.nav, .palette, .mobile-menu, .intro, .burn-hud, [data-no-shoot]');
  let holdTimer = null, downX = 0, downY = 0, burstTimer = null, activeTouch = false, fireStart = 0;
  function startFire() {
    if (firing) return;
    firing = true; fireStart = performance.now();
    gun && gun.classList.add('is-firing');
    roarStart();
    wake();
  }
  function stopFire() {
    if (!firing) return;
    firing = false;
    gun && gun.classList.remove('is-firing');
    roarStop();
  }
  document.addEventListener('pointerdown', (e) => {
    if (!on || e.button !== 0 || excluded(e.target) || (window.GlassFX && window.GlassFX.isIntroOpen())) return;
    tx = e.clientX; ty = e.clientY;
    if (e.pointerType === 'mouse') { startFire(); return; }
    // touch: tap = short burst, press-and-hold = continuous fire, swipe = scroll
    activeTouch = true; downX = e.clientX; downY = e.clientY;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { if (activeTouch) startFire(); }, 170);
  }, { passive: true });
  document.addEventListener('pointermove', (e) => {
    if (!on) return;
    if (e.pointerType === 'mouse') { tx = e.clientX; ty = e.clientY; wake(); return; }
    if (activeTouch) {
      if (!firing && Math.hypot(e.clientX - downX, e.clientY - downY) > 12) { activeTouch = false; clearTimeout(holdTimer); }
      else if (firing) { tx = e.clientX; ty = e.clientY; }
    }
  }, { passive: true });
  const burst = (ms) => { clearTimeout(burstTimer); burstTimer = setTimeout(() => { burstTimer = null; stopFire(); }, ms); };
  const release = (e) => {
    if (!on) return;
    if (e.pointerType !== 'mouse' && activeTouch && !firing) {
      clearTimeout(holdTimer); startFire(); burst(380);      // quick tap → short burst
    } else if (firing && !burstTimer) {
      const held = performance.now() - fireStart;
      if (held < 240) burst(240 - held); else stopFire();     // a click still gives a visible puff
    }
    activeTouch = false; clearTimeout(holdTimer);
  };
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', (e) => { activeTouch = false; clearTimeout(holdTimer); if (e.pointerType !== 'mouse') stopFire(); }, { passive: true });
  window.addEventListener('blur', stopFire);
  // in burn mode, links inside the page don't navigate (so you can torch them)
  document.addEventListener('click', (e) => {
    if (!on || excluded(e.target)) return;
    const a = e.target instanceof Element && e.target.closest('#main a');
    if (a) e.preventDefault();
  }, true);

  /* ---------------- HUD, toggle, restore ---------------- */
  let hud;
  function buildHud() {
    if (hud) return;
    hud = document.createElement('div');
    hud.className = 'burn-hud'; hud.setAttribute('data-no-shoot', '');
    hud.innerHTML = '<span class="burn-hud__icon" aria-hidden="true">🔥</span><b>0</b><span>letters burnt</span><button type="button" class="burn-hud__restore">Restore ↺</button>';
    hud.querySelector('button').addEventListener('click', restore);
    document.body.appendChild(hud);
  }
  function updateHud() { if (hud) hud.querySelector('b').textContent = burnt; }

  function restore() {
    stopFire();
    const now = performance.now();
    let k = 0;
    for (const l of letters) {
      if (!l.state) continue;
      l.el.classList.remove('bl--fire', 'bl--char', 'bl--gone');
      l.state = 0;
      if (l.el.animate && k++ < 900) {
        l.el.animate([{ opacity: 0, filter: 'blur(6px)', color: '#ff8a3d' }, { opacity: 1, filter: 'blur(0)' }],
          { duration: 600, delay: rand(0, 450), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      }
    }
    burning.clear();
    parts.length = 0;
    if (layerEl) layerEl.innerHTML = '';
    burnt = 0; updateHud();
    if (window.GlassFX) window.GlassFX.whoosh();
    void now;
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('is-in');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('is-in'), 2400);
  }

  function setBurn(v, announce = true) {
    if (v && reduce) { toast('Burn mode is off because “reduce motion” is on'); return; }
    on = !!v;
    root.classList.toggle('burn-mode', on);
    const btn = document.getElementById('burnToggle');
    if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.classList.toggle('is-on', on); }
    if (on) {
      ensureCanvas(); buildGun(); buildHud();
      window.dispatchEvent(new CustomEvent('fxmode', { detail: 'burn' }));
      if (announce) toast(coarse ? 'Burn mode 🔥 tap or hold on any text' : 'Burn mode 🔥 hold the mouse on any text');
      wake();
    } else {
      stopFire();
      if (letters.some((l) => l.state)) restore();
      if (announce) toast('Burn mode off: text restored');
    }
  }
  window.addEventListener('fxmode', (e) => { if (e.detail !== 'burn' && on) setBurn(false, false); });

  function wire() {
    const btn = document.getElementById('burnToggle');
    if (!btn) return;
    if (reduce) { btn.hidden = true; return; }
    btn.addEventListener('click', () => setBurn(!on));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.BurnFX = { toggle: () => setBurn(!on), restore, isOn: () => on };
})();
