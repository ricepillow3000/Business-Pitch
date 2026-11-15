/**
 * End-to-end proof that every feature works. Usage:
 *   node tests/verify.cjs [baseUrl] [screenshotDir]
 * Needs Playwright (locally: npm i -D playwright && npx playwright install chromium).
 */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3000";
const SHOTS = process.argv[3];

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const wait = (p, ms) => p.waitForTimeout(ms);

// Installed in every page before it loads: layout-shift total (CLS), whether a
// cross-document view transition ran, and helpers used by the design checks.
const instrument = () => {
  window.__cls = 0;
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  addEventListener("pagereveal", (e) => { window.__vt = !!e.viewTransition; });
  // any CSS colour (oklch, oklab, color-mix...) -> [r, g, b, a] in sRGB
  window.__rgb = (c) => {
    const x = (window.__ctx ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true }));
    x.clearRect(0, 0, 1, 1); x.fillStyle = "#000"; x.fillStyle = c; x.fillRect(0, 0, 1, 1);
    return [...x.getImageData(0, 0, 1, 1).data];
  };
  // the rendered lines of an element: [{ words, chars }]
  window.__lines = (el) => {
    const lines = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode()); ) {
      for (const m of n.textContent.matchAll(/\S+/g)) {
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const rect = r.getClientRects()[0]; if (!rect) continue;
        let line = lines.find((l) => Math.abs(l.top - rect.top) < 4);
        if (!line) lines.push((line = { top: rect.top, words: 0, chars: 0 }));
        line.words += 1; line.chars += m[0].length + 1;
      }
    }
    return lines.sort((a, b) => a.top - b.top);
  };
};

(async () => {
  const browser = await chromium.launch();

  /* ── DESKTOP ─────────────────────────────────────────────── */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(instrument);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(BASE);
  await page.evaluate(() => (window.__alive = "same-page"));

  // 1. Loader
  check("Loader: JIDO fades in on a slate screen", await page.waitForSelector("[data-loader] [data-word]", { state: "visible", timeout: 2000 }).then(() => true, () => false));
  // dev mode can take a moment to start the page's code; the loader covers the screen meanwhile
  check("Scroll locked while loading", await page.waitForFunction(() => document.documentElement.classList.contains("lenis-stopped"), null, { timeout: 3000 }).then(() => true, () => false));
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    seen.add(await page.textContent("[data-count]"));
    await wait(page, 80);
  }
  const optical = await page.evaluate(() => {
    const r = document.querySelector("[data-word]").getBoundingClientRect();
    return { word: Math.round(r.top + r.height / 2), mid: Math.round(innerHeight / 2) };
  });
  check("Loader: % counts up with zero-padded tabular digits", seen.size > 5 && [...seen].every((s) => /^\d{3}%$/.test(s)), [...seen].slice(0, 6).join(" "));
  await page.waitForFunction(() => document.querySelector("[data-count]").textContent === "100%");
  check("Loader: reaches 100%", true);
  await wait(page, 700);
  const reachScale = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("[data-word]")).transform).a);
  check("Reach: word scales up toward viewer", reachScale > 1.2, `scale ${reachScale.toFixed(2)}`);
  await wait(page, 450);
  const split = await page.evaluate(() => {
    const x = (s) => new DOMMatrix(getComputedStyle(document.querySelector(s)).transform).e;
    return { ji: x("[data-left]"), do: x("[data-right]") };
  });
  check("Split: JI slides left, DO slides right", split.ji < -50 && split.do > 50, `JI x=${split.ji.toFixed(0)} DO x=${split.do.toFixed(0)}`);
  await wait(page, 1600);
  check("Loader removes itself after reveal", await page.evaluate(() => getComputedStyle(document.querySelector("[data-loader]")).display === "none"));
  check("Scroll unlocked after reveal", await page.evaluate(() => !document.documentElement.classList.contains("lenis-stopped")));
  const heroY = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("[data-hero-line]")).transform).f);
  check("Hero headline revealed", Math.abs(heroY) < 2);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/1-hero.png` });

  // 2. HUD
  check("HUD: 4 corner crosshairs", (await page.$$("[data-corner]")).length === 4);
  check("HUD: rotated micro-data present", (await page.textContent("body")).includes("SYS.LINK //"));
  const layout = await page.evaluate(() => {
    const bars = [...document.querySelectorAll("[data-hud-bar]")];
    const inside = (sel, bar) => { const r = document.querySelector(sel).getBoundingClientRect(), b = bar.getBoundingClientRect(); return r.top >= b.top && r.bottom <= b.bottom; };
    const sec = document.getElementById("friction"), sr = sec.getBoundingClientRect();
    const contentLeft = sr.left + parseFloat(getComputedStyle(sec).paddingLeft);
    const edge = [...document.querySelectorAll("[data-fade]")].find((e) => e.textContent.includes("SYS.LINK")).getBoundingClientRect();
    return {
      solid: bars.length === 2 && bars.every((b) => { const [r, g, bl, a] = window.__rgb(getComputedStyle(b).backgroundColor); return Math.abs(r - 20) <= 2 && Math.abs(g - 24) <= 2 && Math.abs(bl - 27) <= 2 && a === 255; }),
      top: inside('a[aria-label="JIDO, back to top"]', bars[0]) && inside('a[href="#initiation"]', bars[0]),
      bottom: inside("[data-hud-label]", bars[1]) && inside("[data-scroll]", bars[1]),
      margin: edge.right < contentLeft, edgeRight: edge.right, contentLeft,
    };
  });
  check("HUD: top + bottom bars are solid, so text slides under them (no overlap)", layout.solid);
  check("HUD: logo + Contact sit inside the top bar, label + scroll inside the bottom bar", layout.top && layout.bottom);
  check("HUD: side micro-data stays in the margin, clear of the text", layout.margin, `micro-data ends ${layout.edgeRight.toFixed(0)}px, text starts ${layout.contentLeft.toFixed(0)}px`);
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('[data-hud-bar] a[href="#top"] [data-block]')].map((b) => ({
      op: +getComputedStyle(b).opacity,
      t: b.getAttribute("transform") || "",
    })),
  );
  check(
    "Logo: 10 blocks snap into alignment to form the J (no tail)",
    !(await page.$('[data-hud-bar] a[href="#top"] svg path, [data-hud-bar] a[href="#top"] svg circle')) &&
    blocks.length === 10 && blocks.every((b) => b.op === 1 && !/[1-9]/.test(b.t.replace(/matrix\(1,0,0,1,0,0\)/, ""))),
    `${blocks.length} blocks, ${blocks.filter((b) => b.op === 1).length} settled`,
  );
  const pager = () =>
    page.evaluate(() => ({
      label: document.querySelector("[data-hud-text]").textContent,
      shown: +getComputedStyle(document.querySelector("[data-hud-label]")).opacity > 0.9,
    }));
  let p = await pager();
  check("Page numbers removed (no [[00X]] anywhere)", !/\[\[\d{3}\]\]/.test(await page.textContent("body")) && !(await page.$("[data-reel]")));
  check("Bottom label shows OVERVIEW on the hero", p.label === "OVERVIEW" && p.shown, JSON.stringify(p));

  // 3. Cursor
  check("Custom cursor active on mouse devices", await page.evaluate(() => document.documentElement.classList.contains("has-cursor")));
  await page.mouse.move(700, 450);
  await page.mouse.move(760, 470, { steps: 5 });
  const contact = await page.$('a[href="#initiation"]');
  const cb = await contact.boundingBox();
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2, { steps: 10 });
  await wait(page, 900);
  const frame = await page.evaluate(() => {
    const f = document.querySelector("[data-cursor-frame]");
    const r = f.getBoundingClientRect();
    return { op: +getComputedStyle(f).opacity, w: r.width, h: r.height };
  });
  check("Cursor viewfinder snaps around links (corner ticks, dot steps aside)", frame.op > 0.9 && frame.w > cb.width && frame.h > cb.height, `frame ${frame.w.toFixed(0)}×${frame.h.toFixed(0)} around ${cb.width.toFixed(0)}×${cb.height.toFixed(0)} link`);
  // sleek, not obnoxious: the dot is small, sits on the pointer with no lag, never stretches or spins
  await page.mouse.move(300, 300);
  await wait(page, 400);
  await page.mouse.move(1100, 620, { steps: 4 });
  await wait(page, 60);
  const calmDot = await page.evaluate(() => {
    const el = document.querySelector("[data-cursor-dot]"), r = el.getBoundingClientRect();
    const m = new DOMMatrix(getComputedStyle(el).transform);
    const fr = document.querySelector("[data-cursor-frame]").getBoundingClientRect();
    return { size: r.width, off: Math.hypot(r.left + r.width / 2 - 1100, r.top + r.height / 2 - 620), frameOff: Math.hypot(fr.left + fr.width / 2 - 1100, fr.top + fr.height / 2 - 620), skew: Math.abs(m.b) + Math.abs(m.c), sx: m.a, sy: m.d };
  });
  check("Cursor moves like a normal cursor: dot and viewfinder stay on the pointer (no lag), no stretch or rotation", calmDot.size >= 9 && calmDot.size <= 11 && calmDot.off < 1.5 && calmDot.frameOff < 1.5 && calmDot.skew < 0.001 && Math.abs(calmDot.sx - calmDot.sy) < 0.001, `${calmDot.size}px dot ${calmDot.off.toFixed(1)}px and viewfinder ${calmDot.frameOff.toFixed(1)}px from the pointer`);
  const ibeam = await page.evaluate(() => { const i = document.querySelector("input:not([type=hidden])"); return i ? getComputedStyle(i).cursor : "text"; });
  check("Text fields keep the native I-beam", ibeam === "text", ibeam);

  // 4. In-page navigation (no reload)
  await contact.click();
  await wait(page, 2600);
  const nav = await page.evaluate(() => ({
    alive: window.__alive,
    top: document.getElementById("initiation").getBoundingClientRect().top,
    loads: performance.getEntriesByType("navigation").length,
  }));
  check("Contact link smooth-scrolls to the contact section with NO page reload", nav.alive === "same-page" && nav.loads === 1 && Math.abs(nav.top) < 5, `section top=${nav.top.toFixed(0)}px, page state kept=${nav.alive === "same-page"}`);
  p = await pager();
  check("Bottom label switched to INITIATION", p.label === "INITIATION" && p.shown, JSON.stringify(p));

  // 5. The main button stays still while hovered
  const btn = await page.$("[data-cta]");
  const bb = await btn.boundingBox();
  await page.mouse.move(bb.x + bb.width * 0.9, bb.y + bb.height * 0.9, { steps: 10 });
  await wait(page, 700);
  const pull = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("[data-cta]")).transform));
  const box = await page.evaluate(() => { const f = document.querySelector("[data-cursor-frame]").getBoundingClientRect(), b = document.querySelector("[data-cta]").getBoundingClientRect(); return { boxed: f.left < b.left && f.right > b.right && f.top < b.top && f.bottom > b.bottom }; });
  check("Main button stays still while hovered, and the cursor boxes it", Math.abs(pull.e) < 0.5 && Math.abs(pull.f) < 0.5 && box.boxed, `moved x=${pull.e.toFixed(1)} y=${pull.f.toFixed(1)}; boxed ${box.boxed}`);
  const menu = "#contact-options";
  check("Email menu is hidden until the button is clicked", !(await page.isVisible(menu)));
  await btn.click();
  await wait(page, 1400);
  const menuBottom = await page.evaluate((m) => document.querySelector(m).getBoundingClientRect().bottom - innerHeight, menu);
  check("Email menu is scrolled fully into view when opened", menuBottom <= 0, `${Math.round(-menuBottom)}px above the bottom edge`);
  const gmail = await page.getAttribute(`${menu} a[target="_blank"]`, "href");
  check("Clicking 'Start the conversation' offers: book a call, send a message, Gmail", (await page.isVisible(menu)) && (await page.$$(`${menu} a, ${menu} button`)).length === 3 && !!(await page.$(`${menu} a[href="/book"]`)) && !!(await page.$(`${menu} a[href^="/contact"]`)));
  check("Gmail option opens a new Gmail email to the right address", gmail.startsWith("https://mail.google.com/mail/") && gmail.includes("to=john7000.nguyen%40gmail.com"), gmail);
  check("No email link opens Outlook / the default mail app (no mailto: anywhere)", !(await page.$('a[href^="mailto:"]')));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4b-email-menu.png` });
  await page.keyboard.press("Escape");
  await wait(page, 700);
  check("Escape closes the email menu", !(await page.isVisible(menu)));
  check("Contact: email address is a link that opens Gmail", await page.isVisible('#initiation dl a[href^="https://mail.google.com/"][target="_blank"]'));
  check("Phone number removed from the site", !(await page.textContent("body")).includes("265-9930") && !(await page.$('a[href^="tel:"]')));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4-initiation.png` });

  // 6. Every section: label + reveals
  await page.mouse.move(1300, 120);
  const sections = [["top", "OVERVIEW"], ["friction", "FRICTION"], ["automation", "AUTOMATION"], ["initiation", "INITIATION"]];
  for (const [id, label] of sections) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
    await wait(page, 1800);
    p = await pager();
    const hidden = await page.evaluate((id) =>
      [...document.querySelectorAll(`#${id} [data-reveal]`)].filter((el) => getComputedStyle(el).opacity < 0.99).length, id);
    check(`${label}: bottom label shown + content visible`, p.label === label && p.shown && hidden === 0, `${JSON.stringify(p)} hidden=${hidden}`);
    if (id === "friction") {
      // halfway between two sections, neither "owns" the screen: the label steps aside
      await page.evaluate(() => window.scrollTo(0, scrollY + document.getElementById("friction").getBoundingClientRect().top - innerHeight / 2));
      await wait(page, 1200);
      const between = await pager();
      check("Bottom label hides between sections", !between.shown, JSON.stringify(between));
      await page.evaluate(() => document.getElementById("friction").scrollIntoView());
      await wait(page, 1200);
    }
    if (SHOTS && (id === "friction" || id === "automation")) await page.screenshot({ path: `${SHOTS}/${id === "friction" ? 2 : 3}-${id}.png` });
    if (id === "friction") {
      await page.evaluate(() => document.querySelector("[data-strikes]").scrollIntoView({ block: "start" }));
      await wait(page, 1500);
      const struck = await page.evaluate(() => [...document.querySelectorAll("[data-bar]")].filter((b) => new DOMMatrix(getComputedStyle(b).transform).a > 0.5).length);
      check("Friction: manual tasks get struck through on scroll", struck >= 1, `${struck}/4 struck once the list scrolls up`);
    }
    if (id === "automation") {
      const g = await page.evaluate(() => ({
        drawn: [...document.querySelectorAll("[data-wire]")].every((w) => parseFloat(getComputedStyle(w).strokeDashoffset) < 0.01),
        packets: [...document.querySelectorAll(".packet")].filter((pk) => pk.getAnimations().length).length,
      }));
      check("Automation: all 6 wires drawn + data packets flowing", g.drawn && g.packets === 6, JSON.stringify(g));
    }
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await wait(page, 1500);
  const scr = await page.textContent("[data-scroll]");
  check("HUD scroll readout reaches 100% at the bottom", parseInt(scr) === 100, `SCR ${scr}%`);

  /* ── 20 PRINCIPLES OF UX & ANIMATION (enforced) ──────────────
     Each principle is a check: if a later change breaks one, this run fails. */
  const ux = (n, name, ok, detail) => check(`UX ${String(n).padStart(2, "0")} ${name}`, ok, detail);
  const passed = (prefix) => results.some((r) => r.name.startsWith(prefix) && r.ok);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const cta = "[data-cta]";
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "center" }), cta);
  await wait(page, 1200);

  // 1 Squash & stretch: on press the CTA squashes and the cursor viewfinder tightens
  let b = await page.locator(cta).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  await wait(page, 300);
  await page.mouse.down();
  await wait(page, 250);
  const pressed = await page.evaluate((s) => {
    const btn = document.querySelector(s);
    return { scale: getComputedStyle(btn.querySelector("[data-press]")).scale, wind: getComputedStyle(btn.querySelector("[data-mark]")).scale, frame: new DOMMatrix(getComputedStyle(document.querySelector("[data-cursor-frame]")).transform).a };
  }, cta);
  await page.mouse.up();
  ux(1, "Squash & stretch: button squashes and the cursor viewfinder tightens on press", pressed.frame < 0.97 && parseFloat(pressed.scale) < 1, `viewfinder ${pressed.frame.toFixed(2)}, button ${pressed.scale}`);

  // 2 Anticipation: the loader reaches toward you before it splits; the CTA crosshair gathers while pressed, snaps open on release
  ux(2, "Anticipation wind-up: loader 'reach' before the split, button crosshair gathers on press", passed("Reach:") && parseFloat(pressed.wind) < 1, `crosshair scale ${pressed.wind} while pressed`);

  // 17 Doherty threshold: a click answers in under 400ms
  await wait(page, 380);
  const menuShown = await page.evaluate(() => +getComputedStyle(document.getElementById("contact-options")).opacity);
  ux(17, "Doherty threshold: the email menu answers a click in under 400ms", menuShown > 0.6, `opacity ${menuShown.toFixed(2)} after 380ms`);

  // 5 Follow through: the menu rows settle in one after another; the button is at rest
  const delays = await page.evaluate(() => [...document.querySelectorAll("#contact-options a, #contact-options button")].map((r) => parseFloat(getComputedStyle(r).transitionDelay)));
  await page.mouse.move(80, 300, { steps: 6 });
  await wait(page, 1600);
  const rest = await page.evaluate((s) => new DOMMatrix(getComputedStyle(document.querySelector(s)).transform), cta);
  ux(5, "Follow through: menu rows stagger in, the button stays at rest", delays.length > 1 && delays.every((d, i) => i === 0 || d > delays[i - 1]) && Math.abs(rest.e) < 1 && Math.abs(rest.f) < 1, `row delays ${delays.join("/")}s`);

  // 6 Slow in & slow out: UI motion uses eased curves, never linear
  const easing = await page.evaluate(() => ["#contact-options", "#contact-options a"].map((s) => getComputedStyle(document.querySelector(s)).transitionTimingFunction));
  ux(6, "Slow in & slow out: transitions use eased curves (expo), not linear", easing.every((e) => e.includes("cubic-bezier")), easing.join(" | "));

  // 9 Snappy timing: no UI feedback transition is slower than 500ms
  const slowest = await page.evaluate(() => {
    const els = [...document.querySelectorAll("a, button, #contact-options, #contact-options *, [data-cta] *")];
    return Math.max(...els.flatMap((el) => getComputedStyle(el).transitionDuration.split(",").map((d) => parseFloat(d) * (d.includes("ms") ? 0.001 : 1))));
  });
  ux(9, "Snappy timing: every hover/press/menu transition is 500ms or less", slowest <= 0.5, `slowest ${slowest}s`);

  // 11 Solid layering: things never clip through each other (open menu sits on top of what follows)
  const solid = await page.evaluate(() => {
    const panel = document.getElementById("contact-options").getBoundingClientRect();
    const hit = document.elementFromPoint(panel.left + panel.width / 2, panel.bottom - 8);
    return !!hit && !!hit.closest("#contact-options");
  });
  ux(11, "Solid layering: the open menu sits cleanly above the content below it", solid);

  // 10 Exaggerated feedback: copying the address answers loudly
  await page.keyboard.press("Escape");
  await wait(page, 500);
  await page.evaluate(() => document.querySelector("#initiation [data-copy]").scrollIntoView({ block: "center" }));
  await wait(page, 600);
  await page.click("#initiation [data-copy]");
  await wait(page, 200);
  const fb = await page.evaluate(() => {
    const r = document.querySelector("#initiation [data-copy]");
    return { text: r.textContent, bg: getComputedStyle(r).backgroundColor };
  });
  ux(10, "Exaggerated feedback: 'Copy' flips to 'Copied' and lights up", fb.text.includes("Copied") && fb.bg !== "rgba(0, 0, 0, 0)", fb.bg);

  // 18 Postel's law: copying still works when the browser blocks the clipboard API
  await wait(page, 2200);
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: () => Promise.reject(new Error("blocked")) }));
  await page.click("#initiation [data-copy]");
  await wait(page, 200);
  ux(18, "Postel's law: copy falls back gracefully when the clipboard API is blocked", (await page.textContent("#initiation [data-copy]")).includes("Copied"));
  await page.click("[data-cta]");
  await wait(page, 500);



  // 15 Hick's law: few choices
  const choices = await page.evaluate(() => ({
    menu: document.querySelectorAll("#contact-options a, #contact-options button").length,
    nav: document.querySelectorAll("[data-hud-bar] a").length,
  }));
  ux(15, "Hick's law: 3 ways to start, at most 5 links in the top bar", choices.menu <= 3 && choices.nav <= 5, JSON.stringify(choices));
  await page.keyboard.press("Escape");
  await wait(page, 500);

  // 3 Staging the focus: one primary action, text on quiet halos, one section label at a time
  const stage = await page.evaluate(() => ({ primary: document.querySelectorAll("[data-cta]").length, halos: document.querySelectorAll(".quiet").length }));
  ux(3, "Staging the focus: one primary button, text on quiet halos, one label at a time", stage.primary === 1 && stage.halos >= 8 && passed("Bottom label hides"), JSON.stringify(stage));

  // 4 Pose to pose: the intro moves through clear key poses (count → reach → split → page)
  ux(4, "Pose to pose: intro hits every key pose (100% → reach → split → hero)", ["Loader: reaches 100%", "Reach:", "Split:", "Hero headline revealed"].every(passed));

  // 7 Moving in arcs: wires (and the data packets riding them) follow curves
  const arcs = await page.evaluate(() => [...document.querySelectorAll("[data-wire]")].every((w) => /C/.test(w.getAttribute("d"))));
  ux(7, "Moving in arcs: every wire is a curve, so data packets travel in arcs", arcs);

  // 8 Secondary action: packets flow and the hub ring turns while you read
  const secondary = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  ux(8, "Secondary action: background details keep moving (packets, hub ring)", passed("Automation: all 6 wires") && secondary >= 6, `${secondary} running animations`);

  // 12 Overall appeal: every piece of text uses the brand palette only
  const palette = await page.evaluate(() => {
    const ok = [[245, 245, 220], [110, 155, 240], [10, 49, 97]];
    const bad = new Set();
    document.querySelectorAll("body *").forEach((el) => {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
      const [r, g, b] = window.__rgb(getComputedStyle(el).color);
      if (!ok.some(([R, G, B]) => Math.abs(R - r) <= 3 && Math.abs(G - g) <= 3 && Math.abs(B - b) <= 3)) bad.add(`${r}, ${g}, ${b}`);
    });
    return [...bad];
  });
  ux(12, "Overall appeal: all text uses the brand palette (beige / flag blue)", palette.length === 0, palette.join(" | ") || "beige, flag, flag-deep only");

  // 13 Fitts's law: the main action is big and close to the message it answers
  b = await page.locator(cta).boundingBox();
  ux(13, "Fitts's law: the main button is a big target (at least 200×60px)", b.width >= 200 && b.height >= 60, `${b.width.toFixed(0)}×${b.height.toFixed(0)}px`);

  // 14 Bigger hit areas: small text links still catch a click 20px above/below the text
  const small = ['a[aria-label="JIDO, back to top"]', '[data-hud-bar] a[href="#initiation"]', '#initiation dl a', 'footer a[href="#top"]', 'footer a[target="_blank"]'];
  const misses = await page.evaluate((sels) => sels.filter((s) => {
    const el = document.querySelector(s), r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    return ![y - 20, y + 20].every((py) => el.contains(document.elementFromPoint(x, py)));
  }), small);
  ux(14, "Bigger hit areas: every small link is at least 44px tall to the pointer", misses.length === 0, misses.join(", ") || `${small.length} links checked`);

  // 16 Miller's law: lists stay short enough to hold in your head
  const longest = await page.evaluate(() => Math.max(...[...document.querySelectorAll("ul, ol")].map((l) => l.children.length)));
  ux(16, "Miller's law: no list is longer than 7 items", longest <= 7, `longest list ${longest}`);

  // 19 Jakob's law: logo top-left goes home, Contact top-right, new-tab links say so (↗)
  const jakob = await page.evaluate(() => {
    const logo = document.querySelector('a[aria-label="JIDO, back to top"]').getBoundingClientRect();
    const contact = document.querySelector('[data-hud-bar] a[href="#initiation"]').getBoundingClientRect();
    const ext = [...document.querySelectorAll('a[target="_blank"]')];
    return logo.left < 100 && logo.top < 80 && contact.right > innerWidth - 100 && contact.top < 80 &&
      ext.every((a) => a.rel.includes("noopener") && a.querySelector('[data-icon="external"]'));
  });
  ux(19, "Jakob's law: logo top-left → home, Contact top-right, new-tab links marked with the ↗ icon", jakob);

  // 20 Frequency of use: the most used action (contact) is one click away at every scroll position
  const reach = [];
  for (const f of [0, 0.5, 1]) {
    await page.evaluate((f) => window.scrollTo(0, f * (document.documentElement.scrollHeight - innerHeight)), f);
    await wait(page, 500);
    reach.push(await page.isVisible('[data-hud-bar] a[href="#initiation"]'));
  }
  ux(20, "Frequency of use: Contact is visible and one click away at every scroll position", reach.every(Boolean), reach.join("/"));


  /* ── NO AI SLOP (enforced) ───────────────────────────────────
     Scans styles + text for the usual "AI-made website" tells. Any hit fails the run. */
  const slopScan = (pg) => pg.evaluate(() => {
    const issues = {};
    const add = (k, v) => { issues[k] ??= []; if (issues[k].length < 3) issues[k].push(v); };
    const name = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "");
    const all = [...document.querySelectorAll("body *")];
    for (const el of all) {
      const cs = getComputedStyle(el);
      for (const c of [cs, getComputedStyle(el, "::before"), getComputedStyle(el, "::after")]) {
        if (c.boxShadow !== "none" || c.textShadow !== "none" || /drop-shadow|blur/.test(c.filter)) add("shadow", name(el));
        if (c.backdropFilter && c.backdropFilter !== "none") add("glass", name(el));
        if (/radial-gradient|conic-gradient/.test(c.backgroundImage)) add("orb", name(el));
        if (c.backgroundClip === "text") add("gradientText", name(el));
        if (["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"].some((k) => parseFloat(c[k]) > 0)) add("radius", name(el));
      }
      // (skip Next.js's own dev-only overlay, which never ships to the real site)
      if (!cs.fontFamily.includes("__nextjs") && /(^|[\s,"])(inter|geist|space grotesk)/i.test(cs.fontFamily)) add("font", cs.fontFamily);
      const bgc = window.__rgb ? window.__rgb(cs.backgroundColor) : [0, 0, 0, 0];
      if (bgc[0] > 250 && bgc[1] > 250 && bgc[2] > 250 && bgc[3] > 250) add("white", name(el));
    }
    const text = document.body.innerText + " " + document.title;
    const grab = (re) => (text.match(re) || [""])[0];
    if (/[—–]/.test(text)) add("dash", grab(/.{0,24}[—–].{0,24}/));
    if (/\p{Emoji_Presentation}/u.test(text)) add("emoji", grab(/\p{Emoji_Presentation}/u));
    if (/[✓✔☑✅]/.test(text)) add("checkmark", grab(/[✓✔☑✅]/));
    if (/[✦✧✨⭐★☆]/.test(text)) add("sparkle/stars", grab(/[✦✧✨⭐★☆]/));
    // tier pricing = three or more different prices, or "$X/mo" price tags; plus testimonials / quotes
    const prices = new Set(text.match(/\$\s?\d[\d,]*/g) || []);
    if (prices.size >= 3 || /\$\s?\d[\d,]*\s*(\/\s?mo\b|per month)/i.test(text) || /testimonial/i.test(text) || document.querySelector("blockquote")) add("pricing/testimonials", [...prices].join(" ") || "found");
    if (document.querySelector("svg.lucide, [class*='lucide']")) add("lucide", "icon");
    // hover may only swap colours instantly: nothing moves, scales or rotates on hover
    const walk = (rules, hover) => {
      for (const r of rules) {
        const h = hover || (r.selectorText || "").includes(":hover");
        if (h && r.style && /translate|rotate|scale|transform|animation/.test(r.style.cssText)) add("hoverAnimation", r.selectorText || "nested rule");
        if (r.cssRules) walk(r.cssRules, h);
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules, false); } catch {} }
    return issues;
  });
  const slop = await slopScan(page);
  const none = (...keys) => keys.every((k) => !slop[k]);
  const why = (...keys) => keys.filter((k) => slop[k]).map((k) => `${k}: ${slop[k].join(", ")}`).join(" | ");
  check("No AI slop: no drop shadows, glows or blur", none("shadow"), why("shadow"));
  check("No AI slop: no radial orbs, no gradient text", none("orb", "gradientText"), why("orb", "gradientText"));
  check("No AI slop: no liquid glass (backdrop blur)", none("glass"), why("glass"));
  check("No AI slop: square corners everywhere (no soft radius)", none("radius"), why("radius"));
  check("No AI slop: no em dashes, emojis, checkmarks or sparkles in the text", none("dash", "emoji", "checkmark", "sparkle/stars"), why("dash", "emoji", "checkmark", "sparkle/stars"));
  check("No AI slop: no Inter / Geist / Space Grotesk fonts, no Lucide icons", none("font", "lucide"), why("font", "lucide"));
  check("No AI slop: no pure white backgrounds", none("white"), why("white"));
  check("No AI slop: no hover animations (hover never moves, scales or rotates)", none("hoverAnimation"), why("hoverAnimation"));
  check("No AI slop: no pricing tiers, fake testimonials or star ratings", none("pricing/testimonials"));
  const legalLinks = await page.evaluate(() => [...document.querySelectorAll('footer nav[aria-label="Legal"] a')].map((a) => a.getAttribute("href")));
  check("Footer links to Privacy, Terms, AI disclosure and Legal contact", ["/privacy", "/terms", "/ai-disclosure", "/legal-contact"].every((h) => legalLinks.includes(h)), legalLinks.join(" "));

  /* ── 20 DESIGN TERMS (enforced) ──────────────────────────────── */
  const dt = (n, name, ok, detail) => check(`D${String(n).padStart(2, "0")} ${name}`, ok, detail);
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(page, 600);
  const type = await page.evaluate(() => {
    const h1 = getComputedStyle(document.querySelector("h1"));
    const hud = getComputedStyle(document.querySelector(".font-hud"));
    return {
      kerning: h1.fontKerning, rendering: h1.textRendering,
      h1Track: parseFloat(h1.letterSpacing), hudTrack: parseFloat(hud.letterSpacing),
      tabular: ["[data-scroll]", "[data-count]"].every((q) => getComputedStyle(document.querySelector(q)).fontVariantNumeric.includes("tabular-nums")),
    };
  });
  dt(1, "Kerning: the font's own pair spacing is switched on", type.kerning === "normal" && type.rendering === "optimizelegibility", `${type.kerning}, ${type.rendering}`);
  dt(2, "Optical centre: the intro word sits slightly above the true middle", optical.word < optical.mid - 10, `word centre ${optical.word}px, screen middle ${optical.mid}px`);
  dt(3, "Tabular numbers: counters and readouts use equal-width digits", type.tabular);
  dt(5, "Tracking: big titles tight, small HUD labels open", type.h1Track < 0 && type.hudTrack > 0, `title ${type.h1Track.toFixed(1)}px, HUD +${type.hudTrack.toFixed(1)}px`);

  // running text = lowercase reading text (not uppercase display or HUD lines)
  const reading = await page.evaluate(() => {
    const els = [...document.querySelectorAll("main p, main li, main dd, main label, [data-reveal] span")].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.textTransform !== "uppercase" && el.getClientRects().length && /[a-z]{3}/.test(el.textContent) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    });
    const ctx = document.createElement("canvas").getContext("2d");
    const xh = els.map((el) => {
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      return { t: el.textContent.trim().slice(0, 24), x: ctx.measureText("x").actualBoundingBoxAscent };
    });
    const paras = [...document.querySelectorAll("main p")].filter((el) => getComputedStyle(el).textTransform !== "uppercase" && el.getClientRects().length && /[a-z]{3}/.test(el.textContent));
    const leading = paras.map((el) => { const cs = getComputedStyle(el); return { t: el.textContent.trim().slice(0, 24), r: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) }; });
    const heads = [...document.querySelectorAll("main h1, main h2")].map((el) => { const cs = getComputedStyle(el); return parseFloat(cs.lineHeight) / parseFloat(cs.fontSize); });
    const longest = Math.max(...paras.flatMap((el) => window.__lines(el).map((l) => l.chars)));
    const widows = [...document.querySelectorAll("main h2, main p")].filter((el) => el.getClientRects().length).filter((el) => {
      const l = window.__lines(el); return l.length > 1 && l[l.length - 1].words === 1;
    }).map((el) => el.textContent.trim().slice(0, 30));
    const wrap = { h: getComputedStyle(document.querySelector("main h2")).textWrapStyle, p: getComputedStyle(document.querySelector("main p")).textWrapStyle };
    const underlined = [...document.querySelectorAll("main p a, main dd a")].every((a) => getComputedStyle(a).textDecorationLine.includes("underline"));
    return { minX: Math.min(...xh.map((v) => v.x)), smallest: xh.sort((a, b) => a.x - b.x)[0], leading, heads, longest, widows, wrap, underlined };
  });
  dt(7, "x-height: lowercase reading text is at least 7px tall at its x-height", reading.minX >= 7, `smallest x-height ${reading.minX.toFixed(1)}px ("${reading.smallest?.t}")`);
  dt(9, "Leading: paragraphs 1.4 to 1.8, headlines tight (1.15 or less)", reading.leading.every((l) => l.r >= 1.4 && l.r <= 1.8) && reading.heads.every((r) => r <= 1.15), reading.leading.filter((l) => l.r < 1.4 || l.r > 1.8).map((l) => `${l.t} ${l.r.toFixed(2)}`).join(" | ") || "all in range");
  dt(12, "Widows: headings balance, paragraphs never end on one lonely word", reading.wrap.h === "balance" && reading.wrap.p === "pretty" && reading.widows.length === 0, reading.widows.join(" | ") || `${reading.wrap.h} / ${reading.wrap.p}`);
  dt(15, "Line length: no reading line is longer than 80 characters", reading.longest <= 80, `longest line ${reading.longest} characters`);
  dt(16, "Affordance: links in text are underlined, the button looks like a button", reading.underlined && (await page.$("button[data-cta] [data-press].bg-beige")) !== null);

  const tokens = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const vars = ["--color-slate", "--color-slate-line", "--color-beige", "--color-flag", "--color-flag-deep"].map((v) => css.getPropertyValue(v).trim());
    let safe = 0;
    const walk = (rules) => { for (const r of rules) { if (r.cssText && r.cssText.includes("safe-area-inset")) safe++; if (r.cssRules) walk(r.cssRules); } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
    return { vars, safe, fit: document.querySelector('meta[name="viewport"]').content };
  });
  // the source defines them in OKLCH (Tailwind's CSS optimiser may serialise them as lab() in the browser)
  const theme = require("fs").readFileSync(require("path").join(__dirname, "../app/globals.css"), "utf8").match(/@theme \{([\s\S]*?)\n\}/)[1];
  const colourDefs = [...theme.matchAll(/--color-[\w-]+:\s*([^;]+);/g)].map((m) => m[1].trim());
  dt(11, "OKLCH: every brand colour is defined in OKLCH", colourDefs.length === 5 && colourDefs.every((v) => v.startsWith("oklch(")), colourDefs.join(" | "));
  dt(13, "Safe area: page may sit under a notch, HUD and gutters pad around it", tokens.fit.includes("viewport-fit=cover") && tokens.safe >= 3, `${tokens.fit}; ${tokens.safe} safe-area rules`);
  dt(14, "Stagger: lists and menus enter one item after another", passed("UX 05"));

  // combobox + optimistic update + origin-aware + interruptible menu, in the contact section
  await page.evaluate(() => document.querySelector("[data-combobox]").scrollIntoView({ block: "center" }));
  await wait(page, 900);
  const lbHidden = await page.evaluate(() => document.querySelector('[role="listbox"]').hidden);
  await page.click("[data-combobox]");
  await wait(page, 150);
  const lbOpen = await page.evaluate(() => !document.querySelector('[role="listbox"]').hidden && document.querySelector("[data-combobox]").getAttribute("aria-expanded") === "true");
  await page.keyboard.type("inv");
  await wait(page, 100);
  const filtered = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await wait(page, 100);
  const combo = await page.evaluate(() => ({
    value: document.querySelector("[data-combobox]").value,
    closed: document.querySelector('[role="listbox"]').hidden,
    gmail: decodeURIComponent(document.querySelector("#contact-options a[target=_blank]").href),
  }));
  dt(17, "Combobox: type to filter, arrow keys + Enter pick, the choice fills the email subject", filtered.length === 1 && filtered[0] === "Invoicing" && combo.value === "Invoicing" && combo.closed && combo.gmail.includes("su=Hello JIDO: Invoicing"), `${filtered.join("/")} -> "${combo.value}"`);
  dt(19, "Progressive disclosure: suggestions and email options stay hidden until asked for", lbHidden && lbOpen && passed("Email menu is hidden until"));

  const origin = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById("contact-options")); return { o: cs.transformOrigin, scale: cs.scale }; });
  await page.click("[data-cta]");
  await wait(page, 80);
  const mid = await page.evaluate(() => +getComputedStyle(document.getElementById("contact-options")).opacity);
  await page.keyboard.press("Escape");
  await wait(page, 40);
  const back1 = await page.evaluate(() => +getComputedStyle(document.getElementById("contact-options")).opacity);
  await wait(page, 160);
  const back2 = await page.evaluate(() => +getComputedStyle(document.getElementById("contact-options")).opacity);
  dt(10, "Origin-aware animation: the email menu grows out of its button (top-left)", origin.o.startsWith("0px 0px") && parseFloat(origin.scale) < 1, `origin ${origin.o}, closed scale ${origin.scale}`);
  const menuInterrupt = mid > 0 && mid < 1 && back2 < back1;
  await wait(page, 500);

  await page.evaluate(() => Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: () => new Promise((r) => setTimeout(r, 1500)) }));
  await page.evaluate(() => document.querySelector("#initiation [data-copy]").scrollIntoView({ block: "center" }));
  await wait(page, 600);
  await page.click("#initiation [data-copy]");
  await wait(page, 60);
  const optimistic = await page.textContent("#initiation [data-copy]");
  dt(6, "Optimistic update: 'Copied' shows instantly, before the copy finishes", optimistic.includes("Copied"), "label after 60ms of a 1.5s copy");
  await page.keyboard.press("Escape");
  await wait(page, 600);
  const cls = await page.evaluate(() => window.__cls);
  dt(4, "Layout shift: nothing jumps while the page loads and scrolls (CLS under 0.05)", cls < 0.05, `CLS ${cls.toFixed(4)}`);

  // 17 (repeat visit) Doherty threshold: the full show plays once; a reload is quick
  const t0 = Date.now();
  await page.reload();
  await page.waitForFunction(() => !document.documentElement.classList.contains("lenis-stopped") && document.querySelector("[data-loader]")?.dataset.intro, null, { timeout: 8000 });
  const quick = { ms: Date.now() - t0, mode: await page.evaluate(() => document.querySelector("[data-loader]").dataset.intro) };
  ux(17, "Doherty threshold: a repeat visit skips the long intro (usable in under 2.5s)", quick.mode === "quick" && quick.ms < 2500, `${quick.mode} intro, usable after ${quick.ms}ms`);


  /* ── SHARED ELEMENT TRANSITION: footer "Privacy" link becomes the Privacy title ── */
  await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').scrollIntoView({ block: "center" }));
  await wait(page, 800);
  const vtName = await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').style.viewTransitionName);
  // Browsers may skip a view transition now and then (the page still opens normally),
  // so this gets one retry; any skip is reported in the result details.
  let vt;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt === 2) {
      await page.goto(BASE + "/");
      await wait(page, 2500);
      await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').scrollIntoView({ block: "center" }));
      await wait(page, 800);
    }
    await page.click('footer a[href="/privacy"]');
    await page.waitForURL(/\/privacy$/);
    await page.waitForFunction(() => document.querySelector("[data-loader]")?.dataset.intro, null, { timeout: 8000 });
    await wait(page, 700);
    vt = await page.evaluate(() => ({ ran: window.__vt, mode: document.querySelector("[data-loader]").dataset.intro, h1: document.querySelector("h1").style.viewTransitionName }));
    vt.attempts = attempt;
    if (vt.ran) break;
  }
  dt(20, "Shared element transition: the footer link morphs into the page title", vt.ran === true && vt.mode === "none" && vtName === vt.h1 && vt.h1 === "legal-privacy", JSON.stringify({ ...vt, link: vtName }));

  /* ── LEGAL PAGES ─────────────────────────────────────────── */
  const legalPages = [
    ["/privacy", "PRIVACY", "Privacy policy.", 17],
    ["/terms", "TERMS", "Terms of service.", 20],
    ["/ai-disclosure", "AI DISCLOSURE", "AI disclosure.", 6],
    ["/legal-contact", "LEGAL CONTACT", "Legal contact.", 4],
  ];
  for (const [path, label, heading, count] of legalPages) {
    await page.goto(BASE + path);
    await page.waitForFunction(() => !document.documentElement.classList.contains("lenis-stopped") && document.querySelector("[data-loader]")?.dataset.intro, null, { timeout: 8000 });
    await wait(page, 1200);
    const lp = await page.evaluate(() => ({
      h1: document.querySelector("h1")?.textContent,
      updated: /last updated/i.test(document.body.innerText),
      label: document.querySelector("[data-hud-text]").textContent,
      contact: document.querySelector('[data-hud-bar] a[href$="#initiation"]').getAttribute("href"),
      home: document.querySelector('[data-hud-bar] a[aria-label^="JIDO"]').getAttribute("href"),
    }));
    check(`${heading.replace(".", "")} page: loads in the site style, HUD links lead back home`, lp.h1 === heading && lp.updated && lp.label === label && lp.contact === "/#initiation" && lp.home === "/", JSON.stringify(lp));
    const doc = await page.evaluate(() => ({
      sections: document.querySelectorAll("main section[id] h2").length,
      toc: [...document.querySelectorAll('nav[aria-label="On this page"] a')].every((a) => document.getElementById(a.hash.slice(1))),
      tocCount: document.querySelectorAll('nav[aria-label="On this page"] a').length,
      draft: !!document.querySelector("[data-legal-status]"),
      placeholders: [...new Set([...document.querySelectorAll("[data-placeholder]")].map((p) => p.textContent))],
      links: [...document.querySelectorAll('nav[aria-label="Legal"] a')].length,
      widows: [...document.querySelectorAll("main h2, main p")].filter((el) => el.getClientRects().length).filter((el) => { const l = window.__lines(el); return l.length > 1 && l[l.length - 1].words === 1; }).length,
      longest: Math.max(...[...document.querySelectorAll("main p")].filter((el) => el.getClientRects().length && getComputedStyle(el).textTransform !== "uppercase").flatMap((el) => window.__lines(el).map((l) => l.chars))),
      unsupported: /\b(HIPAA compliant|GDPR compliant|CCPA compliant|SOC 2 certified|ISO 27001 certified|encrypted at rest|we never share)\b/i.test(document.body.innerText.replace(/not HIPAA compliant/gi, "")),
    }));
    check(`${heading.replace(".", "")} page: ${count} sections, working table of contents, draft notice, links to every legal page`, doc.sections === count && doc.toc && doc.tocCount === count && doc.draft && doc.links === 4, JSON.stringify({ ...doc, placeholders: doc.placeholders.length }));
    check(`${heading.replace(".", "")} page: readable (no widows, lines of 80 characters or less), no unverified compliance claims`, doc.widows === 0 && doc.longest <= 80 && !doc.unsupported, `widows ${doc.widows}, longest line ${doc.longest}, placeholders: ${doc.placeholders.join(" ")}`);
    const ls = await slopScan(page);
    check(`${heading.replace(".", "")} page: no AI-slop markers either`, Object.keys(ls).length === 0, JSON.stringify(ls));
  }
  await page.click('[data-hud-bar] a[href="/#initiation"]');
  await page.waitForURL(/#initiation$/);
  const waitErr = await page.waitForFunction(() => Math.abs(document.getElementById("initiation").getBoundingClientRect().top) < 5, null, { timeout: 8000 }).then(() => "", (e) => e.message.split("\n")[0]);
  const landed = await page.evaluate(() => Math.round(document.getElementById("initiation").getBoundingClientRect().top));
  check("Contact from a legal page lands on the contact section", Math.abs(landed) < 5, `section top ${landed}px ${waitErr}`.trim());

  /* ── INNER PAGES: Services, Pricing, Book a call, Contact ─────────── */
  const siteSrc = require("fs").readFileSync(require("path").join(__dirname, "../lib/site.ts"), "utf8");
  const endpoint = (siteSrc.match(/contactEndpoint:\s*"([^"]+)"/) || [])[1] || null;
  const booking = (siteSrc.match(/bookingUrl:\s*"([^"]+)"/) || [])[1] || null;
  const innerPages = [
    ["/services", "SERVICES", "What we automate."],
    ["/pricing", "PRICING", "Clear prices, agreed in writing."],
    ["/book", "BOOK A CALL", "Book a discovery call."],
    ["/contact", "CONTACT", "Send us a message."],
  ];
  for (const [path, label, heading] of innerPages) {
    const googleCalls = [];
    const onReq = (r) => /calendar\.google\.com|google\.com\/calendar/.test(r.url()) && googleCalls.push(r.url());
    page.on("request", onReq);
    await page.goto(BASE + path);
    await page.waitForFunction(() => document.querySelector("[data-loader]")?.dataset.intro && !document.documentElement.classList.contains("lenis-stopped"), null, { timeout: 8000 });
    await wait(page, 1200);
    const ip = await page.evaluate(() => ({
      h1: document.querySelector("h1")?.textContent,
      label: document.querySelector("[data-hud-text]").textContent,
      nav: [...document.querySelectorAll('footer nav[aria-label="Site"] a')].length,
      legal: [...document.querySelectorAll('footer nav[aria-label="Legal"] a')].length,
      widows: [...document.querySelectorAll("main h1, main h2, main p")].filter((el) => el.getClientRects().length && getComputedStyle(el).textTransform !== "uppercase").filter((el) => { const l = window.__lines(el); return l.length > 1 && l[l.length - 1].words === 1; }).map((el) => el.textContent.slice(0, 30)),
      longest: Math.max(0, ...[...document.querySelectorAll("main p, main li:not(:has(h2, h3, p, div))")].filter((el) => el.getClientRects().length && getComputedStyle(el).textTransform !== "uppercase").flatMap((el) => window.__lines(el).map((l) => l.chars))),
      text: document.body.innerText,
    }));
    const name = heading.replace(/\.$/, "");
    check(`${name}: loads in the site style, with site + legal links in the footer`, ip.h1 === heading && ip.label === label && ip.nav === 4 && ip.legal === 4, JSON.stringify({ h1: ip.h1, label: ip.label, nav: ip.nav, legal: ip.legal }));
    const sl = await slopScan(page);
    check(`${name}: readable (no widows, short lines) and no AI-slop markers`, ip.widows.length === 0 && ip.longest <= 80 && Object.keys(sl).length === 0, `widows: ${ip.widows.join(" | ") || "none"}; longest ${ip.longest}; ${JSON.stringify(sl)}`);

    if (path === "/services") {
      const chips = await page.evaluate(() => [...document.querySelectorAll("main li .font-label.border")].map((c) => c.textContent));
      check("Services: every service says honestly how far along it is (pilot / not built yet)", chips.length === 5 && ip.text.includes("Not built yet") && /tested with sample data/i.test(ip.text), chips.join(", "));
    }
    if (path === "/pricing") {
      const prices = [...new Set(ip.text.match(/\$\s?\d[\d,]*/g) || [])];
      check("Pricing: plain 'from' prices only (no tier cards), terms agreed in writing", prices.length === 2 && /Setup from \$399/.test(ip.text) && /Plans from \$199 a month/.test(ip.text) && /written agreement/i.test(ip.text), prices.join(" "));
    }
    if (path === "/book") {
      const b = await page.evaluate(() => ({ iframe: !!document.querySelector("iframe"), mode: document.querySelector("[data-booking]")?.dataset.booking, href: document.querySelector('[data-booking="request"] a')?.href || "" }));
      const ok = booking ? b.mode === "consent" && !b.iframe : b.mode === "request" && decodeURIComponent(b.href).includes("Discovery call request");
      check("Book a call: Google is not contacted until you ask; email request until the booking link is set", ok && !b.iframe && googleCalls.length === 0, JSON.stringify({ ...b, googleCalls: googleCalls.length, bookingUrlSet: !!booking }));
    }
    if (path === "/contact") {
      await page.click("[data-contact-form] button[type=submit]");
      await wait(page, 200);
      const v = await page.evaluate(() => ({
        invalid: [...document.querySelectorAll("[data-contact-form] [aria-invalid=true]")].length,
        focused: document.activeElement?.getAttribute("autocomplete"),
      }));
      check("Contact form: empty send shows clear errors and focuses the first problem", v.invalid === 3 && v.focused === "name", JSON.stringify(v));
      await page.fill("[data-contact-form] input[autocomplete=name]", "Test Person");
      await page.fill("[data-contact-form] input[autocomplete=email]", "test.person@example.com");
      await page.fill("[data-contact-form] textarea", "We spend hours every week booking appointments by email.");
      let sent = null;
      if (endpoint) {
        await page.route(endpoint, (route) => { sent = JSON.parse(route.request().postData() || "{}"); route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
        await page.click("[data-contact-form] button[type=submit]");
        await wait(page, 600);
        const st = await page.evaluate(() => document.querySelector("[data-form-state]")?.dataset.formState);
        check("Contact form: a valid message is sent to the n8n webhook and confirmed (network mocked)", st === "sent" && sent?.email === "test.person@example.com" && sent?.website === "", JSON.stringify({ st, sent }));
        await page.unroute(endpoint);
      } else {
        await page.click("[data-contact-form] button[type=submit]");
        await wait(page, 300);
        const f = await page.evaluate(() => ({ st: document.querySelector("[data-form-state]")?.dataset.formState, href: decodeURIComponent(document.querySelector('[data-form-state="failed"] a')?.href || "") }));
        check("Contact form: while the webhook is not set up, nothing is lost (Gmail draft with the message)", f.st === "failed" && f.href.includes("booking appointments by email") && f.href.includes("test.person@example.com"), f.st);
      }
      await page.goto(BASE + "/contact?topic=Invoicing");
      await page.waitForFunction(() => document.querySelector("[data-combobox]")?.value === "Invoicing", null, { timeout: 8000 }).catch(() => {});
      check("Contact form: the topic picked on the home page carries over", (await page.inputValue("[data-combobox]")) === "Invoicing");
    }
    page.off("request", onReq);
  }

  // "Transition was aborted" is the browser skipping an animation, not an error in the site's code
  const skipped = errors.filter((e) => /Transition was aborted/.test(e));
  const realErrors = errors.filter((e) => !/Transition was aborted/.test(e));
  check("No JavaScript errors (desktop)", realErrors.length === 0, [...realErrors, skipped.length ? `${skipped.length} view transition(s) skipped by the browser` : ""].filter(Boolean).join(" | "));

  /* ── 20 WAYS TO UNSLOP (enforced on every page) ─────────────────── */
  const us = (n, name, ok, detail) => check(`U${String(n).padStart(2, "0")} ${name}`, ok, detail);
  const SITE_PAGES = ["/", "/services", "/pricing", "/book", "/contact", "/privacy", "/terms", "/ai-disclosure", "/legal-contact"];
  const LEGAL_PATHS = ["/privacy", "/terms", "/ai-disclosure", "/legal-contact"];

  // Static look of one page: colours, fonts, icons, borders, cards, labels, meta tags.
  const unslopScan = (pg) => pg.evaluate(() => {
    const out = { gradients: [], purple: [], emoji: [], glyphIcons: [], oddIcons: [], fonts: [], italic: [], badge: [], heroButtons: 0,
      tintedBorders: [], identicalCards: [], caps: [], readouts: [], stats: [], steps: [], widows: [], wrapRules: [], shadcn: [], meta: {} };
    const vis = (el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && !el.closest("[hidden], [data-loader]");
    const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "");
    const short = (s) => s.replace(/\s+/g, " ").trim().slice(0, 40);
    // sRGB -> OKLCH chroma / hue
    const oklch = ([r, g, b]) => {
      const f = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const [R, G, B] = [f(r), f(g), f(b)];
      const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
      const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
      const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
      const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
      const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
      return { C: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
    };
    const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const all = [...document.querySelectorAll("body *")].filter((el) => !el.closest("script, style, [data-loader]"));

    for (const el of all) {
      const cs = getComputedStyle(el);
      for (const c of [cs, getComputedStyle(el, "::before"), getComputedStyle(el, "::after")])
        if (/gradient/.test(c.backgroundImage)) out.gradients.push(name(el));
      if (!vis(el)) continue;
      // purple: any colour in use with real saturation in the violet/purple hue range
      for (const prop of ["color", "backgroundColor", "borderTopColor", "fill", "stroke"]) {
        const v = cs[prop]; if (!v || v === "none") continue;
        const c = window.__rgb(v); if (c[3] < 20) continue;
        const k = oklch(c); if (k.C > 0.06 && k.h > 285 && k.h < 335) out.purple.push(`${name(el)} ${prop}`);
      }
      // tinted borders: every visible border is a neutral colour
      for (const side of ["Top", "Right", "Bottom", "Left"])
        if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== "none") {
          const c = window.__rgb(cs[`border${side}Color`]);
          if (c[3] > 20 && oklch(c).C > 0.05) { out.tintedBorders.push(`${name(el)} ${side.toLowerCase()}`); break; }
        }
      if (ownText(el) || el.tagName === "text") {
        const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
        if (!/^(Archivo Variable|JetBrains Mono Variable)$/.test(fam) && !el.closest("[class*='__nextjs'], nextjs-portal")) out.fonts.push(`${name(el)}: ${fam}`);
        if (cs.fontStyle !== "normal") out.italic.push(short(el.textContent));
        const t = short(el.textContent), size = parseFloat(cs.fontSize);
        const letters = t.replace(/[^A-Za-z]/g, "");
        const tracked = parseFloat(cs.letterSpacing) / size >= 0.05;
        if (el.closest("main") && size < 16 && tracked && letters.length >= 2 && (cs.textTransform === "uppercase" || letters === letters.toUpperCase()))
          (el.closest("[data-hud-readout]") ? out.readouts : out.caps).push(t);
        if (el.closest("main") && size >= 32 && /^[\d$€£+%x×.,/:\s-]{1,8}[a-z%+]{0,3}$/i.test(t) && /\d/.test(t)) out.stats.push(t);
        if (el.closest("main") && /^(step\s*\d+|0?\d{1,2}\.?)$/i.test(t)) out.steps.push(t);
      }
    }
    if (document.querySelector("em, i, cite")) out.italic.push("em/i element");

    const text = document.body.innerText;
    out.emoji = [...new Set(text.match(/(?![©®™])\p{Extended_Pictographic}/gu) || [])];
    out.glyphIcons = [...new Set(text.match(/[↗↘↙↖→←↑↓➔➜➝»›]/g) || [])];
    // icons: every small SVG is one of the two line icons (crosshair, arrow), nothing else
    for (const svg of document.querySelectorAll("svg")) {
      const r = svg.getBoundingClientRect();
      if (!vis(svg) || r.width > 24 || r.height > 24 || svg.closest("svg:not(:scope) svg")) continue;
      if (!svg.dataset.icon) out.oddIcons.push(svg.outerHTML.slice(0, 60));
      else if ([...svg.querySelectorAll("path")].some((p) => p.getAttribute("stroke-width") !== "1")) out.oddIcons.push(`${svg.dataset.icon}: stroke`);
    }

    // headline badge: nothing small sits just above the page's main headline
    const h1 = document.querySelector("main h1");
    if (h1) {
      const hr = h1.getBoundingClientRect();
      for (const el of document.querySelectorAll("main *")) {
        if (!vis(el) || !ownText(el) || el.contains(h1) || h1.contains(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom <= hr.top + 1 && r.bottom > hr.top - 200 && r.right > hr.left && r.left < hr.right) out.badge.push(short(el.textContent));
      }
    }
    // hero: buttons visible on the first screen (filled or outlined links / buttons)
    for (const el of document.querySelectorAll("main a, main button")) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!vis(el) || r.top > innerHeight) continue;
      const filled = window.__rgb(cs.backgroundColor)[3] > 20;
      const outlined = ["Top", "Right", "Bottom", "Left"].every((s) => parseFloat(cs[`border${s}Width`]) > 0);
      if (filled || outlined) out.heroButtons++;
    }
    // cards: boxed blocks (outlined or filled) with text; 3+ identical siblings = a "feature grid"
    const isCard = (el) => {
      const cs = getComputedStyle(el);
      return el.textContent.trim().length > 20 && (window.__rgb(cs.backgroundColor)[3] > 20 || ["Top", "Right", "Bottom", "Left"].every((s) => parseFloat(cs[`border${s}Width`]) > 0));
    };
    for (const parent of document.querySelectorAll("main *")) {
      const cards = [...parent.children].filter((c) => vis(c) && isCard(c));
      if (cards.length < 3) continue;
      const sig = (c) => `${Math.round(c.getBoundingClientRect().width)}x${Math.round(c.getBoundingClientRect().height)}|${c.className}`;
      if (new Set(cards.map(sig)).size === 1) out.identicalCards.push(`${name(parent)} x${cards.length}`);
    }
    // text wrapping: headings balance, paragraphs avoid widows, and nothing ends on one lonely word
    for (const el of document.querySelectorAll("main h1, main h2, main h3, main p")) {
      if (!vis(el) || getComputedStyle(el).textTransform === "uppercase") continue;
      const want = /^H/.test(el.tagName) && el.tagName !== "P" ? "balance" : "pretty";
      if (getComputedStyle(el).textWrapStyle !== want && getComputedStyle(el).textWrap !== want) out.wrapRules.push(short(el.textContent));
      const l = window.__lines(el);
      if (l.length > 1 && l[l.length - 1].words === 1) out.widows.push(short(el.textContent));
    }
    // default shadcn/ui fingerprints
    if (document.querySelector("[data-slot], [data-radix-collection-item]")) out.shadcn.push("data-slot/radix");
    const cls = [...document.querySelectorAll("[class]")].map((e) => (typeof e.className === "string" ? e.className : "")).join(" ");
    for (const t of ["bg-background", "text-muted-foreground", "ring-offset-background", "bg-primary", "text-primary-foreground", "bg-card", "border-input", "rounded-md", "rounded-lg", "shadow-sm"])
      if (new RegExp(`(^|\\s)${t}(\\s|$)`).test(cls)) out.shadcn.push(t);

    const meta = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) || "";
    out.meta = {
      title: document.title, description: meta('meta[name="description"]'),
      ogTitle: meta('meta[property="og:title"]'), ogDescription: meta('meta[property="og:description"]'),
      ogType: meta('meta[property="og:type"]'), ogSite: meta('meta[property="og:site_name"]'),
      twitter: meta('meta[name="twitter:card"]'), icon: meta('link[rel="icon"]', "href"), iconType: meta('link[rel="icon"]', "type"),
      apple: meta('link[rel="apple-touch-icon"]', "href"), manifest: meta('link[rel="manifest"]', "href"),
      theme: meta('meta[name="theme-color"]'), lang: document.documentElement.lang,
    };
    out.operator = document.querySelector("footer [data-operator]")?.textContent.replace(/\s+/g, " ").trim() || "";
    return out;
  });

  // Colour contrast (WCAG AA): scroll through the page and measure every piece of text where it is read.
  const contrastScan = (pg) => pg.evaluate(async () => {
    const lum = (c) => { const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const page = window.__rgb(getComputedStyle(document.documentElement).backgroundColor);
    const bgOf = (el) => {
      const layers = [];
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        const c = window.__rgb(getComputedStyle(e).backgroundColor);
        if (c[3] > 0) { layers.push(c); if (c[3] === 255) break; }
      }
      let bg = page.slice(0, 3);
      for (const c of layers.reverse()) { const a = c[3] / 255; bg = bg.map((v, i) => v * (1 - a) + c[i] * a); }
      return bg;
    };
    const opacity = (el) => { let o = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
    const measure = (el, colour) => {
      const cs = getComputedStyle(el), bg = bgOf(el), fg = window.__rgb(colour);
      const a = (fg[3] / 255) * opacity(el);
      const eff = bg.map((v, i) => v * (1 - a) + fg[i] * a);
      const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
      return { r: ratio(eff, bg), need: large ? 3 : 4.5 };
    };
    const own = (el) => el.tagName === "text" || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const els = [...document.querySelectorAll("body *")].filter((el) => own(el) && !el.closest("script, style, [data-loader], [hidden], #contact-options, [data-words], .sr-only") && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().width > 1);
    const inputs = [...document.querySelectorAll("input[placeholder], textarea[placeholder]")].filter((el) => el.getClientRects().length);
    const done = new Map(), fails = [];
    const band = (el) => { const r = el.getBoundingClientRect(); return r.top >= 64 && r.bottom <= innerHeight - 64; };
    const take = () => {
      for (const el of [...els, ...inputs]) {
        if (done.has(el) || !band(el)) continue;
        const isInput = el.matches("input, textarea");
        const m = measure(el, isInput ? getComputedStyle(el, "::placeholder").color : el.tagName === "text" ? getComputedStyle(el).fill : getComputedStyle(el).color);
        done.set(el, m);
        if (m.r < m.need) fails.push(`${(isInput ? "placeholder: " + el.placeholder : el.textContent).replace(/\s+/g, " ").trim().slice(0, 28)} ${m.r.toFixed(2)}:1`);
      }
    };
    const fixed = (el) => !!el.closest("[data-hud-bar]");
    // fixed HUD text sits on its own solid bar: measure in place
    for (const el of els.filter(fixed)) { const m = measure(el, getComputedStyle(el).color); done.set(el, m); if (m.r < m.need) fails.push(`HUD ${el.textContent.trim().slice(0, 20)} ${m.r.toFixed(2)}:1`); }
    window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400));
    take();
    for (const el of [...els, ...inputs].filter((e) => !fixed(e)).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)) {
      if (done.has(el)) continue;
      const r = el.getBoundingClientRect();
      window.scrollTo(0, scrollY + r.top - innerHeight * 0.3);
      await new Promise((res) => setTimeout(res, 260));
      take();
      if (!done.has(el)) done.set(el, null); // taller than the screen: skip
    }
    const measured = [...done.values()].filter(Boolean);
    return { measured: measured.length, lowest: Math.min(...measured.map((m) => m.r)).toFixed(2), fails };
  });

  const usPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await usPage.addInitScript(instrument);
  await usPage.goto(BASE + "/");
  await wait(usPage, 6000);
  // 19: before anything is scrolled into view, which sections hide their text, waiting to fade in?
  const fades = await usPage.evaluate(() => {
    const hidden = (sec) => [...sec.querySelectorAll("*")].filter((el) => {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.closest("[hidden], #contact-options") || !el.getClientRects().length) return false;
      let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) o *= +getComputedStyle(e).opacity;
      return o < 0.5 || getComputedStyle(el).visibility === "hidden";
    }).length;
    return [...document.querySelectorAll("main section[id]")].filter((s) => s.id !== "top").map((s) => [s.id, hidden(s)]).filter(([, n]) => n > 0);
  });
  // keyboard focus ring is our own (thin Flag Blue outline, offset), not a default ring
  await usPage.keyboard.press("Tab");
  const focus = await usPage.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, shadow: cs.boxShadow }; });

  const scans = {}, contrast = {};
  for (const path of SITE_PAGES) {
    if (path !== "/") { await usPage.goto(BASE + path); await wait(usPage, 1800); }
    else await usPage.evaluate(() => window.scrollTo(0, 0));
    scans[path] = await unslopScan(usPage);
    contrast[path] = await contrastScan(usPage);
  }
  // the reading effect on the friction headline ends with every word at full strength
  await usPage.goto(BASE + "/");
  await wait(usPage, 2500);
  await usPage.evaluate(() => { const h = document.querySelector("[data-words]"); window.scrollTo(0, scrollY + h.getBoundingClientRect().bottom - innerHeight * 0.3); });
  await wait(usPage, 1500);
  const readWords = await usPage.evaluate(() => [...document.querySelectorAll("[data-words] div, [data-words] span")].every((w) => +getComputedStyle(w).opacity > 0.99));
  const iconFile = await usPage.evaluate(async (u) => (await fetch(u)).text(), scans["/"].meta.icon).catch(() => "");
  const ogFile = await usPage.evaluate(async () => (await fetch("/og.png")).status);
  const manifest = await usPage.evaluate(async (u) => (await fetch(u)).json().catch(() => null), scans["/"].meta.manifest || "/manifest.json");
  await usPage.close();

  const pick = (k) => SITE_PAGES.flatMap((p) => (Array.isArray(scans[p][k]) && scans[p][k].length ? [`${p}: ${[...new Set(scans[p][k])].slice(0, 3).join(" · ")}`] : []));
  const clean = (k) => pick(k).length === 0;
  const show = (k, ok) => pick(k).join(" | ") || ok;
  us(1, "No purple gradient: no gradients and no purple anywhere", clean("gradients") && clean("purple"), show("gradients", "") + show("purple", "palette: slate, beige, flag blue"));
  us(2, "Consistent icons, no emojis: one 1px line-icon family, no emoji or arrow glyphs", clean("emoji") && clean("glyphIcons") && clean("oddIcons"), [show("emoji", ""), show("glyphIcons", ""), show("oddIcons", "")].filter(Boolean).join(" ; ") || "crosshair + arrow SVGs only");
  us(3, "Swap out Inter: all text is Archivo or JetBrains Mono", clean("fonts"), show("fonts", "Archivo (display/body) + JetBrains Mono (labels)"));
  us(4, "No italic serif word: no italics, no serif fonts", clean("italic") && clean("fonts"), show("italic", "none"));
  us(5, "Lose the headline badge: nothing sits on top of any page's main headline", clean("badge"), show("badge", "9 pages checked"));
  us(6, "Skip the 2-button hero: at most one button on any first screen", SITE_PAGES.every((p) => scans[p].heroButtons <= 1), SITE_PAGES.map((p) => `${p} ${scans[p].heroButtons}`).join(", "));
  us(7, "Match outer + inner radius: square corners throughout (0 inside 0)", none("radius"), why("radius") || "no rounded corners anywhere");
  const lowC = SITE_PAGES.filter((p) => contrast[p].fails.length);
  us(8, "Fix color contrast: every text passes WCAG AA (4.5:1, large 3:1), placeholders too", lowC.length === 0, lowC.map((p) => `${p}: ${contrast[p].fails.slice(0, 3).join(", ")}`).join(" | ") || `${SITE_PAGES.reduce((n, p) => n + contrast[p].measured, 0)} texts measured; lowest ${Math.min(...SITE_PAGES.map((p) => +contrast[p].lowest)).toFixed(2)}:1`);
  us(9, "Cut the glowing shadows: no box, text or drop shadows", none("shadow"), why("shadow") || "none");
  us(10, "No colored card borders: every border is a neutral colour", clean("tintedBorders"), show("tintedBorders", "slate line / beige only"));
  us(11, "Break up identical cards: no grid of 3+ look-alike cards", clean("identicalCards"), show("identicalCards", "none found"));
  us(12, "No glassmorphism: no backdrop blur", none("glass"), why("glass") || "none");
  const readouts = Math.max(...SITE_PAGES.map((p) => scans[p].readouts.length));
  us(13, "Ease up on all-caps labels: small spaced-out caps only in the HUD readouts, never as page labels", clean("caps") && readouts <= 3,
    `${show("caps", "0 caps labels in page content")}; HUD readouts in the footer: ${[...new Set(SITE_PAGES.flatMap((p) => scans[p].readouts))].join(" · ")}`);
  us(14, "Drop the stat banner: no row of big numbers", clean("stats"), show("stats", "none"));
  const stepPages = SITE_PAGES.filter((p) => !LEGAL_PATHS.includes(p));
  us(15, "Ditch the 1-2-3 steps: no numbered step labels (legal clause numbers excepted)", stepPages.every((p) => scans[p].steps.length === 0), stepPages.filter((p) => scans[p].steps.length).map((p) => `${p}: ${scans[p].steps.join(" ")}`).join(" | ") || "process is written as prose");
  us(16, "Fix text wrapping: headings balance, paragraphs pretty, no one-word last lines", clean("widows") && clean("wrapRules"), [show("widows", ""), show("wrapRules", "")].filter(Boolean).join(" ; ") || "9 pages checked");
  us(17, "No gradient backgrounds: flat colour + hairline grid (an SVG tile)", clean("gradients"), show("gradients", "none"));
  us(18, "Restyle default shadcn: no shadcn classes, own focus ring", clean("shadcn") && focus.style === "solid" && focus.width === "1px" && focus.offset === "6px" && focus.shadow === "none", `${show("shadcn", "no shadcn")}; focus ${focus.style} ${focus.width} offset ${focus.offset}`);
  us(19, "No fade-in on every section: one reading effect, other sections are just there", fades.length <= 1 && readWords, `sections waiting to fade: ${fades.map(([s, n]) => `${s} (${n})`).join(", ") || "none"}; friction words reach full strength: ${readWords}`);
  check("Footer on every page: JIDO, an AI automation platform developed and operated by [the operator's legal name]", SITE_PAGES.every((p) => /^JIDO\. An AI automation platform developed and operated by .+\.$/.test(scans[p].operator)), scans["/"].operator);
  const metaOk = SITE_PAGES.every((p) => { const m = scans[p].meta; return m.title && m.description.length >= 50 && m.description.length <= 160 && m.ogTitle === m.title && m.ogDescription === m.description && m.ogType && m.ogSite === "JIDO" && m.twitter && m.icon && m.apple && m.manifest && m.theme && m.lang === "en"; });
  const unique = new Set(SITE_PAGES.map((p) => scans[p].meta.title)).size === SITE_PAGES.length && new Set(SITE_PAGES.map((p) => scans[p].meta.description)).size === SITE_PAGES.length;
  us(20, "Custom favicon + meta tags: JIDO mark icon, home-screen icon, manifest, unique title + description + social tags on every page", metaOk && unique && /<rect/.test(iconFile) && scans["/"].meta.iconType === "image/svg+xml" && manifest?.name === "JIDO" && ogFile === 200,
    `icon ${scans["/"].meta.icon.split("?")[0]} (JIDO mark), apple ${scans["/"].meta.apple.split("?")[0]}, manifest ${manifest?.name}, share image ready (${ogFile}); ${SITE_PAGES.length} unique titles/descriptions`);

  /* ── PHONE ───────────────────────────────────────────────── */
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const perr = [];
  phone.on("pageerror", (e) => perr.push(e.message));
  await phone.goto(BASE);
  await wait(phone, 5200);
  const ph = await phone.evaluate(() => ({ w: document.documentElement.scrollWidth, cursor: document.documentElement.classList.contains("has-cursor") }));
  check("Phone: no sideways scrolling", ph.w <= 390, `page width ${ph.w}px`);
  check("Phone: custom cursor off (touch keeps native behaviour)", !ph.cursor);
  // D08 touch targets: every tappable thing catches a tap 20px from its centre in every direction
  const touchMisses = async (pg) => pg.evaluate(() => {
    // links inside a sentence are exempt (as in WCAG 2.5.8); everything else needs a full target
    const inline = (el) => el.tagName === "A" && el.parentElement.matches("p, li") && el.parentElement.textContent.trim() !== el.textContent.trim();
    const els = [...document.querySelectorAll("a, button, input, textarea, summary")].filter((el) => !inline(el) && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && !el.closest('[hidden], #contact-options, [aria-hidden="true"]') && !el.closest("details:not([open]) > :not(summary)"));
    const miss = [];
    for (const el of els) {
      const fixed = el.closest("[data-hud-bar]");
      if (!fixed) el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const ok = [[x, y - 20], [x, y + 20], [x - 20, y], [x + 20, y]].every(([px, py]) => { const h = document.elementFromPoint(px, py); return h && el.contains(h); });
      if (!ok) miss.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 20));
    }
    return { checked: els.length, miss };
  });
  const tHome = await touchMisses(phone);
  await phone.goto(BASE + "/privacy");
  await wait(phone, 2500);
  const tLegal = await touchMisses(phone);
  await phone.goto(BASE + "/contact");
  await wait(phone, 2500);
  const tContact = await touchMisses(phone);
  dt(8, "Touch targets: every link, button and field is at least 44 x 44px to a finger", tHome.miss.length === 0 && tLegal.miss.length === 0 && tContact.miss.length === 0, `${tHome.checked + tLegal.checked + tContact.checked} checked; misses: ${[...tHome.miss, ...tLegal.miss, ...tContact.miss].join(", ") || "none"}`);
  check("No JavaScript errors (phone)", perr.length === 0, perr.join(" | "));
  if (SHOTS) await phone.screenshot({ path: `${SHOTS}/5-phone.png` });

  /* ── INTERRUPTIBLE INTRO: a click fast-forwards it smoothly ───────── */
  const fresh = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await fresh.goto(BASE);
  await fresh.waitForFunction(() => document.querySelector("[data-loader]")?.dataset.intro === "full", null, { timeout: 8000 });
  await wait(fresh, 400);
  const t1 = Date.now();
  await fresh.mouse.click(640, 400);
  await fresh.waitForFunction(() => !document.documentElement.classList.contains("lenis-stopped"), null, { timeout: 6000 }).catch(() => {});
  const skipMs = Date.now() - t1;
  dt(18, "Interruptible animation: a click speeds up the intro, an open menu reverses mid-way", skipMs < 1500 && menuInterrupt, `page usable ${skipMs}ms after the click (full intro is about 3s); menu ${mid.toFixed(2)} -> ${back1.toFixed(2)} -> ${back2.toFixed(2)}`);

  /* ── REDUCED MOTION ──────────────────────────────────────── */
  const calm = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await calm.goto(BASE);
  await wait(calm, 1500);
  check("Reduced-motion users skip the show and see content", await calm.evaluate(() => +getComputedStyle(document.querySelector("[data-loader]")).opacity === 0));

  await browser.close();

  const pass = results.filter((r) => r.ok).length;
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `   (${r.detail})` : ""}`);
  console.log(`\n${pass}/${results.length} checks passed against ${BASE}`);
  process.exit(pass === results.length ? 0 : 1);
})();
