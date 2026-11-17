/**
 * The cursor on the Book a call page once Google's booking calendar is showing.
 *   node tests/booking-cursor.cjs [baseUrl]   (needs SITE.bookingUrl set; Google is answered by a stand-in)
 * Over the calendar and its frame: the normal mouse pointer, no JIDO dot or viewfinder trailing.
 * Everywhere else: the JIDO cursor. Run with Chrome's separate-process iframes, like real Chrome.
 */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:4173";
(async () => {
  const b = await chromium.launch({ args: ["--site-per-process"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/calendar\.google\.com/, (r) => r.fulfill({ contentType: "text/html", body: "<body style='height:2000px'>stand-in</body>" }));
  const p = await ctx.newPage();
  await p.goto(BASE + "/book"); await p.waitForTimeout(4000);
  const vis = () => p.evaluate(() => ({ dot: +getComputedStyle(document.querySelector("[data-cursor-dot]")).opacity, frame: +getComputedStyle(document.querySelector("[data-cursor-frame]")).opacity,
    frameBox: (() => { const r = document.querySelector("[data-cursor-frame]").getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(","); })() }));
  const out = [];
  // 1. the reported case: click the button, then keep moving inside Google's calendar
  const btn = await p.locator("[data-booking] button").boundingBox();
  await p.mouse.move(btn.x + 40, btn.y + 20, { steps: 5 }); await p.waitForTimeout(400);
  await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(700);
  for (let i = 1; i <= 5; i++) await p.mouse.move(btn.x + 40 + i * 30, btn.y + 20 + i * 15);
  await p.waitForTimeout(500);
  const a = await vis();
  out.push([`After clicking "Show available times" and moving in the calendar: JIDO cursor hidden`, a.dot < 0.05 && a.frame < 0.05, JSON.stringify(a)]);
  // 2. the header strip above the calendar (inside the booking frame): system pointer, no JIDO cursor
  const hdr = await p.locator("[data-booking] > div.border-b").boundingBox();
  await p.mouse.move(hdr.x + hdr.width + 120, hdr.y + 10, { steps: 4 }); await p.waitForTimeout(400);
  const outside = await vis();
  await p.mouse.move(hdr.x + 300, hdr.y + hdr.height / 2, { steps: 6 }); await p.waitForTimeout(400);
  const h = await vis();
  const sys = await p.evaluate(([x, y]) => getComputedStyle(document.elementFromPoint(x, y)).cursor, [hdr.x + 300, hdr.y + hdr.height / 2]);
  out.push(["Outside the calendar: JIDO cursor shown", outside.dot > 0.9, JSON.stringify(outside)]);
  out.push(["Booking frame header: normal mouse pointer, JIDO cursor hidden", h.dot < 0.05 && h.frame < 0.05 && sys !== "none", `${JSON.stringify(h)} system cursor: ${sys}`]);
  // 3. entering the calendar from outside, then leaving again
  const fr = await p.locator("[data-booking] iframe").boundingBox();
  await p.mouse.move(fr.x + 300, fr.y + 300, { steps: 8 }); await p.waitForTimeout(400);
  const inn = await vis();
  out.push(["Moving into the calendar from outside: JIDO cursor hidden", inn.dot < 0.05 && inn.frame < 0.05, JSON.stringify(inn)]);
  await p.mouse.move(fr.x + fr.width + 120, fr.y + 300, { steps: 8 }); await p.waitForTimeout(400);
  const back = await vis();
  out.push(["Leaving the calendar: JIDO cursor comes back", back.dot > 0.9 && back.frame > 0.9, JSON.stringify(back)]);
  // 4. click "Show available times" and keep the mouse perfectly still: hidden at once
  const p2 = await ctx.newPage();
  await p2.goto(BASE + "/book"); await p2.waitForTimeout(4000);
  const b2 = await p2.locator("[data-booking] button").boundingBox();
  await p2.mouse.move(b2.x + 40, b2.y + 20, { steps: 5 }); await p2.waitForTimeout(300);
  await p2.mouse.down(); await p2.mouse.up(); await p2.waitForTimeout(800);
  const still = await p2.evaluate(() => [+getComputedStyle(document.querySelector("[data-cursor-dot]")).opacity, +getComputedStyle(document.querySelector("[data-cursor-frame]")).opacity]);
  out.push(["Click 'Show available times' and keep the mouse still: JIDO cursor hidden at once", still[0] < 0.05 && still[1] < 0.05, JSON.stringify(still)]);
  await b.close();
  for (const [n, ok, d] of out) console.log(`${ok ? "PASS" : "FAIL"}  ${n}   (${d})`);
  console.log(`\n${out.filter((o) => o[1]).length}/${out.length} calendar cursor checks passed`);
})();
