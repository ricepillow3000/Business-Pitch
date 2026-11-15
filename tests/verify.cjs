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

(async () => {
  const browser = await chromium.launch();

  /* ── DESKTOP ─────────────────────────────────────────────── */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
  check("HUD: rotated micro-data present", (await page.textContent("body")).includes("SYS.LOC //"));
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
    page.evaluate(() => {
      const digits = [...document.querySelectorAll("[data-reel]")].map((r) => {
        const m = new DOMMatrix(getComputedStyle(r).transform);
        return Math.round(-m.f / (r.offsetHeight / 10));
      });
      return { n: digits.join(""), label: document.querySelector("[data-hud-label]").textContent };
    });
  let p = await pager();
  check("Pagination starts at [[001]] OVERVIEW", p.n === "001" && p.label === "OVERVIEW", JSON.stringify(p));

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
  check("Contact link smooth-scrolls to [[004]] with NO page reload", nav.alive === "same-page" && nav.loads === 1 && Math.abs(nav.top) < 5, `section top=${nav.top.toFixed(0)}px, page state kept=${nav.alive === "same-page"}`);
  p = await pager();
  check("Pagination rolled to [[004]] INITIATION", p.n === "004" && p.label === "INITIATION", JSON.stringify(p));

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
  check("Clicking 'Start the conversation' offers Gmail / email app / copy", (await page.isVisible(menu)) && (await page.$$(`${menu} a, ${menu} button`)).length === 3);
  check("Gmail option opens a new Gmail email to the right address", gmail.startsWith("https://mail.google.com/mail/") && gmail.includes("to=john7000.nguyen%40gmail.com"), gmail);
  check("Email-app option uses mailto:", (await page.getAttribute(`${menu} a[href^="mailto:"]`, "href")).startsWith("mailto:john7000.nguyen@gmail.com"));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4b-email-menu.png` });
  await page.keyboard.press("Escape");
  await wait(page, 700);
  check("Escape closes the email menu", !(await page.isVisible(menu)));
  check("Contact: email address shown as a link", await page.isVisible('#initiation dl a[href="mailto:john7000.nguyen@gmail.com"]'));
  check("Phone number removed from the site", !(await page.textContent("body")).includes("265-9930") && !(await page.$('a[href^="tel:"]')));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4-initiation.png` });

  // 6. Every section: pagination + reveals
  await page.mouse.move(1300, 120);
  const sections = [["top", "001", "OVERVIEW"], ["friction", "002", "FRICTION"], ["automation", "003", "AUTOMATION"], ["initiation", "004", "INITIATION"]];
  for (const [id, n, label] of sections) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
    await wait(page, 1800);
    p = await pager();
    const hidden = await page.evaluate((id) =>
      [...document.querySelectorAll(`#${id} [data-reveal]`)].filter((el) => getComputedStyle(el).opacity < 0.99).length, id);
    check(`[[${n}]] ${label}: pagination correct + content revealed`, p.n === n && p.label === label && hidden === 0, `${JSON.stringify(p)} hidden=${hidden}`);
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
  check("No JavaScript errors (phone)", perr.length === 0, perr.join(" | "));
  if (SHOTS) await phone.screenshot({ path: `${SHOTS}/5-phone.png` });

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
