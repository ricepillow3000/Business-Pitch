// Light mode / Dark mode (John 2026-11-20): plain words beside Services and Gallery, not a pill and not on
// the hero; Light mode is the default.
//   - the site opens in Light mode, even after an old saved evening choice
//   - laptop: "Dark mode" sits in the header's link row, right after Location, styled like the other links
//   - phone: "Dark mode" is in the menu with Services, Gallery and Location
//   - choosing it turns the site dark and the words become "Light mode"; choosing that brings it back
//   - nothing on the hero, and the "t" key does nothing
// Run: node tests/look.cjs <site folder>
const { chromium, devices } = require('playwright');
let failed = 0;
const rec = (name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(40)}  ${detail}`); };
const seed = () => { try { sessionStorage.setItem('ria-entered', '1'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('ria-theme-choice', 'dark'); sessionStorage.setItem('seeded', '1'); } } catch (e) {} };

(async () => {
  const b = await chromium.launch();
  // laptop
  {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' }); await c.addInitScript(seed);
    const p = await c.newPage(); await p.goto('file://' + process.argv[2] + '/index.html'); await p.waitForTimeout(2200);
    const s = await p.evaluate(() => {
      const m = document.getElementById('modeBtn'), loc = document.querySelector('.nav-links a[href="#visit"]');
      const ms = getComputedStyle(m), ls = getComputedStyle(loc), r = m.getBoundingClientRect(), lr = loc.getBoundingClientRect();
      return { theme: document.documentElement.dataset.theme, text: m.textContent, inRow: m.parentElement.classList.contains('nav-links') && m.previousElementSibling === loc,
               sameLine: Math.abs((r.top + r.bottom) / 2 - (lr.top + lr.bottom) / 2) < 2 && r.left > lr.right, plain: ms.borderRadius === '0px' && ms.backgroundColor === 'rgba(0, 0, 0, 0)' && ms.borderTopWidth === '0px',
               look: ms.fontSize === ls.fontSize && ms.fontFamily === ls.fontFamily && ms.color === ls.color, onHero: !!document.querySelector('.hero button:not(.photo-btn)') };
    });
    rec('laptop: opens in Light mode', s.theme === 'light' && s.text === 'Dark mode', `${s.theme}; the link reads "${s.text}" (an old saved evening is ignored)`);
    rec('laptop: beside Services and Gallery', s.inRow && s.sameLine, 'in the header row, right after Location');
    rec('laptop: plain words, not a pill', s.plain && s.look, 'no fill, no border, no rounding; same type and color as the other links');
    rec('laptop: nothing on the hero', !s.onHero, 'the hero has no switch');
    await p.click('#modeBtn'); await p.waitForTimeout(200);
    const d = await p.evaluate(() => [document.documentElement.dataset.theme, document.getElementById('modeBtn').textContent]);
    await p.click('#modeBtn'); await p.waitForTimeout(200);
    const l = await p.evaluate(() => [document.documentElement.dataset.theme, document.getElementById('modeBtn').textContent]);
    rec('laptop: Dark mode and back', d[0] === 'dark' && d[1] === 'Light mode' && l[0] === 'light' && l[1] === 'Dark mode', `${d.join(', reads ')} then ${l.join(', reads ')}`);
    await p.keyboard.press('t'); await p.waitForTimeout(200);
    rec('laptop: no hidden switch', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'light', '"t" key does nothing');
    await c.close();
  }
  // phone
  {
    const c = await b.newContext({ ...devices['iPhone 13'], colorScheme: 'dark' }); await c.addInitScript(seed);
    const p = await c.newPage(); await p.goto('file://' + process.argv[2] + '/index.html'); await p.waitForTimeout(2200);
    rec('iPhone: opens in Light mode', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'light', 'even with the phone in Dark Mode');
    await p.click('#menuBtn'); await p.waitForTimeout(500);
    const items = await p.evaluate(() => [...document.querySelectorAll('#cmdList [role="option"]')].map((o) => o.textContent.trim()));
    const i = items.findIndex((t) => t.startsWith('Dark mode')), near = items.slice(Math.max(0, i - 6), i).join(' | ');
    rec('iPhone: in the menu by Gallery', i > 0 && /Gallery/.test(near) && /Services/.test(near), `menu: ... ${near} | ${items[i] || 'missing'}`);
    await p.evaluate(() => [...document.querySelectorAll('#cmdList [role="option"]')].find((o) => o.textContent.trim().startsWith('Dark mode')).click()); await p.waitForTimeout(400);
    rec('iPhone: Dark mode works', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'choosing it turns the site dark');
    await c.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
