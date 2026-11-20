/**
 * A visitor books a discovery call, click by click, from the home page.
 * Google is never contacted: calendar.google.com is answered by a clearly labelled STAND-IN
 * that follows the same steps as Google's booking page (pick a time, name + email, Book).
 *   node tests/booking-journey.cjs [shotsDir] [baseUrl]   (needs a build with SITE.bookingUrl set; any
 *   calendar.google.com/... address works for the test, since Google is answered by the stand-in)
 */
const { chromium } = require("playwright");
const DIR = process.argv[2];
const BASE = process.argv[3] || "http://localhost:4173";
const STAND_IN = `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width"><style>
  body{margin:0;font:15px system-ui,sans-serif;color:#1f1f1f;background:#fff}
  .ban{background:#fde68a;color:#5b4300;padding:8px 14px;font-size:14px;font-weight:700}
  h1{font-size:20px;margin:16px 20px 4px} .sub{margin:0 20px 14px;color:#555}
  .wk{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;padding:0 20px}
  .d{font-weight:600;text-align:center;padding:6px 0;border-bottom:1px solid #ddd}
  .col{display:flex;flex-direction:column;gap:8px;padding-top:8px}
  button{font:inherit;border:1px solid #1a73e8;color:#1a73e8;background:#fff;border-radius:6px;padding:8px 4px;cursor:pointer}
  .none{color:#888;font-size:12px;text-align:center;padding-top:10px}
  form{padding:16px 20px;display:none;max-width:380px} form.on{display:block}
  label{display:block;margin:10px 0 4px} input{width:100%;font:inherit;padding:8px;border:1px solid #bbb;border-radius:6px;box-sizing:border-box}
  .book{margin-top:14px;background:#1a73e8;color:#fff;padding:10px 22px}
  .done{display:none;padding:30px 20px;font-size:18px} .done.on{display:block}
</style></head><body>
<div class=ban>STAND-IN for Google's booking page (test only, follows Google's steps)</div>
<div id=pick><h1>Discovery call · 30 min</h1><p class=sub>Select an appointment time</p><div class=wk id=wk></div></div>
<form id=f><b id=when></b><label>First name<input id=fn required></label><label>Last name<input id=ln required></label>
<label>Email<input id=em type=email required></label><button class=book>Book</button></form>
<div class=done id=done>✓ Booked. A confirmation email is on its way.</div>
<script>
  const days={Mon:["10:00","11:00","14:00"],Tue:["10:00","13:00"],Wed:["09:30","15:00"],Thu:[],Fri:["10:00","11:30"],Sat:[],Sun:[]};
  for(const [d,t] of Object.entries(days)){const c=document.createElement("div");c.innerHTML='<div class=d>'+d+'</div>';const col=document.createElement("div");col.className="col";
    if(!t.length)col.innerHTML='<div class=none>No availability</div>';
    for(const x of t){const b=document.createElement("button");b.textContent=x;b.onclick=()=>{document.getElementById("pick").style.display="none";f.classList.add("on");when.textContent=d+" "+x+" · 30 min";};col.append(b);}
    c.append(col);wk.append(c);}
  f.onsubmit=(e)=>{e.preventDefault();f.classList.remove("on");done.classList.add("on");};
</script></body></html>`;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.route(/calendar\.google\.com/, (r) => r.fulfill({ contentType: "text/html", body: STAND_IN }));
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => !/Transition was aborted/.test(e.message) && errors.push(e.message));
  let clicks = 0, typed = 0, step = 0;
  const t0 = Date.now();
  const shot = async (name) => DIR && p.screenshot({ path: `${DIR}/journey-${++step}-${name}.png` });
  const out = [];
  const ok = (name, pass, detail = "") => out.push(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `   (${detail})` : ""}`);

  await p.goto(BASE + "/");
  await p.waitForTimeout(6000);
  await p.evaluate(() => document.getElementById("initiation").scrollIntoView());
  await p.waitForTimeout(1200);
  await p.click("[data-cta]"); clicks++;
  await p.waitForTimeout(600);
  await shot("home-menu");
  await p.click('#contact-options a[href="/book"]'); clicks++;
  await p.waitForURL(/\/book$/);
  await p.waitForTimeout(3500);
  await p.evaluate(() => document.querySelector("[data-booking]").scrollIntoView({ block: "center" }));
  await p.waitForTimeout(900);
  const week = await p.evaluate(() => [...document.querySelectorAll("[data-day]")].map((d) => `${d.dataset.day}:${d.dataset.off ? "off" : "open"}`).join(" "));
  ok("Book page shows the week with Thu, Sat, Sun unavailable", week === "Mon:open Tue:open Wed:open Thu:off Fri:open Sat:off Sun:off", week);
  await shot("book-page");
  await p.click("[data-booking] button"); clicks++;
  await p.waitForTimeout(1500);
  await p.evaluate(() => scrollBy(0, document.querySelector("[data-booking]").getBoundingClientRect().top - 110));
  await p.waitForTimeout(900);
  const cal = p.frameLocator("[data-booking] iframe");
  ok("Calendar opens inside the page (no new tab, no Gmail)", p.url().endsWith("/book") && (await p.locator("[data-booking] iframe").count()) === 1 && p.context().pages().length === 1);
  await shot("calendar");
  const noThu = await cal.locator(".wk > div:nth-child(4) button").count();
  ok("Thursday offers no times (as set in the calendar)", noThu === 0);
  await cal.locator(".wk > div:nth-child(1) button", { hasText: "10:00" }).click(); clicks++;
  await p.waitForTimeout(500);
  await cal.locator("#fn").fill("Demo"); typed++;
  await cal.locator("#ln").fill("Visitor"); typed++;
  await cal.locator("#em").fill("demo.visitor@example.com"); typed++;
  await shot("details");
  await cal.locator(".book").click(); clicks++;
  await p.waitForTimeout(500);
  const done = await cal.locator("#done").isVisible();
  ok("Booked: confirmation shown, still on the JIDO page", done && p.url().endsWith("/book") && p.context().pages().length === 1);
  await shot("booked");
  ok(`From the home page to booked: ${clicks} clicks + 3 short fields`, clicks <= 5, `${((Date.now() - t0) / 1000).toFixed(0)}s including page animations`);
  ok("No JavaScript errors", errors.length === 0, errors.join(" | "));

  // the cursor steps aside over the calendar, and comes back outside it
  const fr = await p.locator("[data-booking] iframe").boundingBox();
  await p.mouse.move(fr.x - 60, fr.y + 100, { steps: 4 });
  await p.waitForTimeout(400);
  const outside = await p.evaluate(() => +getComputedStyle(document.querySelector("[data-cursor-dot]")).opacity);
  await p.mouse.move(fr.x + 200, fr.y + 200, { steps: 6 });
  await p.waitForTimeout(500);
  const inside = await p.evaluate(() => +getComputedStyle(document.querySelector("[data-cursor-dot]")).opacity);
  await p.mouse.move(fr.x - 60, fr.y + 120, { steps: 6 });
  await p.waitForTimeout(500);
  const back = await p.evaluate(() => +getComputedStyle(document.querySelector("[data-cursor-dot]")).opacity);
  ok("JIDO cursor hides over the calendar (no frozen dot) and comes back outside", outside > 0.9 && inside < 0.05 && back > 0.9, `outside ${outside}, over calendar ${inside}, back ${back}`);

  await b.close();
  console.log(out.join("\n"));
  console.log(`\n${out.filter((l) => l.startsWith("PASS")).length}/${out.length} booking journey checks passed`);
})();
