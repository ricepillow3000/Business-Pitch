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
    [...document.querySelectorAll('a[href="#top"] [data-block]')].map((b) => ({
      op: +getComputedStyle(b).opacity,
      t: b.getAttribute("transform") || "",
    })),
  );
  check(
    "Logo: 10 blocks snap into alignment to form the J (no tail)",
    !(await page.$('a[href="#top"] svg path, a[href="#top"] svg circle')) &&
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
    const f = document.querySelector('[class*="z-[199]"]');
    const r = f.getBoundingClientRect();
    return { op: +getComputedStyle(f).opacity, w: r.width, h: r.height };
  });
  check("Cursor morphs into [ ] brackets around links", frame.op > 0.9 && frame.w > cb.width && frame.h > cb.height, `bracket box ${frame.w.toFixed(0)}×${frame.h.toFixed(0)} around ${cb.width.toFixed(0)}×${cb.height.toFixed(0)} link`);

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

  // 5. Magnetic CTA
  const btn = await page.$("[data-magnetic]");
  const bb = await btn.boundingBox();
  await page.mouse.move(bb.x + bb.width * 0.9, bb.y + bb.height * 0.9, { steps: 10 });
  await wait(page, 700);
  const pull = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("[data-magnetic]")).transform));
  check("CTA button is magnetic (pulled toward cursor)", pull.e > 3 && pull.f > 3, `moved x=${pull.e.toFixed(1)} y=${pull.f.toFixed(1)}`);
  const menu = "#contact-options";
  check("Email menu is hidden until the button is clicked", !(await page.isVisible(menu)));
  await btn.click();
  await wait(page, 1400);
  const menuBottom = await page.evaluate((m) => document.querySelector(m).getBoundingClientRect().bottom - innerHeight, menu);
  check("Email menu is scrolled fully into view when opened", menuBottom <= 0, `${Math.round(-menuBottom)}px above the bottom edge`);
  const gmail = await page.getAttribute(`${menu} a[target="_blank"]`, "href");
  check("Clicking 'Start the conversation' offers Gmail / copy address", (await page.isVisible(menu)) && (await page.$$(`${menu} a, ${menu} button`)).length === 2);
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
    check(`${label}: bottom label shown + content revealed`, p.label === label && p.shown && hidden === 0, `${JSON.stringify(p)} hidden=${hidden}`);
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
  const cta = "[data-magnetic]";
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "center" }), cta);
  await wait(page, 1200);

  // 1 Squash & stretch: the cursor stretches along fast moves; the CTA squashes when pressed
  await page.mouse.move(150, 150);
  await wait(page, 600);
  await page.mouse.move(1250, 700, { steps: 3 });
  await wait(page, 60);
  const stretch = await page.evaluate(() => {
    const m = new DOMMatrix(getComputedStyle(document.querySelector('[class*="z-[200]"]')).transform);
    return Math.abs(Math.hypot(m.a, m.b) - Math.hypot(m.c, m.d));
  });
  let b = await page.locator(cta).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  await wait(page, 300);
  await page.mouse.down();
  await wait(page, 250);
  const pressed = await page.evaluate((s) => {
    const btn = document.querySelector(s);
    return { scale: getComputedStyle(btn.querySelector("[data-press]")).scale, wind: getComputedStyle(btn.querySelector("[data-mark]")).scale };
  }, cta);
  await page.mouse.up();
  ux(1, "Squash & stretch: cursor stretches on fast moves, button squashes on press", stretch > 0.04 && parseFloat(pressed.scale) < 1, `stretch ${stretch.toFixed(2)}, press scale ${pressed.scale}`);

  // 2 Anticipation: the loader reaches toward you before it splits; the CTA crosshair gathers while pressed, snaps open on release
  ux(2, "Anticipation wind-up: loader 'reach' before the split, button crosshair gathers on press", passed("Reach:") && parseFloat(pressed.wind) < 1, `crosshair scale ${pressed.wind} while pressed`);

  // 17 Doherty threshold: a click answers in under 400ms
  await wait(page, 380);
  const menuShown = await page.evaluate(() => +getComputedStyle(document.getElementById("contact-options")).opacity);
  ux(17, "Doherty threshold: the email menu answers a click in under 400ms", menuShown > 0.6, `opacity ${menuShown.toFixed(2)} after 380ms`);

  // 5 Follow through: the menu rows settle in one after another; the magnetic button springs back
  const delays = await page.evaluate(() => [...document.querySelectorAll("#contact-options a, #contact-options button")].map((r) => parseFloat(getComputedStyle(r).transitionDelay)));
  await page.mouse.move(80, 300, { steps: 6 });
  await wait(page, 1600);
  const rest = await page.evaluate((s) => new DOMMatrix(getComputedStyle(document.querySelector(s)).transform), cta);
  ux(5, "Follow through: menu rows stagger in, magnetic button springs back to rest", delays.length > 1 && delays.every((d, i) => i === 0 || d > delays[i - 1]) && Math.abs(rest.e) < 1 && Math.abs(rest.f) < 1, `row delays ${delays.join("/")}s`);

  // 6 Slow in & slow out: UI motion uses eased curves, never linear
  const easing = await page.evaluate(() => ["#contact-options", "#contact-options a"].map((s) => getComputedStyle(document.querySelector(s)).transitionTimingFunction));
  ux(6, "Slow in & slow out: transitions use eased curves (expo), not linear", easing.every((e) => e.includes("cubic-bezier")), easing.join(" | "));

  // 9 Snappy timing: no UI feedback transition is slower than 500ms
  const slowest = await page.evaluate(() => {
    const els = [...document.querySelectorAll("a, button, #contact-options, #contact-options *, [data-magnetic] *")];
    return Math.max(...els.flatMap((el) => getComputedStyle(el).transitionDuration.split(",").map((d) => parseFloat(d) * (d.includes("ms") ? 0.001 : 1))));
  });
  ux(9, "Snappy timing: every hover/press/menu transition is 500ms or less", slowest <= 0.5, `slowest ${slowest}s`);

  // 10 Exaggerated feedback: copying the address answers loudly
  await page.click("#contact-options button");
  await wait(page, 200);
  const fb = await page.evaluate(() => {
    const r = document.querySelector("#contact-options button");
    return { text: r.textContent, bg: getComputedStyle(r).backgroundColor };
  });
  ux(10, "Exaggerated feedback: 'Copy address' flips to 'Copied' and lights up", fb.text.includes("Copied") && fb.bg !== "rgba(0, 0, 0, 0)", fb.bg);

  // 18 Postel's law: copying still works when the browser blocks the clipboard API
  await wait(page, 2200);
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: () => Promise.reject(new Error("blocked")) }));
  await page.click("#contact-options button");
  await wait(page, 200);
  ux(18, "Postel's law: copy falls back gracefully when the clipboard API is blocked", (await page.textContent("#contact-options button")).includes("Copied"));

  // 11 Solid layering: things never clip through each other (open menu sits on top of what follows)
  const solid = await page.evaluate(() => {
    const panel = document.getElementById("contact-options").getBoundingClientRect();
    const hit = document.elementFromPoint(panel.left + panel.width / 2, panel.bottom - 8);
    return !!hit && !!hit.closest("#contact-options");
  });
  ux(11, "Solid layering: the open menu sits cleanly above the content below it", solid);

  // 15 Hick's law: few choices
  const choices = await page.evaluate(() => ({
    menu: document.querySelectorAll("#contact-options a, #contact-options button").length,
    nav: document.querySelectorAll("[data-hud-bar] a").length,
  }));
  ux(15, "Hick's law: 2 email choices, 2 links in the top bar", choices.menu <= 3 && choices.nav <= 2, JSON.stringify(choices));
  await page.keyboard.press("Escape");
  await wait(page, 500);

  // 3 Staging the focus: one primary action, text on quiet halos, one section label at a time
  const stage = await page.evaluate(() => ({ primary: document.querySelectorAll("[data-magnetic]").length, halos: document.querySelectorAll(".quiet").length }));
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
      ext.every((a) => a.rel.includes("noopener") && a.textContent.includes("↗"));
  });
  ux(19, "Jakob's law: logo top-left → home, Contact top-right, new-tab links marked ↗", jakob);

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
    if (/\/mo\b|per month|pricing|testimonial/i.test(text) || document.querySelector("blockquote")) add("pricing/testimonials", "found");
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
  dt(16, "Affordance: links in text are underlined, the button looks like a button", reading.underlined && (await page.$("button[data-magnetic] [data-press].bg-beige")) !== null);

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
  await page.click("[data-magnetic]");
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

  await page.click("[data-magnetic]");
  await wait(page, 500);
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: () => new Promise((r) => setTimeout(r, 1500)) }));
  await page.click("#contact-options button");
  await wait(page, 60);
  const optimistic = await page.textContent("#contact-options button");
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
  await page.click('footer a[href="/privacy"]');
  await page.waitForURL(/\/privacy$/);
  await page.waitForFunction(() => document.querySelector("[data-loader]")?.dataset.intro, null, { timeout: 8000 });
  await wait(page, 700);
  const vt = await page.evaluate(() => ({ ran: window.__vt, mode: document.querySelector("[data-loader]").dataset.intro, h1: document.querySelector("h1").style.viewTransitionName }));
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

  check("No JavaScript errors (desktop)", errors.length === 0, errors.join(" | "));

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
    const els = [...document.querySelectorAll("a, button, input, summary")].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && !el.closest("[hidden], #contact-options") && !el.closest("details:not([open]) > :not(summary)"));
    const miss = [];
    for (const el of els) {
      const fixed = el.closest("[data-hud-bar]");
      if (!fixed) el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const ok = [[x, y - 20], [x, y + 20], [x - 20, y], [x + 20, y]].every(([px, py]) => { const h = document.elementFromPoint(px, py); return h && (el.contains(h) || h.contains(el)); });
      if (!ok) miss.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 20));
    }
    return { checked: els.length, miss };
  });
  const tHome = await touchMisses(phone);
  await phone.goto(BASE + "/privacy");
  await wait(phone, 2500);
  const tLegal = await touchMisses(phone);
  dt(8, "Touch targets: every link, button and field is at least 44 x 44px to a finger", tHome.miss.length === 0 && tLegal.miss.length === 0, `${tHome.checked + tLegal.checked} checked; misses: ${[...tHome.miss, ...tLegal.miss].join(", ") || "none"}`);
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
