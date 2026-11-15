/**
 * The JIDO cursor on phones / touch screens (and Chrome DevTools phone mode).
 *   node tests/cursor-touch.cjs [baseUrl] [screenshotDir]
 * A tap should show our cursor (dot + corner viewfinder) at the finger, box the tapped
 * button, then fade away. A mouse on the same device brings the full cursor back.
 */
const { chromium, devices } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3000";
const SHOTS = process.argv[3];
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const wait = (p, ms) => p.waitForTimeout(ms);

const state = (pg) => pg.evaluate(() => {
  const d = document.querySelector("[data-cursor-dot]"), f = document.querySelector("[data-cursor-frame]");
  if (!d || !f) return null;
  const fr = f.getBoundingClientRect(), dr = d.getBoundingClientRect();
  const b = document.querySelector("[data-cta]")?.getBoundingClientRect();
  return {
    frameShown: +getComputedStyle(f).opacity > 0.5 && getComputedStyle(f).visibility === "visible",
    dotShown: +getComputedStyle(d).opacity > 0.5 && getComputedStyle(d).visibility === "visible",
    frame: { x: fr.left, y: fr.top, w: fr.width, h: fr.height }, dot: { x: dr.left + dr.width / 2, y: dr.top + dr.height / 2 },
    boxed: !!b && fr.left < b.left && fr.right > b.right && fr.top < b.top && fr.bottom > b.bottom,
    noneCursor: document.documentElement.classList.contains("has-cursor"),
  };
});

(async () => {
  const browser = await chromium.launch();

  /* ── phone (what Chrome DevTools phone mode emulates) ── */
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const phone = await ctx.newPage();
  await phone.goto(BASE + "/");
  await wait(phone, 5500);
  check("Phone: no cursor before the first touch", !(await state(phone))?.frameShown, "");
  // tap empty space: the cursor appears where the finger landed
  await phone.touchscreen.tap(200, 300);
  await wait(phone, 120);
  const s1 = await state(phone);
  check("Phone: tapping shows the JIDO cursor (dot + viewfinder) at the finger", s1?.frameShown && s1?.dotShown && Math.hypot(s1.dot.x - 200, s1.dot.y - 300) < 3, JSON.stringify(s1 && { dot: s1.dot, frame: s1.frame }));
  if (SHOTS) await phone.screenshot({ path: `${SHOTS}/touch-1-tap.png` });
  await wait(phone, 1400);
  check("Phone: the cursor fades away after the tap", !(await state(phone))?.frameShown);
  // tap the main button: the viewfinder boxes it
  await phone.evaluate(() => document.getElementById("initiation").scrollIntoView());
  await wait(phone, 1500);
  const b = await phone.locator("[data-cta]").boundingBox();
  await phone.touchscreen.tap(b.x + b.width * 0.3, b.y + b.height / 2);
  // opening the menu gently scrolls the page so all options fit; the viewfinder rides along with
  // the button, so watch the whole tap and look for the moment it is shown and boxing the button
  let s2 = null, boxedAt = -1;
  for (let t = 0; t <= 1200; t += 50) {
    s2 = await state(phone);
    if (s2?.frameShown && s2?.boxed) { boxedAt = t; break; }
    await wait(phone, 50);
  }
  check("Phone: tapping a button boxes it with the viewfinder", boxedAt >= 0, boxedAt >= 0 ? `boxed ${boxedAt}ms after the tap` : JSON.stringify(s2 && s2.frame));
  if (SHOTS) await phone.screenshot({ path: `${SHOTS}/touch-2-button.png` });
  check("Phone: never hides the system pointer (no cursor:none on touch)", !s2?.noneCursor);
  await ctx.close();

  /* ── laptop with a touchscreen: mouse and finger on one device ── */
  const both = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  await both.goto(BASE + "/");
  await wait(both, 5500);
  await both.mouse.move(400, 400);
  await both.mouse.move(420, 410, { steps: 3 });
  await wait(both, 200);
  const m1 = await state(both);
  check("Touch laptop: the mouse gets the full JIDO cursor", m1?.dotShown && m1?.noneCursor, JSON.stringify(m1 && m1.dot));
  await both.touchscreen.tap(700, 300);
  await wait(both, 120);
  const t1 = await state(both);
  check("Touch laptop: a finger tap shows the cursor at the tap, system pointer back", t1?.frameShown && !t1?.noneCursor && Math.hypot(t1.dot.x - 700, t1.dot.y - 300) < 3, JSON.stringify(t1 && t1.dot));
  await wait(both, 1400);
  await both.mouse.move(500, 500, { steps: 3 });
  await wait(both, 200);
  const m2 = await state(both);
  check("Touch laptop: moving the mouse again brings the full cursor back", m2?.dotShown && m2?.noneCursor && Math.hypot(m2.dot.x - 500, m2.dot.y - 500) < 3, JSON.stringify(m2 && m2.dot));
  await both.close();

  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `   (${r.detail})` : ""}`);
  console.log(`\n${pass}/${results.length} touch cursor checks passed against ${BASE}`);
  process.exit(pass === results.length ? 0 : 1);
})();
