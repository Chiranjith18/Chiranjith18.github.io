# Portfolio — Chiranjith Dharma S

Static site, no build step: `index.html`, `assets/css/style.css`, `assets/js/main.js`.

## 1. Add your links
Open `assets/js/main.js` and fill in the `SITE.links` block at the top (LinkedIn, GitHub,
project repos, Solafune leaderboard, OCI badges, Coursera certificates, LeetCode).
Any link left empty is hidden automatically, so nothing on the live site is broken.

Optional: drop a portrait at `assets/img/photo.jpg` and set `photo: 'assets/img/photo.jpg'`.

## 2. Preview locally
```bash
python -m http.server 5510
```
Then open http://localhost:5510

## 3. Deploy (free)
- **GitHub Pages:** push this folder to a repo → Settings → Pages → deploy from `main` / root.
- **Netlify / Vercel:** drag-and-drop this folder, or import the repo. No build command needed.

After editing CSS/JS, bump the `?v=` number on the two asset links in `index.html` so visitors get the new files.

Shortcuts on the site: `Ctrl K` / `⌘K` opens the quick menu.

## Glass-break mode (`assets/js/glass.js`, `assets/css/glass.css`)
- Intro: visitors shoot a pane of glass to enter (2 shots). Shown once per browser session; add `?intro=1` to the URL to see it again. Esc or "Skip intro" skips it.
- Shoot mode: after the intro, every click/tap fires (cracks, bullet hole, shards, flash, shake). Links still work. Toggle with the crosshair button or the quick menu; the choice is remembered.
- Sound: synthesised in the browser (no audio files). Mute button in the top bar.
- Weak devices get fewer shards automatically; people with "reduce motion" turned on skip the intro and shooting.

## Burn mode (`assets/js/burn.js`, `assets/css/burn.css`)
- Flame button in the top bar (or quick menu). A flamethrower appears and aims at the pointer.
- Hold the mouse on text (phone: tap for a burst, press-and-hold for a stream). Letters glow, char, break off and fall; fire spreads along the text.
- "Restore ↺" in the bottom-left, or switching the mode off, brings all text back. Links don't navigate while burn mode is on.
- Only one of Shoot / Burn is on at a time. Live widgets (clock, counters, demo panels, marquee) never burn.


