// Tries hard to freeze the animations, then checks that everything still ends in place.
// On a laptop (3D card turns) and an iPhone (flat card folds), each scenario on a fresh page:
//   1. a 6x slower CPU through the walk-in and hero intro
//   2. animation frames stop dead mid walk-in (the phone pauses the page): walk-in and intro still land
//   3. a scroll storm (60 jumps up and down) on a 4x slower CPU
//   4. the page frozen mid-reveal for 2 s, then resumed
//   5. the page hidden and shown again mid-reveal (another app, a notification)
//   6. the screen rotated mid-reveal (phone)
//   7. tabs and reviews pressed rapidly, mid-move
// "In place" means: no block still waiting, every block at full opacity with no transform,
// no leftover inline motion styles in the hero or the nav, and no script errors.
// Run: node tests/motion.cjs <site folder>
const { chromium, devices } = require('playwright');
const url = 'file://' + process.argv[2] + '/index.html';
let failed = 0;
const rec = (vp, name, problems) => {
  const ok = !problems.length; if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${vp.padEnd(6)}  ${name.padEnd(46)}  ${ok ? 'all in place' : problems.slice(0, 4).join(' | ')}`);
};

// what "in place" means, measured in the page
const offenders = (p) => p.evaluate(() => {
  const bad = [];
  const name = (e) => (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') || e.tagName;
  document.querySelectorAll('[data-t]').forEach((e) => {
    if (!e.offsetParent) return;                                   // not shown on this screen (e.g. arrows on a phone)
    const cs = getComputedStyle(e);
    if (e.hasAttribute('data-r')) bad.push(name(e) + ' still waiting');
    else if (parseFloat(cs.opacity) < 1) bad.push(name(e) + ' opacity ' + cs.opacity);
    else if (cs.transform !== 'none') bad.push(name(e) + ' transform ' + cs.transform.slice(0, 40));
  });
  if (document.getElementById('entry')) bad.push('walk-in still on screen');
  if (!document.documentElement.classList.contains('intro-done')) bad.push('hero intro not finished');
  document.querySelectorAll('.hero h1 .ln span span, .hero .lede, #nav, #nav .logo, #nav .nav-links > a, #heroImg').forEach((e) => {
    const t = e.style.transform, o = e.style.opacity;
    if ((t && t !== 'none' && !/translateY\(0(%|px)?\)|translate\(0px, 0px\)|^$/.test(t)) || (o && o !== '1')) bad.push(name(e) + ' left at ' + (t || '') + ' ' + (o || ''));
  });
  return bad;
});
const tag = (p) => p.evaluate(() => document.querySelectorAll('[data-r]').forEach((e) => (e.dataset.t = '1')));
const scrollAll = async (p) => {
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= H; y += 350) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(90); }
};

(async () => {
  const b = await chromium.launch();
  for (const [vp, opts] of [['laptop', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['iPhone 13'] }]]) {
    const run = async (name, entry, body) => {
      const c = await b.newContext(opts);
      await c.route(/^https?:/, (r) => r.abort());
      // a switch that stops animation frames dead, installed before any script captures the real one
      await c.addInitScript((entry) => {
        if (!entry) { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} }
        const real = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => (window.__rafOff ? 0 : real(cb));
      }, entry);
      const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      const cdp = await c.newCDPSession(p);
      await p.goto(url);
      await tag(p);
      try { await body(p, cdp); } catch (e) { errs.push('test: ' + e.message.split('\n')[0]); }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
      await p.evaluate(() => (window.__rafOff = false)).catch(() => {});
      await scrollAll(p);                                          // then make sure every block has had its turn
      await p.waitForTimeout(2600);
      rec(vp, name, [...await offenders(p), ...errs.map((e) => 'error ' + e)]);
      await c.close();
    };

    await run('1. slow CPU through walk-in and intro', true, async (p, cdp) => {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
      await p.waitForFunction(() => document.documentElement.classList.contains('intro-done'), null, { timeout: 25000 });
    });
    await run('2. frames stop mid walk-in', true, async (p) => {
      await p.waitForFunction(() => document.querySelector('#entry.walking'), null, { timeout: 15000 });
      await p.waitForTimeout(300);
      await p.evaluate(() => (window.__rafOff = true));             // nothing animates from here on
      await p.waitForTimeout(9000);                                  // walk-in lands by 3 s, intro by 4.5 s after it
      const still = await p.evaluate(() => ({ entry: !!document.getElementById('entry'), done: document.documentElement.classList.contains('intro-done') }));
      if (still.entry || !still.done) throw new Error('stuck with frames off: ' + JSON.stringify(still));
    });
    await run('3. scroll storm on a slow CPU', false, async (p, cdp) => {
      await p.waitForTimeout(2800);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let i = 0; i < 60; i++) { await p.evaluate((y) => scrollTo(0, y), Math.round(((i * 7919) % 97) / 97 * H)); await p.waitForTimeout(40); }
    });
    await run('4. page frozen mid-reveal, then resumed', false, async (p, cdp) => {
      await p.waitForTimeout(2800);
      await p.evaluate(() => document.querySelector('#work').scrollIntoView());
      await p.waitForTimeout(350);
      await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
      await new Promise((r) => setTimeout(r, 2000));
      await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    });
    await run('5. page hidden and shown mid-reveal', false, async (p) => {
      await p.waitForTimeout(2800);
      await p.evaluate(() => document.querySelector('#reviews').scrollIntoView());
      await p.waitForTimeout(300);
      await p.evaluate(() => {
        let v = 'hidden';
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
        document.dispatchEvent(new Event('visibilitychange'));
        v = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
      });
      const waiting = await p.evaluate(() => [...document.querySelectorAll('#reviews [data-r].in')].length);
      if (waiting) throw new Error(waiting + ' blocks still mid-move right after the page came back');
    });
    await run('6. screen rotated mid-reveal', false, async (p) => {
      await p.waitForTimeout(2800);
      await p.evaluate(() => document.querySelector('#book').scrollIntoView());
      await p.waitForTimeout(300);
      const v = opts.viewport; await p.setViewportSize({ width: v.height, height: v.width });
      await p.waitForTimeout(400); await p.setViewportSize(v);
    });
    await run('7. tabs and reviews pressed rapidly', false, async (p) => {
      await p.waitForTimeout(2800);
      await p.evaluate(() => window.__story.revealAll());
      await p.$eval('#services', (e) => e.scrollIntoView()); await p.waitForTimeout(300);
      for (const i of [1, 3, 0, 4, 2, 1]) { await p.click(`#t${i}`); await p.waitForTimeout(60); }
      await p.$eval('#reviews', (e) => e.scrollIntoView()); await p.waitForTimeout(300);
      for (const s of ['#next', '#next', '#next', '#prev', '#next']) { await p.click(s); await p.waitForTimeout(70); }
      await p.waitForTimeout(1500);
      const st = await p.evaluate(() => {
        const shown = [...document.querySelectorAll('#panels [role=tabpanel]')].filter((x) => !x.hidden);
        const sel = [...document.querySelectorAll('[role=tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true');
        const track = document.getElementById('track'), w = document.getElementById('viewport').clientWidth;
        const idx = parseInt(document.getElementById('count').textContent) - 1;
        const x = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
        return { panels: shown.length, styled: shown.map((x) => x.style.cssText).join(''), op: shown.map((x) => getComputedStyle(x).opacity).join(), sel, shownId: shown[0] && shown[0].id, off: Math.abs(x + idx * w) };
      });
      if (st.panels !== 1 || st.shownId !== 'p' + st.sel || st.styled || st.op !== '1') throw new Error('tabs not settled ' + JSON.stringify(st));
      if (st.off > 1) throw new Error('reviews not settled, ' + st.off.toFixed(1) + ' px off');
    });
  }
  await b.close();
  console.log(failed ? `\n${failed} scenario(s) left something frozen` : '\nNothing froze: every scenario ended with everything in place');
  process.exit(failed ? 1 : 0);
})();
