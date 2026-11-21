// Booking is easy: a first-time client books a visit from the moment the site opens, on an iPhone
// and a laptop, by the shortest path, counting every tap and every box typed in. Also checks:
//   - phone: a way to book is on the very first screen (the menu's "Book a visit"); laptop: no Book button in the
//     header (John 2026-11-21), so the shortest path is a tap on a service row
//   - every route into booking works: the menu, tapping a service row, the "Book a visit" glide button under the
//     reviews (BP-18), and search (laptops: Ctrl K; the phone menu has no search box since BP-18); a service picked
//     on the way is already filled in
//   - everything tapped on the phone is at least 44 x 44 px (Apple's minimum)
//   - mistakes are explained right where they happen; a phone call is one tap away (the footer's number; John
//     2026-11-21 removed the "Rather talk?" link beside the form)
// Run: node tests/booking.cjs <site folder>
const { chromium, devices } = require('playwright');
let failed = 0;
const rec = (vp, name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${vp.padEnd(6)}  ${name.padEnd(44)}  ${detail}`); };
const nextWeekday = () => { const d = new Date(); d.setDate(d.getDate() + 2); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

(async () => {
  const b = await chromium.launch();
  for (const [vp, opts] of [['phone', { ...devices['iPhone 13'] }], ['laptop', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = async () => {
      const c = await b.newContext(opts); await c.route(/^https?:/, (r) => r.abort());
      await c.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
      return c;
    };
    const tap = (p, sel) => (vp === 'phone' ? p.tap(sel) : p.click(sel));

    // 1. the shortest path, counted
    {
      const c = await ctx(); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.goto('file://' + process.argv[2] + '/index.html'); await p.waitForTimeout(2600);
      let taps = 0, typed = 0, t0 = Date.now();
      if (vp === 'phone') {
        // the menu button is on the very first screen, and "Book a visit" is the first thing in it
        const firstScreen = await p.evaluate(() => { const r = document.getElementById('menuBtn').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0 && r.width > 0; });
        t0 = Date.now();
        await tap(p, '#menuBtn'); taps++; await p.waitForTimeout(600);
        const first = await p.$eval('#cmdList .cmd-item span', (e) => e.textContent.trim());
        rec(vp, 'a way to book on the very first screen', firstScreen && first === 'Book a visit', `menu button on screen: ${firstScreen}; its first item: "${first}"`);
        await tap(p, '#cmdList .cmd-item >> nth=0'); taps++; await p.waitForTimeout(900);
        await p.selectOption('select[name=service]', { index: 3 }); taps++;
      } else {
        // laptop: no Book button (John 2026-11-21): scroll to the menu, click a service (that also picks it)
        await p.evaluate(() => document.querySelector('#p0 li:nth-child(3)').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(300);
        t0 = Date.now();
        await p.click('#p0 li:nth-child(3)'); taps++; await p.waitForTimeout(900);
      }
      await p.evaluate((d) => { const i = document.querySelector('[name=date]'); i.value = d; i.dispatchEvent(new Event('change', { bubbles: true })); }, nextWeekday()); taps++;
      await tap(p, '.slot:not([disabled]) >> nth=1'); taps++;
      await p.fill('[name=name]', 'Maya'); typed++;
      await p.fill('[name=phone]', '7705550123'); typed++;
      const label = await p.textContent('#submitLabel');
      await tap(p, '#submitBtn'); taps++;
      await p.waitForSelector('#otp:visible', { timeout: 8000 });
      await p.fill('#otp', '123456'); typed++;   // on an iPhone the code fills itself in from the text (one tap on the keyboard)
      await p.waitForSelector('#confirmed:not([hidden])', { timeout: 8000 });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      const shown = await p.evaluate(() => { const r = document.querySelector('#confirmed h3').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
      rec(vp, 'book from the first screen', shown && taps <= 6 && typed <= 3 && !errs.length,
        `${taps} taps + ${typed} boxes typed (name, mobile, code) -> "Visit confirmed" on screen in ${secs} s of machine time; button said "${label.replace(/ /g, ' ')}"`);
      await c.close();
    }

    // 2. every route into booking lands on the form, with the service already chosen when one was picked
    {
      const c = await ctx(); const p = await c.newPage();
      const routes = [];
      const fresh = async () => { await p.goto('file://' + process.argv[2] + '/index.html'); await p.waitForTimeout(2400); };
      const atForm = () => p.evaluate(() => { const r = document.getElementById('bookForm').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
      const service = () => p.$eval('select[name=service]', (s) => s.value);
      // the menu's "Book a visit" (phone: the menu button; laptop: Ctrl K), replacing the hero and header Book buttons
      await fresh(); if (vp === 'phone') await tap(p, '#menuBtn'); else await p.keyboard.press('Control+k');
      await p.waitForTimeout(500); await tap(p, '#cmdList .cmd-item >> nth=0'); await p.waitForTimeout(1200);
      routes.push([`${vp === 'phone' ? 'menu' : 'Ctrl K'} "Book a visit"`, await atForm()]);
      // tap a service row (BP-17: replaces the Services menu)
      await fresh(); await p.$eval('#p0 li:nth-child(4)', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(400);
      const pick = await p.$eval('#p0 li:nth-child(4) h3', (x) => x.textContent.trim()); await tap(p, '#p0 li:nth-child(4)'); await p.waitForTimeout(1200);
      routes.push([`service row "${pick}"`, (await atForm()) && (await service()) === pick]);
      // the "Book a visit" glide button under the reviews (BP-18)
      await fresh(); await p.$eval('#reviews a.glide[href="#book"]', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(400);
      await tap(p, '#reviews a.glide[href="#book"]'); await p.waitForTimeout(2800);
      routes.push(['the "Book a visit" button under the reviews', await atForm()]);
      if (vp === 'laptop') {   // laptop: Ctrl K (no Search button, John 2026-11-21); the phone menu is a short list to tap, no search box (BP-18)
        await fresh(); await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
        await p.keyboard.type('keratin'); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForTimeout(1300);
        routes.push([`search "keratin" -> "${await service()}"`, (await atForm()) && /keratin/i.test(await service())]);
      }
      const all = routes.every((r) => r[1]);
      rec(vp, 'every route into booking works', all, routes.map((r) => `${r[0]} ${r[1] ? 'ok' : 'FAILED'}`).join('; '));
      await c.close();
    }

    // 3. thumb-sized targets (phone) and help where it is needed
    {
      const c = await ctx(); const p = await c.newPage();
      await p.goto('file://' + process.argv[2] + '/index.html#book'); await p.waitForTimeout(900);
      if (vp === 'phone') {
        const small = await p.evaluate(() => [...document.querySelectorAll('#bookForm button, #bookForm input, #bookForm select, #menuBtn')]
          .filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return [e.name || e.textContent.trim().slice(0, 14) || e.id, Math.round(r.width), Math.round(r.height)]; })
          .filter(([, w, h]) => w < 44 || h < 44));
        rec(vp, 'every booking control is thumb-sized', !small.length, small.length ? 'too small: ' + JSON.stringify(small) : 'all at least 44 x 44 px');
      }
      await tap(p, '#submitBtn'); await p.waitForTimeout(300);
      const errs = await p.evaluate(() => [...document.querySelectorAll('#bookForm .err')].map((e) => e.textContent).filter(Boolean));
      const sunday = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); const i = document.querySelector('[name=date]'); i.value = d.toISOString().slice(0, 10); i.dispatchEvent(new Event('change', { bubbles: true })); return document.getElementById('e-date').textContent; });
      rec(vp, 'mistakes explained where they happen', errs.length >= 3 && /Sunday/i.test(sunday), `empty form: ${errs.join(' / ')}; a Sunday: "${sunday}"`);
      const call = await p.$eval('footer.site a[href^="tel:"]', (a) => a.getAttribute('href') + ' ' + a.textContent.trim());
      rec(vp, 'a phone call is one tap away', call === 'tel:+17705570354 (770) 557-0354', `the footer's "(770) 557-0354" calls`);
      await c.close();
    }
  }
  await b.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nBooking is quick and clear on both screens');
  process.exit(failed ? 1 : 0);
})();
