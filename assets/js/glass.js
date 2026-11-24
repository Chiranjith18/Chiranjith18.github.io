/* ==========================================================================
   GlassFX — shoot-to-break glass: sound, cracks, shards, intro, shoot mode.
   No dependencies. Sounds are synthesised live with the Web Audio API.
   Exposes window.GlassFX for main.js (intro + quick-menu commands).
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const local = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  /* ---------- device quality: fewer shards on weaker hardware ---------- */
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  let quality = cores <= 4 || memory <= 2 ? 0.55 : 1;
  if (quality < 1) root.classList.add('lite'); // lighter CSS transitions (no big blurs)
  const DPR = Math.min(window.devicePixelRatio || 1, quality < 1 ? 1 : 1.75);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isLight = () => root.dataset.theme === 'light';

  /* ======================================================================
     1. SOUND — gunshot + glass, generated from noise and oscillators
     ====================================================================== */
  const Sound = (() => {
    let ctx = null, master = null, noise = null;
    let enabled = local.get('sound') !== 'off';

    const init = () => {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 6;
      master = ctx.createGain(); master.gain.value = 0.6;
      master.connect(comp); comp.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 1.5);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    };

    const burst = ({ t, dur, type = 'lowpass', f0, f1, q = 0.7, gain = 1, attack = 0.002 }) => {
      const src = ctx.createBufferSource(); src.buffer = noise;
      const flt = ctx.createBiquadFilter(); flt.type = type; flt.Q.value = q;
      flt.frequency.setValueAtTime(f0, t);
      if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt); flt.connect(g); g.connect(master);
      src.start(t, Math.random() * 0.8); src.stop(t + dur + 0.05);
    };
    const tone = ({ t, type = 'sine', f0, f1, dur, gain }) => {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    };

    return {
      unlock: () => enabled && init(),
      shot() {
        if (!enabled || !init()) return;
        const t = ctx.currentTime + 0.004;
        burst({ t, dur: 0.035, type: 'highpass', f0: 2600, gain: 0.95, attack: 0.001 });       // crack
        burst({ t, dur: 0.3, type: 'lowpass', f0: 3400, f1: 260, q: 0.9, gain: 1 });             // body
        tone({ t, type: 'sine', f0: 165, f1: 40, dur: 0.22, gain: 0.95 });                       // thump
        burst({ t: t + 0.05, dur: 0.65, type: 'bandpass', f0: 900, f1: 220, q: 0.6, gain: 0.16 }); // room tail
      },
      glass(size = 0.5) {
        if (!enabled || !init()) return;
        const t = ctx.currentTime + 0.015;
        burst({ t, dur: 0.16 + 0.3 * size, type: 'highpass', f0: 3600, gain: 0.25 + 0.45 * size });
        burst({ t, dur: 0.07, type: 'bandpass', f0: 6200, q: 2.2, gain: 0.45 });
        const n = Math.round(5 + 14 * size);
        for (let i = 0; i < n; i++) {
          const f = rand(2200, 7600);
          tone({
            t: t + Math.random() * (0.2 + 0.7 * size),
            type: Math.random() < 0.5 ? 'sine' : 'triangle',
            f0: f, f1: f * rand(0.96, 1.03),
            dur: rand(0.04, 0.26), gain: rand(0.04, 0.11)
          });
        }
      },
      raw() { return enabled && init() ? { ctx, master, noise } : null; },
      whoosh() {
        if (!enabled || !init()) return;
        const t = ctx.currentTime + 0.08;
        burst({ t, dur: 0.6, type: 'bandpass', f0: 260, f1: 2600, q: 1.1, gain: 0.4, attack: 0.28 }); // rushing air
        tone({ t: t + 0.32, type: 'sine', f0: 95, f1: 34, dur: 0.7, gain: 0.75 });                    // deep boom
        burst({ t: t + 0.32, dur: 0.5, type: 'lowpass', f0: 900, f1: 120, gain: 0.35 });
      },
      get enabled() { return enabled; },
      set enabled(v) { enabled = !!v; local.set('sound', enabled ? 'on' : 'off'); if (enabled) init(); }
    };
  })();

  /* ======================================================================
     2. CRACK ART — pre-rendered once per hit into a small canvas
     ====================================================================== */
  function makeCrack(size = 0.5) {
    const R = (95 + 185 * size) * rand(0.85, 1.15);
    const S = Math.ceil(R * 2 + 16);
    const oc = document.createElement('canvas');
    oc.width = Math.ceil(S * DPR); oc.height = Math.ceil(S * DPR);
    const c = oc.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.translate(S / 2, S / 2);
    c.lineCap = 'round'; c.lineJoin = 'round';

    // frosted halo where the glass is crushed
    const halo = c.createRadialGradient(0, 0, 0, 0, 0, 30 + 26 * size);
    halo.addColorStop(0, 'rgba(255,255,255,.55)');
    halo.addColorStop(0.35, 'rgba(255,255,255,.18)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(0, 0, 30 + 26 * size, 0, Math.PI * 2); c.fill();

    const rays = 9 + Math.floor(Math.random() * 8);
    const lines = [];
    for (let i = 0; i < rays; i++) {
      let a = (i / rays) * Math.PI * 2 + rand(-0.25, 0.25);
      const len = R * rand(0.45, 1);
      const pts = [[0, 0]];
      let r = 0;
      while (r < len) {
        r += rand(7, 20); a += rand(-0.16, 0.16);
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      lines.push(pts);
      // a branch or two
      const branches = Math.random() < 0.7 ? 1 + (Math.random() < 0.4 ? 1 : 0) : 0;
      for (let b = 0; b < branches && pts.length > 4; b++) {
        const k = 2 + Math.floor(Math.random() * (pts.length - 3));
        let [bx, by] = pts[k];
        let ba = Math.atan2(by, bx) + (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 0.8);
        const bp = [[bx, by]];
        const bl = rand(16, 55);
        for (let s = 0; s < bl; s += rand(6, 13)) {
          ba += rand(-0.2, 0.2); bx += Math.cos(ba) * 9; by += Math.sin(ba) * 9; bp.push([bx, by]);
        }
        lines.push(bp);
      }
    }

    // concentric "spider-web" rings between neighbouring rays
    const rings = [0.16, 0.34, 0.58].map((f) => f * R * rand(0.85, 1.15));
    const ringPts = rings.map((rr) => lines.slice(0, rays).map((pts) => {
      let best = pts[pts.length - 1];
      for (const p of pts) if (Math.hypot(p[0], p[1]) >= rr) { best = p; break; }
      return Math.hypot(best[0], best[1]) >= rr * 0.8 ? best : null;
    }));

    const stroke = (pts, style, width) => {
      c.strokeStyle = style; c.lineWidth = width;
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    };
    const drawAll = (style, wMain, wRing) => {
      lines.forEach((pts, i) => stroke(pts, style, i < rays ? wMain : wMain * 0.7));
      ringPts.forEach((ring) => {
        for (let i = 0; i < ring.length; i++) {
          const p = ring[i], q = ring[(i + 1) % ring.length];
          if (!p || !q || Math.random() < 0.22) continue;
          const mx = (p[0] + q[0]) / 2 * 0.9, my = (p[1] + q[1]) / 2 * 0.9;
          c.strokeStyle = style; c.lineWidth = wRing;
          c.beginPath(); c.moveTo(p[0], p[1]); c.quadraticCurveTo(mx, my, q[0], q[1]); c.stroke();
        }
      });
    };
    drawAll('rgba(0,0,0,.38)', 2.2, 1.6);       // shadow pass (reads on light pages)
    drawAll('rgba(255,255,255,.92)', 1.05, 0.8); // highlight pass (reads on dark pages)

    // bullet hole
    const hole = 3.4 + 2.4 * size;
    c.fillStyle = 'rgba(255,255,255,.95)';
    for (let i = 0; i < 9; i++) { // chipped rim
      const a = rand(0, Math.PI * 2), r1 = hole + rand(1, 4);
      c.beginPath();
      c.moveTo(Math.cos(a) * hole, Math.sin(a) * hole);
      c.lineTo(Math.cos(a + 0.25) * r1, Math.sin(a + 0.25) * r1);
      c.lineTo(Math.cos(a + 0.5) * hole, Math.sin(a + 0.5) * hole);
      c.fill();
    }
    c.beginPath(); c.arc(0, 0, hole + 1.4, 0, Math.PI * 2); c.fill();
    const hg = c.createRadialGradient(-1, -1, 0, 0, 0, hole);
    hg.addColorStop(0, '#000'); hg.addColorStop(0.7, '#141414'); hg.addColorStop(1, '#3a3a3a');
    c.fillStyle = hg; c.beginPath(); c.arc(0, 0, hole, 0, Math.PI * 2); c.fill();

    return { img: oc, S };
  }

  /* ======================================================================
     3. FX OVERLAY — cracks on the "screen", flying shards, muzzle flashes
     ====================================================================== */
  const FX = (() => {
    let cv, ctx, w = 0, h = 0, raf = 0;
    const impacts = [], shards = [], flashes = [];
    const panes = [], rings = [], streaks = [];
    let whiteAt = -1;
    const MAX_IMPACTS = quality < 1 ? 8 : 14;

    const ensure = () => {
      if (cv) return;
      cv = document.createElement('canvas');
      cv.className = 'fx-canvas'; cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      ctx = cv.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
    };
    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      wake();
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

    let last = performance.now(), slowFrames = 0;
    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // adapt quality if the device struggles
      if (dt > 0.028 && shards.length) { if (++slowFrames > 12 && quality > 0.5) quality = 0.5; } else slowFrames = 0;

      ctx.clearRect(0, 0, w, h);

      for (let i = impacts.length - 1; i >= 0; i--) {
        const im = impacts[i];
        const age = now - im.born;
        const fadeAt = im.life - 1400;
        const a = age < fadeAt ? 1 : 1 - (age - fadeAt) / 1400;
        if (a <= 0) { impacts.splice(i, 1); continue; }
        const grow = clamp(age / 110, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        if (grow < 1) { ctx.beginPath(); ctx.arc(im.x, im.y, (im.S / 2) * (0.15 + 0.85 * grow), 0, Math.PI * 2); ctx.clip(); }
        ctx.drawImage(im.img, im.x - im.S / 2, im.y - im.S / 2, im.S, im.S);
        ctx.restore();
      }

      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.t += dt;
        s.vy += 1900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
        const a = 1 - clamp((s.t - 0.45) / 0.5, 0, 1);
        if (a <= 0 || s.y > h + 40) { shards.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(s.x, s.y); ctx.rotate(s.r);
        ctx.beginPath();
        ctx.moveTo(s.p[0], s.p[1]); ctx.lineTo(s.p[2], s.p[3]); ctx.lineTo(s.p[4], s.p[5]); ctx.closePath();
        ctx.fillStyle = isLight() ? 'rgba(170,200,215,.55)' : 'rgba(220,235,245,.42)';
        ctx.fill();
        ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.stroke();
        ctx.restore();
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        const k = (now - f.born) / 110;
        if (k >= 1) { flashes.splice(i, 1); continue; }
        const r = 18 + 46 * k;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, `rgba(255,255,240,${0.95 * (1 - k)})`);
        g.addColorStop(0.35, `rgba(255,190,90,${0.6 * (1 - k)})`);
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,230,170,${1 - k})`; ctx.lineWidth = 1.5;
        for (const a of f.sparks) {
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(a) * r * 0.4, f.y + Math.sin(a) * r * 0.4);
          ctx.lineTo(f.x + Math.cos(a) * r * 1.15, f.y + Math.sin(a) * r * 1.15);
          ctx.stroke();
        }
      }

      /* --- full-screen break: panes, shockwave, streaks, flash --- */
      for (let i = panes.length - 1; i >= 0; i--) {
        const p = panes[i];
        const t = (now - p.born) / 1000;
        const lt = t - p.delay;
        if (lt < 0) {
          // still in place: the crack web races outward from the impact
          if (p.d > p.far * clamp(t / 0.16, 0, 1)) continue;
          drawPane(p, 1, 1, 0.04);
          continue;
        }
        p.vy += 1500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.flip += p.vflip * dt;
        const a = 1 - clamp((lt - 0.3) / 0.45, 0, 1);
        if (a <= 0) { panes.splice(i, 1); continue; }
        const sc = 1 + p.grow * clamp(lt / 0.55, 0, 1);
        drawPane(p, a, sc, 0.05 + 0.32 * Math.abs(Math.sin(p.flip)));
      }
      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        const age = (now - s.born) / 1000;
        if (age < 0) continue;
        if (age > 0.5) { streaks.splice(i, 1); continue; }
        const r = s.r0 + s.speed * age, len = s.len * (1 + age * 3);
        ctx.globalAlpha = (1 - age / 0.5) * 0.75;
        ctx.strokeStyle = s.hot ? '#ff9a5c' : (isLight() ? 'rgba(40,30,20,.7)' : '#ffffff');
        ctx.lineWidth = s.wd;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(s.a) * r, s.y + Math.sin(s.a) * r);
        ctx.lineTo(s.x + Math.cos(s.a) * (r + len), s.y + Math.sin(s.a) * (r + len));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i];
        const k = (now - rg.born) / 520;
        if (k < 0) continue;
        if (k >= 1) { rings.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - k, 3);
        ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - k)})`; ctx.lineWidth = 2 + 10 * (1 - k);
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.far * e, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,91,31,${0.7 * (1 - k)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.far * e * 0.82, 0, Math.PI * 2); ctx.stroke();
      }
      if (whiteAt > 0) {
        const k = (now - whiteAt) / 160;
        if (k >= 0 && k < 1) { ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - k)})`; ctx.fillRect(0, 0, w, h); }
        else if (k >= 1) whiteAt = -1;
      }

      if (impacts.length || shards.length || flashes.length || panes.length || rings.length || streaks.length || whiteAt > 0) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    }

    function drawPane(p, alpha, sc, fill) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.cx + p.x, p.cy + p.y);
      ctx.rotate(p.r);
      ctx.scale(sc * (0.25 + 0.75 * Math.abs(Math.cos(p.flip))), sc);
      ctx.beginPath();
      p.pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.fillStyle = isLight() ? `rgba(150,185,205,${fill * 1.4})` : `rgba(225,240,255,${fill})`;
      ctx.fill();
      ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.stroke();
      ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
      ctx.restore();
    }

    return {
      hit(x, y, size = 0.5) {
        ensure();
        const { img, S } = makeCrack(size);
        impacts.push({ x, y, img, S, born: performance.now(), life: 6500 });
        while (impacts.length > MAX_IMPACTS) impacts.shift();
        flashes.push({ x, y, born: performance.now(), sparks: Array.from({ length: 7 }, () => rand(0, Math.PI * 2)) });
        const n = Math.round((4 + 8 * size) * quality);
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), sp = rand(80, 420);
          const sz = rand(3, 10);
          shards.push({
            x, y, t: 0, r: rand(0, 6), vr: rand(-12, 12),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(150, 420),
            p: [0, -sz, sz * rand(0.5, 1), sz * rand(0.3, 1), -sz * rand(0.5, 1), sz * rand(0.2, 0.9)]
          });
        }
        last = performance.now();
        wake();
      },
      /* the whole screen cracks, then explodes toward the viewer */
      screenBreak(ix, iy) {
        ensure();
        const now = performance.now();
        const { polys, far } = shatterGrid(ix, iy, w, h, quality < 1 ? 10 : 16, quality < 1 ? 64 : 44);
        for (const poly of polys) {
          let sx = 0, sy = 0;
          for (const [px, py] of poly) { sx += px; sy += py; }
          const cx = sx / poly.length, cy = sy / poly.length;
          const dx = cx - ix, dy = cy - iy, d = Math.hypot(dx, dy) || 1;
          const near = 1 - clamp(d / far, 0, 1);
          const sp = (260 + 1500 * near * near) * rand(0.75, 1.2);
          panes.push({
            pts: poly.map(([px, py]) => [px - cx, py - cy]), cx, cy, d, far,
            x: 0, y: 0, r: 0, flip: 0, born: now,
            vx: (dx / d) * sp, vy: (dy / d) * sp * 0.8 - rand(60, 260) * near,
            vr: rand(-1, 1) * (1 + 4 * near), vflip: rand(-1, 1) * (3 + 9 * near),
            grow: 0.2 + 1.3 * near, delay: 0.16 + (d / far) * 0.1
          });
        }
        rings.push({ x: ix, y: iy, far, born: now + 160 });
        const n = quality < 1 ? 22 : 46;
        for (let i = 0; i < n; i++) {
          streaks.push({
            x: ix, y: iy, a: rand(0, Math.PI * 2), r0: rand(20, 180), len: rand(50, 200),
            speed: rand(900, 2600), wd: rand(0.6, 2), hot: Math.random() < 0.25, born: now + 170 + rand(0, 120)
          });
        }
        whiteAt = now + 160;
        last = now;
        wake();
      },
      /* shockwave + speed streaks only (used by the intro, whose glass has its own canvas) */
      burst(ix, iy) {
        ensure();
        const now = performance.now();
        rings.push({ x: ix, y: iy, far: Math.hypot(w, h), born: now });
        const n = quality < 1 ? 22 : 46;
        for (let i = 0; i < n; i++) {
          streaks.push({ x: ix, y: iy, a: rand(0, Math.PI * 2), r0: rand(20, 180), len: rand(50, 220),
            speed: rand(900, 2600), wd: rand(0.6, 2), hot: Math.random() < 0.25, born: now + rand(0, 120) });
        }
        last = now;
        wake();
      },
      clear() { impacts.length = 0; shards.length = 0; flashes.length = 0; }
    };
  })();

  /* radial + ring grid of shared vertices, so the pieces tile the screen exactly */
  function shatterGrid(ix, iy, w, h, K, firstStep) {
    const angles = Array.from({ length: K }, (_, i) => ((i + rand(0.15, 0.85)) / K) * Math.PI * 2);
    const far = Math.hypot(Math.max(ix, w - ix), Math.max(iy, h - iy)) * 1.08;
    const radii = [0];
    let r = 0, step = firstStep;
    while (r < far) { r = Math.min(far, r + step * rand(0.75, 1.25)); radii.push(r); step *= 1.5; }
    const V = radii.map((rr, j) => angles.map((a) => {
      if (j === 0) return [ix, iy];
      const jr = j === radii.length - 1 ? rr * 1.05 : rr * rand(0.9, 1.1);
      const ja = a + rand(-0.06, 0.06);
      return [ix + Math.cos(ja) * jr, iy + Math.sin(ja) * jr];
    }));
    const polys = [];
    for (let j = 0; j < radii.length - 1; j++) {
      for (let i = 0; i < K; i++) {
        const i2 = (i + 1) % K;
        polys.push(j === 0 ? [[ix, iy], V[1][i], V[1][i2]] : [V[j][i], V[j + 1][i], V[j + 1][i2], V[j][i2]]);
      }
    }
    return { polys, far };
  }

  /* ======================================================================
     4. SHOOT MODE — click/tap anywhere to fire
     ====================================================================== */
  let shootOn = false, shots = 0;
  const hud = () => document.getElementById('shotHud');

  function shake() {
    const m = document.getElementById('main');
    if (!m || reduce) return;
    m.classList.remove('is-shaking'); void m.offsetWidth; m.classList.add('is-shaking');
  }
  function recoil() {
    const c = document.querySelector('.cursor');
    if (!c) return;
    c.classList.remove('is-firing'); void c.offsetWidth; c.classList.add('is-firing');
  }
  const vibrate = (p) => { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } };

  function countShot() {
    shots++;
    const el = hud();
    if (el) { el.querySelector('b').textContent = shots; el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }
  }

  function fire(x, y, size) {
    if (breaking) return;
    recoil();
    countShot();
    if (registerHit()) { breakTo(x, y); return; }
    Sound.shot();
    setTimeout(() => Sound.glass(0.35 + size * 0.4), 30);
    FX.hit(x, y, size);
    shake();
    vibrate(18);
  }

  /* ---------- 3 quick hits = the screen breaks → fly through to the next section ---------- */
  const SCREENS = [
    ['top', 'Back to the top'], ['about', 'About'], ['work', 'Selected work'],
    ['toolkit', 'Toolkit'], ['credentials', 'Credentials'], ['contact', 'Contact']
  ];
  const NEED = 3, WINDOW = 4500;
  const hitTimes = [];
  let breaking = false, pipTimer;

  function pips() {
    const now = performance.now();
    while (hitTimes.length && now - hitTimes[0] > WINDOW) hitTimes.shift();
    document.querySelectorAll('.shot-hud__pips i').forEach((p, i) => p.classList.toggle('on', i < hitTimes.length));
  }
  function registerHit() {
    hitTimes.push(performance.now());
    pips();
    clearTimeout(pipTimer);
    pipTimer = setTimeout(pips, WINDOW + 60);
    return hitTimes.length >= NEED;
  }

  function warp(cls, origin) {
    const main = document.getElementById('main');
    if (!main) return;
    main.style.transformOrigin = origin;
    main.classList.remove('warp-in', 'warp-out', 'is-shaking');
    void main.offsetWidth;
    main.classList.add(cls);
    if (cls === 'warp-in') setTimeout(() => main.classList.remove('warp-in'), 900);
  }

  function titleCard(num, name) {
    let c = document.querySelector('.warp-card');
    if (!c) {
      c = document.createElement('div');
      c.className = 'warp-card'; c.setAttribute('aria-hidden', 'true');
      c.innerHTML = '<span class="warp-card__num"></span><span class="warp-card__name"></span><span class="warp-card__bar"></span>';
      document.body.appendChild(c);
    }
    c.querySelector('.warp-card__num').textContent = `${String(num).padStart(2, '0')} / 05`;
    c.querySelector('.warp-card__name').textContent = name;
    c.classList.remove('is-on'); void c.offsetWidth; c.classList.add('is-on');
  }

  function breakTo(x, y) {
    breaking = true;
    hitTimes.length = 0; pips();
    const list = SCREENS.map(([id, name]) => [document.getElementById(id), name]).filter(([el]) => el);
    let cur = 0;
    list.forEach(([el], i) => { if (el.getBoundingClientRect().top <= window.innerHeight * 0.45) cur = i; });
    const nextIdx = (cur + 1) % list.length;
    const [next, name] = list[nextIdx];
    const nextTop = next.id === 'top' ? 0 : next.getBoundingClientRect().top + window.scrollY; // measure before any transform

    Sound.shot();
    setTimeout(() => Sound.glass(1), 20);
    Sound.whoosh();
    vibrate([30, 40, 70]);
    FX.clear();
    FX.screenBreak(x, y);

    setTimeout(() => warp('warp-out', `${x}px ${window.scrollY + y}px`), 150);
    setTimeout(() => {
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, nextTop);
      root.style.scrollBehavior = prev;
      titleCard(SCREENS.findIndex(([id]) => id === next.id), name);
      warp('warp-in', `50% ${window.scrollY + window.innerHeight / 2}px`);
    }, 150 + 430);
    setTimeout(() => { breaking = false; }, 1500);
  }

  function setShoot(on, announce, persist = true) {
    shootOn = !!on;
    root.classList.toggle('shoot-mode', shootOn);
    if (persist) local.set('shoot', shootOn ? 'on' : 'off'); // only remember real user choices
    if (shootOn) window.dispatchEvent(new CustomEvent('fxmode', { detail: 'shoot' }));
    const btn = document.getElementById('shootToggle');
    if (btn) { btn.setAttribute('aria-pressed', String(shootOn)); btn.classList.toggle('is-on', shootOn); }
    if (!shootOn) FX.clear();
    if (announce) toast(shootOn ? (coarse ? 'Shoot mode on: tap anywhere' : 'Shoot mode on: click anywhere') : 'Shoot mode off');
  }
  function setSound(on, announce) {
    Sound.enabled = on;
    const btn = document.getElementById('soundToggle');
    if (btn) { btn.setAttribute('aria-pressed', String(!!on)); btn.classList.toggle('is-muted', !on); btn.setAttribute('aria-label', on ? 'Mute sound' : 'Turn sound on'); }
    if (announce) toast(on ? 'Sound on 🔊' : 'Sound muted');
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('is-in');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-in'), 2200);
  }

  // Mouse fires instantly on press. Touch fires on a real tap ("click"),
  // so swiping to scroll on a phone never shoots.
  const excluded = (t) => t instanceof Element && t.closest('.nav__actions, .palette, .mobile-menu, .intro, [data-no-shoot], input, textarea');
  let lastMouseShot = 0;
  document.addEventListener('pointerdown', (e) => {
    if (!shootOn || e.button !== 0 || e.pointerType !== 'mouse' || excluded(e.target)) return;
    lastMouseShot = performance.now();
    fire(e.clientX, e.clientY, rand(0.35, 0.75));
  }, { passive: true });
  document.addEventListener('click', (e) => {
    if (!shootOn || e.detail === 0 || performance.now() - lastMouseShot < 700 || excluded(e.target)) return;
    fire(e.clientX, e.clientY, rand(0.35, 0.75));
  });

  /* ======================================================================
     5. INTRO — a pane of glass over the site. Two shots to break through.
     ====================================================================== */
  function shouldIntro() {
    if (reduce || !document.createElement('canvas').getContext) return false;
    if (/[?&]intro=1/.test(location.search)) return true;
    return session.get('glassIntro') !== 'done';
  }

  function intro() {
    return new Promise((resolve) => {
      session.set('glassIntro', 'done');
      const wrap = document.createElement('div');
      wrap.className = 'intro';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.setAttribute('aria-label', 'Intro: shoot the glass to enter');
      wrap.innerHTML =
        '<div class="intro__blur"></div><canvas class="intro__canvas"></canvas>' +
        '<div class="intro__ui">' +
        '<span class="intro__ping" aria-hidden="true"></span>' +
        '<div class="intro__bar"><span class="intro__note"></span>' +
        '<button class="intro__skip" type="button">Skip intro →</button></div></div>';
      document.body.appendChild(wrap);
      root.classList.add('intro-open');

      const cv = wrap.querySelector('canvas');
      const ctx = cv.getContext('2d');
      const note = wrap.querySelector('.intro__note');
      note.textContent = Sound.enabled ? '🔊 Sound on' : '🔇 Sound off';
      let w, h, hits = 0, broken = false, finished = false;
      const cracks = [];
      let caption = coarse ? 'Tap anywhere to shoot' : 'Click anywhere to shoot';
      const base = document.createElement('canvas');

      const finish = () => {
        if (finished) return;
        finished = true;
        root.classList.remove('intro-open');
        window.removeEventListener('keydown', onKey);
        resolve();
      };

      function drawBase() {
        w = window.innerWidth; h = window.innerHeight;
        for (const c of [cv, base]) { c.width = Math.round(w * DPR); c.height = Math.round(h * DPR); }
        const b = base.getContext('2d');
        b.setTransform(DPR, 0, 0, DPR, 0, 0);
        const light = isLight();
        b.fillStyle = light ? 'rgba(238,234,226,.9)' : 'rgba(9,9,12,.86)';
        b.fillRect(0, 0, w, h);
        // glass sheen
        const g = b.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(0.32, 'rgba(255,255,255,0)');
        g.addColorStop(0.36, 'rgba(255,255,255,.06)'); g.addColorStop(0.44, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,.04)');
        b.fillStyle = g; b.fillRect(0, 0, w, h);
        b.strokeStyle = 'rgba(255,255,255,.14)'; b.lineWidth = 2; b.strokeRect(1, 1, w - 2, h - 2);

        const ink = light ? '#17150f' : '#efede7';
        const muted = light ? '#6c675c' : '#8e8b84';
        const accent = light ? '#e4470b' : '#ff5b1f';
        const cx = w / 2, cy = h / 2;
        const big = clamp(w * 0.115, 46, 150);
        b.textAlign = 'center'; b.textBaseline = 'alphabetic';
        b.fillStyle = muted;
        b.font = `500 ${clamp(w * 0.012, 11, 13)}px "Geist Mono", ui-monospace, monospace`;
        spaced(b, 'CHIRANJITH DHARMA S  —  PORTFOLIO', cx, cy - big * 1.25, 3);
        b.fillStyle = ink;
        b.font = `600 ${big}px "Geist", system-ui, sans-serif`;
        b.fillText('Break the', cx, cy - big * 0.12);
        b.fillStyle = accent;
        b.font = `italic 400 ${big * 1.08}px "Instrument Serif", Georgia, serif`;
        b.fillText('glass.', cx, cy + big * 0.86);
        b.fillStyle = muted;
        b.font = `500 ${clamp(w * 0.013, 12, 14)}px "Geist Mono", ui-monospace, monospace`;
        spaced(b, caption.toUpperCase(), cx, cy + big * 1.55, 2);
      }
      function spaced(b, text, x, y, sp) {
        const total = b.measureText(text).width + sp * (text.length - 1);
        let px = x - total / 2;
        b.textAlign = 'left';
        for (const ch of text) { b.fillText(ch, px, y); px += b.measureText(ch).width + sp; }
        b.textAlign = 'center';
      }
      function paint() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(base, 0, 0);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        for (const c of cracks) ctx.drawImage(c.img, c.x - c.S / 2, c.y - c.S / 2, c.S, c.S);
      }

      const onResize = () => { if (!broken) { drawBase(); paint(); } };
      window.addEventListener('resize', onResize);

      const fontsReady = document.fonts && document.fonts.load
        ? Promise.race([Promise.all([
          document.fonts.load('600 100px "Geist"'),
          document.fonts.load('italic 400 100px "Instrument Serif"'),
          document.fonts.load('500 13px "Geist Mono"')
        ]), new Promise((r) => setTimeout(r, 1200))])
        : Promise.resolve();
      drawBase(); paint();
      fontsReady.then(() => { if (!broken) { drawBase(); paint(); } });

      function shoot(x, y) {
        if (broken) return;
        Sound.unlock();
        hits++;
        Sound.shot();
        if (hits === 1) {
          setTimeout(() => Sound.glass(0.55), 30);
          cracks.push(Object.assign({ x, y }, makeCrack(1)));
          caption = 'One more.';
          drawBase(); paint();
          wrap.classList.remove('is-hit'); void wrap.offsetWidth; wrap.classList.add('is-hit');
          if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) { /* ignore */ } }
          return;
        }
        broken = true;
        setTimeout(() => Sound.glass(1), 20);
        if (navigator.vibrate) { try { navigator.vibrate([25, 30, 40]); } catch (e) { /* ignore */ } }
        shatter(x, y);
      }

      function shatter(ix, iy) {
        paint();
        const snap = document.createElement('canvas');
        snap.width = cv.width; snap.height = cv.height;
        snap.getContext('2d').drawImage(cv, 0, 0);

        // radial + ring grid of shared vertices so pieces tile perfectly
        const K = Math.round(quality < 1 ? 11 : 17);
        const angles = Array.from({ length: K }, (_, i) => ((i + rand(0.15, 0.85)) / K) * Math.PI * 2);
        const far = Math.hypot(Math.max(ix, w - ix), Math.max(iy, h - iy)) * 1.08;
        const radii = [0];
        let r = 0, step = quality < 1 ? 70 : 46;
        while (r < far) { r = Math.min(far, r + step * rand(0.75, 1.25)); radii.push(r); step *= 1.5; }
        const V = radii.map((rr, j) => angles.map((a) => {
          if (j === 0) return [ix, iy];
          const jr = j === radii.length - 1 ? rr * 1.05 : rr * rand(0.9, 1.1);
          const ja = a + rand(-0.06, 0.06);
          return [ix + Math.cos(ja) * jr, iy + Math.sin(ja) * jr];
        }));
        const pieces = [];
        for (let j = 0; j < radii.length - 1; j++) {
          for (let i = 0; i < K; i++) {
            const i2 = (i + 1) % K;
            const poly = j === 0
              ? [[ix, iy], V[1][i], V[1][i2]]
              : [V[j][i], V[j + 1][i], V[j + 1][i2], V[j][i2]];
            pieces.push(poly);
          }
        }

        const shardsBig = pieces.map((poly) => {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, sx = 0, sy = 0;
          for (const [px, py] of poly) { minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py); sx += px; sy += py; }
          minX = Math.floor(clamp(minX, 0, w)); minY = Math.floor(clamp(minY, 0, h));
          maxX = Math.ceil(clamp(maxX, 0, w)); maxY = Math.ceil(clamp(maxY, 0, h));
          const bw = maxX - minX, bh = maxY - minY;
          if (bw < 2 || bh < 2) return null;
          const c = document.createElement('canvas');
          c.width = Math.ceil(bw * DPR); c.height = Math.ceil(bh * DPR);
          const g = c.getContext('2d');
          g.setTransform(DPR, 0, 0, DPR, 0, 0);
          g.translate(-minX, -minY);
          g.beginPath(); poly.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
          g.save(); g.clip();
          g.drawImage(snap, 0, 0, w, h);
          g.restore();
          g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; g.stroke();
          const cx = sx / poly.length, cy = sy / poly.length;
          const dx = cx - ix, dy = cy - iy, d = Math.hypot(dx, dy) || 1;
          const near = 1 - clamp(d / far, 0, 1);
          const sp = (180 + 820 * near * near) * rand(0.7, 1.2);
          return {
            img: c, bx: minX, by: minY, bw, bh, cx, cy,
            x: 0, y: 0, r: 0,
            vx: (dx / d) * sp * 0.75, vy: (dy / d) * sp * 0.55 - rand(80, 320) * near,
            vr: rand(-1, 1) * (1.5 + 5 * near), grow: 0.15 + 1.25 * near,
            flip: 0, vflip: rand(-1, 1) * (2 + 8 * near),
            delay: (d / far) * 0.14
          };
        }).filter(Boolean);

        wrap.classList.add('is-broken');
        resolve(); // let the hero start animating as the glass falls
        Sound.whoosh();
        FX.burst(ix, iy);
        warp('warp-in', `50% ${window.scrollY + window.innerHeight / 2}px`);
        const t0 = performance.now();
        let lastT = t0;
        const tick = (now) => {
          const t = (now - t0) / 1000, dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, cv.width, cv.height);
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          if (t < 0.09) { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - t / 0.09)})`; ctx.fillRect(0, 0, w, h); }
          let alive = 0;
          for (const s of shardsBig) {
            const lt = t - s.delay;
            if (lt > 0) {
              s.vy += 2300 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; s.flip += s.vflip * dt;
            }
            const a = 1 - clamp((t - 0.55) / 0.6, 0, 1);
            if (a <= 0 || s.cy + s.y - s.bh > h + 60) continue;
            alive++;
            const sc = 1 + s.grow * clamp(lt / 0.8, 0, 1);
            ctx.save();
            ctx.globalAlpha = a;
            ctx.translate(s.cx + s.x, s.cy + s.y); ctx.rotate(s.r); ctx.scale(sc * (0.3 + 0.7 * Math.abs(Math.cos(s.flip))), sc);
            ctx.drawImage(s.img, s.bx - s.cx, s.by - s.cy, s.bw, s.bh);
            ctx.restore();
          }
          if (alive && t < 2.4) requestAnimationFrame(tick);
          else { window.removeEventListener('resize', onResize); wrap.remove(); finish(); afterIntro(); }
        };
        requestAnimationFrame(tick);
      }

      const skip = () => {
        if (broken) return;
        broken = true;
        wrap.classList.add('is-skipped');
        resolve();
        setTimeout(() => { window.removeEventListener('resize', onResize); wrap.remove(); finish(); afterIntro(); }, 450);
      };
      wrap.querySelector('.intro__skip').addEventListener('click', (e) => { e.stopPropagation(); skip(); });
      wrap.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('.intro__skip')) return;
        shoot(e.clientX, e.clientY);
      });
      const onKey = (e) => {
        if (e.key === 'Escape') skip();
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shoot(w / 2 + rand(-60, 60), h / 2 + rand(-40, 40)); }
      };
      window.addEventListener('keydown', onKey);
    });
  }

  function afterIntro() {
    const pref = local.get('shoot');
    if (pref !== 'off') {
      setShoot(true, false, false);
      setTimeout(() => toast('Shoot mode on ⌖ 3 quick shots smash to the next screen'), 900);
    }
  }

  /* ---------- wire up toggles ---------- */
  function wire() {
    const sBtn = document.getElementById('shootToggle');
    const aBtn = document.getElementById('soundToggle');
    if (sBtn) sBtn.addEventListener('click', () => setShoot(!shootOn, true));
    if (aBtn) aBtn.addEventListener('click', () => setSound(!Sound.enabled, true));
    setSound(Sound.enabled, false);
    // returning visitors who skipped the intro this session keep their preference
    if (!shouldIntro() && !reduce) setShoot(local.get('shoot') !== 'off', false, false);
    else setShoot(false, false, false);
  }
  window.addEventListener('fxmode', (e) => { if (e.detail !== 'shoot' && shootOn) setShoot(false, false, false); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.GlassFX = {
    shouldIntro,
    intro,
    toggleShoot: () => setShoot(!shootOn, true),
    toggleSound: () => setSound(!Sound.enabled, true),
    audio: () => Sound.raw(),
    whoosh: () => Sound.whoosh(),
    isIntroOpen: () => root.classList.contains('intro-open'),
    fire
  };
})();
