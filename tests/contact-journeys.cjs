/**
 * Every way a visitor can reach out, clicked through like a person would.
 *   node tests/contact-journeys.cjs [baseUrl] [payloads.json]
 *
 * The contact form's request to n8n is intercepted (nothing leaves the browser), so this checks
 * what the website sends for each choice. The payloads are written to [payloads.json] so the
 * same requests can be replayed into the n8n workflow as live demo tests.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3];
const ENDPOINT = /jido-website-contact/;
const EMAIL = "john7000.nguyen@gmail.com";
const TOPICS = ["An AI receptionist", "Appointment booking", "Lead follow-up", "Invoicing", "CRM updates", "Review requests"];

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const wait = (p, ms) => p.waitForTimeout(ms);
const gmail = (href) => {
  const u = new URL(href);
  return { host: u.host, view: u.searchParams.get("view"), to: u.searchParams.get("to"), su: u.searchParams.get("su"), body: u.searchParams.get("body") || "" };
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const payloads = [];
  let reply = { status: 200, body: { ok: true } };
  await page.route(ENDPOINT, async (route) => {
    payloads.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const home = async () => {
    await page.goto(BASE + "/");
    await wait(page, payloads.length || results.length ? 2500 : 6000);
    await page.evaluate(() => document.getElementById("initiation").scrollIntoView());
    await wait(page, 1200);
  };
  const pickTopic = async (scope, topic, custom) => {
    const box = page.locator(`${scope} [data-combobox]`);
    await box.click();
    if (custom) await box.fill(topic);
    else await page.locator(`${scope} [role="option"]`, { hasText: topic }).click();
    await page.keyboard.press("Escape");
    return box.inputValue();
  };
  const fillAndSend = async (n, topic, business = true) => {
    const f = "[data-contact-form]";
    await page.fill(`${f} input[autocomplete="name"]`, `Demo Tester ${n}`);
    await page.fill(`${f} input[type="email"]`, "demo.visitor@example.com");
    if (business) await page.fill(`${f} input[autocomplete="organization"]`, "Demo Dental (fictional)");
    await page.fill(`${f} textarea`, `[DEMO TEST ${n}] Testing the JIDO website contact form. Topic: ${topic || "none picked"}. Please ignore.`);
    await page.click(`${f} button[type="submit"]`);
    await page.waitForSelector('[data-form-state="sent"]', { timeout: 5000 }).catch(() => {});
    return page.locator('[data-form-state="sent"]').count();
  };

  // 1-6: home page, pick each suggested task, "Start the conversation" -> "Send a message"
  let n = 1;
  for (const topic of TOPICS) {
    await home();
    const picked = await pickTopic("#initiation", topic);
    await page.click("#initiation button[aria-controls='contact-options']");
    await wait(page, 500);
    const menu = await page.evaluate(() => [...document.querySelectorAll("#contact-options a")].map((a) => a.href));
    const mail = gmail(menu[2]);
    check(`Home, "${topic}": Gmail option opens a new email to JIDO with the task in the subject`, mail.host === "mail.google.com" && mail.view === "cm" && mail.to === EMAIL && mail.su === `Hello JIDO: ${topic}`, `to ${mail.to}, subject "${mail.su}"`);
    await page.click("#contact-options a[href^='/contact']");
    await page.waitForURL(/\/contact\?topic=/);
    await wait(page, 1500);
    const prefilled = await page.locator("[data-contact-form] [data-combobox]").inputValue();
    const sent = await fillAndSend(String(n).padStart(2, "0"), topic);
    const p = payloads[payloads.length - 1] || {};
    check(`Home, "${topic}": message form arrives with the task filled in and sends it`, picked === topic && prefilled === topic && sent === 1 && p.topic === topic && p.page === "/contact" && p.website === "", `picked "${picked}", form shows "${prefilled}", sent topic "${p.topic}"`);
    n++;
  }

  // 7: a task typed in the visitor's own words
  await home();
  const custom = "Payroll reminders";
  await pickTopic("#initiation", custom, true);
  await page.click("#initiation button[aria-controls='contact-options']");
  await wait(page, 500);
  await page.click("#contact-options a[href^='/contact']");
  await page.waitForURL(/\/contact\?topic=/);
  await wait(page, 1500);
  const sent7 = await fillAndSend("07", custom);
  check(`Home, own words ("${custom}"): sent with that topic`, sent7 === 1 && payloads.at(-1)?.topic === custom, payloads.at(-1)?.topic);

  // 8: no task picked at all
  await home();
  await page.click("#initiation button[aria-controls='contact-options']");
  await wait(page, 500);
  const plain = gmail(await page.locator("#contact-options a").nth(2).getAttribute("href"));
  await page.click("#contact-options a[href='/contact']");
  await page.waitForURL(/\/contact$/);
  await wait(page, 1500);
  const sent8 = await fillAndSend("08", "", false);
  check("Home, no task picked: sends with an empty topic (arrives as General)", sent8 === 1 && payloads.at(-1)?.topic === "" && payloads.at(-1)?.business === "", JSON.stringify({ topic: payloads.at(-1)?.topic }));
  check("Home, no task picked: Gmail option still opens a new email to JIDO", plain.to === EMAIL && plain.su === "Hello JIDO", `subject "${plain.su}"`);

  // 9: straight to the Contact page (top bar link), task picked inside the form
  await page.goto(BASE + "/contact");
  await wait(page, 2500);
  const picked9 = await pickTopic("[data-contact-form]", "Review requests");
  const sent9 = await fillAndSend("09", picked9);
  check("Contact page directly, task picked in the form: sent", sent9 === 1 && payloads.at(-1)?.topic === "Review requests", payloads.at(-1)?.topic);

  // 10: n8n says a field is wrong -> the visitor sees the message on that field, nothing lost
  reply = { status: 422, body: { ok: false, errors: { email: "Please enter a valid email address." } } };
  await page.goto(BASE + "/contact");
  await wait(page, 2500);
  await fillAndSend("10", "");
  const fieldErr = await page.evaluate(() => ({ invalid: document.querySelector('[data-contact-form] input[type="email"]').getAttribute("aria-invalid"), text: document.body.innerText.includes("Please enter a valid email address.") }));
  check("Server says a field is wrong: the field is marked and explained", fieldErr.invalid === "true" && fieldErr.text, JSON.stringify(fieldErr));

  // 11: n8n cannot send (502) or is unreachable -> Gmail draft with everything typed
  for (const [label, r] of [["sending failed (502)", { status: 502, body: { ok: false, error: "send_failed" } }], ["service unreachable", null]]) {
    if (r) reply = r;
    else await page.route(ENDPOINT, (route) => route.abort());
    await page.goto(BASE + "/contact?topic=Invoicing");
    await wait(page, 2500);
    await fillAndSend("11", "Invoicing");
    await page.waitForSelector('[data-form-state="failed"]', { timeout: 5000 }).catch(() => {});
    const fb = await page.locator('[data-form-state="failed"] a').getAttribute("href").catch(() => null);
    const m = fb ? gmail(fb) : {};
    check(`Fallback when ${label}: a Gmail draft with the topic, message, name and email`, m.to === EMAIL && m.su === "Hello JIDO: Invoicing" && m.body.includes("[DEMO TEST 11]") && m.body.includes("Demo Tester 11") && m.body.includes("demo.visitor@example.com"), fb ? `subject "${m.su}"` : "no fallback shown");
  }
  await page.unroute(ENDPOINT);

  // 12: Book a discovery call (no booking link yet) -> Gmail call request
  await page.goto(BASE + "/book");
  await wait(page, 2500);
  const book = await page.evaluate(() => ({ mode: document.querySelector("[data-booking]")?.dataset.booking, href: document.querySelector('[data-booking] a[href*="mail.google.com"]')?.href }));
  const bm = book.href ? gmail(book.href) : {};
  check("Book a discovery call: opens a Gmail call request to JIDO", book.mode === "request" && bm.to === EMAIL && /call/i.test(bm.su), `subject "${bm.su}"`);

  // 13: every plain email link on the site goes to Gmail compose for the same address (never mailto/Outlook)
  const emailLinks = [];
  for (const path of ["/", "/contact", "/services", "/pricing", "/book", "/privacy"]) {
    await page.goto(BASE + path);
    await wait(page, 1500);
    emailLinks.push(...(await page.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.href).filter((h) => /mailto:|mail\.google|outlook/.test(h)))));
  }
  check("Every email link uses Gmail compose to the JIDO address (no mailto, no Outlook)", emailLinks.length > 0 && emailLinks.every((h) => h.startsWith("https://mail.google.com/") && gmail(h).to === EMAIL), `${emailLinks.length} links checked`);
  check("No JavaScript errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(payloads.slice(0, 9), null, 2));
  const pass = results.filter((r) => r.ok).length;
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `   (${r.detail})` : ""}`);
  console.log(`\n${pass}/${results.length} contact journeys passed against ${BASE}`);
  process.exit(pass === results.length ? 0 : 1);
})();
