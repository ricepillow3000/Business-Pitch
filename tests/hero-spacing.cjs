/**
 * The first screen after the logo loads the home page: no big empty band.
 *   node tests/hero-spacing.cjs [baseUrl] [screenshotDir]
 * Measures the largest empty vertical band between the top bar and the bottom bar on
 * phones, a tablet and desktops. Rule: no empty band taller than 25% of the screen.
 */
const { chromium, devices } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3000";
const SHOTS = process.argv[3];
const SCREENS = [
  ["iPhone SE", devices["iPhone SE"]],
  ["iPhone 13", devices["iPhone 13"]],
  ["Pixel 7", devices["Pixel 7"]],
  ["iPad portrait", devices["iPad (gen 7)"]],
  ["Laptop 1280x800", { viewport: { width: 1280, height: 800 } }],
  ["Desktop 1440x900", { viewport: { width: 1440, height: 900 } }],
  ["Desktop 1920x1080", { viewport: { width: 1920, height: 1080 } }],
];
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

const emptiest = (pg) => pg.evaluate(() => {
  const bars = [...document.querySelectorAll("[data-hud-bar]")].map((b) => b.getBoundingClientRect());
  const top = Math.max(...bars.filter((r) => r.top < innerHeight / 2).map((r) => r.bottom));
  const bottom = Math.min(...bars.filter((r) => r.top >= innerHeight / 2).map((r) => r.top));
  // everything a visitor can see: text, icons, lines, the diagram
  const spans = [...document.querySelectorAll("main *")].filter((el) => {
    if (!el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || +cs.opacity < 0.05) return false;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    return own || el.tagName === "svg" || (el.children.length === 0 && el.getBoundingClientRect().height > 0);
  }).map((el) => el.getBoundingClientRect()).filter((r) => r.bottom > top && r.top < bottom && r.width > 0)
    .map((r) => [Math.max(r.top, top), Math.min(r.bottom, bottom)]).sort((a, b) => a[0] - b[0]);
  let cursor = top, gap = 0, where = "";
  for (const [a, b] of spans) {
    if (a - cursor > gap) { gap = a - cursor; where = `${Math.round(cursor)}-${Math.round(a)}px`; }
    cursor = Math.max(cursor, b);
  }
  if (bottom - cursor > gap) { gap = bottom - cursor; where = `${Math.round(cursor)}-${Math.round(bottom)}px`; }
  return { gap: Math.round(gap), share: gap / (bottom - top), where, h: innerHeight };
});

(async () => {
  const browser = await chromium.launch();
  for (const [label, opts] of SCREENS) {
    const ctx = await browser.newContext({ ...opts });
    const pg = await ctx.newPage();
    // arrive the way the logo link does: from another page, back to "/"
    await pg.goto(BASE + "/services");
    await pg.waitForTimeout(4500);
    await pg.click('[data-hud-bar] a[aria-label^="JIDO"]');
    await pg.waitForURL(/\/$/);
    await pg.waitForTimeout(2500);
    const m = await emptiest(pg);
    check(`${label}: no empty band over 25% of the screen`, m.share <= 0.25, `largest gap ${m.gap}px = ${Math.round(m.share * 100)}% of the screen (${m.where})`);
    if (SHOTS) await pg.screenshot({ path: `${SHOTS}/hero-${label.replace(/\W+/g, "-")}.png` });
    await ctx.close();
  }
  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `   (${r.detail})` : ""}`);
  console.log(`\n${pass}/${results.length} first-screen spacing checks passed against ${BASE}`);
  process.exit(pass === results.length ? 0 : 1);
})();
