(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ------------------------------------------------------------ i18n */
  // HUD card: illustrative lanes across Europe, in both directions
  const ROUTES = [['RO → DE', 'FTL'], ['IT → RO', 'Groupage'], ['RO → PL', 'FTL'], ['AT → RO', 'FTL'], ['RO → GR', 'Groupage'], ['HR → RO', 'Project cargo']];
  const SERVICE_RO = { FTL: 'FTL', Groupage: 'Grupaj', 'Project cargo': 'Project cargo' };
  const STATUS = {
    en: { sending: 'Sending…', ok: 'Thank you. A planner will reply within one working day.', err: 'Something went wrong. Please email office@interlogistik-transport.com.', missing: 'Please fill in the highlighted fields.', nokey: 'Form not connected yet. Please email office@interlogistik-transport.com.' },
    ro: { sending: 'Se trimite…', ok: 'Mulțumim. Un dispecer îți răspunde în cel mult o zi lucrătoare.', err: 'A apărut o eroare. Te rugăm scrie la office@interlogistik-transport.com.', missing: 'Completează câmpurile marcate.', nokey: 'Formularul nu este încă conectat. Scrie-ne la office@interlogistik-transport.com.' },
  };

  // Each language is its own static page (/ and /ro/); the page language comes from <html lang>.
  const lang = document.documentElement.lang === 'ro' ? 'ro' : 'en';
  // site root, worked out from this script's own URL so /ro/ resolves assets correctly
  const BASE = (document.currentScript && document.currentScript.src || location.href).replace(/assets\/js\/site\.js.*$/, '');

  /* ------------------------------------------------------------ nav */
  const nav = $('#nav');
  const hero = $('.hero');
  // the nav turns solid whenever a white block (curtain) sits under it, and clears over the photo scenes
  const curtains = $$('.curtain');
  const darks = $$('[data-dark]');
  const under = (n, y) => { const r = n.getBoundingClientRect(); return r.top < y && r.bottom > y; };
  const mcta = $('#mcta'), quote = $('#quote');
  const onScroll = () => {
    const y = nav.offsetHeight / 2;
    nav.classList.toggle('is-solid', curtains.some(c => under(c, y)) && !darks.some(d => under(d, y)));
    // mobile quote button: hidden at the very top and while the form is on screen
    if (mcta) {
      const q = quote.getBoundingClientRect();
      mcta.classList.toggle('is-hidden', scrollY < innerHeight * 0.5 || (q.top < innerHeight && q.bottom > 0));
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------ HUD route rotation */
  const hudRoute = $('#hudRoute'), hudService = $('#hudService');
  let routeIndex = 0;
  if (!reduce && hudRoute) {
    setInterval(() => {
      if (document.hidden) return;
      const tagR = hudRoute.closest('.hud__tag'), tagS = hudService.closest('.hud__tag');
      tagR.classList.add('is-swap'); tagS.classList.add('is-swap');
      setTimeout(() => {
        routeIndex = (routeIndex + 1) % ROUTES.length;
        const [r, sv] = ROUTES[routeIndex];
        hudRoute.textContent = r;
        hudService.textContent = lang === 'ro' ? SERVICE_RO[sv] : sv;
        layoutHud();
        tagR.classList.remove('is-swap'); tagS.classList.remove('is-swap');
      }, 300);
    }, 3200);
  }

  /* ------------------------------------------------------------ HUD tracking */
  const video = $('#heroVideo');
  const hud = $('#hud');
  const box = $('#hudBox');
  const linesG = $('#hudLines g');
  const tags = {};
  $$('.hud__tag').forEach(t => { tags[t.dataset.tag] = t; });
  const TRACK = window.TRUCK_TRACK;
  const titleEl = $('.hero__title'), subEl = $('.hero__sub');
  const VW = 1920, VH = 1080;
  const lines = {};
  for (const k in tags) {
    lines[k] = { l: el('line', {}, linesG), c: el('circle', { r: 2 }, linesG) };
  }

  function frameAt(t) {
    if (!TRACK) return [0.565, 0.5, 0.07];
    const f = TRACK.f, x = Math.max(0, Math.min(f.length - 1.001, t * TRACK.fps));
    const i = Math.floor(x), u = x - i, a = f[i], b = f[i + 1] || a;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }

  let heroRect, vidRect, objPos;
  function measure() {
    heroRect = hero.getBoundingClientRect();
    vidRect = video.getBoundingClientRect();
    const op = getComputedStyle(video).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    objPos = [isNaN(op[0]) ? .5 : op[0], isNaN(op[1]) ? .5 : op[1]];
  }
  // tag reveal amounts, driven by scroll (0..1 each)
  const reveal = { truck: 1, departs: 1, gps: 1, eta: 1 };

  // where each tag sits relative to the box (in box units) + which corner it attaches to
  function placements(mobile) {
    return mobile ? {
      truck:   { ax: 0,   ay: 0,    dx: -0.15, dy: -0.95, side: 'left' },
      departs: { ax: 1,   ay: 0.1,  dx: 0.45,  dy: -0.45, side: 'right' },
      gps:     { ax: 1,   ay: 0.6,  dx: 0.45,  dy: 0.25,  side: 'right' },
      eta:     { ax: 0,   ay: 0.45, dx: -0.5,  dy: 0.05,  side: 'left' },
    } : {
      truck:   { ax: 0,   ay: 0,    dx: -0.25, dy: -0.85, side: 'left' },
      departs: { ax: 1,   ay: 0.08, dx: 0.85,  dy: -0.4,  side: 'right' },
      gps:     { ax: 1,   ay: 0.55, dx: 1.05,  dy: 0.02,  side: 'right' },
      eta:     { ax: 1,   ay: 0.95, dx: 0.8,   dy: 0.38,  side: 'right' },
    };
  }

  let tagSize = {};
  function layoutHud() {
    measure();
    for (const k in tags) tagSize[k] = [tags[k].offsetWidth, tags[k].offsetHeight];
  }

  function drawHud() {
    if (!vidRect) return;
    heroRect = hero.getBoundingClientRect();
    vidRect = video.getBoundingClientRect(); // includes the scroll zoom on .hero__media
    const t = video.currentTime || 0;
    const [cx, top, w] = frameAt(t);
    const rw = vidRect.width, rh = vidRect.height;
    const s = Math.max(rw / VW, rh / VH), dw = VW * s, dh = VH * s;
    const ox = vidRect.left - heroRect.left + (rw - dw) * objPos[0];
    const oy = vidRect.top - heroRect.top + (rh - dh) * objPos[1];
    const bw = w * 1.32 * dw, bh = bw * 1.5;
    const bx = ox + (cx + w * 0.08) * dw - bw / 2;
    const by = oy + top * dh - bh * 0.06;
    box.style.width = bw + 'px'; box.style.height = bh + 'px';
    box.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;

    const W = heroRect.width, mobile = W < 640;
    const P = placements(mobile);
    const unit = Math.max(bw, mobile ? 70 : 90);
    // tags never drift into the headline block (it lifts on scroll)
    const copyTop = copy.getBoundingClientRect().top - heroRect.top;
    const copyRight = Math.max(titleEl.getBoundingClientRect().right, subEl.getBoundingClientRect().right) - heroRect.left;
    for (const k in P) {
      const p = P[k], [tw, th] = tagSize[k] || [120, 28];
      const axp = bx + p.ax * bw, ayp = by + p.ay * bh;
      let tx = axp + p.dx * unit, ty = ayp + p.dy * unit - th / 2;
      if (p.side === 'left') tx -= tw;
      tx = Math.max(12, Math.min(W - tw - 12, tx));
      // a tag that would land on the headline block moves above it; if there is
      // no room above (short landscape screens) it stays hidden rather than pile up
      const minTop = mobile ? 76 : (heroRect.height < 700 ? 80 : 120);
      let fits = true;
      if ((mobile || tx < copyRight + 16) && ty + th > copyTop - 12) {
        const want = copyTop - th - 12;
        if (want < minTop) fits = false; else ty = want;
      }
      ty = Math.max(minTop, ty);
      const r = fits ? reveal[k] : 0;
      // the line draws out from the truck first, then the tag settles in at its end
      const kl = Math.min(1, r / 0.55), kt = Math.max(0, (r - 0.4) / 0.6);
      tags[k].style.opacity = kt.toFixed(3);
      tags[k].style.transform = `translate3d(${tx.toFixed(1)}px, ${(ty + (1 - kt) * 8).toFixed(1)}px, 0)`;
      const lx = p.side === 'left' ? tx + tw : tx, ly = ty + th / 2;
      const L = lines[k];
      L.l.setAttribute('x1', axp.toFixed(1)); L.l.setAttribute('y1', ayp.toFixed(1));
      L.l.setAttribute('x2', (axp + (lx - axp) * kl).toFixed(1)); L.l.setAttribute('y2', (ayp + (ly - ayp) * kl).toFixed(1));
      L.l.style.opacity = kl > 0 ? 1 : 0;
      L.c.setAttribute('cx', axp.toFixed(1)); L.c.setAttribute('cy', ayp.toFixed(1));
      L.c.setAttribute('r', (2 * Math.min(1, r * 4)).toFixed(2));
    }
  }

  /* ------------------------------------------------------------ scroll scene
     p: 0..1 across the pinned span (scrubs the footage, zooms, reveals the HUD)
     c: 0..1 while the curtain rises over the pinned hero */
  const scene = $('#heroScene');
  const media = $('.hero__media');
  const copy = $('.hero__copy');
  const poster = $('#heroPoster');
  const mqMobile = matchMedia('(max-width: 640px)');
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const smooth = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  // TRUCK is on screen from the start; the others arrive one by one as you scroll
  const STEPS = { truck: [-0.2, 0.0], departs: [0.12, 0.26], gps: [0.32, 0.46], eta: [0.52, 0.66] };
  let duration = 0, tCur = 0, sp = 0, sc = 0, scrubOn = false;

  function sceneProgress() {
    const pinPx = scene.offsetHeight - 2 * hero.offsetHeight;
    const y = -scene.getBoundingClientRect().top;
    return [clamp01(y / Math.max(1, pinPx)), clamp01((y - pinPx) / hero.offsetHeight)];
  }

  function applyScene(p, c) {
    const mob = mqMobile.matches;
    const zoom = 1 + (mob ? 0.06 : 0.12) * p;                // slow push-in, 1.00 -> 1.12
    const drift = (mob ? 10 : 18) * p + c * (mob ? 40 : 90);  // the image moves slower...
    media.style.transform = `translate3d(0, ${(-drift).toFixed(1)}px, 0) scale(${zoom.toFixed(4)})`;
    const lift = (mob ? 12 : 56) * p + c * (mob ? 60 : 200);  // ...than the copy
    copy.style.transform = `translate3d(0, ${(-lift).toFixed(1)}px, 0)`;
    copy.style.opacity = (1 - smooth(0.2, 0.8, c)).toFixed(3);
    hud.style.opacity = (1 - smooth(0.05, 0.6, c)).toFixed(3);
    for (const k in STEPS) reveal[k] = smooth(STEPS[k][0], STEPS[k][1], p);
  }

  function frame() {
    if (scene) heroFrame();
    bandsFrame();
    requestAnimationFrame(frame);
  }
  function heroFrame() {
    const [p, c] = sceneProgress();
    // calm easing: follow the wheel, never snap to it
    const ease = mqMobile.matches ? 0.16 : 0.1;
    sp += (p - sp) * ease; sc += (c - sc) * ease;
    if (Math.abs(p - sp) < 0.0005) sp = p;
    if (Math.abs(c - sc) < 0.0005) sc = c;
    if (sc < 1) {
      applyScene(sp, sc);
      if (scrubOn && duration) {
        const target = sp * (duration - 0.08);
        tCur += (target - tCur) * 0.35;
        if (!video.seeking && Math.abs(video.currentTime - tCur) > 1 / 60) video.currentTime = tCur;
      }
      drawHud();
    }
  }

  // Load a scrub clip as a Blob: seeking then never depends on HTTP range support.
  // onReady fires once the first real frame has painted (iOS keeps a never-played video blank).
  async function loadClip(v, src, onMeta, onReady) {
    v.addEventListener('loadedmetadata', () => onMeta(v.duration), { once: true });
    v.addEventListener('loadeddata', () => { v.currentTime = 0.001; }, { once: true });
    v.addEventListener('seeked', () => { v.classList.add('is-ready'); onReady && onReady(); }, { once: true });
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(res.status);
      v.src = URL.createObjectURL(await res.blob());
    } catch (e) { v.src = src; }
    v.load();
  }
  // phones keep the still frame + zoom: no video download at all
  function loadScrub() {
    if (mqMobile.matches) return;
    loadClip(video, video.dataset.src, d => { duration = d; scrubOn = true; }, () => { poster.style.opacity = 0; });
  }

  /* ------------------------------------------------------------ photo bands
     In-flow, never pinned: the photo eases out of a slight zoom and the title
     lifts a little as the band crosses the screen (transform + opacity only). */
  const bands = $$('.band').map(b => ({ b, img: $('.band__img', b), copy: $('.band__copy', b) }));
  function bandsFrame() {
    const H = innerHeight;
    bands.forEach(({ b, img, copy: c }) => {
      const r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H) return;
      const k = clamp01((H - r.top) / (H + r.height));   // 0 entering .. 1 leaving
      img.style.transform = `scale(${(1.14 - 0.14 * k).toFixed(4)})`;
      c.style.transform = `translate3d(0, ${((0.5 - k) * 60).toFixed(1)}px, 0)`;
      c.style.opacity = smooth(0.12, 0.42, k).toFixed(3);
    });
  }
  const clock = $('#hudClock');
  if (clock) setInterval(() => { const d = new Date(); clock.textContent = d.toTimeString().slice(0, 8); }, 1000);

  addEventListener('resize', () => { if (scene) { layoutHud(); drawHud(); } });

  /* ------------------------------------------------------------ maps (data loads lazily, ~38 KB gzipped) */
  const net = $('#netMap'), trk = $('#trkMap');
  let trkAnim = null, mapsReady = false;
  const pendingReveal = new Set();
  function initMaps() {
    const M = window.EUMAP;
    /* ------------------------------------------------------------ map helpers */
    function defs(svg, id) {
      const d = el('defs', {}, svg);
      const pat = (pid, gap, color, sw) => {
        const p = el('pattern', { id: pid + id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
        el('line', { x1: 0, y1: 0, x2: 0, y2: gap, stroke: color, 'stroke-width': sw }, p);
      };
      pat('hatch', 4.2, '#cfcfcb', .7);
      pat('hatchInk', 2.8, '#2a2a2a', .65);
      pat('hatchInk2', 2.2, '#0b0b0c', .9);
    }
    const NET = ['Austria', 'Italy', 'Croatia', 'Slovenia', 'Germany', 'Poland', 'Greece', 'Turkey', 'Iraq'];
    function countries(svg, id, home) {
      const g = el('g', {}, svg);
      M.countries.forEach(c => {
        const cls = c.name === 'Romania' ? 'is-home' : (home && NET.includes(c.name) ? 'is-net' : '');
        const p = el('path', { d: c.d, class: 'map-c ' + cls }, g);
        p.style.fill = `url(#${cls === 'is-home' ? 'hatchInk2' : cls === 'is-net' ? 'hatchInk' : 'hatch'}${id})`;
      });
      return g;
    }
    const pts2d = pts => 'M' + pts.map(p => p[0] + ',' + p[1]).join('L');

    /* ------------------------------------------------------------ network map */
    if (net && M) {
      defs(net, 'N');
      el('path', { d: M.graticule, fill: 'none', stroke: '#efefed', 'stroke-width': .6 }, net);
      countries(net, 'N', true);
      const lanesG = el('g', {}, net);
      const CITY = { vienna: 'Vienna', milan: 'Milan', zagreb: 'Zagreb', munich: 'Munich', stuttgart: 'Stuttgart', wroclaw: 'Wrocław', bologna: 'Bologna' };
      const laneEls = [];
      // which drawn lane lights up for each row of the list
      const KEY = { vienna: 'at', milan: 'it', zagreb: 'hr si', munich: 'de', wroclaw: 'pl' };
      Object.values(M.lanes).forEach(l => {
        laneEls.push(el('path', { d: pts2d(l.pts), class: 'map-lane', 'data-k': KEY[l.to] || '' }, lanesG));
      });
      laneEls.push(el('path', { d: pts2d(M.route.map(r => r.xy)), class: 'map-lane', 'data-k': 'gr' }, lanesG));
      laneEls.forEach((p, i) => { p.style.opacity = reduce ? 1 : 0; p.style.transition = `opacity .8s ease ${0.5 + i * 0.15}s`; });
      const lbl = (x, y, text, anchor = 'start', dx = 8, dy = 3) => {
        const t = el('text', { x: x + dx, y: y + dy, class: 'map-lbl map-lbl--bg', 'text-anchor': anchor }, lanesG);
        t.textContent = text;
      };
      Object.values(M.lanes).forEach(l => {
        const end = l.pts[l.pts.length - 1];
        el('circle', { cx: end[0], cy: end[1], r: 3.2, class: 'map-city' }, lanesG);
        const name = CITY[l.to] || l.to;
        const left = end[0] < 560;
        lbl(end[0], end[1], name, left ? 'end' : 'start', left ? -8 : 8);
      });
      // east: Istanbul, Ankara and on to Iraq (positions fitted to the map's own country outlines)
      const EAST = { bucharest: [776, 527], istanbul: [853, 552], ankara: [935, 589], gaziantep: [1029, 689], baghdad: [1231, 706] };
      const curve = pts => { let d = 'M' + pts[0].join(','); for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i]; const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2 - Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.08; d += ` Q${mx.toFixed(1)},${my.toFixed(1)} ${q.join(',')}`; } return d; };
      const ai0 = M.cities.albaiulia;
      [[ai0, EAST.bucharest, EAST.istanbul, EAST.ankara], [EAST.ankara, EAST.gaziantep, EAST.baghdad]].forEach((pts, i) => {
        const p = el('path', { d: curve(pts), class: 'map-lane', 'data-k': 'tr' }, lanesG);
        p.style.opacity = reduce ? 1 : 0; p.style.transition = `opacity .8s ease ${1.3 + i * 0.2}s`;
        laneEls.push(p);
      });
      [['istanbul', 'Istanbul', 'start', 8, 14], ['ankara', 'Ankara', 'start', 8, -6], ['baghdad', 'Baghdad', 'end', -8, -8]].forEach(([k, name, anc, dx, dy]) => {
        el('circle', { cx: EAST[k][0], cy: EAST[k][1], r: 3.2, class: 'map-city' }, lanesG);
        lbl(EAST[k][0], EAST[k][1], name, anc, dx, dy - 3);
      });
      const th = M.cities.thessaloniki, at = M.cities.athens, ai = M.cities.albaiulia;
      el('circle', { cx: th[0], cy: th[1], r: 3.2, class: 'map-city' }, lanesG);
      el('circle', { cx: at[0], cy: at[1], r: 3.2, class: 'map-city' }, lanesG);
      lbl(th[0], th[1], 'Thessaloniki', 'end', -8);
      lbl(at[0], at[1], 'Athens', 'start', 8);
      el('circle', { cx: ai[0], cy: ai[1], r: 9, fill: 'rgba(255,90,31,.18)' }, lanesG);
      el('circle', { cx: ai[0], cy: ai[1], r: 4.5, class: 'map-home' }, lanesG);
      lbl(ai[0], ai[1], 'Alba Iulia', 'start', 12, -8);
      net._reveal = () => { laneEls.forEach(p => { p.style.opacity = 1; }); };
      net._light = k => laneEls.forEach(p => p.classList.toggle('is-on', !!k && (p.dataset.k || '').split(' ').includes(k)));
    }

    /* ------------------------------------------------------------ tracking card map: Alba Iulia -> Munich (illustrative) */
    if (trk && M) {
      const pts = Object.values(M.lanes).find(l => l.to === 'munich').pts;
      // cumulative length along the drawn lane stands in for distance
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const total = cum[cum.length - 1];
      trk.setAttribute('viewBox', '478 404 280 130');
      defs(trk, 'T');
      countries(trk, 'T', false);
      const g = el('g', {}, trk);
      el('path', { d: pts2d(pts), fill: 'none', stroke: '#0b0b0c', 'stroke-width': 1, 'stroke-dasharray': '2 2.5', opacity: .45 }, g);
      const done = el('path', { d: pts2d(pts), fill: 'none', stroke: '#0b0b0c', 'stroke-width': 1.8, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1, 'stroke-linecap': 'round' }, g);
      const a = pts[0], b = pts[pts.length - 1], v = M.cities.vienna;
      el('circle', { cx: a[0], cy: a[1], r: 2.6, fill: '#0b0b0c' }, g);
      el('circle', { cx: b[0], cy: b[1], r: 3.4, fill: '#fff', stroke: '#0b0b0c', 'stroke-width': 1.2 }, g);
      const halo = el('circle', { r: 7, fill: 'rgba(255,90,31,.2)' }, g);
      const dot = el('circle', { r: 3.4, fill: '#ff5a1f', stroke: '#fff', 'stroke-width': 1.2 }, g);
      const tl = (p, text, anchor, dx, dy) => { const t = el('text', { x: p[0] + dx, y: p[1] + dy, class: 'map-lbl map-lbl--bg', 'text-anchor': anchor, style: 'font-size:7px' }, g); t.textContent = text; };
      tl(a, 'Alba Iulia', 'end', -6, 12);
      tl(b, lang === 'ro' ? 'München' : 'Munich', 'start', -4, -8);
      tl(v, lang === 'ro' ? 'Viena' : 'Vienna', 'start', 4, -7);
      // the truck is "now" at the point of the lane nearest Vienna
      const dV = p => Math.hypot(p[0] - v[0], p[1] - v[1]);
      let vi = 0; pts.forEach((p, i) => { if (dV(p) < dV(pts[vi])) vi = i; });
      const target = cum[vi] / total;
      // GPS chip: straight interpolation between the two ends (illustration only)
      const A = [23.58, 46.07], B = [11.58, 48.14];
      const bar = $('#trkBar'), chip = $('#trkChip');
      const set = f => {
        const d = f * total; let i = 0; while (i < pts.length - 2 && cum[i + 1] < d) i++;
        const u = (d - cum[i]) / ((cum[i + 1] - cum[i]) || 1);
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
        dot.setAttribute('cx', x); dot.setAttribute('cy', y); halo.setAttribute('cx', x); halo.setAttribute('cy', y);
        done.setAttribute('stroke-dashoffset', 1 - f);
        bar.style.width = (f * 100).toFixed(1) + '%';
        chip.textContent = `GPS · ${(A[1] + (B[1] - A[1]) * f).toFixed(2)}°N ${(A[0] + (B[0] - A[0]) * f).toFixed(2)}°E`;
      };
      set(reduce ? target : 0);
      trkAnim = () => {
        if (reduce) return;
        const t0 = performance.now(), D = 2600;
        const step = now => {
          const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
          set(e * target);
          if (k < 1) requestAnimationFrame(step);
          else { let f = target; const creep = () => { f = Math.min(target + 0.03, f + 0.00004); set(f); requestAnimationFrame(creep); }; requestAnimationFrame(creep); }
        };
        requestAnimationFrame(step);
      };
    }

    mapsReady = true;
    if (pendingReveal.has('trk') && trkAnim) trkAnim();
    if (pendingReveal.has('net') && net._reveal) net._reveal();
  }
  let mapsAsked = false;
  function loadMaps() {
    if (mapsAsked) return; mapsAsked = true;
    const sc = document.createElement('script');
    sc.src = BASE + 'assets/js/europe.js'; sc.async = true; sc.onload = initMaps;
    document.head.appendChild(sc);
  }
  const mapIO = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { loadMaps(); mapIO.disconnect(); } }, { rootMargin: '150% 0px 150% 0px' });
  [net, trk].forEach(n => n && mapIO.observe(n));

  /* ------------------------------------------------------------ count up */
  const cu = $('#countUp');
  const countUp = () => {
    if (reduce) return;
    const t0 = performance.now(), D = 1600;
    const step = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 4); cu.textContent = Math.round(e * 98); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  /* ------------------------------------------------------------ reveal */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const n = e.target;
    n.classList.add('is-in');
    if (n.classList.contains('ui--track')) { if (mapsReady && trkAnim) trkAnim(); else pendingReveal.add('trk'); }
    if (n.classList.contains('net')) { if (mapsReady && net._reveal) net._reveal(); else pendingReveal.add('net'); }
    if (n.querySelector('#countUp')) countUp();
    io.unobserve(n);
  }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(n => io.observe(n));

  /* ------------------------------------------------------------ form */
  const form = $('#quoteForm'), status = $('#formStatus');
  // a lane in the list pre-fills the destination; a service link pre-selects the transport type
  $$('[data-dest]').forEach(a => a.addEventListener('click', () => {
    form.to.value = a.dataset.dest;
    const r = $('input[name="direction"][value="Romania → Europe"]', form); if (r) r.checked = true;
  }));
  $$('.net__list li').forEach(li => {
    const k = (li.querySelector('[data-lane]') || {}).dataset?.lane;
    const light = on => { if (net && net._light) net._light(on ? k : null); };
    li.addEventListener('mouseenter', () => light(true));
    li.addEventListener('mouseleave', () => light(false));
    li.addEventListener('focusin', () => light(true));
    li.addEventListener('focusout', () => light(false));
  });
  $$('[data-service]').forEach(a => a.addEventListener('click', () => {
    const r = $(`input[name="transport_type"][value="${a.dataset.service}"]`, form); if (r) r.checked = true;
  }));
  // ?to=…&from=…&type=… in the URL (for the lane pages) pre-fills the same way
  const qs = new URLSearchParams(location.search);
  if (qs.get('to')) form.to.value = qs.get('to');
  if (qs.get('from')) form.from.value = qs.get('from');
  if (qs.get('type')) { const r = $(`input[name="transport_type"][value="${CSS.escape(qs.get('type'))}"]`, form); if (r) r.checked = true; }
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const S = STATUS[lang];
    status.className = 'form__status mono';
    let bad = false;
    $$('[required]', form).forEach(i => { const ok = i.value.trim() && (i.type !== 'email' || /.+@.+\..+/.test(i.value)); i.classList.toggle('is-bad', !ok); if (!ok) bad = true; });
    if (bad) { status.textContent = S.missing; status.classList.add('err'); $('.is-bad', form).focus(); return; }
    if (form.access_key.value.startsWith('YOUR_')) { status.textContent = S.nokey; status.classList.add('err'); return; }
    status.textContent = S.sending;
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const j = await res.json();
      if (j.success) {
        status.textContent = S.ok; status.classList.add('ok'); form.reset();
        const r = form.querySelector('[name="redirect"]');
        if (r) { try { location.href = new URL(r.value).pathname; } catch (e) {} }
      }
      else throw new Error(j.message);
    } catch (e) { status.textContent = S.err; status.classList.add('err'); }
  });

  $('#yr').textContent = new Date().getFullYear();

  /* ------------------------------------------------------------ boot */
  const start = () => {
    // lane pages have no video hero: only the photo band and the page reveals run
    if (!scene) { if (!reduce) requestAnimationFrame(frame); return; }
    layoutHud(); hud.classList.add('is-on');
    if (reduce) { drawHud(); return; } // static frame: poster, every tag shown, no scrub
    loadScrub();
    requestAnimationFrame(frame);
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
