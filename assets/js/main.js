/* ==========================================================================
   Chiranjith Dharma S — Portfolio interactions
   Plain JavaScript, no dependencies.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. YOUR LINKS — paste URLs here.
        Any link left empty is hidden on the page automatically,
        so the live site never shows a broken button.
     ------------------------------------------------------------------------ */
  const SITE = {
    email: 'chiranjith2006@gmail.com',
    photo: 'assets/img/photo.jpg', // portrait on the ID card (cropped from linkedinprofile.png)
    links: {
      resume: 'Chiranjith_Dharma_S_Resume.pdf',
      linkedin: 'https://www.linkedin.com/in/chiranjith-dharma-s-616839290/',
      github: 'https://github.com/Chiranjith18',
      leetcode: 'https://leetcode.com/u/chiranjith2006/',
      foodtruck: 'https://github.com/Chiranjith18/food-truck-vendor-license',
      debatemind: 'https://github.com/Chiranjith18/debate',
      solafune: 'https://solafune.com/competitions/1918ccd7-eb06-4cfc-822f-a9823c63b2c1?menu=lb&tab=private',
      solafuneCommunity: 'https://community.solafune.com/competitions/1918ccd7-eb06-4cfc-822f-a9823c63b2c1?menu=lb&tab=private',
      ociAI: 'https://catalog-education.oracle.com/pls/certview/sharebadge?id=F2252A0A89041BB1D4FCB78DC08A4EB04F334C40906B77660D5CD27870954CC8',
      ociDS: 'https://catalog-education.oracle.com/pls/certview/sharebadge?id=DA2D68047CC5B1FD5E6814B1DD38FF40CFABFE08AA2D7B7C2030488207752DBE',
      courseraDBMS: 'https://coursera.org/share/b9f9258abac20f1cd0d34c8fd84d9e39',
      courseraOOP: 'https://www.coursera.org/account/accomplishments/verify/8AMG3J2TTSH7'
    }
  };

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const mq = (q) => window.matchMedia(q).matches;
  const reduce = mq('(prefers-reduced-motion: reduce)');
  const fine = mq('(hover: hover) and (pointer: fine)');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lerp = (a, b, t) => a + (b - a) * t;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const linkMap = () => Object.assign({ email: 'mailto:' + SITE.email }, SITE.links);

  /* ---------- links ---------- */
  function wireLinks() {
    const map = linkMap();
    $$('[data-link]').forEach((el) => {
      const url = map[el.dataset.link];
      if (!url) { el.hidden = true; return; }
      el.setAttribute('href', url);
      if (/^https?:/i.test(url)) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    });
    $$('[data-link-group]').forEach((g) => {
      if ($$('[data-link]', g).every((a) => a.hidden)) g.hidden = true;
    });
    $$('[data-email]').forEach((el) => { el.textContent = SITE.email; });

    if (SITE.photo) {
      const slot = $('.idcard__photo');
      const img = new Image();
      img.alt = 'Chiranjith Dharma S';
      img.decoding = 'async';
      img.onload = () => { if (slot) { slot.appendChild(img); slot.classList.add('has-photo'); } };
      img.src = SITE.photo;
    }
  }

  function openLink(key, download) {
    const url = linkMap()[key];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    if (download) a.download = '';
    else if (/^https?:/i.test(url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- toast + copy ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg;
    t.classList.add('is-in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-in'), 2600);
  }
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SITE.email);
      toast('Email copied — talk soon ✦');
    } catch (e) {
      window.location.href = 'mailto:' + SITE.email;
    }
  }

  /* ---------- theme ---------- */
  function theme() {
    const btn = $('#themeToggle');
    const meta = $('meta[name="theme-color"]');
    const apply = (t) => {
      root.dataset.theme = t;
      if (meta) meta.content = t === 'light' ? '#f2efe8' : '#0b0b0d';
      if (btn) btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      window.dispatchEvent(new Event('themechange'));
    };
    apply(root.dataset.theme === 'light' ? 'light' : 'dark');
    const toggle = () => {
      const t = root.dataset.theme === 'light' ? 'dark' : 'light';
      apply(t); store.set('theme', t);
    };
    if (btn) btn.addEventListener('click', toggle);
    return toggle;
  }

  /* ---------- intro loader ---------- */
  function runLoader() {
    const el = $('.loader');
    if (window.GlassFX && window.GlassFX.shouldIntro()) {
      if (el) el.remove();
      return window.GlassFX.intro();
    }
    if (!el) return Promise.resolve();
    let seen = false;
    try { seen = sessionStorage.getItem('intro') === '1'; sessionStorage.setItem('intro', '1'); } catch (e) { /* ignore */ }
    if (reduce || seen) { el.remove(); return Promise.resolve(); }
    const num = $('#loaderCount', el);
    const bar = $('.loader__bar span', el);
    return new Promise((resolve) => {
      const t0 = performance.now(), dur = 1050;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        num.textContent = Math.round(e * 100);
        bar.style.transform = `scaleX(${e})`;
        if (p < 1) { requestAnimationFrame(tick); return; }
        el.classList.add('is-done');
        setTimeout(resolve, 280);
        setTimeout(() => el.remove(), 1100);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- text effects ---------- */
  function splitChars() {
    $$('.split').forEach((el) => {
      const text = el.textContent;
      el.textContent = '';
      el.setAttribute('aria-hidden', 'true');
      Array.from(text).forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch === ' ' ? ' ' : ch;
        s.style.setProperty('--i', i);
        el.appendChild(s);
      });
    });
  }

  function wordScrub() {
    const el = $('[data-scrub]');
    if (!el) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement('span');
        s.className = 'w'; s.textContent = part;
        frag.appendChild(s);
      });
      n.parentNode.replaceChild(frag, n);
    });
    if (reduce) return null;
    const words = $$('.w', el);
    el.classList.add('is-scrub');
    let last = -1;
    return () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.82 - r.top) / (r.height + vh * 0.3);
      const n = Math.round(Math.max(0, Math.min(1, p)) * words.length);
      if (n === last) return;
      last = n;
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    };
  }

  /* ---------- scroll-driven bits ---------- */
  function onScroll(extra) {
    const nav = $('#nav');
    const bar = $('.scroll-progress span');
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (nav) nav.classList.toggle('is-scrolled', y > 24);
      if (extra) extra();
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function activeNav() {
    const links = $$('[data-nav]');
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        const a = byId.get(en.target.id);
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    const top = $('#top');
    if (top) new IntersectionObserver(([en]) => {
      if (en.isIntersecting) links.forEach((l) => l.classList.remove('is-active'));
    }, { rootMargin: '-45% 0px -50% 0px' }).observe(top);
  }

  function reveals() {
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
  }

  function counters() {
    const els = $$('[data-count]');
    const run = (el) => {
      const to = +el.dataset.count, from = +(el.dataset.from || 0);
      if (reduce) { el.textContent = to; return; }
      const t0 = performance.now(), dur = 1700;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    els.forEach((el) => {
      if (!reduce) el.textContent = el.dataset.from || 0;
      io.observe(el);
    });
  }

  /* ---------- live clock + degree progress ---------- */
  function clock() {
    const els = $$('[data-clock]');
    if (!els.length) return;
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const tick = () => { const s = fmt.format(new Date()); els.forEach((e) => { e.textContent = s; }); };
    tick();
    setInterval(tick, 1000);
  }

  function degree() {
    const el = $('[data-degree]');
    if (!el) return;
    const start = new Date('2023-04-01T00:00:00+05:30');
    const end = new Date('2027-05-31T00:00:00+05:30');
    const now = new Date();
    const p = Math.max(0, Math.min(1, (now - start) / (end - start)));
    el.style.setProperty('--p', p.toFixed(4));
    const pct = $('[data-degree-pct]', el);
    if (pct) pct.textContent = `${Math.round(p * 100)}% complete`;
    const yr = $('[data-degree-year]', el);
    const year = Math.min(4, Math.floor((now - start) / (365.25 * 864e5)) + 1);
    if (yr) yr.textContent = p >= 1 ? 'Graduated' : `Year ${year} of 4`;
  }

  /* ---------- pointer niceties ---------- */
  function cursor() {
    if (!fine || reduce) return;
    const c = $('.cursor');
    if (!c) return;
    root.classList.add('has-cursor');
    const dot = $('.cursor__dot', c), ring = $('.cursor__ring', c), label = $('.cursor__label', c);
    let x = -100, y = -100, rx = -100, ry = -100, shown = false;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!shown) { shown = true; rx = x; ry = y; c.classList.remove('is-hidden'); }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { c.classList.add('is-hidden'); shown = false; });
    const loop = () => {
      rx = lerp(rx, x, 0.2); ry = lerp(ry, y, 0.2);
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', (e) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const labelled = t.closest('[data-cursor-label]');
      const interactive = t.closest('a, button, input, [data-tilt]');
      if (labelled && !(interactive && interactive !== labelled && labelled.contains(interactive))) {
        label.textContent = labelled.dataset.cursorLabel;
        c.classList.add('has-label'); c.classList.remove('is-hover');
      } else {
        c.classList.remove('has-label');
        c.classList.toggle('is-hover', !!interactive);
      }
    });
    window.addEventListener('pointerdown', () => c.classList.add('is-down'));
    window.addEventListener('pointerup', () => c.classList.remove('is-down'));
  }

  function magnetic() {
    if (!fine || reduce) return;
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function spotlight() {
    $$('.spot').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  function tilt() {
    if (!fine || reduce) return;
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 12}deg) rotateY(${(px - 0.5) * 14}deg) rotate(0deg)`;
        el.style.setProperty('--gx', `${px * 100}%`);
        el.style.setProperty('--gy', `${py * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- mobile menu ---------- */
  function mobileMenu() {
    const btn = $('#burger'), menu = $('#mobileMenu');
    if (!btn || !menu) return;
    const set = (open) => {
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', String(!open));
    };
    btn.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 880) set(false); });
  }

  /* ---------- command palette ---------- */
  function palette(toggleTheme) {
    const el = $('#palette'), input = $('#paletteInput'), list = $('#paletteList');
    if (!el || !input || !list) return;
    const go = (id) => () => { const t = $(id); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); };
    const has = (k) => (k === 'glass' ? !!window.GlassFX : k === 'burn' ? !!window.BurnFX : !!linkMap()[k]);
    const items = [
      { group: 'Navigate', label: 'About', hint: '01', run: go('#about') },
      { group: 'Navigate', label: 'Selected work', hint: '02', run: go('#work') },
      { group: 'Navigate', label: 'Toolkit', hint: '03', run: go('#toolkit') },
      { group: 'Navigate', label: 'Credentials', hint: '04', run: go('#credentials') },
      { group: 'Navigate', label: 'Contact', hint: '05', run: go('#contact') },
      { group: 'Do', label: 'Copy email address', hint: SITE.email, run: copyEmail },
      { group: 'Do', label: 'Download résumé', hint: 'PDF', run: () => openLink('resume', true), when: 'resume' },
      { group: 'Do', label: 'Switch light / dark', hint: 'Theme', run: toggleTheme },
      { group: 'Do', label: 'Toggle shoot mode', hint: '⌖ Glass', run: () => window.GlassFX && window.GlassFX.toggleShoot(), when: 'glass' },
      { group: 'Do', label: 'Sound on / off', hint: 'Audio', run: () => window.GlassFX && window.GlassFX.toggleSound(), when: 'glass' },
      { group: 'Do', label: 'Toggle burn mode', hint: '🔥 Flamethrower', run: () => window.BurnFX && window.BurnFX.toggle(), when: 'burn' },
      { group: 'Do', label: 'Restore burnt text', hint: 'Undo fire', run: () => window.BurnFX && window.BurnFX.restore(), when: 'burn' },
      { group: 'Elsewhere', label: 'LinkedIn', hint: 'Profile ↗', run: () => openLink('linkedin'), when: 'linkedin' },
      { group: 'Elsewhere', label: 'GitHub', hint: 'Code ↗', run: () => openLink('github'), when: 'github' },
      { group: 'Elsewhere', label: 'LeetCode', hint: '165 solved ↗', run: () => openLink('leetcode'), when: 'leetcode' }
    ].filter((i) => !i.when || has(i.when));

    let filtered = items, sel = 0, lastFocus = null;

    const mark = () => {
      $$('.palette__item', list).forEach((li, i) => {
        const on = i === sel;
        li.classList.toggle('is-sel', on);
        li.setAttribute('aria-selected', String(on));
        if (on) { li.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', li.id); }
      });
    };
    const render = () => {
      list.innerHTML = '';
      if (!filtered.length) {
        const li = document.createElement('li');
        li.className = 'palette__empty';
        li.textContent = 'Nothing here — try “work”, “email” or “theme”.';
        list.appendChild(li);
        input.removeAttribute('aria-activedescendant');
        return;
      }
      let group = '';
      filtered.forEach((it, i) => {
        if (it.group !== group) {
          group = it.group;
          const g = document.createElement('li');
          g.className = 'palette__group'; g.setAttribute('role', 'presentation'); g.textContent = group;
          list.appendChild(g);
        }
        const li = document.createElement('li');
        li.className = 'palette__item'; li.id = `pal-${i}`; li.setAttribute('role', 'option');
        const a = document.createElement('span'); a.textContent = it.label;
        const b = document.createElement('small'); b.textContent = it.hint;
        li.append(a, b);
        li.addEventListener('click', () => exec(it));
        li.addEventListener('pointermove', () => { if (sel !== i) { sel = i; mark(); } });
        list.appendChild(li);
      });
      mark();
    };
    const filter = () => {
      const q = input.value.trim().toLowerCase();
      filtered = items.filter((i) => `${i.label} ${i.hint} ${i.group}`.toLowerCase().includes(q));
      sel = 0; render();
    };
    const isOpen = () => el.classList.contains('is-open');
    const open = () => {
      lastFocus = document.activeElement;
      el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
      input.value = ''; filter();
      input.focus({ preventScroll: true });
    };
    const close = () => {
      el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    const exec = (it) => { close(); setTimeout(it.run, 140); };

    input.addEventListener('input', filter);
    input.addEventListener('keydown', (e) => {
      const n = filtered.length;
      if (e.key === 'ArrowDown' && n) { e.preventDefault(); sel = (sel + 1) % n; mark(); }
      else if (e.key === 'ArrowUp' && n) { e.preventDefault(); sel = (sel - 1 + n) % n; mark(); }
      else if (e.key === 'Enter' && filtered[sel]) { e.preventDefault(); exec(filtered[sel]); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen() ? close() : open(); }
      else if (e.key === 'Escape' && isOpen()) close();
    });
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    $$('[data-open-palette]').forEach((b) => b.addEventListener('click', open));

    const mac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
    $$('[data-kbd]').forEach((k) => { k.textContent = mac ? '⌘K' : 'Ctrl K'; });
  }

  /* ---------- hero neural field ---------- */
  function neural() {
    const canvas = $('#neural');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const LINK = 150, LINK2 = LINK * LINK, REPEL = 130;
    const mouse = { x: -1e4, y: -1e4 };
    let w = 0, h = 0, nodes = [], pulses = [], raf = 0, visible = true, colors = { ink: '#fff', accent: '#ff5b1f' };

    const readColors = () => {
      const cs = getComputedStyle(root);
      colors = { ink: cs.getPropertyValue('--net').trim() || '#fff', accent: cs.getPropertyValue('--accent').trim() || '#ff5b1f' };
    };
    const seed = () => {
      const count = Math.round(Math.max(34, Math.min(115, (w * h) / 15000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.5 + 0.7
      }));
      pulses = [];
    };
    let lastW = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (Math.abs(w - lastW) > 40 || !nodes.length) { seed(); lastW = w; }
      if (reduce || !raf) draw(false);
    };

    const draw = (move) => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        if (!move) continue;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < REPEL && d > 0.1) { const f = (1 - d / REPEL) * 1.4; n.x += (dx / d) * f; n.y += (dy / d) * f; }
        n.x = Math.max(0, Math.min(w, n.x)); n.y = Math.max(0, Math.min(h, n.y));
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.ink;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 > LINK2) continue;
          const d = Math.sqrt(d2);
          const mx = (a.x + b.x) / 2 - mouse.x, my = (a.y + b.y) / 2 - mouse.y;
          const near = mx * mx + my * my < 200 * 200;
          ctx.globalAlpha = (1 - d / LINK) * (near ? 0.42 : 0.13);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          if (move && pulses.length < 16 && Math.random() < 0.0007) pulses.push({ a, b, t: 0, s: 0.007 + Math.random() * 0.012 });
        }
      }

      ctx.fillStyle = colors.accent;
      pulses = pulses.filter((p) => p.t <= 1);
      for (const p of pulses) {
        if (move) p.t += p.s;
        const t = Math.min(1, p.t);
        const x = lerp(p.a.x, p.b.x, t), y = lerp(p.a.y, p.b.y, t);
        const alpha = Math.sin(Math.PI * t);
        ctx.globalAlpha = alpha * 0.22; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      }

      for (const n of nodes) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const near = dx * dx + dy * dy < 190 * 190;
        ctx.globalAlpha = near ? 0.95 : 0.42;
        ctx.fillStyle = near ? colors.accent : colors.ink;
        ctx.beginPath(); ctx.arc(n.x, n.y, near ? n.r + 0.6 : n.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => { draw(true); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && !reduce && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    readColors(); resize();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
    window.addEventListener('themechange', () => { readColors(); if (!raf) draw(false); });
    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -1e4; });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  }

  /* ---------- project demos ---------- */
  const demos = {
    leaderboard(win) {
      const list = $('.lb', win);
      if (!list) return null;
      const others = ['geo•••ml', 'k_n•••', 'ter•••ai', 'mlp•••x', 'gbm•••s', 'arc•••7'];
      const mk = (name, isYou) => {
        const r = document.createElement('div');
        r.className = 'lb__row' + (isYou ? ' is-you' : '');
        r.innerHTML = '<span class="lb__rank"></span><span class="lb__team"></span><span class="lb__bar"><i></i></span>';
        const team = $('.lb__team', r);
        team.textContent = name;
        if (isYou) { const pill = document.createElement('span'); pill.className = 'you-pill'; pill.textContent = 'you'; team.appendChild(pill); }
        list.appendChild(r);
        return r;
      };
      const rows = others.map((n) => mk(n, false));
      const you = mk('chiranjith', true);
      const set = (row, pos, rank) => {
        row.style.setProperty('--pos', pos);
        $('.lb__rank', row).textContent = rank ? `#${rank}` : '—';
        row.style.setProperty('--w', rank ? `${96 - (rank - 9) * 7}%` : '0%');
      };
      const final = () => {
        rows.forEach((r, i) => set(r, i < 3 ? i : i + 1, i < 3 ? 9 + i : 10 + i));
        set(you, 3, 12); you.classList.remove('is-scoring');
      };
      let token = 0;
      const play = async () => {
        const my = ++token;
        if (reduce) { final(); return; }
        you.classList.remove('is-flash');
        rows.forEach((r, i) => set(r, i, 9 + i));
        set(you, 6, null); you.classList.add('is-scoring');
        await sleep(1600); if (my !== token) return;
        you.classList.remove('is-scoring');
        set(you, 3, 12);
        rows.slice(3).forEach((r, k) => set(r, 4 + k, 13 + k));
        await sleep(650); if (my !== token) return;
        void you.offsetWidth; you.classList.add('is-flash');
      };
      final();
      return { play, loop: false };
    },

    debate(win) {
      const feed = $('.debate__feed', win);
      if (!feed) return null;
      const NAMES = { pro: 'Agent · Pro', con: 'Agent · Con', judge: 'Judge' };
      const AV = { pro: 'P', con: 'C', judge: 'J' };
      const SCRIPT = [
        { who: 'pro', text: 'Fewer interruptions. The attached study logs longer uninterrupted focus blocks for engineers working from home.' },
        { who: 'con', text: 'Focus isn’t output. Onboarding slows down when juniors can’t just turn around and ask.' },
        { who: 'pro', text: 'Section 4 of team_study.pdf: written async docs closed most of that onboarding gap within a quarter.' },
        { who: 'con', text: 'That’s one company. A single case study can’t carry a general claim.' },
        { who: 'judge', text: 'Verdict → PRO, narrowly. Better grounded in the supplied document; CON’s sample-size point is noted.' }
      ];
      const add = (who, typing) => {
        const el = document.createElement('div');
        el.className = `msg msg--${who}`;
        const av = document.createElement('span'); av.className = 'msg__av'; av.textContent = AV[who];
        const bub = document.createElement('div'); bub.className = 'msg__bubble';
        const name = document.createElement('span'); name.className = 'msg__name'; name.textContent = NAMES[who];
        bub.appendChild(name);
        if (typing) {
          const t = document.createElement('span'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>';
          bub.appendChild(t);
        } else {
          const txt = document.createElement('span'); txt.className = 'msg__text';
          bub.appendChild(txt);
        }
        el.append(av, bub);
        feed.appendChild(el);
        while (feed.children.length > 6) feed.firstElementChild.remove();
        return el;
      };
      let token = 0;
      const play = async () => {
        const my = ++token;
        feed.innerHTML = '';
        if (reduce) { SCRIPT.forEach((m) => { $('.msg__text', add(m.who)).textContent = m.text; }); return; }
        for (const m of SCRIPT) {
          const t = add(m.who, true);
          await sleep(m.who === 'judge' ? 1400 : 850); if (my !== token) return;
          t.remove();
          const txt = $('.msg__text', add(m.who));
          for (let i = 2; i <= m.text.length + 1; i += 2) {
            txt.textContent = m.text.slice(0, i);
            await sleep(22); if (my !== token) return;
          }
          await sleep(700); if (my !== token) return;
        }
        await sleep(4200); if (my !== token) return;
        if (win.dataset.visible === '1') play(); else win.dataset.idle = '1';
      };
      return { play, loop: true };
    },

    pipeline(win) {
      const stages = $$('.stage', win);
      const fill = $('.pipe__fill', win), log = $('.log', win), status = $('[data-status]', win), stamp = $('.stamp', win);
      if (!stages.length) return null;
      const STEPS = [
        { role: 'vendor', msg: 'registration submitted · FT-0427', status: 'Submitted' },
        { role: 'admin', msg: 'documents checked → approved', status: 'Approved' },
        { role: 'reviewer', msg: 'evaluation complete → forwarded', status: 'Evaluated' },
        { role: 'inspector', msg: 'on-site inspection → verified', status: 'Verified' }
      ];
      const line = (role, msg, t) => {
        const d = document.createElement('div');
        d.className = 'log__line';
        const a = document.createElement('span'); a.className = 'log__t'; a.textContent = t;
        const b = document.createElement('span'); b.className = `log__role log__role--${role}`; b.textContent = role;
        const c = document.createElement('span'); c.className = 'log__msg'; c.textContent = msg;
        d.append(a, b, c);
        log.appendChild(d);
        while (log.children.length > 6) log.firstElementChild.remove();
      };
      const setStatus = (text, state) => { status.textContent = text; status.dataset.state = state; };
      const reset = () => {
        stages.forEach((s) => s.classList.remove('is-active', 'is-done'));
        fill.style.setProperty('--p', 0);
        log.innerHTML = '';
        setStatus('Draft', 'draft');
        stamp.classList.remove('is-in');
      };
      const final = () => {
        reset();
        stages.forEach((s) => s.classList.add('is-done'));
        fill.style.setProperty('--p', 1);
        STEPS.forEach((s, i) => line(s.role, s.msg, `+${(i * 1.3 + 0.6).toFixed(1)}s`));
        line('system', 'license issued ✓', '+5.8s');
        setStatus('Licensed', 'ok'); stamp.classList.add('is-in');
      };
      let token = 0;
      const play = async () => {
        const my = ++token;
        if (reduce) { final(); return; }
        reset();
        await sleep(500); if (my !== token) return;
        for (let i = 0; i < STEPS.length; i++) {
          stages[i].classList.add('is-active');
          fill.style.setProperty('--p', i / (STEPS.length - 1));
          setStatus(`With ${STEPS[i].role}`, 'busy');
          await sleep(950); if (my !== token) return;
          stages[i].classList.remove('is-active'); stages[i].classList.add('is-done');
          line(STEPS[i].role, STEPS[i].msg, `+${(i * 1.3 + 0.6).toFixed(1)}s`);
          setStatus(STEPS[i].status, i === STEPS.length - 1 ? 'ok' : 'busy');
          await sleep(380); if (my !== token) return;
        }
        line('system', 'license issued ✓', '+5.8s');
        setStatus('Licensed', 'ok');
        stamp.classList.add('is-in');
        await sleep(4500); if (my !== token) return;
        if (win.dataset.visible === '1') play(); else win.dataset.idle = '1';
      };
      return { play, loop: true };
    }
  };

  function initDemos() {
    $$('[data-demo]').forEach((win) => {
      const make = demos[win.dataset.demo];
      const ctrl = make && make(win);
      if (!ctrl) return;
      let started = false;
      new IntersectionObserver(([en]) => {
        win.dataset.visible = en.isIntersecting ? '1' : '0';
        if (!en.isIntersecting) return;
        if (!started) { started = true; ctrl.play(); }
        else if (ctrl.loop && win.dataset.idle === '1') { win.dataset.idle = '0'; ctrl.play(); }
      }, { threshold: 0.35 }).observe(win);
      win.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        win.dataset.idle = '0';
        ctrl.play();
      });
    });
  }

  /* ---------- boot ---------- */
  async function boot() {
    wireLinks();
    splitChars();
    const toggleTheme = theme();
    const scrub = wordScrub();
    onScroll(scrub);
    activeNav();
    reveals();
    counters();
    clock();
    degree();
    cursor();
    magnetic();
    spotlight();
    tilt();
    mobileMenu();
    palette(toggleTheme);
    neural();
    initDemos();
    $$('[data-copy-email]').forEach((b) => b.addEventListener('click', copyEmail));
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, sleep(1500)]) : Promise.resolve();
    await Promise.all([runLoader(), fonts]);
    root.classList.add('is-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
