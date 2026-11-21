/* Ria's Creations: page behaviour.
   Plain JS, no dependencies. Everything here enhances HTML that is already
   rendered, so the page reads fine before (or without) this file. */
(() => {
  "use strict";

  /* ── Shared helpers ─────────────────────────────────────────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = matchMedia("(max-width: 640px)");
  const OUT = "cubic-bezier(.23, 1, .32, 1)", INOUT = "cubic-bezier(.77, 0, .175, 1)", IN = "cubic-bezier(.4, 0, 1, 1)";
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const go = (sel) => { const el = document.querySelector(sel); window.__arrive?.(el); el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); };
  const rubber = (over, dim) => (1 - 1 / ((over * 0.55) / dim + 1)) * dim;   // resistance grows the further you pull
  const afterTransition = (el, ms = 450) => new Promise((r) => {
    const done = () => { clearTimeout(t); el.removeEventListener("transitionend", onEnd); r(); };
    const onEnd = (e) => { if (e.target === el) done(); };
    const t = setTimeout(done, ms);
    el.addEventListener("transitionend", onEnd);
  });
  /* Smooth height: animate a box from its old height to its new auto height. */
  function morphHeight(box, change) {
    box.getAnimations().forEach((a) => a.cancel());
    const from = box.offsetHeight;
    change();
    const to = box.offsetHeight;
    if (reduced || from === to) return;
    box.animate({ height: [from + "px", to + "px"] }, { duration: 380, easing: INOUT });
  }
  const enter = (el) => !reduced && el.animate({ opacity: [0, 1], transform: ["scale(.97)", "none"] }, { duration: 420, easing: OUT });
  const shake = (el) => !reduced && el.animate(
    { transform: ["translateX(0)", "translateX(-7px)", "translateX(6px)", "translateX(-4px)", "translateX(3px)", "translateX(-1px)", "translateX(0)"] },
    { duration: 420, easing: "ease-out" });

  /* ── Entry: walk through the arched doorway into the salon ───
     The counter follows real loading (fonts, the hero photo, the page) with a short
     minimum so it can be read. At 100% the doorway grows past the edges of the screen
     while the room inside grows more slowly, like stepping through a door. The photo
     lands exactly where the hero shows it, so the hand-off has no visible cut. */
  let walkedIn = false;
  function runEntry(done) {
    const entry = $("#entry"), heroImg = $("#heroImg");
    if (!entry || root.classList.contains("no-entry")) { entry?.remove(); return done(); }
    root.classList.add("entry-playing");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTo(0, 0);
    const door = $("#entryDoor"), dimg = $("#entryImg"), count = $("#entryCount"), ring = $("#entryRing"), line = $("#entryLine");
    // the doorway shows the very file the hero picked for this screen: one download, never two
    const syncDoor = () => { if (heroImg.currentSrc) dimg.src = heroImg.currentSrc; };
    syncDoor();
    if (!dimg.getAttribute("src")) heroImg.addEventListener("load", syncDoor, { once: true });
    // a little story while the page loads, then the door opens. Two lines: the loader lasts about 1.85 s and each
    // change fades for 200 ms, so two lines are the most that can each be read with no wait added
    // (BP-16, John 2026-11-21: "something that doesn't bring wait time")
    const LINES = [[0, "Warming up the dryers"], [61, "Come on in"]];
    let lineIdx = 0;
    const setLine = (pct) => {
      let i = 0; LINES.forEach(([at], k) => { if (pct >= at) i = k; });
      if (i === lineIdx) return;
      lineIdx = i; line.classList.add("swap");
      setTimeout(() => { line.textContent = LINES[i][1]; line.classList.remove("swap"); }, 200);
    };
    walkedIn = true;                                           // the hero then stays exactly where the walk lands it
    /* The doorway's photo is laid out at the size it lands at (the hero's) and shrunk to fit the door.
       It only ever shrinks, never stretches, so it stays as sharp as the hero the whole way in
       (phones decode a photo at the size it is laid out, and a stretched one goes blocky). */
    let k0 = 1;
    const fitDoor = () => {
      const hb = heroImg.getBoundingClientRect(), nw = heroImg.naturalWidth || 1530, nh = heroImg.naturalHeight || 2040;
      const s = Math.max(hb.width / nw, hb.height / nh), cw = nw * s, ch = nh * s, dw = door.offsetWidth, dh = door.offsetHeight;
      k0 = Math.max(dw / cw, dh / ch);
      Object.assign(dimg.style, { position: "absolute", maxWidth: "none", width: cw + "px", height: ch + "px",
        left: "50%", top: "50%", marginLeft: -cw / 2 + "px", marginTop: -ch / 2 + "px", transform: `scale(${k0})` });
    };
    fitDoor();
    heroImg.addEventListener("load", () => { if (!walking) fitDoor(); }, { once: true });
    const scrim = $(".hero-scrim"); scrim.style.opacity = "0";
    const tasks = [
      document.fonts ? document.fonts.ready : Promise.resolve(),
      heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve(),
      new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true }))),
    ];
    let ready = 0; tasks.forEach((p) => p.then(() => ready++, () => ready++));
    const t0 = performance.now(), MIN = 1300, MAX = 6000;
    let finished = false, walking = false;
    // never stuck: if frames stop (the phone pauses the page, a slow device), the walk-in still ends
    const giveUp = setTimeout(() => finish(), MAX + 5000);
    let shown = 0;
    const tick = (now) => {
      if (finished) return;
      const el = now - t0;
      const target = el > MAX ? 100 : Math.min((ready / tasks.length) * 100, (el / MIN) * 100);
      shown += (target - shown) * 0.14;
      if (target - shown < 0.6) shown = target;
      count.textContent = String(Math.floor(shown));
      ring.style.strokeDashoffset = String(100 - shown);       // the mirror light comes on as the page loads
      setLine(shown);
      if (shown >= 100) { count.textContent = "100"; ring.style.strokeDashoffset = "0"; setTimeout(walk, 180); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    function walk() {
      if (finished || walking) return;
      walking = true;
      setTimeout(() => finish(), 1500 + 1400);                 // the walk lasts 1.5 s; if frames stall, land anyway
      const vw = innerWidth, vh = innerHeight, r = door.getBoundingClientRect();
      Object.assign(door.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", transform: "none" });
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      // where the hero shows the photo: object-fit cover, positioned 50% 45%
      const hb = heroImg.getBoundingClientRect(), nw = heroImg.naturalWidth || 1530, nh = heroImg.naturalHeight || 2040;
      const s = Math.max(hb.width / nw, hb.height / nh), cw = nw * s, ch = nh * s;
      const tx = hb.left + (hb.width - cw) * 0.5 + cw / 2, ty = hb.top + (hb.height - ch) * 0.45 + ch / 2;
      const I1 = cw / r.width;                                   // photo: from the doorway's size to the hero's
      const D1 = 4 * Math.max(vw / r.width, vh / r.height, I1);   // doorway: grows well past the screen edges
      entry.classList.add("walking");
      const dur = 1500, start = performance.now();
      const step = (now) => {
        if (finished) return;
        const p = Math.min(1, (now - start) / dur);
        // One shot, everything ending on the same frame:
        // the room (photo) glides in and settles softly onto the hero, its size and its place on one curve,
        // so it never lands and then readjusts; the doorway holds, then rushes past you at the end.
        // These two curves keep the photo covering every part of the doorway that is on screen
        // (checked from 320 px phones to 2560 px screens: never more than 0.64 px short, and the doorway
        // is see-through while walking, so even that shows only the blush around it).
        const q = 1 - Math.pow(1 - p, 5), I = Math.pow(I1, q);
        const D = Math.pow(D1, Math.pow(p, 3));
        // the door really grows (its size, not a zoom of a small picture of it), and drifts with the photo
        const W = r.width * D, H = r.height * D, mx = cx + (tx - cx) * q, my = cy + (ty - cy) * q;
        Object.assign(door.style, { left: mx - W / 2 + "px", top: my - H / 2 + "px", width: W + "px", height: H + "px" });
        dimg.style.transform = `scale(${(I * r.width) / cw})`;   // only ever shrunk: ends at exactly 1, the photo at its own size
        if (p < 1) requestAnimationFrame(step);
        else finish();
      };
      requestAnimationFrame(step);
    }
    function finish() {
      if (finished) return;
      finished = true; clearTimeout(giveUp);
      try { sessionStorage.setItem("ria-entered", "1"); } catch (e) {}
      entry.remove();
      root.classList.add("no-entry"); root.classList.remove("entry-playing");
      done();
    }
  }

  /* ── Hero intro, played by anime.js ──────────────────────────
     Picks up where the walk-in ends (the photo already in place, it never moves again): the light dims a little
     behind the words, the headline rises, then the bar and the button. */
  function heroIntro() {
    const A = window.anime, heroImg = $("#heroImg"), scrim = $(".hero-scrim");
    const clean = () => [heroImg, scrim].forEach((el) => { el.style.removeProperty("transform"); el.style.removeProperty("opacity"); });
    if (reduced) { clean(); root.classList.add("intro-run"); return; }
    if (!A) { clean(); root.classList.add("intro-css"); return; }        // library missing: CSS fallback
    let chars = [];
    try { chars = $$(".hero h1 .ln > span").flatMap((el) => A.splitText(el, { chars: true }).chars); }
    catch (e) { clean(); root.classList.add("intro-css"); return; }
    const lede = $(".hero .lede"), cta = $(".hero .glide"), nav = $("#nav");
    const brand = $("#nav .logo");
    const navItems = $$("#nav .nav-links > a, #nav .nav-links > button, #nav .nav-tools > button").filter((el) => el.offsetParent);

    // starting poses, set before anything is revealed so nothing flashes
    A.set(chars, { y: "108%" });
    A.set([lede, cta], { opacity: 0, x: -40 });
    if (!walkedIn) A.set(heroImg, { scale: 1.04 });             // after the walk-in the photo is already in place: no settle
    A.set(scrim, { opacity: 0 });
    A.set(brand, { opacity: 0, x: -40 });
    A.set(navItems, { opacity: 0, x: 40 });
    root.classList.add("intro-run");

    // the intro lasts about 2.6 s; whatever happens (frames stop, the phone pauses the page), it lands by 4.5 s
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true; clearTimeout(guard);
      try { tl.pause(); } catch (e) {}
      // hand the elements back to CSS so hover, press and theme styles work normally
      [lede, cta, heroImg, scrim, nav, brand, ...navItems, ...chars].forEach((el) => {
        ["transform", "opacity", "translate", "scale"].forEach((p) => el.style.removeProperty(p));
      });
      root.classList.add("intro-done");
    };
    const guard = setTimeout(land, 4500);
    let tl;
    try {
    tl = A.createTimeline({ defaults: { ease: "out(4)" } });
    if (!walkedIn) tl.add(heroImg, { scale: 1, duration: 2600, ease: "out(3)" }, 0);
    tl.add(scrim, { opacity: 1, duration: 1000, ease: "out(2)" }, 0)
      .add(chars, { y: "0%", duration: 1100, delay: A.stagger(16) }, 180)
      .add(brand, { opacity: 1, x: 0, duration: 1400 }, 120)
      .add(navItems, { opacity: 1, x: 0, duration: 1400, delay: A.stagger(75) }, 240)
      .add(lede, { opacity: 1, x: 0, duration: 1200 }, 560)
      .add(cta, { opacity: 1, x: 0, duration: 1200 }, 680)
      .then(land);
    } catch (e) { land(); }
  }
  runEntry(heroIntro);

  /* ── The scroll story ─────────────────────────────────────────
     Blocks marked data-r arrive once, when 15% of them is on screen. Blocks that
     arrive together step in 90 ms apart, leftmost and topmost first, at most 6 steps.
     A section you jump to (a link, the search menu, a deep link) is simply there.
     Once a block lands it is handed back to its own styles, so presses, hovers and
     the tabs behave as before. If a move is cut short, the block lands at once. */
  (function story() {
    if (!root.classList.contains("reveal-on")) return;
    const STEP = 90, CAP = 6;
    const land = (el) => {
      if (!el.hasAttribute("data-r")) return;
      clearTimeout(el._landT);
      el.removeAttribute("data-r"); el.classList.remove("in", "now"); el.style.removeProperty("--d");
    };
    const show = (el, i, instant) => {
      if (!el.hasAttribute("data-r") || el.classList.contains("in")) return;
      if (instant) { el.classList.add("now", "in"); requestAnimationFrame(() => land(el)); return; }
      const d = Math.min(i, CAP - 1) * STEP;
      el.style.setProperty("--d", d + "ms");
      el.classList.add("in");
      const dur = 1000;
      el._landT = setTimeout(() => land(el), d + dur + 250);   // lands even if no transition event comes
      const done = (e) => { if (e.target === el && e.propertyName === "transform") { el.removeEventListener("transitionend", done); land(el); } };
      el.addEventListener("transitionend", done);
      el.addEventListener("transitioncancel", (e) => { if (e.target === el) land(el); }, { once: true });
    };
    // a block inside a sideways scroller (the gallery) arrives with its row, even if it sits off to the side
    const groups = new Map();
    const blocks = $$("[data-r]");
    blocks.forEach((el) => {
      const t = el.parentElement.closest(".scroller") || el;
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t).push(el);
    });
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).flatMap((e) => { io.unobserve(e.target); return groups.get(e.target) || []; });
      seen.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      seen.forEach((el, i) => show(el, i, false));
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    groups.forEach((_, t) => io.observe(t));
    // jumping to a section: everything in it is already in place when you land
    const arrive = (id) => {
      const sec = typeof id === "string" ? id && document.getElementById(id) : id;
      if (!sec) return;
      const s = sec.closest("section") || sec;
      $$("[data-r]", s).forEach((el) => { io.unobserve(el); show(el, 0, true); });
    };
    window.__arrive = arrive;
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (a && a.getAttribute("href").length > 1) arrive(a.getAttribute("href").slice(1));
    }, true);
    addEventListener("hashchange", () => arrive(location.hash.slice(1)));
    if (location.hash) arrive(location.hash.slice(1));
    const settle = () => $$("[data-r].in").forEach(land);
    addEventListener("pageshow", (e) => { if (e.persisted) settle(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") settle(); });
    window.__story = { revealAll: () => blocks.forEach((el) => { io.unobserve(el); show(el, 0, true); }) };
    root.classList.add("reveal-ready");
  })();

  /* ── Glide buttons (BP-18) ───────────────────────────────────
     John, 2026-11-21: "the clicking automatically traverses down slowly ... as if it's being pulled to the next
     section". Three links (See services, See her work, Book a visit) glide the page to their section's top, just under
     the header, on the page's ease-in-out curve, by the clock: 1.4 s for a screen's distance, at most 2.2 s. A wheel,
     touch, key or press stops it where it is. Focus moves to the section's heading without a jump. Reduced motion:
     it jumps at once. Without this script each link still lands (the CSS scroll padding keeps it under the header). */
  const curve = (x1, y1, x2, y2) => (t) => {   // a CSS cubic-bezier: find where the curve's x is t, give its y
    const at = (a, b, s) => 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 24; i++) { s = (lo + hi) / 2; if (at(x1, x2, s) < t) lo = s; else hi = s; }
    return at(y1, y2, s);
  };
  const glideEase = curve(...(getComputedStyle(root).getPropertyValue("--ease-in-out") || INOUT).match(/[\d.]+/g).map(Number));
  let glideStop = null, wheelStop = null;
  function glide(sec) {
    glideStop?.(); wheelStop?.();
    const heading = $("h2", sec);
    const to = Math.round(Math.max(0, Math.min(root.scrollHeight - innerHeight, sec.getBoundingClientRect().top + scrollY - $("#nav").offsetHeight)));
    const from = scrollY, d = to - from;
    const land = () => { heading.tabIndex = -1; heading.focus({ preventScroll: true }); };
    if (reduced || Math.abs(d) < 2) { scrollTo({ top: to, behavior: "instant" }); return land(); }
    const dur = Math.min(2200, Math.max(1400, 1400 + (Math.abs(d) - 700) * 0.6)), t0 = performance.now();
    const cuts = ["wheel", "touchstart", "keydown", "pointerdown"];
    let raf = 0;
    const stop = () => { cancelAnimationFrame(raf); cuts.forEach((t) => removeEventListener(t, stop, true)); glideStop = null; };
    const step = (now) => {
      const k = Math.min(1, Math.max(0, now - t0) / dur);
      scrollTo({ top: from + d * glideEase(k), behavior: "instant" });
      if (k < 1) raf = requestAnimationFrame(step); else { stop(); land(); }
    };
    cuts.forEach((t) => addEventListener(t, stop, { capture: true, passive: true }));
    glideStop = stop;
    raf = requestAnimationFrame(step);
  }
  $$("a.glide").forEach((a) => a.addEventListener("click", (e) => {
    const sec = $(a.getAttribute("href"));
    if (!sec || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); glide(sec);
  }));

  /* ── Heavy wheel (BP-18) ─────────────────────────────────────
     John: "the scrolling feels heavier than the static original one, where it looks like you're pulling the site
     down. Obviously not too slow, but not too fast." Each wheel turn moves a target; the page follows it by the clock,
     closing the gap with a 150 ms time constant, so it eases in and never passes it. Only for a mouse or trackpad
     (a fine pointer that hovers), never under reduced motion, never where something else should take the wheel: a
     field, an open dialog, a row that scrolls sideways, the reviews. Ctrl (zoom), keys, the scrollbar, touch and the
     glide buttons keep their own behaviour, and anything else that scrolls the page makes it let go. Idle: nothing runs. */
  (function heavyWheel() {
    if (reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const TAU = 150;
    let target = 0, pos = 0, last = 0, raf = 0, set = 0;
    const stop = () => { cancelAnimationFrame(raf); raf = 0; removeEventListener("scroll", onScroll); wheelStop = null; };
    const onScroll = () => { if (Math.abs(scrollY - set) > 2) stop(); };
    const step = (now) => {
      pos = target - (target - pos) * Math.exp(-Math.max(0, now - last) / TAU); last = now;
      if (Math.abs(target - pos) < 1.5) pos = target;
      scrollTo({ top: pos, behavior: "instant" }); set = scrollY;
      if (pos === target) return stop();
      raf = requestAnimationFrame(step);
    };
    addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY) || document.querySelector("dialog[open]")) return;
      const t = e.target.closest ? e.target : e.target.parentElement, row = t.closest(".scroller");
      if (t.closest("input, select, textarea, [contenteditable], dialog, .rail, #viewport") || (row && row.scrollWidth > row.clientWidth + 1)) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
      if (!raf) { pos = target = scrollY; }
      const next = Math.max(0, Math.min(root.scrollHeight - innerHeight, target + dy));
      if (next === target) return;
      e.preventDefault(); target = next;
      if (!raf) { last = performance.now(); set = scrollY; wheelStop = stop; addEventListener("scroll", onScroll, { passive: true }); raf = requestAnimationFrame(step); }
    }, { passive: false });
  })();

  /* ── BlurHash placeholders ──────────────────────────────────── */
  const B83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
  const d83 = (s) => [...s].reduce((v, c) => v * 83 + B83.indexOf(c), 0);
  const toLinear = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const toSRGB = (v) => { v = Math.max(0, Math.min(1, v)); return Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255); };
  const signPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  function decodeBlurHash(hash, w, h) {
    const size = d83(hash[0]), ny = Math.floor(size / 9) + 1, nx = (size % 9) + 1;
    const maxV = (d83(hash[1]) + 1) / 166, colors = [];
    for (let i = 0; i < nx * ny; i++) {
      if (i === 0) { const v = d83(hash.slice(2, 6)); colors.push([toLinear(v >> 16), toLinear((v >> 8) & 255), toLinear(v & 255)]); }
      else {
        const v = d83(hash.slice(4 + i * 2, 6 + i * 2));
        colors.push([Math.floor(v / 361), Math.floor(v / 19) % 19, v % 19].map((q) => signPow((q - 9) / 9, 2) * maxV));
      }
    }
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const basis = Math.cos((Math.PI * x * i) / w) * Math.cos((Math.PI * y * j) / h), c = colors[i + j * nx];
        r += c[0] * basis; g += c[1] * basis; b += c[2] * basis;
      }
      const o = 4 * (x + y * w);
      px[o] = toSRGB(r); px[o + 1] = toSRGB(g); px[o + 2] = toSRGB(b); px[o + 3] = 255;
    }
    return px;
  }
  $$(".ph").forEach((ph) => {
    const img = $("img", ph);
    if (ph.dataset.blurhash) {
      const c = document.createElement("canvas"); c.width = 24; c.height = 32; c.setAttribute("aria-hidden", "true");
      const ctx = c.getContext("2d"), data = ctx.createImageData(24, 32);
      data.data.set(decodeBlurHash(ph.dataset.blurhash, 24, 32)); ctx.putImageData(data, 0, 0);
      ph.prepend(c);
    }
    if (img.complete && img.naturalWidth) img.classList.add("loaded");          // already here: no fade needed
    else img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
  });

  /* ── Toasts, with undo ─────────────────────────────────────── */
  const toasts = $("#toasts");
  function toast(message, { action, onAction, onExpire, tone, duration = 5000 } = {}) {
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", tone === "error" ? "alert" : "status");
    if (tone) t.dataset.tone = tone;                          // green for done, red for a problem
    const p = document.createElement("p"); p.textContent = message; t.append(p);
    if (action) { const b = document.createElement("button"); b.className = "act"; b.type = "button"; b.textContent = action; t.append(b); }
    toasts.append(t);
    const timer = t.animate({ opacity: [1, 1] }, { duration });   // an invisible clock: no progress bar, still pausable
    let settled = false;
    const leave = (how) => {
      if (settled) return; settled = true; timer.cancel();
      t.classList.add("leaving"); setTimeout(() => t.remove(), 340);
      if (how !== "action") onExpire?.();
    };
    timer.finished.then(() => leave("expire"), () => {});
    ["pointerenter", "focusin"].forEach((e) => t.addEventListener(e, () => timer.pause()));     // reading it? the clock waits
    ["pointerleave", "focusout"].forEach((e) => t.addEventListener(e, () => !settled && timer.play()));
    t.querySelector(".act")?.addEventListener("click", () => { leave("action"); onAction?.(); });
    dragDismiss({ target: t, handles: [t], axis: "x", sign: 0, threshold: 0.35,
      onDismiss: (dir) => { t.style.transform = `translateX(${dir * 110}%)`; t.style.opacity = "0"; leave("swipe"); } });
    return { dismiss: () => leave("expire") };
  }

  /* ── Drag to dismiss (sheets, the photo viewer, toasts) ─────────
     Interruptible: grabbing mid-animation picks up from wherever the element is.
     Predictive: onMove reports progress and whether releasing now would dismiss. */
  function dragDismiss({ target, handles, axis = "y", sign = 1, threshold = 0.3, enabled = () => true, onStart, onMove, onRelease, onDismiss, onCancel }) {
    let d = null;
    const pos = (e) => (axis === "y" ? e.clientY : e.clientX);
    const cross = (e) => (axis === "y" ? e.clientX : e.clientY);
    handles.forEach((h) => h.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !enabled()) return;
      const m = new DOMMatrixReadOnly(getComputedStyle(target).transform);
      d = { id: e.pointerId, p0: pos(e), c0: cross(e), base: axis === "y" ? m.m42 : m.m41, active: false, v: 0, s: [{ t: e.timeStamp, p: pos(e) }] };
    }));
    addEventListener("pointermove", (e) => {
      if (!d || e.pointerId !== d.id) return;
      const delta = pos(e) - d.p0;
      if (!d.active) {
        if (Math.abs(delta) < 6) return;
        if (Math.abs(cross(e) - d.c0) > Math.abs(delta)) { d = null; return; }   // moving the other way: let it scroll
        d.active = true; target.style.transition = "none"; onStart?.();
      }
      const size = axis === "y" ? target.offsetHeight : target.offsetWidth;
      let v = d.base + delta;
      if (sign !== 0 && v * sign < 0) v = -sign * rubber(Math.abs(v), size);   // pulling the wrong way stretches, then springs back
      d.v = v; d.size = size;
      target.style.transform = axis === "y" ? `translateY(${v}px)` : `translateX(${v}px)`;
      d.s.push({ t: e.timeStamp, p: pos(e) });
      while (d.s.length > 2 && e.timeStamp - d.s[0].t > 100) d.s.shift();
      const progress = Math.min(1, Math.abs(v) / size);
      onMove?.(progress, (sign === 0 ? Math.abs(v) : v * sign) > size * threshold);
    });
    const end = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const g = d; d = null;
      if (!g.active) return;
      // a drag is not a tap: letting go over the dimmed backdrop must not count as "tap outside to close"
      const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => removeEventListener("click", swallow, { capture: true }), 0);
      const a = g.s[0], b = g.s[g.s.length - 1];
      const vel = b.t > a.t ? ((b.p - a.p) / (b.t - a.t)) * 1000 : 0;                    // px per second
      const far = sign === 0 ? Math.abs(g.v) > g.size * threshold : g.v * sign > g.size * threshold;
      const fast = sign === 0 ? Math.abs(vel) > 650 : vel * sign > 650;
      onRelease?.();
      target.style.transition = "";
      if (far || fast) onDismiss(Math.sign(g.v || vel) || 1, vel);
      else { target.style.transform = ""; onCancel?.(); }
    };
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  }

  /* ── Tooltips with skip-delay and shortcut hints ─────────────── */
  const tipEl = $("#tip");
  let tipTimer = 0, tipOn = false, lastHide = -1e9, tipFor = null;
  function placeTip(el) {
    tipEl.replaceChildren(document.createTextNode(el.dataset.tip));
    if (el.dataset.kbd) { const k = document.createElement("kbd"); k.textContent = el.dataset.kbd; tipEl.append(k); }
    const r = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    let top = r.top - th - 8, below = false;
    if (top < 8) { top = r.bottom + 8; below = true; }
    const left = Math.max(8, Math.min(innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
    tipEl.style.top = top + "px"; tipEl.style.left = left + "px";
    tipEl.style.transformOrigin = `${r.left + r.width / 2 - left}px ${below ? 0 : th}px`;
  }
  function showTip(el, instant) {
    tipFor = el; placeTip(el);
    tipEl.classList.toggle("instant", instant);
    tipEl.classList.add("show"); tipOn = true;
    el.setAttribute("aria-describedby", "tip");
  }
  function hideTip() {
    clearTimeout(tipTimer);
    if (tipOn) lastHide = performance.now();
    tipOn = false; tipEl.classList.add("instant"); tipEl.classList.remove("show");
    tipFor?.removeAttribute("aria-describedby"); tipFor = null;
  }
  function wantTip(el) {
    clearTimeout(tipTimer);
    if (tipOn || performance.now() - lastHide < 450) showTip(el, true);   // skip the delay between neighbours
    else tipTimer = setTimeout(() => showTip(el, false), 520);
  }
  function bindTips(scope = document) {
    $$("[data-tip]", scope).forEach((el) => {
      if (el.dataset.tipBound) return; el.dataset.tipBound = "1";
      el.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") wantTip(el); });
      el.addEventListener("pointerleave", hideTip);
      el.addEventListener("focus", () => { if (el.matches(":focus-visible")) wantTip(el); });
      el.addEventListener("blur", hideTip);
      el.addEventListener("pointerdown", hideTip);
    });
  }
  bindTips();

  /* ── Light mode / Dark mode: beside Services and Gallery (John, 2026-11-20); Light is the default ── */
  const themeLabel = () => (root.dataset.theme === "dark" ? "Light mode" : "Dark mode");
  const modeBtn = $("#modeBtn");
  function toggleTheme() {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.classList.add("theme-switching");
    root.dataset.theme = next;
    void root.offsetWidth;                                     // flush styles while transitions are off
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
    modeBtn.textContent = themeLabel();
    try { localStorage.setItem("ria-look", next); } catch (e) {}
  }
  modeBtn.textContent = themeLabel();
  modeBtn.addEventListener("click", toggleTheme);

  /* ── Nav turns solid past the hero; mobile bar shows between hero and booking ── */
  const nav = $("#nav"), mbar = $("#mbar"), hero = $(".hero"), book = $("#book"), visit = $("#visit");   // mbar: optional mobile bar
  const seen = new Map();
  new IntersectionObserver((es) => {
    es.forEach((e) => seen.set(e.target, e.isIntersecting));
    mbar?.classList.toggle("show", seen.size === 3 && !seen.get(hero) && !seen.get(book) && !seen.get(visit));
  }).observe(hero);
  const io2 = new IntersectionObserver((es) => {
    es.forEach((e) => seen.set(e.target, e.isIntersecting));
    mbar?.classList.toggle("show", seen.size === 3 && !seen.get(hero) && !seen.get(book) && !seen.get(visit));
  });
  io2.observe(book); io2.observe(visit);

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); toast(`${label} copied`, { tone: "ok" }); }
    catch (e) { toast(`Copy didn't work. ${label}: ${text}`, { tone: "error" }); }
  }

  /* ── Services data, read from the pre-rendered menu ─────────── */
  const tabs = $$(".tab"), panels = $$(".menu");
  const CATS = panels.map((p, i) => ({
    name: tabs[i].textContent.trim() + (tabs[i].dataset.keys ? " " + tabs[i].dataset.keys : ""),   // search also knows a tab's longer name
    items: $$("li", p).map((li) => ({
      name: [...$("h3", li).childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(),
      price: $(".price", li).textContent.trim(),
      desc: [$("p", li)?.textContent.trim(), li.dataset.keys].filter(Boolean).join(" "),   // words search can find: the line under it, or the one BP-18 cut from sight
    })),
  }));
  const SERVICES = CATS.flatMap((c) => c.items.map((s) => ({ ...s, cat: c.name })));

  /* ── Command menu (⌘K / Ctrl K / "/") ───────────────────────── */
  const cmd = $("#cmd"), cmdInput = $("#cmdInput"), cmdList = $("#cmdList");
  const MOD = isMac ? "⌘K" : "Ctrl K";
  let results = [], active = 0, cmdReturn = null, closing = null;
  // quiet: shown only when searched, so the menu opens with six choices (BP-17; BP-18 made Meet Ria quiet)
  const commands = () => [
    { g: "Suggested", label: "Book a visit", kbd: "B", keys: "appointment booking schedule", run: goBook },
    { g: "Suggested", label: "Call the salon", hint: "(770) 557-0354", keys: "phone number text cancel change reschedule", run: () => (location.href = "tel:+17705570354") },
    ...SERVICES.map((s) => ({ g: "Book a service", label: s.name, hint: s.price, keys: `${s.cat} ${s.desc}`, run: () => bookService(s.name) })),
    { g: "Go to", label: "Services and prices", keys: "menu cost how much", run: () => go("#services") },
    { g: "Go to", label: "Gallery", keys: "photos recent work color hair results", run: () => go("#work") },
    { g: "Go to", label: themeLabel(), keys: "theme dark light mode evening day", run: toggleTheme },
    { g: "Go to", label: "Meet Ria", keys: "stylist owner about team", quiet: 1, run: () => go("#stylist") },
    { g: "Go to", label: "Reviews", keys: "rating google yelp", quiet: 1, run: () => go("#reviews") },
    { g: "Go to", label: "Hours and directions", keys: "open close address map visit parking payment card credit cash sunday walk in monday saturday weekend", run: () => go("#visit") },
    { g: "Contact", label: "Copy address", keys: "where location", quiet: 1, run: () => copy("375 Rockbridge Rd NW, Suite 156, Lilburn, GA 30047", "Address") },
    { g: "Contact", label: "Get directions", keys: "map drive", quiet: 1, run: () => open($(".map-link").href, "_blank", "noopener") },
  ];
  function renderCmd() {
    const words = cmdInput.value.toLowerCase().split(/\s+/).filter(Boolean).map((w) => (w.length > 4 ? w.replace(/e?s$/, "") : w));
    results = commands().filter((c) => (words.length ? words.every((w) => `${c.label} ${c.keys || ""} ${c.g}`.toLowerCase().includes(w)) : c.g !== "Book a service" && !c.quiet));
    // a name that starts with what you typed comes first, then a name that contains it
    const rank = (c) => { const l = c.label.toLowerCase(); return words.every((w) => l.startsWith(w) || l.includes(" " + w)) ? 0 : words.every((w) => l.includes(w)) ? 1 : 2; };
    if (words.length) results = results.map((c, i) => [rank(c), i, c]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
    active = Math.min(active, Math.max(0, results.length - 1));
    if (!results.length) {
      cmdList.innerHTML = `<div class="cmd-empty">No matches for “${cmdInput.value.replace(/[<&]/g, "")}”. Try “haircut”, “hours” or “call”.</div>`;
      cmdInput.removeAttribute("aria-activedescendant"); return;
    }
    let html = "", group = "";
    results.forEach((c, i) => {
      if (c.g !== group) { group = c.g; html += `<div class="cmd-group" role="presentation">${group}</div>`; }
      html += `<div class="cmd-item" role="option" id="cmd-${i}" data-i="${i}" aria-selected="${i === active}"><span>${c.label}</span>${c.kbd ? `<kbd>${c.kbd}</kbd>` : c.hint ? `<small>${c.hint}</small>` : ""}</div>`;
    });
    cmdList.innerHTML = html;
    cmdInput.setAttribute("aria-activedescendant", `cmd-${active}`);
  }
  function setActive(i, scroll = true) {
    if (!results.length) return;
    active = (i + results.length) % results.length;
    $$(".cmd-item", cmdList).forEach((el) => el.setAttribute("aria-selected", +el.dataset.i === active));
    cmdInput.setAttribute("aria-activedescendant", `cmd-${active}`);
    if (scroll) $(`#cmd-${active}`)?.scrollIntoView({ block: "nearest" });
  }
  function openCmd(trigger) {
    if (cmd.open) return;
    hideTip();
    cmdReturn = document.activeElement;
    cmdInput.value = ""; active = 0; renderCmd();
    cmd.showModal();
    void cmd.offsetWidth;                                    // commit the closed state so the entry transition runs
    if (!phone.matches && trigger) {                         // desktop: grow out of the button that opened it
      const r = trigger.getBoundingClientRect(), c = cmd.getBoundingClientRect();
      cmd.style.transformOrigin = `${Math.max(0, Math.min(c.width, r.left + r.width / 2 - c.left))}px ${r.top < c.top ? 0 : c.height}px`;
    } else cmd.style.transformOrigin = "50% 0";
    requestAnimationFrame(() => cmd.classList.add("open"));
    if (trigger?.id !== "menuBtn") cmdInput.focus();
  }
  function closeCmd(then) {
    if (!cmd.open || closing) return closing;
    cmd.classList.remove("open", "will-close", "dragging");
    cmd.style.transform = ""; cmd.style.removeProperty("--scrim-o");
    closing = afterTransition(cmd, 320).then(() => {
      cmd.close(); closing = null; cmd.style.transition = "";
      cmdReturn?.focus?.({ preventScroll: true });
      then?.();
    });
    return closing;
  }
  cmdInput.addEventListener("input", () => { active = 0; renderCmd(); });
  cmdInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Home" && !cmdInput.value) { e.preventDefault(); setActive(0); }
    else if (e.key === "End" && !cmdInput.value) { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); const c = results[active]; closeCmd(c.run); }
  });
  cmdList.addEventListener("pointermove", (e) => { const it = e.target.closest(".cmd-item"); if (it && +it.dataset.i !== active) setActive(+it.dataset.i, false); });
  cmdList.addEventListener("click", (e) => { const it = e.target.closest(".cmd-item"); if (it) { const c = results[+it.dataset.i]; closeCmd(c.run); } });
  cmd.addEventListener("cancel", (e) => { e.preventDefault(); closeCmd(); });
  cmd.addEventListener("click", (e) => { if (e.target === cmd) closeCmd(); });          // click on the backdrop
  $("#menuBtn").addEventListener("click", (e) => openCmd(e.currentTarget));
  /* phones: the command menu is a sheet; swipe it down to dismiss */
  dragDismiss({
    target: cmd, handles: [$(".cmd-handle"), $(".cmd-search")], axis: "y", sign: 1, threshold: 0.3, enabled: () => phone.matches,
    onStart: () => cmd.classList.add("dragging"),
    onMove: (p, willClose) => { cmd.style.setProperty("--scrim-o", String(1 - p)); cmd.classList.toggle("will-close", willClose); },
    onRelease: () => cmd.classList.remove("dragging"),
    onDismiss: () => closeCmd(),
    onCancel: () => { cmd.classList.remove("will-close"); cmd.style.removeProperty("--scrim-o"); },
  });

  /* ── Photo viewer: view transitions in and out, swipe to dismiss ── */
  const viewer = $("#viewer"), vInner = $("#viewerInner"), vImg = $("#viewerImg"), vCap = $("#viewerCap");
  let vSource = null, vt = null;
  const canVT = () => !!document.startViewTransition && !reduced;
  function withVT(update) {
    vt?.skipTransition();                                   // a new transition interrupts the old one
    if (!canVT()) { update(); return Promise.resolve(); }
    vt = document.startViewTransition(update);
    return vt.finished.finally(() => { vt = null; });
  }
  function openViewer(img) {
    hideTip(); vSource = img;
    img.style.viewTransitionName = "photo";
    withVT(() => {
      img.style.viewTransitionName = "";
      vImg.src = img.currentSrc || img.src; vImg.alt = img.alt; vCap.textContent = img.closest("li")?.querySelector("figcaption b")?.textContent || img.alt;
      // the page may show a small copy; the viewer swaps to the full-size photo once it is ready
      const full = img.getAttribute("src");
      if (full && vImg.src !== new URL(full, location.href).href) {
        const hi = new Image(); hi.src = full;
        hi.decode().then(() => { if (vImg.alt === img.alt) vImg.src = hi.src; }).catch(() => {});
      }
      vImg.style.viewTransitionName = "photo";
      vInner.style.cssText = "";
      viewer.showModal(); viewer.classList.add("open");
    }).then(() => { vImg.style.viewTransitionName = ""; });
  }
  function closeViewer(morph = true) {
    if (!viewer.open) return;
    const src = vSource;
    const update = () => {
      vImg.style.viewTransitionName = "";
      viewer.classList.remove("open", "dragging"); viewer.style.removeProperty("--scrim-o");
      viewer.close();
      if (morph && src) src.style.viewTransitionName = "photo";
    };
    if (morph) vImg.style.viewTransitionName = "photo";
    (morph ? withVT(update) : (update(), Promise.resolve())).then(() => {
      if (src) src.style.viewTransitionName = "";
      vInner.style.cssText = "";
      src?.closest("button")?.focus({ preventScroll: true });
    });
  }
  $$("[data-view]").forEach((b) => b.addEventListener("click", () => openViewer($("img", b))));
  $("#viewerClose").addEventListener("click", () => closeViewer());
  viewer.addEventListener("cancel", (e) => { e.preventDefault(); closeViewer(); });
  viewer.addEventListener("click", (e) => { if (e.target === viewer) closeViewer(); });
  dragDismiss({
    target: vInner, handles: [vInner], axis: "y", sign: 0, threshold: 0.22,
    onStart: () => viewer.classList.add("dragging"),
    onMove: (p) => viewer.style.setProperty("--scrim-o", String(1 - p * 1.4)),
    onRelease: () => viewer.classList.remove("dragging"),
    onDismiss: (dir) => {
      vInner.style.transform = `translateY(${dir * innerHeight * 0.6}px)`; vInner.style.opacity = "0";
      viewer.classList.remove("open");
      afterTransition(vInner, 320).then(() => closeViewer(false));
    },
    onCancel: () => viewer.style.removeProperty("--scrim-o"),
  });

  /* ── Recent work rail: arrows move one photo at a time ── */
  const rail = $("#rail"), workPrev = $("#workPrev"), workNext = $("#workNext");
  const step = () => { const li = $("li", rail); return li.offsetWidth + parseFloat(getComputedStyle(rail).columnGap || 0); };
  const railEnds = () => {
    workPrev.disabled = rail.scrollLeft < 4;
    workNext.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4;
  };
  workPrev.addEventListener("click", () => rail.scrollBy({ left: -step() }));
  workNext.addEventListener("click", () => rail.scrollBy({ left: step() }));
  rail.addEventListener("scroll", railEnds, { passive: true });
  addEventListener("resize", railEnds); railEnds();

  /* ── Service tabs: directional slides, smooth height, transform-only indicator ── */
  const ink = $(".tab-ink"), wrapP = $("#panels");
  let cur = 0;
  function moveInk(animate) {
    const t = tabs[cur];
    if (!animate) ink.style.transition = "none";
    ink.style.transform = `translate(${t.offsetLeft}px, ${t.offsetTop + t.offsetHeight - 1}px) scaleX(${t.offsetWidth})`;
    if (!animate) { void ink.offsetWidth; ink.style.transition = ""; }
  }
  function selectTab(i, focus) {
    if (i === cur) return;
    const dir = i > cur ? 1 : -1, oldP = panels[cur], newP = panels[i];
    wrapP.getAnimations({ subtree: true }).forEach((a) => a.cancel());      // interruptible: a new tab cancels the old slide
    panels.forEach((p, k) => { p.style.cssText = ""; p.hidden = k !== cur; });
    tabs.forEach((t, k) => { t.setAttribute("aria-selected", k === i); t.tabIndex = k === i ? 0 : -1; });
    if (focus) tabs[i].focus();
    morphHeight(wrapP, () => {
      oldP.style.cssText = "position:absolute;inset:0 0 auto 0;pointer-events:none";
      newP.hidden = false;
    });
    cur = i; moveInk(true);
    const tl = tabs[i].parentElement;
    tl.scrollTo({ left: Math.max(0, tabs[i].offsetLeft - tl.clientWidth / 2 + tabs[i].offsetWidth / 2), behavior: reduced ? "auto" : "smooth" });
    if (reduced) { oldP.hidden = true; oldP.style.cssText = ""; return; }
    newP.animate({ opacity: [0, 1], transform: [`translateX(${dir * 32}px)`, "none"] }, { duration: 460, easing: OUT });
    const ex = oldP.animate({ opacity: [1, 0], transform: ["none", `translateX(${-dir * 32}px)`] }, { duration: 200, easing: IN, fill: "forwards" });
    ex.onfinish = () => { ex.cancel(); oldP.hidden = true; oldP.style.cssText = ""; };
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(i));
    t.addEventListener("keydown", (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); selectTab((cur + k + tabs.length) % tabs.length, true); }
    });
  });
  moveInk(false);
  document.fonts?.ready.then(() => moveInk(false));
  addEventListener("resize", () => moveInk(false));

  /* ── Reviews: velocity springs, rubber-banding, predictive fade ── */
  const vp = $("#viewport"), track = $("#track"), slides = $$(".slide", track);
  const prev = $("#prev"), next = $("#next"), count = $("#count"), N = slides.length;
  let x = 0, idx = 0, w = vp.clientWidth, raf = 0;
  function setX(v) {
    x = v; track.style.transform = `translate3d(${v}px,0,0)`;
    slides.forEach((s, k) => (s.style.opacity = String(1 - Math.min(1, Math.abs(k * w + v) / w) * 0.7)));   // the next quote fades up as you pull it in
  }
  function setIdx(i) {
    idx = Math.max(0, Math.min(N - 1, i));
    prev.disabled = idx === 0; next.disabled = idx === N - 1;
    count.textContent = `${idx + 1} / ${N}`;
    // reviews you are not on are out of reach: no Tab stop or click lands in a hidden card
    slides.forEach((s, k) => { s.setAttribute("aria-hidden", k !== idx); s.inert = k !== idx; });
    vp.style.height = Math.max(...slides.map((s) => s.offsetHeight)) + "px";   // as tall as the longest review: the arrows never move under your thumb
  }
  function springTo(target, v0 = 0) {
    cancelAnimationFrame(raf);
    if (reduced) return setX(target);
    const k = 230, c = 31, m = 1;     // stiffness, damping, mass: critically damped, so it settles without bouncing
    let v = v0, last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000), sub = 4, h = dt / sub; last = now;
      for (let s = 0; s < sub; s++) { const a = (-k * (x - target) - c * v) / m; v += a * h; x += v * h; }
      setX(x);
      if (Math.abs(v) < 4 && Math.abs(x - target) < 0.4) return setX(target);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  const goSlide = (i, v0 = 0) => { setIdx(i); springTo(-idx * w, v0); };
  prev.addEventListener("click", () => goSlide(idx - 1));
  next.addEventListener("click", () => goSlide(idx + 1));
  vp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goSlide(idx + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goSlide(idx - 1); }
  });
  let drag = null;
  vp.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(raf);                                 // interruptible: catch it mid-spring
    drag = { x0: e.clientX, y0: e.clientY, base: x, axis: null, id: e.pointerId, s: [{ t: e.timeStamp, x: e.clientX }] };
  });
  vp.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (drag.axis === "y") { drag = null; return goSlide(idx); }
      vp.setPointerCapture(e.pointerId); vp.classList.add("dragging"); hideTip();
    }
    let p = drag.base + dx;
    const min = -(N - 1) * w;
    if (p > 0) p = rubber(p, w); else if (p < min) p = min - rubber(min - p, w);
    setX(p);
    drag.s.push({ t: e.timeStamp, x: e.clientX });
    while (drag.s.length > 2 && e.timeStamp - drag.s[0].t > 100) drag.s.shift();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; vp.classList.remove("dragging");
    if (d.axis !== "x") return goSlide(idx);
    const a = d.s[0], b = d.s[d.s.length - 1];
    const v = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0;     // release velocity, px per second
    const target = Math.max(idx - 1, Math.min(idx + 1, Math.round(-(x + v * 0.18) / w)));
    goSlide(target, v);
  };
  vp.addEventListener("pointerup", endDrag);
  vp.addEventListener("pointercancel", endDrag);
  addEventListener("resize", () => { w = vp.clientWidth; cancelAnimationFrame(raf); setX(-idx * w); setIdx(idx); });
  setIdx(0); setX(0);
  document.fonts?.ready.then(() => setIdx(idx));

  /* ── Booking ─────────────────────────────────────────────────
     Optimistic: "Check your texts" shows the moment you press send.
     Idempotent: one key per request, so retries and double-taps never book twice.
     If sending fails, the form comes back exactly as you left it. */
  const form = $("#bookForm"), box = $("#formBox"), sent = $("#sent"), confirmed = $("#confirmed");
  const submitLabel = $("#submitLabel"), statusEl = $("#sentStatus"), otpBox = $("#otpBox"), otp = $("#otp");
  const dateIn = form.elements.date, slots = $$(".slot");
  const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  dateIn.min = today.toISOString().slice(0, 10);
  const firstOpenDay = () => {   // today if there is still time to book, otherwise the next day the salon is open
    const d = new Date(); if (lilburnNow().min > 18 * 60 - 30) d.setDate(d.getDate() + 1);   // too late for the last slot in Lilburn
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10);
  };
  dateIn.value = firstOpenDay();
  const isSunday = (v) => !!v && new Date(v + "T12:00").getDay() === 0;

  /* The salon's booking API, simulated for the demo. In production these are real requests
     that carry the Idempotency-Key header; the server returns the first result for a repeated key. */
  const api = (() => {
    const inflight = new Map(), done = new Map();
    return {
      request(key, body) {
        if (done.has(key)) return Promise.resolve(done.get(key));
        if (inflight.has(key)) return inflight.get(key);
        const p = wait(900).then(() => {
          if (navigator.onLine === false) throw new Error("offline");
          const r = { ref: refFor(key), body }; done.set(key, r); return r;
        }).finally(() => inflight.delete(key));
        inflight.set(key, p); return p;
      },
      async verify(key, code) { await wait(500); if (!/^\d{6}$/.test(code)) throw new Error("code"); return true; },
      async cancel(key) { await wait(300); done.delete(key); },
    };
  })();
  const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16) + Math.random().toString(16).slice(2));
  const refFor = (k) => "RC-" + k.replace(/-/g, "").slice(0, 6).toUpperCase();
  let idemKey = newKey(), booking = null, otpAbort = null;

  // nothing is chosen for the client: she picks her own time (the first open one takes the Tab key until then)
  const pick = (s) => {
    slots.forEach((el) => { const on = el === s; el.setAttribute("aria-checked", on); el.tabIndex = on ? 0 : -1; });
    if (!s) { const first = slots.find((el) => !el.disabled); if (first) first.tabIndex = 0; }
    else $("#e-time").textContent = "";
  };
  const slotMin = (el) => { const [, h, m, ap] = el.textContent.match(/(\d+):(\d+)\s*(AM|PM)/); return (+h % 12 + (ap === "PM" ? 12 : 0)) * 60 + +m; };
  function refreshSlots() {   // on today, times that have passed (or start within 30 minutes) are greyed out
    const now = dateIn.value === dateIn.min ? lilburnNow().min + 30 : -1;
    slots.forEach((el) => (el.disabled = slotMin(el) <= now));
    const chosen = $('.slot[aria-checked="true"]');
    if (!chosen || chosen.disabled) pick(null);                // a time that just passed is let go, never swapped silently
  }
  refreshSlots();
  const slotTime = () => $('.slot[aria-checked="true"]')?.textContent || "";
  const dayName = (v, long) => new Date(v + "T12:00").toLocaleDateString(undefined, long ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "short" });
  const digits = (s) => s.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const fmtPhone = (p) => `(${p.slice(0, 3)})\u00a0${p.slice(3, 6)}-\u2060${p.slice(6)}`;   // never split across two lines

  /* Predictive feedback: the button says exactly what will be requested. */
  function predict() {
    const s = form.elements.service.value;
    const dayOk = dateIn.value && dateIn.value >= dateIn.min && !isSunday(dateIn.value) && slots.some((el) => !el.disabled);
    submitLabel.textContent = s && dayOk && slotTime() ? `Book ${s.toLowerCase()}, ${`${dayName(dateIn.value)} at ${slotTime()}`.replace(/ /g, "\u00a0")}` : "Book";   // day and time stay together
  }
  slots.forEach((s, i) => {
    s.addEventListener("click", () => { pick(s); predict(); });
    s.addEventListener("keydown", (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (k) {
        e.preventDefault();
        let j = i; do { j = (j + k + slots.length) % slots.length; } while (slots[j].disabled && j !== i);
        const n = slots[j]; pick(n); n.focus(); predict();
      }
    });
  });

  const rules = [
    ["service", "f-service", (v) => !!v, "Choose a service."],
    ["date", "f-date", (v) => !!v && v >= dateIn.min && !isSunday(v) && slots.some((el) => !el.disabled),
      () => (isSunday(dateIn.value) ? "Closed Sundays. Pick another day." : dateIn.value === dateIn.min ? "No times left today. Pick another day." : "Choose today or a later day.")],
    ["name", "f-name", (v) => v.trim().length > 0, "Enter your first name."],
    ["phone", "f-phone", (v) => digits(v).length === 10, "Enter a 10-digit mobile number."],
  ];
  function check(name) {
    const [n, fid, ok, msg] = rules.find((r) => r[0] === name);
    const good = ok(form.elements[n].value);
    document.getElementById(fid).toggleAttribute("data-invalid", !good);
    form.elements[n].setAttribute("aria-invalid", !good);
    document.getElementById("e-" + n).textContent = good ? "" : typeof msg === "function" ? msg() : msg;
    return good;
  }
  rules.forEach(([n]) => form.elements[n].addEventListener(n === "service" || n === "date" ? "change" : "input", () => {
    if (n === "date") refreshSlots();
    if (n === "date" || document.getElementById("e-" + n).textContent) check(n);   // a closed day says so at once
    predict();
  }));

  function showState(name) {
    const target = { form, sent, confirmed }[name];
    morphHeight(box, () => { [form, sent, confirmed].forEach((el) => (el.hidden = el !== target)); progressEl.hidden = name === "form"; });
    enter(target);
    if (name !== "form") {
      target.focus({ preventScroll: true });
      const top = box.getBoundingClientRect().top;
      if (top < nav.offsetHeight || top > innerHeight * 0.5) box.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    }
  }
  function setStatus(state, text) { statusEl.dataset.state = state; statusEl.textContent = text; }
  const progressEl = $("#progress"), otpSkel = $("#otpSkel");
  function progress(stage) {                                   // 0 sending, 1 waiting for the code, 2 confirmed
    $$("span", progressEl).forEach((s, i) => { s.classList.toggle("done", i < stage || stage === 2); s.classList.toggle("now", i === stage && stage < 2); });
    progressEl.setAttribute("aria-valuenow", String(Math.min(3, stage + 1)));
  }

  function send(key) {
    const b = booking;
    api.request(key, b.payload).then(() => {
      if (booking !== b) return;                                // canceled or replaced meanwhile
      setStatus("ok", `We texted a 6-digit code to ${fmtPhone(b.payload.phone)}.`);
      progress(1);
      morphHeight(box, () => { otpBox.hidden = false; otpSkel.hidden = true; });
      enter(otpBox);
      otp.focus({ preventScroll: true });
      listenForCode();
    }, () => {
      if (booking !== b) return;
      booking = null; showState("form");                        // roll back: the form is exactly as it was
      toast("Couldn't send your request. Check your connection and try again.", { tone: "error", action: "Retry", onAction: () => form.requestSubmit() });
    });
  }
  // the mobile number formats itself as it is typed, like (770) 555-0123 (never while deleting)
  form.elements.phone.addEventListener("input", (e) => {
    const el = e.target;
    if ((e.inputType || "").startsWith("delete") || el.selectionStart !== el.value.length) return;
    const d = digits(el.value).slice(0, 10);
    el.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
  });
  // the phone keyboard says "Next" on the name: it moves on instead of sending early
  [["name", "phone"]].forEach(([from, to]) => form.elements[from].addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); form.elements[to].focus(); }
  }));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = rules.filter(([n]) => !check(n));
    const noTime = !slotTime() && slots.some((el) => !el.disabled);
    if (noTime) $("#e-time").textContent = "Choose a time.";
    if (bad.length || noTime) {
      bad.forEach(([, fid]) => shake(document.getElementById(fid)));
      if (noTime) shake(slots[0].closest("fieldset"));
      const firstBad = bad.find(([n]) => n === "service" || n === "date");
      if (firstBad || !noTime) form.elements[bad[0][0]].focus();
      else slots.find((el) => !el.disabled).focus();
      return;
    }
    const f = form.elements;
    const payload = { service: f.service.value, date: f.date.value, time: slotTime(), name: f.name.value.trim(), phone: digits(f.phone.value) };
    booking = { key: idemKey, payload };
    $("#sentText").textContent = `${payload.service} on ${dayName(payload.date, true)} at ${payload.time}, ${payload.name}. Type the code below to lock it in.`;
    setStatus("sending", "Sending to Ria…");
    progress(0); otpSkel.hidden = false;                        // skeleton holds the code box's place
    otpBox.hidden = true; otp.value = ""; clearOtpError();
    showState("sent");                                          // optimistic: show it now, confirm in the background
    send(idemKey);
  });

  /* One-time code: autofill from the SMS where the browser supports it. */
  function clearOtpError() { $("#e-otp").textContent = ""; otp.closest(".field").removeAttribute("data-invalid"); }
  function listenForCode() {
    otpAbort?.abort();
    if (!("OTPCredential" in window)) return;
    otpAbort = new AbortController();
    navigator.credentials.get({ otp: { transport: ["sms"] }, signal: otpAbort.signal })
      .then((c) => { if (c?.code) { otp.value = c.code; verifyCode(); } }).catch(() => {});
  }
  let verifying = false;
  function verifyCode() {
    const b = booking; if (!b || verifying) return;
    verifying = true; clearOtpError(); setStatus("sending", "Checking the code…");
    api.verify(b.key, otp.value).then(() => {
      if (booking !== b) return;
      otpAbort?.abort();
      const p = b.payload;
      $("#confirmedText").textContent = `${p.service} on ${dayName(p.date, true)} at ${p.time}. See you then, ${p.name}!`;
      progress(2);
      showState("confirmed");
    }, () => {
      setStatus("error", "That code didn't match. Check the text and try again.");
      $("#e-otp").textContent = "Enter the 6 digits from the text."; otp.closest(".field").setAttribute("data-invalid", "");
      shake(otp.closest(".field")); otp.select();
    }).finally(() => { verifying = false; });
  }
  otp.addEventListener("input", () => {
    otp.value = otp.value.replace(/\D/g, "").slice(0, 6);
    if (otp.value.length === 6) verifyCode();                 // predictive: no button to press, the 6th digit submits
  });
  otp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); otp.value.length === 6 ? verifyCode() : (shake(otp.closest(".field")), ($("#e-otp").textContent = "Enter the 6 digits from the text.")); } });

  /* Cancel with undo: it disappears now, and is only really canceled if you don't undo. */
  $("#cancelReq").addEventListener("click", () => {
    const b = booking; if (!b) return;
    booking = null; otpAbort?.abort();
    showState("form");
    toast("Request canceled", {
      action: "Undo",
      onAction: () => { booking = b; showState("sent"); if (!otpBox.hidden) listenForCode(); },
      onExpire: () => {
        if (booking?.key === b.key) return;                     // they sent the same request again: keep it
        api.cancel(b.key); if (idemKey === b.key) idemKey = newKey();
      },
    });
  });
  $("#again").addEventListener("click", () => {
    booking = null; idemKey = newKey();
    const keep = { name: form.elements.name.value, phone: form.elements.phone.value };   // same person: no typing twice
    form.reset(); dateIn.value = firstOpenDay(); pick(null); refreshSlots();
    form.elements.name.value = keep.name; form.elements.phone.value = keep.phone;
    rules.forEach(([n, fid]) => { document.getElementById(fid).removeAttribute("data-invalid"); document.getElementById("e-" + n).textContent = ""; });
    predict(); showState("form");
    form.elements.service.focus({ preventScroll: true });
  });

  const bookTarget = () => (matchMedia("(max-width: 900px)").matches ? "#book .shell" : "#book");   // one column: straight to the form
  function goBook() { go(bookTarget()); setTimeout(() => (form.hidden ? null : form.elements.service.focus({ preventScroll: true })), reduced ? 0 : 500); }
  function bookService(name) {
    form.elements.service.value = name;
    if (document.getElementById("e-service").textContent) check("service");
    predict(); goBook();
  }
  /* tap a service row to book it. A click, so a scroll that starts on a row never books */
  $$(".menu li").forEach((li) => {
    const name = $("h3", li).textContent.trim();
    li.tabIndex = 0; li.setAttribute("role", "button");
    li.addEventListener("click", () => bookService(name));
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bookService(name); } });
  });

  /* ── Opening hours: a live "open now" line, in Lilburn's time zone ── */
  const HOURS = [null, [630, 1170], [630, 1170], [630, 1170], [630, 1170], [630, 1170], [630, 1170]];   // Sun closed, Mon–Sat 10:30–7:30 (minutes)
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function lilburnNow() {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), min: +get("hour") * 60 + +get("minute") };
  }
  const clock = (m) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
  function hoursStatus() {
    const { day, min } = lilburnNow(), t = HOURS[day];
    if (t && min >= t[0] && min < t[1]) return `Open now until ${clock(t[1])}`;
    if (t && min < t[0]) return `Opens today at ${clock(t[0])}`;
    let d = (day + 1) % 7, n = 1;
    while (!HOURS[d]) { d = (d + 1) % 7; n++; }
    return `${t ? "Closed now" : "Closed today"}. Opens ${n === 1 ? "tomorrow" : DAYS[d]} at ${clock(HOURS[d][0])}`;
  }
  const paintHours = () => {
    const text = hoursStatus(), state = text.startsWith("Open now") ? "open" : text.startsWith("Opens today") ? "soon" : "closed";
    $$("[data-hours]").forEach((el) => { el.textContent = text; el.dataset.state = state; });
  };
  paintHours(); setInterval(paintHours, 60e3);

  /* ── Stale-while-revalidate: rating and review count ──
     Show the last known values at once, then quietly refresh them. */
  const PLACE_KEY = "ria-swr:place-v1";
  const fetchPlace = () => wait(700).then(() => ({ rating: 4.5, reviews: 29 }));   // production: Google Places, via the salon's server
  function renderPlace(d, fresh) {
    $$("[data-swr]").forEach((el) => {
      const v = String(d[el.dataset.swr]);
      if (el.textContent === v) return;
      el.textContent = v;
      if (fresh && !reduced) { el.classList.remove("swr-fresh"); void el.offsetWidth; el.classList.add("swr-fresh"); }
    });
    $$(".score-meta [data-stars]").forEach((el) => { if (+el.dataset.stars !== d.rating || !el.firstChild) drawStars(el, d.rating); });   // the place rating; each review keeps its own five
  }
  const cached = store.get(PLACE_KEY);
  const revalidate = () => fetchPlace().then((d) => { store.set(PLACE_KEY, { data: d, at: Date.now() }); renderPlace(d, true); }).catch(() => {});
  let sid = 0;
  const STAR = "M12 2.6l2.85 5.9 6.45.78-4.76 4.45 1.22 6.42L12 17l-5.76 3.15 1.22-6.42L2.7 9.28l6.45-.78z";
  function drawStars(el, n) {
    el.dataset.stars = n; el.setAttribute("aria-label", `${n} out of 5 stars`);
    el.innerHTML = Array.from({ length: 5 }, (_, i) => {
      const f = Math.max(0, Math.min(1, n - i)), id = "star" + sid++;
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="${id}"><rect width="${24 * f}" height="24"/></clipPath></defs><path d="${STAR}" fill="currentColor" opacity=".28"/><path d="${STAR}" fill="currentColor" clip-path="url(#${id})"/></svg>`;
    }).join("");
  }
  $$("[data-stars]").forEach((el) => drawStars(el, +el.dataset.stars));
  if (cached?.data) renderPlace(cached.data, false);           // stale, but instant
  idle(revalidate);                                             // then revalidate
  document.addEventListener("visibilitychange", () => {
    const c = store.get(PLACE_KEY);
    if (document.visibilityState === "visible" && (!c || Date.now() - c.at > 5 * 60e3)) revalidate();
  });

  /* ── Pre-rendering: decode images before they are needed ── */
  const predecode = (img) => { if (!img || img.dataset.warm) return; img.dataset.warm = "1"; const p = new Image(); p.src = img.currentSrc || img.src; p.decode?.().catch(() => {}); };
  idle(() => $$('img[loading="lazy"]').forEach(predecode));

  /* ── Keyboard shortcuts ────────────────────────────────────── */
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") { e.preventDefault(); cmd.open ? closeCmd() : openCmd(); return; }
    if (e.key === "Escape") { hideTip(); return; }
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
    const k = e.key.toLowerCase();
    if (k === "/") { e.preventDefault(); openCmd(); }
    else if (k === "b") goBook();
  });

  predict();
})();
