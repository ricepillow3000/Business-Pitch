// BP-17: the final clean-up. One line per change, PASS or FAIL.
// John's words this round: "make sure there's nothing wrong with it ... no design flaws, no hallucinated designs ...
// remove [boring, bloated parts] ... replace those bad elements with elements that complement the site ... better,
// simple, and pretty with glamour." And: "limit the amount of choices users have to make ... I don't want this website
// to be a thinking ground. I want it to captivate, hook users, and reel them into her shop."
// So: fewer words, fewer buttons, nothing made up, one tap to call, tap a service to book it.
// Run: node tests/final.cjs <site folder> <preview folder>
// (the preview folder is the shareable copy that build_preview.py makes from the site)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const site = process.argv[2], preview = process.argv[3];
let failed = 0;
const rec = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(52)}  ${detail}`); };
const read = (dir, f) => { try { return fs.readFileSync(dir + '/' + f, 'utf8'); } catch (e) { return ''; } };
const phone = { ...devices['iPhone 13'] }, laptop = { viewport: { width: 1280, height: 800 } };
const small = { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + 2); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

(async () => {
  const b = await chromium.launch();
  const open = async (opts, { dir = site, page = 'index.html', look, perms } = {}) => {
    const c = await b.newContext({ ...opts, ...(perms ? { permissions: perms } : {}) }); await c.route(/^https?:/, (r) => (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(r.request().url()) ? r.continue() : r.abort()));   // her fonts load, nothing else leaves
    await c.addInitScript((l) => { try { sessionStorage.setItem('ria-entered', '1'); if (l) localStorage.setItem(l[0], l[1]); } catch (e) {} }, look || null);
    const p = await c.newPage(); p._errs = []; p.on('pageerror', (e) => p._errs.push(e.message));
    await p.goto('file://' + dir + '/' + page); await p.waitForTimeout(page === 'index.html' ? 1800 : 400);
    if (page === 'index.html') await p.evaluate(() => window.__story && window.__story.revealAll());
    return { c, p };
  };
  // each check runs on its own: one that breaks is a FAIL, never the end of the run
  const check = async (name, fn) => { try { const [ok, detail] = await fn(); rec(name, ok, detail); } catch (e) { rec(name, false, 'ERROR ' + e.message.split('\n')[0].slice(0, 120)); } };
  const html = read(site, 'index.html'), css = read(site, 'styles.css'), js = read(site, 'app.js');
  const text = (p, s) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, s);

  console.log('-- 1. the preview copy (build_preview.py)');
  await check('A12 preview has the share picture and phone icon', async () => {
    const f = ['og-image.png', 'apple-touch-icon.png'].map((n) => [n, fs.existsSync(preview + '/' + n)]);
    return [f.every((x) => x[1]), f.map(([n, ok]) => `${n} ${ok ? 'there' : 'MISSING'}`).join(', ')];
  });
  // B8 joined the consent line's two sentences; "say it once" (John 2026-11-21) then took the preview words out of it
  await check('B8 preview consent line: no break, preview said in the footer only', async () => {
    const h = read(preview, 'index.html');
    return [h.includes('Reply STOP to opt out. <a href="privacy.html">Privacy</a></p>') && !h.includes('Privacy</a><br>'), h.includes('Privacy</a><br>') ? 'still a line break' : h.includes('Privacy</a>. Design preview:') ? 'still says Design preview' : 'ends at Privacy'];
  });
  await check('A5 preview: no floating note; footer still says preview', async () => {
    const { c, p } = await open(phone, { dir: preview });
    const r = await p.evaluate(() => ({ note: !!document.getElementById('previewNote'), style: [...document.querySelectorAll('style')].some((s) => /preview-note/.test(s.textContent)),
      foot: /Design preview, not the salon's live site/.test(document.querySelector('footer.site').textContent), consent: !/Design preview/.test(document.querySelector('.consent').textContent) }));
    await c.close();
    return [!r.note && !r.style && r.foot && r.consent, `note ${r.note ? 'SHOWN' : 'gone'}, its styles ${r.style ? 'LEFT' : 'gone'}, footer line ${r.foot ? 'kept' : 'MISSING'}, consent line ${r.consent ? 'says it no more (once is enough)' : 'STILL SAYS IT'}`];
  });
  await check('A1 Location: details beside the map on laptops, map under on phones', async () => {
    const out = [];
    for (const [dir, label] of [[site, 'site'], [preview, 'preview']]) {
      for (const w of [1280, 1440]) for (const look of ['light', 'dark']) {
        const { c, p } = await open({ viewport: { width: w, height: 900 } }, { dir, look: ['ria-look', look] });
        const r = await p.evaluate(() => { const L = document.querySelector('.visit .info').getBoundingClientRect(), M = document.querySelector('.map-frame').getBoundingClientRect();
          return { side: M.left >= L.right && M.width > 200 && M.top < L.bottom && M.bottom > L.top }; });
        out.push([`${label} ${w} ${look}`, r.side]); await c.close();
      }
      const { c, p } = await open(phone, { dir });
      const ph = await p.evaluate(() => { const L = document.querySelector('.visit .info').getBoundingClientRect(), M = document.querySelector('.map-frame').getBoundingClientRect();
        return { under: M.top >= L.bottom && M.width >= innerWidth - 41, side: document.documentElement.scrollWidth - innerWidth }; });
      out.push([`${label} phone`, ph.under && ph.side <= 0]); await c.close();
    }
    return [out.every((x) => x[1]), out.filter((x) => !x[1]).map((x) => x[0] + ' WRONG').join('; ') || 'laptops (1280, 1440, both modes): map beside the details, no empty column; phones: map under the details, full width'];
  });

  console.log('-- 2. the Privacy and Terms pages');
  await check('A3 legal pages follow the site\'s Light/Dark choice', async () => {
    const r = [];
    for (const [label, opts, look, want] of [['Dark chosen', laptop, ['ria-look', 'dark'], 'dark'], ['phone in Dark Mode, nothing chosen', { ...phone, colorScheme: 'dark' }, null, 'light'], ['old saved key', { ...phone, colorScheme: 'dark' }, ['ria-theme', 'dark'], 'light']])
      for (const pg of ['privacy.html', 'terms.html']) {
        const { c, p } = await open(opts, { page: pg, look });
        const t = await p.evaluate(() => document.documentElement.dataset.theme); await c.close();
        r.push([`${pg.split('.')[0]} ${label}: ${t}`, t === want]);
      }
    return [r.every((x) => x[1]), r.filter((x) => !x[1]).map((x) => x[0]).join('; ') || 'Dark when Dark is chosen; otherwise Light, whatever the phone is set to'];
  });
  await check('A6 legal footer: a dot between address and phone', async () => {
    const f = ['privacy.html', 'terms.html'].map((pg) => read(site, pg).includes('Lilburn, GA 30047</span> · <span class="num">'));
    return [f.every(Boolean), f.map((x, i) => `${['privacy', 'terms'][i]} ${x ? 'ok' : 'MISSING'}`).join(', ')];
  });
  await check('Privacy wording matches the site as it is', async () => {
    const h = read(site, 'privacy.html');
    const want = ['To confirm your visit by text.', 'the service, and the day and time you prefer.</p>', 'Light or Dark mode choice', 'Directions and maps come from Google, which has its own privacy policy.'];
    const gone = ['reminder the day before', 'any notes you choose to add', 'day or evening setting', 'The map on the page'];
    const miss = want.filter((s) => !h.includes(s)), left = gone.filter((s) => h.includes(s));
    return [!miss.length && !left.length, (miss.length ? 'missing: ' + miss.join(' / ') + '. ' : '') + (left.length ? 'still says: ' + left.join(' / ') : miss.length ? '' : 'all four lines updated')];
  });
  await check('Terms wording: call the salon; prices are samples', async () => {
    const h = read(site, 'terms.html');
    const ok = h.includes('<p>Plans change. Call the salon as early') && !h.includes('reminder text')
      && h.includes('<p>Some prices on the site are samples until Ria sets them. Length, thickness and the products used can change the final price.</p>')
      && h.includes('If you would like Ria specifically, call ahead.');
    return [ok, ok ? 'updated, "If you would like Ria specifically, call ahead." kept' : 'not updated'];
  });

  console.log('-- 3. words on the home page');
  {
    const { c, p } = await open(laptop);
    await check('B1 hero line is short', async () => { const t = await text(p, '.hero .lede'); return [t === 'A full service salon. Walk-ins welcome.' && /<span class="nowrap">Walk-ins<\/span> welcome\./.test(html), `"${t}"`]; });
    await check('B2 Meet Ria: one plain line, no photo caption', async () => {
      const t = await text(p, '.about .lede'), cap = await p.$('.about figcaption');
      return [t === "The owner and stylist behind Ria's Creations." && !cap, `"${t}"; caption ${cap ? 'STILL THERE' : 'gone'}`];
    });
    // B3 (John 2026-11-21: remove the Services line; "walk in" is said once, in the hero)
    await check('B3 Services: heading only; "walk" once on the page', async () => {
      const r = await p.evaluate(() => { document.querySelectorAll('span[style*="clip"]').forEach((e) => (e.style.display = 'none'));
        return { lede: document.querySelectorAll('#services .lede, .svc-head p').length, walk: (document.querySelector('main').innerText.match(/walk/gi) || []).length,
          gap: Math.round(document.querySelector('.tabs').getBoundingClientRect().top - document.querySelector('.svc-head h2').getBoundingClientRect().bottom) }; });
      return [r.lede === 0 && r.walk === 1 && r.gap >= 24 && r.gap <= 64, `${r.lede} lines under the heading; "walk" ${r.walk} time(s); heading to tabs ${r.gap}px`];
    });
    await check('B6 gallery: names only, no second line', async () => {
      const n = await p.$$eval('#rail figcaption span', (e) => e.length), ig = await p.$$eval('#work a[href*="instagram"]', (e) => e.length);
      return [n === 0 && ig === 0 && !/\.rail figcaption span/.test(css), `${n} small lines, ${ig} Instagram links, CSS rule ${/\.rail figcaption span/.test(css) ? 'LEFT' : 'gone'}`];
    });
    await check('B10/A9 address: landmark first, no plate under map', async () => {
      const t = await p.$eval('.info dd', (e) => e.innerHTML), plate = await p.$('.map-plate');
      return [t === 'Lilburn Corner, Suite&nbsp;156<br>375 Rockbridge Rd&nbsp;NW, Lilburn, GA&nbsp;30047' && !plate && !/\.map-plate/.test(css), `"${t.replace(/&nbsp;/g, ' ').replace('<br>', ' / ')}"; plate ${plate ? 'STILL THERE' : 'gone'}`];
    });
    await check('Location: no "free parking" plate (John: "remove the free parking thing")', async () => {
      const out = [];
      for (const [dir, label] of [[site, 'site'], [preview, 'preview']]) {
        const h = read(dir, 'index.html'), v = h.slice(h.indexOf('<section class="visit"'), h.indexOf('</section>', h.indexOf('<section class="visit"')));
        const row = /<dt>Parking<\/dt><dd>Free, right outside<\/dd>/.test(v);
        out.push([`${label}: "free parking" ${/free parking/i.test(v) ? 'STILL THERE' : 'gone'}, Parking row ${row ? 'kept' : 'MISSING'}`, v.length > 0 && !/free parking/i.test(v) && row]);
      }
      return [out.every((x) => x[1]), out.map((x) => x[0]).join('; ')];
    });
    await check('B11 hours in short words', async () => {
      const t = await p.$eval('.info div:nth-child(2) dd', (e) => e.innerText.replace(/\n/g, ' / '));
      return [/^Mon to Sat, 10:30 AM to 7:30 PM \/ Sunday closed \/ (Open|Opens|Closed)/.test(t), `"${t}"`];
    });
    await check('Hero photo described as it is', async () => { const a = await p.getAttribute('#heroImg', 'alt'); return [a === "Inside Ria's Creations Salon: lit arched mirrors and black styling chairs", `"${a}"`]; });
    await check('A7 no "Special" or "Holiday" tags', async () => {
      const n = await p.$$eval('.menu .tag', (e) => e.length);
      return [n === 0 && !/\.tag\s*\{/.test(css), `${n} tags, .tag CSS ${/\.tag\s*\{/.test(css) ? 'LEFT' : 'gone'}`];
    });
    // styled by the old reviews-note rule (that note left with "say it once"): small, muted, no new style
    await check('Sample line under the menu, the small muted note style', async () => {
      const r = await p.evaluate(() => { const n = document.querySelector('#panels + .svc-note'); if (!n) return null;
        const t = document.createElement('i'); t.style.color = 'var(--muted)'; document.body.append(t); const muted = getComputedStyle(t).color; t.remove();
        const a = getComputedStyle(n); return { t: n.textContent, same: a.fontSize === '14.72px' && a.color === muted && a.marginTop === '6px' }; });
      return [!!r && r.t === 'Some prices are samples for Ria to set.' && r.same && /\.svc-note \{ margin-top: 6px; font-size: \.92rem; color: var\(--muted\); \}/.test(css), r ? `"${r.t}", ${r.same ? 'small muted note' : 'DIFFERENT look'}` : 'MISSING'];
    });
    await c.close();
  }

  // John 2026-11-21: "remove any repeated info, once is stated once do not repeat it once again"
  await check('Say it once: each fact once on the page', async () => {
    const facts = [['rating 4.5', /\b4\.5\b/g], ['phone number', /557-0354/g], ['weekly hours', /10:30 AM to 7:30 PM/g], ['Sunday closed', /Sunday closed/gi],
      ['street address', /Rockbridge/g], ['Lilburn Corner', /Lilburn Corner/g], ['Suite 156', /Suite\s156/g], ['walk-ins', /walk[- ]?ins?\b/gi],
      ['free parking', /\bfree\b/gi], ['open-now line', /Open now until|Opens today at|Closed (now|today)\. Opens/g], ['Design preview', /Design preview/g]];
    const out = [];
    for (const [dir, label] of [[site, 'site'], [preview, 'preview']]) {
      const { c, p } = await open(laptop, { dir });
      const t = await p.evaluate(() => {
        // not page text: the hidden screen-reader copy of the headline, the booking form's closed list of services,
        // and the address printed under the live Google map (it shows only if the map cannot load)
        document.querySelectorAll('span[style*="clip"], select, .map-fallback').forEach((e) => (e.style.display = 'none'));
        return document.querySelector('main').innerText;
      });
      await c.close();
      const bad = facts.map(([n, re]) => [n, (t.match(re) || []).length]).filter(([n, k]) => k !== (n === 'Design preview' && label === 'site' ? 0 : 1));
      const svc = /cut|colou?r|keratin|thread|lash|facial/i.test(t.split('\n').find((l) => /full service salon/i.test(l)) || '');
      out.push([`${label}: ${bad.length ? bad.map(([n, k]) => `${n} x${k}`).join(', ') : 'every fact once'}${svc ? ', hero line lists services' : ''}`, !bad.length && !svc]);
    }
    return [out.every((x) => x[1]), out.map((x) => x[0]).join('; ')];
  });

  console.log('-- 4. the menu rows');
  await check('B5 short rows: name and price on one line, no times', async () => {
    const plain = ['Long layers and face framing', 'Curly haircut', "Men's haircut", 'Beard trim', "Kids' haircut", 'Wash and blow-dry', 'Hair color', 'Highlights', 'Express facial', 'Eyebrow threading', 'Eyebrow tint or wax', 'Upper lip', 'Full-body wax', 'Underarm wax'];
    const bad = [];
    for (const [n, o] of [['390', phone], ['320', small], ['1280', laptop]]) {
      const { c, p } = await open(o);
      const r = await p.evaluate((plain) => {
        document.querySelectorAll('.menu').forEach((m) => (m.hidden = false));
        const out = { withP: [], trims: {}, layout: [] };
        document.querySelectorAll('.menu li').forEach((li) => {
          const h = li.querySelector('h3'), name = h.textContent.trim(), pr = li.querySelector('.price'), ps = li.querySelector('p');
          if (plain.includes(name) && ps) out.withP.push(name);
          if (ps) out.trims[name] = ps.textContent.trim();
          const rg = document.createRange(); rg.selectNodeContents(h); const line = rg.getClientRects()[0];
          const H = h.getBoundingClientRect(), P = pr.getBoundingClientRect(), lh = parseFloat(getComputedStyle(h).lineHeight);
          const oneLine = P.top >= H.top - 4 && P.top < line.bottom - 8 && !li.querySelector('.dur');   // the price starts on the name's first line; no time
          const order = H.right <= P.left + 1 && P.right <= li.getBoundingClientRect().right + 1;
          const noWrap = P.height < 30 && H.height <= lh * 2 + 2;
          const under = !ps || ps.getBoundingClientRect().top >= H.bottom - 1;
          if (!(oneLine && order && noWrap && under)) out.layout.push(`${name} (${[!oneLine && 'not one line', !order && 'order', !noWrap && 'wraps', !under && 'note not under'].filter(Boolean).join(', ')})`);
        });
        return out;
      }, plain);
      if (r.withP.length) bad.push(`${n}: still described: ${r.withP.join(', ')}`);
      if (r.layout.length) bad.push(`${n}: ${r.layout.join('; ')}`);
      if (n === '390') {
        if (r.trims['Chemical treatments'] !== 'Priced at a consultation.') bad.push(`Chemical treatments says "${r.trims['Chemical treatments']}"`);
        if (r.trims['Eyelash extensions'] !== 'Price depends on the set.') bad.push(`Eyelash extensions says "${r.trims['Eyelash extensions']}"`);
      }
      await c.close();
    }
    return [!bad.length, bad.join(' | ').slice(0, 400) || '14 rows trimmed, 2 shortened; every row reads name, price at 390, 320 and 1280, no times'];
  });

  await check('No service times: menu, search, booking', async () => {
    const re = /\b\d+\s*(min|hr)\b/i;
    const { c, p } = await open(laptop);
    const menu = await p.evaluate(() => { document.querySelectorAll('.menu').forEach((m) => (m.hidden = false)); return document.getElementById('services').innerText; });
    const found = [];
    await p.keyboard.press('Control+k'); await p.waitForTimeout(400);
    for (const q of ['', 'haircut', 'color', 'treatment', 'brow', 'lash', 'wax', 'facial', 'hair']) {
      await p.fill('#cmdInput', q); await p.waitForTimeout(120);
      found.push(...(await p.$$eval('#cmdList .cmd-item', (e) => e.map((x) => x.textContent.trim()))).filter((t) => re.test(t)));
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await p.selectOption('select[name=service]', 'Balayage');
    const label = await p.textContent('#submitLabel'); await c.close();
    const svcT = (menu.match(new RegExp(re.source, 'gi')) || []);
    return [!svcT.length && !found.length && !re.test(label) && !/\.dur\b|svcMin/.test(css + js) && !/class="dur/.test(html),
      `menu: ${svcT.length ? svcT.join(', ') : 'no times'}; search: ${found.length ? found.join(' | ') : 'no times'}; booking button: "${label.replace(/\s/g, ' ')}"`];
  });

  console.log('-- 5. booking');
  await check('C1 no Notes box; Enter on the name goes to mobile', async () => {
    const { c, p } = await open(phone);
    const r = await p.evaluate(() => ({ notes: !!document.querySelector('[name=notes]'), hint: document.querySelector('[name=phone]').getAttribute('enterkeyhint') }));
    await p.focus('[name=name]'); await p.keyboard.press('Enter');
    const f = await p.evaluate(() => document.activeElement.name); await c.close();
    return [!r.notes && r.hint === 'send' && f === 'phone' && !/notes/.test(js), `notes box ${r.notes ? 'STILL THERE' : 'gone'}, mobile key says "${r.hint}", Enter on name -> ${f}`];
  });
  await check('Demo words: plain "We texted", no reference line', async () => {
    const { c, p } = await open(laptop);
    await p.evaluate(() => document.getElementById('book').scrollIntoView()); await p.waitForTimeout(400);
    await p.selectOption('select[name=service]', "Men's haircut");
    await p.evaluate((d) => { const i = document.querySelector('[name=date]'); i.value = d; i.dispatchEvent(new Event('change', { bubbles: true })); }, nextMonday());
    await p.click('.slot:not([disabled]) >> nth=1'); await p.fill('[name=name]', 'Maya'); await p.fill('[name=phone]', '7705550123');
    await p.click('#submitBtn'); await p.waitForSelector('#otpBox:not([hidden])', { timeout: 8000 });
    const s = await text(p, '#sentStatus');
    await p.fill('#otp', '123456'); await p.waitForSelector('#confirmed:not([hidden])', { timeout: 8000 });
    const t = await text(p, '#confirmedText'), ref = await p.$('#confirmedRef'); await c.close();
    return [/^We texted a 6-digit code to/.test(s) && !/reminder/.test(t) && !ref, `"${s}" / "${t}" / reference line ${ref ? 'STILL THERE' : 'gone'}`];
  });
  // John 2026-11-21: "remove the rather talk call the salon link too"
  await check('Booking section: no call link (the number lives in the footer)', async () => {
    const { c, p } = await open(phone);
    const r = await p.evaluate(() => ({ tel: document.querySelectorAll('#book a[href^="tel:"]').length, rather: /Rather talk/i.test(document.getElementById('book').innerText),
      foot: [...document.querySelectorAll('main a[href^="tel:"]')].map((a) => (a.closest('footer') ? 'footer' : (a.closest('section') || {}).id)) }));
    await c.close();
    return [!r.tel && !r.rather && r.foot.join() === 'footer' && !/book-call/.test(css + html), `${r.tel} call links in Booking; call links on the page: ${r.foot.join(', ') || 'none'}`];
  });
  await check('B9 booking form is one flat card (no mat)', async () => {
    const { c, p } = await open(laptop);
    const r = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.book .shell')), k = getComputedStyle(document.querySelector('.book .card'));
      return { bg: s.backgroundColor, pad: s.paddingTop, sh: s.boxShadow, card: k.boxShadow }; });
    await c.close();
    return [r.bg === 'rgba(0, 0, 0, 0)' && r.pad === '0px' && r.sh === 'none' && /0px 0px 0px 1px/.test(r.card), `around the card: background ${r.bg}, padding ${r.pad}, shadow ${r.sh}; card: ${r.card}`];
  });

  console.log('-- 6. fewer choices');
  await check('C2 tap a service row to book it', async () => {
    const { c, p } = await open(phone);
    await p.evaluate(() => document.getElementById('services').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(500);
    const a = await p.evaluate(() => { const li = document.querySelector('#p0 li:nth-child(4)'), s = getComputedStyle(li); return { role: li.getAttribute('role'), tab: li.tabIndex, cur: s.cursor, tap: s.webkitTapHighlightColor, touch: s.touchAction }; });
    // a scroll that starts on a row is a scroll, not a booking
    const box = await (await p.$('#p0 li:nth-child(2)')).boundingBox(), y0 = await p.evaluate(() => scrollY);
    const cdp = await c.newCDPSession(p);
    const x = Math.round(box.x + 40), y = Math.round(box.y + 10);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 20 }] }); await p.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(900);
    const scrolled = (await p.evaluate(() => scrollY)) - y0, afterScroll = await p.$eval('select[name=service]', (s) => s.value);
    await p.tap('#p0 li:nth-child(4)'); await p.waitForTimeout(1300);
    const tapped = await p.evaluate(() => { const r = document.getElementById('bookForm').getBoundingClientRect(); return { v: document.querySelector('select[name=service]').value, at: r.top < innerHeight && r.bottom > 0 }; });
    await c.close();
    const lc = await open(laptop);
    await lc.p.evaluate(() => document.getElementById('services').scrollIntoView({ behavior: 'instant' })); await lc.p.waitForTimeout(400);
    await lc.p.hover('#p0 li:nth-child(2)'); await lc.p.waitForTimeout(250);
    const hov = await lc.p.evaluate(() => { const t = document.createElement('i'); t.style.color = 'var(--accent)'; document.body.append(t); const want = getComputedStyle(t).color; t.remove();
      return getComputedStyle(document.querySelector('#p0 li:nth-child(2) h3')).color === want; });
    await lc.p.focus('#p0 li:nth-child(3)'); await lc.p.keyboard.press('Enter'); await lc.p.waitForTimeout(1000);
    const key = await lc.p.$eval('select[name=service]', (s) => s.value);
    await lc.p.evaluate(() => document.getElementById('services').scrollIntoView({ behavior: 'instant' })); await lc.p.waitForTimeout(300);
    await lc.p.focus('#p0 li:nth-child(5)'); await lc.p.keyboard.press(' '); await lc.p.waitForTimeout(1000);
    const space = await lc.p.$eval('select[name=service]', (s) => s.value);
    await lc.c.close();
    const ok = a.role === 'button' && a.tab === 0 && a.cur === 'pointer' && a.touch === 'manipulation' && /rgba\(0, 0, 0, 0\)|transparent/.test(a.tap)
      && scrolled !== 0 && afterScroll === '' && tapped.v === "Men's haircut" && tapped.at && key === 'Curly haircut' && space === 'Beard trim' && hov;
    return [ok, `role ${a.role}, tabindex ${a.tab}, cursor ${a.cur}, touch ${a.touch}; a ${scrolled}px scroll booked "${afterScroll}"; tap -> "${tapped.v}", form in view ${tapped.at}; Enter -> "${key}"; Space -> "${space}"; name turns gold on hover ${hov}`];
  });
  await check('C6 phone menu: 7 choices, Dark mode under Gallery', async () => {
    const { c, p } = await open(phone);
    await p.tap('#menuBtn'); await p.waitForTimeout(600);
    const items = await p.$$eval('#cmdList .cmd-item span', (e) => e.map((x) => x.textContent.trim())); await c.close();
    const want = ['Book a visit', 'Call the salon', 'Services and prices', 'Gallery', 'Dark mode', 'Meet Ria', 'Hours and directions'];
    return [items.join('|') === want.join('|'), items.join(' | ')];
  });
  await check('A11 search: weekdays find hours, "cancel" finds call', async () => {
    const { c, p } = await open(laptop);
    await p.keyboard.press('Control+k'); await p.waitForTimeout(400);
    const want = [['saturday', 'Hours and directions'], ['monday', 'Hours and directions'], ['weekend', 'Hours and directions'], ['cancel', 'Call the salon'], ['change', 'Call the salon'],
      ['reschedule', 'Call the salon'], ['reviews', 'Reviews'], ['copy', 'Copy address'], ['get directions', 'Get directions']];
    const bad = [];
    for (const [q, w] of want) { await p.fill('#cmdInput', q); await p.waitForTimeout(120); const f = await p.evaluate(() => document.querySelector('#cmdList .cmd-item span')?.textContent.trim() || null); if (f !== w) bad.push(`"${q}" -> ${f}`); }
    await c.close();
    return [!bad.length, bad.join('; ') || `all ${want.length} searches put the right item first (the hidden ones still turn up when searched)`];
  });
  await check('A2 200% text: menu, headline and footer logo fit', async () => {
    const out = [];
    for (const [n, o] of [['390', phone], ['320', small]]) {
      const { c, p } = await open(o);
      const normal = await p.evaluate(() => ({ h1: getComputedStyle(document.querySelector('.hero h1')).fontSize, logo: getComputedStyle(document.querySelector('#nav .logo')).fontSize, foot: getComputedStyle(document.querySelector('footer.site .logo')).fontSize }));
      await p.evaluate(() => (document.documentElement.style.fontSize = '200%')); await p.waitForTimeout(400);
      await p.evaluate(() => scrollTo(0, document.querySelector('.hero').offsetHeight + 20)); await p.waitForTimeout(400);
      const r = await p.evaluate(() => { const g = (s) => document.querySelector(s).getBoundingClientRect(); const word = [...document.querySelectorAll('.hero h1 em')].find((e) => !e.closest('span[style*="clip"]'));   // not the hidden screen-reader copy
        const chars = [...word.querySelectorAll('[data-char]')].map((e) => e.getBoundingClientRect()).concat(word.querySelector('[data-char]') ? [] : [word.getBoundingClientRect()]);   // each letter, once split
        const em = { right: Math.max(...chars.map((r) => r.right)), line: Math.max(...chars.map((r) => r.top)) - Math.min(...chars.map((r) => r.top)) < 2 }; const m = g('#menuBtn'), h1 = g('.hero h1'), fl = g('footer.site .logo'), fw = g('footer.site .wrap');
        return { menu: m.right <= innerWidth && m.left >= 0, em: em.line && em.right <= h1.right + 0.5 && h1.right <= innerWidth, foot: fl.right <= fw.right + 0.5 && fl.right <= innerWidth, mr: Math.round(m.right), emr: Math.round(em.right), fr: Math.round(fl.right), w: innerWidth }; });
      await c.close();
      const same = n === '320' ? normal.h1 === '48px' : true;
      out.push([n, r.menu && r.em && r.foot && same, `${n}: menu right ${r.mr}, "beautifully" ${r.em ? 'on one line' : 'BROKEN or cut'} (right ${r.emr}), footer logo right ${r.fr} of ${r.w}; at 100% h1 ${normal.h1}, logo ${normal.logo}, footer logo ${normal.foot}`]);
    }
    return [out.every((x) => x[1]), out.map((x) => x[2]).join(' | ')];
  });
  await check('C5 header: no Services link (John: "remove the services button")', async () => {
    const { c, p } = await open(laptop);
    await p.evaluate(() => scrollTo(0, document.querySelector('.hero').offsetHeight + 20)); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ svc: document.querySelectorAll('#nav a[href="#services"]').length, menu: !!document.getElementById('svcMenu') || !!document.getElementById('svcTrigger'),
      row: [...document.querySelectorAll('#nav .nav-links > *, #nav .nav-right > a, #nav .nav-right > button')].filter((e) => e.offsetParent).map((e) => e.textContent.trim().replace(/\s+/g, ' ')),
      section: !!document.getElementById('services') }));
    await c.close();
    const want = 'Stylist|Gallery|Location|Dark mode';
    return [r.svc === 0 && !r.menu && r.row.join('|') === want && r.section && !/\.mega/.test(css) && !/megaCats|svcTrigger/.test(js),
      `Services links in the header: ${r.svc}; laptop row: ${r.row.join(', ')}; Services and prices section ${r.section ? 'kept' : 'MISSING'}`];
  });
  await check('C4 laptop header: no Search button; Ctrl K still searches', async () => {
    const { c, p } = await open(laptop);
    const btn = await p.evaluate(() => [...document.querySelectorAll('#nav button, #nav a')].filter((e) => e.offsetParent && /search/i.test(e.textContent + ' ' + (e.getAttribute('aria-label') || ''))).length + (document.getElementById('searchBtn') ? 1 : 0));
    await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
    const k = await p.evaluate(() => ({ open: document.getElementById('cmd').open, on: document.activeElement.id }));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await p.keyboard.press('/'); await p.waitForTimeout(500);
    const slash = await p.evaluate(() => document.getElementById('cmd').open && document.activeElement.id === 'cmdInput');
    await c.close();
    return [btn === 0 && k.open && k.on === 'cmdInput' && slash && !/search-btn|searchBtn/.test(css + js + html),
      `${btn} Search buttons in the header; Ctrl K: search ${k.open ? 'open' : 'NOT OPEN'}, cursor in ${k.on || 'nothing'}; "/" opens it too: ${slash}`];
  });
  // John 2026-11-21: "remove get direction buttons and call the salon button and then add in the map"
  await check('Location: no buttons; the map picture is one link to directions', async () => {
    const out = [];
    for (const [dir, label] of [[site, 'site'], [preview, 'preview']]) for (const [n, o] of [['phone', phone], ['laptop', laptop]]) for (const look of ['light', 'dark']) {
      const { c, p } = await open(o, { dir, look: ['ria-look', look] });
      await p.evaluate(() => document.querySelector('.map-link').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(800);
      const r = await p.evaluate(() => { const a = document.querySelector('#visit .map-link'), img = a && a.querySelector('img'), R = img ? img.getBoundingClientRect() : {};
        const links = [...document.querySelectorAll('#visit a, #visit button')].filter((e) => !e.closest('footer') && e.offsetParent);
        return { href: a && a.getAttribute('href'), target: a && a.target, rel: a && a.rel, shown: !!img && img.complete && img.naturalWidth > 0 && R.width > 200 && R.top < innerHeight && R.bottom > 0,
          only: links.length === 1 && links[0] === a, btns: document.querySelectorAll('#visit .btn, #visit .cta').length, iframe: document.querySelectorAll('iframe').length }; });
      await c.close();
      out.push([`${label} ${n} ${look}`, r.href === 'https://www.google.com/maps/dir/?api=1&destination=375+Rockbridge+Rd+NW+Ste+156%2C+Lilburn%2C+GA+30047' && r.target === '_blank' && /noopener/.test(r.rel) && r.shown && r.only && !r.btns && !r.iframe, r]);
    }
    const bad = out.filter((x) => !x[1]);
    return [!bad.length && !/callPop|copyBtn|closePop|mapFrame|prefetch-map/.test(js + html) && !/\.pop\b|\.map-box|map-skel|map-fallback|\.visit \.cta/.test(css),
      bad.map((x) => x[0] + ' ' + JSON.stringify(x[2])).join('; ') || 'map shows on phone and laptop, both modes, site and preview; one link, opens Google Maps directions in a new tab; no buttons, no iframe'];
  });
  await check('Search: Copy address and Get directions still work', async () => {
    const { c, p } = await open(laptop, { perms: ['clipboard-read', 'clipboard-write'] });
    await p.keyboard.press('Control+k'); await p.waitForTimeout(400); await p.fill('#cmdInput', 'copy address'); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
    const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    await p.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });   // catch the new tab's address
    await p.keyboard.press('Control+k'); await p.waitForTimeout(400); await p.fill('#cmdInput', 'get directions'); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
    const url = await p.evaluate(() => window.__opened[0] || ''); await c.close();
    return [/Rockbridge/.test(clip) && /google\.com\/maps\/dir/.test(url), `copied "${clip}"; Get directions opened ${url.slice(0, 60) || 'NOTHING'}`];
  });
  await check('Nothing loads from Google until the map is tapped', async () => {
    const c = await b.newContext(phone); const seen = [];
    await c.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
    await c.route(/^https?:/, (r) => { const u = r.request().url(); if (/google|gstatic/.test(u) && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) seen.push(u.slice(0, 70)); return /^https:\/\/fonts\./.test(u) ? r.continue() : r.abort(); });
    const p = await c.newPage(); await p.goto('file://' + site + '/index.html'); await p.waitForTimeout(1500);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } }); await p.waitForTimeout(1200);
    await c.close();
    return [!seen.length, seen.length ? 'requested: ' + seen.join(' | ') : 'no Google Maps request on open or while scrolling (her fonts come from Google Fonts, as before)'];
  });

  console.log('-- 7. the hero and header (John 2026-11-21: "remove the rating and the open today at 10:30 ... remove the book now")');
  await check('Hero: no rating, no open line, no Book button', async () => {
    const out = [];
    for (const [n, o] of [['390', phone], ['1280', laptop]]) {
      const { c, p } = await open(o);
      const r = await p.evaluate(() => { const h = document.querySelector('.hero'); document.querySelectorAll('.hero span[style*="clip"]').forEach((e) => (e.style.display = 'none'));
        return { t: h.innerText.replace(/\s+/g, ' ').trim(), btn: [...h.querySelectorAll('a, button')].filter((e) => e.offsetParent).length, bar: !!document.querySelector('.hero-bar, .hero-note, .hero-cta, .hero [data-hours], .hero [data-swr]') }; });
      await c.close();
      out.push([`${n}: "${r.t}"${r.btn ? `, ${r.btn} buttons` : ''}${r.bar ? ', bar still there' : ''}`, !/4\.5|Rated|Open|Closed|Book/i.test(r.t) && !r.btn && !r.bar]);
    }
    return [out.every((x) => x[1]), out.map((x) => x[0]).join('; ')];
  });
  await check('No Book button in the header, at any scroll', async () => {
    const out = [];
    for (const [n, o] of [['phone', phone], ['laptop', laptop]]) {
      const { c, p } = await open(o); const seen = [];
      for (const at of [0, 0.15, 0.5, 1]) {
        await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), at); await p.waitForTimeout(500);
        seen.push(...await p.evaluate(() => [...document.querySelectorAll('#nav a, #nav button')].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden' && /book/i.test(e.textContent)).map((e) => e.textContent.trim())));
      }
      const gone = !(await p.$('.nav-book')) && !/cta-gone|nav-book/.test(js + css);
      await c.close(); out.push([`${n}: ${seen.length ? 'SHOWS ' + [...new Set(seen)].join(', ') : 'none'}`, !seen.length && gone]);
    }
    return [out.every((x) => x[1]), out.map((x) => x[0]).join('; ') + ' (top, 15%, half way, bottom)'];
  });
  await check('Rating once (Reviews), open line once (Location)', async () => {
    const out = [];
    for (const [dir, label] of [[site, 'site'], [preview, 'preview']]) {
      const { c, p } = await open(laptop, { dir });
      const r = await p.evaluate(() => {
        const own = (re) => [...document.querySelectorAll('main *')].filter((e) => e.offsetParent && !e.closest('span[style*="clip"]') && [...e.childNodes].some((x) => x.nodeType === 3 && re.test(x.textContent)));
        const sec = (e) => (e.closest('section') || {}).id || (e.closest('footer') ? 'footer' : '?');
        return { rating: own(/\b4\.5\b/).map(sec), open: [...document.querySelectorAll('[data-hours]')].filter((e) => e.offsetParent).map(sec), count: document.querySelector('[data-swr="reviews"]')?.textContent };
      });
      await c.close();
      out.push([`${label}: 4.5 in ${r.rating.join(', ') || 'nowhere'}, "29 Google reviews" ${r.count === '29' ? 'kept' : 'MISSING'}; open line in ${r.open.join(', ') || 'nowhere'}`,
        r.rating.join() === 'reviews' && r.count === '29' && r.open.join() === 'visit']);
    }
    return [out.every((x) => x[1]), out.map((x) => x[0]).join('; ')];
  });
  await check('Phone hero has room: one screen, photo above the words', async () => {
    const out = [];
    for (const [n, o] of [['390', phone], ['320', small]]) for (const look of ['light', 'dark']) {
      const { c, p } = await open(o, { look: ['ria-look', look] });
      await p.waitForTimeout(3000);   // the hero intro has landed
      const r = await p.evaluate(() => { const g = (s) => document.querySelector(s).getBoundingClientRect(); const nav = g('#nav'), h1 = g('.hero h1'), le = g('.hero .lede'), hero = g('.hero');
        return { one: Math.abs(hero.height - innerHeight) < 1, px: getComputedStyle(document.querySelector('.hero h1')).fontSize, above: Math.round(h1.top - nav.bottom), gap: Math.round(le.top - h1.bottom), below: Math.round(hero.bottom - le.bottom),
          edges: Math.min(h1.left, le.left) >= 20 && Math.max(h1.right, le.right) <= innerWidth - 20, photo: Math.round((h1.top / innerHeight) * 100) }; });
      await c.close();
      const ok = r.one && (n !== '320' || r.px === '48px') && r.gap >= 24 && r.below >= 56 && r.edges && r.photo >= 40;
      out.push([`${n} ${look}: one screen ${r.one}, h1 ${r.px}, photo above the words ${r.photo}% of the screen, h1 to line ${r.gap}px, space below ${r.below}px, 20px from the edges ${r.edges}`, ok]);
    }
    return [out.every((x) => x[1]), out.map((x) => x[0]).join(' | ')];
  });

  // John 2026-11-21: "add these pics to the gallery" (six new photos)
  await check('Gallery: 11 photos, one size, each opens; laptop arrows slide the row', async () => {
    const out = [];
    for (const [n, o] of [['1280', laptop], ['1440', { viewport: { width: 1440, height: 900 } }], ['390', phone], ['320', small]]) {
      const { c, p } = await open(o);
      await p.evaluate(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(600);
      const r = await p.evaluate(() => { const lis = [...document.querySelectorAll('#rail li')]; const sizes = [...new Set(lis.map((l) => Math.round(l.querySelector('.ph').getBoundingClientRect().width) + 'x' + Math.round(l.querySelector('.ph').getBoundingClientRect().height)))];
        const tops = [...new Set(lis.map((l) => Math.round(l.getBoundingClientRect().top)))];
        return { count: lis.length, sizes, rows: tops.length, hashes: lis.filter((l) => l.querySelector('.ph[data-blurhash] canvas')).length, arrows: getComputedStyle(document.querySelector('.rail-ctrl')).display !== 'none' }; });
      let slide = 'n/a';
      if (+n >= 1024) {
        const x0 = await p.evaluate(() => document.getElementById('rail').scrollLeft); await p.click('#workNext'); await p.waitForTimeout(900);
        const x1 = await p.evaluate(() => document.getElementById('rail').scrollLeft); slide = x1 - x0;
      }
      let opened = [];
      if (n === '1280') {
        const names = await p.$$eval('#rail figcaption b', (e) => e.map((x) => x.textContent.trim()));
        for (let i = 0; i < names.length; i++) {
          await p.$eval(`#rail li:nth-child(${i + 1}) .photo-btn`, (e) => e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })); await p.waitForTimeout(300);
          await p.click(`#rail li:nth-child(${i + 1}) .photo-btn`); await p.waitForTimeout(700);
          const v = await p.evaluate(() => ({ open: document.getElementById('viewer').open, cap: document.getElementById('viewerCap').textContent, w: document.getElementById('viewerImg').naturalWidth }));
          opened.push(v.open && v.cap === names[i] && v.w > 0 ? '' : names[i]);
          await p.keyboard.press('Escape'); await p.waitForTimeout(700);
        }
        opened = opened.filter(Boolean);
      }
      await c.close();
      const ok = r.count === 11 && r.sizes.length === 1 && r.rows === 1 && r.hashes === 11 && (+n >= 1024 ? r.arrows && slide > 100 : true) && !opened.length;
      out.push([`${n}: ${r.count} photos, size ${r.sizes.join('/')}, ${r.rows} row, ${r.hashes} placeholders${+n >= 1024 ? `, arrows ${r.arrows ? 'shown' : 'HIDDEN'}, Next slid ${slide}px` : ''}${n === '1280' ? (opened.length ? ', did NOT open: ' + opened.join(', ') : ', all 11 open large with their titles') : ''}`, ok]);
    }
    return [out.every((x) => x[1]), out.map((x) => x[0]).join(' | ')];
  });

  console.log('-- house rules');
  await check('Nothing scrolls sideways at 320; no em dashes', async () => {
    const { c, p } = await open(small);
    const r = await p.evaluate(() => ({ side: document.documentElement.scrollWidth - innerWidth, dash: (document.body.innerText.match(/—/g) || []).length })); await c.close();
    return [r.side <= 0 && r.dash === 0, `${r.side} px sideways, ${r.dash} em dashes`];
  });
  await check('Phone page under 10 screens (390 and 320)', async () => {
    const out = [];
    for (const [dir, label] of [[site, 'site'], [preview, 'preview']]) for (const [n, o] of [['390', phone], ['320', small]]) {
      const { c, p } = await open(o, { dir });
      const s = await p.evaluate(() => document.documentElement.scrollHeight / innerHeight); await c.close();
      out.push([`${label} ${n}: ${s.toFixed(2)}`, s < 10]);
    }
    return [out.every((x) => x[1]), out.map((x) => x[0]).join(', ')];
  });

  await b.close();
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll BP-17 checks passed');
  process.exit(failed ? 1 : 0);
})();
