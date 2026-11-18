// Design audit: measures the page in a real browser and prints pass/fail for each rule.
// Usage (from the repo root, with Playwright installed):
//   node demos/rias-creations/tests/audit.cjs "$PWD/demos/rias-creations" /tmp
// Also refreshes apple-touch-icon.png and og-image.png.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const dir = process.argv[2], out = process.argv[3];
const url = 'file://' + dir + '/index.html';
const files = ['index.html', 'styles.css', 'app.js'].map((f) => fs.readFileSync(`${dir}/${f}`, 'utf8'));
const src = files.join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

(async () => {
  const b = await chromium.launch();
  const res = [];
  const ok = (name, pass, detail = '') => res.push([pass ? 'PASS' : 'FAIL', name, detail]);

  // static source checks
  ok('No gradients in code', !/gradient\(/i.test(src), (src.match(/gradient\(/gi) || []).length + ' found');
  ok('No glassmorphism (backdrop-filter)', !/backdrop-filter/i.test(src));
  ok('No italic type', !/font-style:\s*italic|ital,/i.test(src));
  ok('All caps only in the logo (her sign uses them)', (src.match(/text-transform:\s*uppercase/gi) || []).length === 1 && /\.logo-salon \{[^}]*uppercase/.test(src));
  const emoji = files.join('').match(/\p{Extended_Pictographic}/gu) || [];
  ok('No emojis', emoji.filter((e) => !'©®™'.includes(e)).length === 0, emoji.join(' '));
  const strokes = new Set((files[0] + files[2]).match(/stroke-width="[\d.]+"/g));
  ok('Consistent icon stroke', strokes.size === 1, [...strokes].join(', '));
  ok('Favicon + social meta tags', /rel="icon"/.test(files[0]) && /og:image/.test(files[0]) && /twitter:card/.test(files[0]) && fs.existsSync(dir + '/favicon.svg'));

  // the entry screen: plays once, then gets out of the way
  const e = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await e.goto(url);
  const entered = await e.waitForFunction(() => !document.querySelector('#entry') && document.documentElement.classList.contains('intro-done'), null, { timeout: 12000 }).then(() => true, () => false);
  await e.reload(); await e.waitForTimeout(300);
  const again = await e.evaluate(() => { const x = document.querySelector('#entry'); return !!x && getComputedStyle(x).display !== 'none'; });
  ok('Entry walk-in plays, then hands over to the hero', entered);
  ok('Entry plays once per visit (not again on reload)', !again);

  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(3200);
  const m = await p.evaluate(() => {
    const parse = (c) => { const v = c.match(/[\d.]+/g).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
    const lum = ({ r, g, b }) => [r, g, b].map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
    const bgOf = (el) => {
      for (let e = el; e; e = e.parentElement) {
        if (e.matches('.nav:not(.solid)')) return parse(getComputedStyle(document.querySelector('.hero')).backgroundColor);   // see-through nav sits on the hero
        const c = parse(getComputedStyle(e).backgroundColor); if (c.a > 0.5) return c;
      }
      return { r: 253, g: 252, b: 250, a: 1 };
    };
    const all = [...document.querySelectorAll('body *')].filter((e) => !e.closest('dialog:not([open]), .pop:not(.open), template, #tip, [hidden], .mbar') && e.getClientRects().length);
    const radii = new Set(), grad = [], glass = [], italic = [], low = [];
    let texts = 0;
    for (const e of all) {
      const cs = getComputedStyle(e);
      if (/gradient/.test(cs.backgroundImage)) grad.push(e.className);
      if (cs.backdropFilter && cs.backdropFilter !== 'none') glass.push(e.className);
      if (cs.fontStyle === 'italic' && e.textContent.trim()) italic.push(e.tagName);
      const r = cs.borderTopLeftRadius; if (r !== '0px') radii.add(`${e.className || e.tagName}:${r}`);
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const fg = parse(cs.color), bg = bgOf(e);
      const mix = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
      const [x, y] = [lum(mix), lum(bg)].sort((a, b) => b - a), ratio = (x + 0.05) / (y + 0.05);
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = size >= 24 || (bold && size >= 18.66);
      texts++;
      if (ratio < (large ? 3 : 4.5)) low.push(`${e.tagName}.${e.className} "${e.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}`);
    }
    const anims = document.getAnimations().filter((a) => a.playState === 'running' && !a.effect?.target?.closest?.('.toasts'));
    const minFont = Math.min(...all.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize)));
    return { radii: [...radii], grad, glass, italic, low, texts, anims: anims.length, minFont,
      photos: [...document.querySelectorAll('main img')].filter((i) => !i.closest('[hidden]')).map((i) => i.getAttribute('src')),
      h1em: [...document.querySelectorAll('h1 em, h2 em, h3 em')].filter((e) => !e.closest('span[style*="clip"]')).length,   // ignore the screen-reader copy
      heroButtons: document.querySelectorAll('.hero .btn').length,
      concentric: [['.book .shell', '.book .card'], ['.mega', '.mega button']].map(([o, i]) => {
        const O = document.querySelector(o), I = document.querySelector(i); if (!O || !I) return true;
        const co = getComputedStyle(O), pad = parseFloat(co.paddingTop);
        return Math.abs(parseFloat(co.borderTopLeftRadius) - (parseFloat(getComputedStyle(I).borderTopLeftRadius) + pad)) < 0.5;
      }),
      sections: [...document.querySelectorAll('main > section')].map((s) => getComputedStyle(s).backgroundColor) };
  });
  ok('Every text passes WCAG AA contrast', m.low.length === 0, `${m.texts} text elements checked${m.low.length ? '; low: ' + m.low.join(' | ') : ''}`);
  ok('No gradient backgrounds (computed)', m.grad.length === 0);
  ok('No glass (computed)', m.glass.length === 0);
  ok('No italic text (computed)', m.italic.length === 0);
  ok('Subtle corners only (4 to 16px; arches and dots aside)', m.radii.every((r) => /999px|50%/.test(r) || parseFloat(r.split(':').pop()) <= 16), [...new Set(m.radii.map((r) => r.split(':').pop()))].join(', '));
  ok('Outer radius = inner radius + padding (concentric)', m.concentric.every(Boolean), m.concentric.join(', '));
  ok('Readable labels (smallest text ≥ 12px)', m.minFont >= 12, m.minFont + 'px');
  ok('One highlighted word', m.h1em === 1);
  ok('Single-button hero', m.heroButtons === 1, m.heroButtons + ' button(s)');
  ok('Every photo used once', new Set(m.photos).size === m.photos.length, m.photos.length + ' photos');
  ok('No fade-in on every section (nothing animating after the intro)', m.anims === 0, m.anims + ' running');
  ok('No JS errors', errs.length === 0, errs.join(' | '));
  const extra = await p.evaluate(() => ({
    reviews: document.querySelectorAll('.slide').length,
    sourced: [...document.querySelectorAll('.slide footer')].every((f) => f.querySelector('a[href*="yelp"], a[href*="google"]')),
    pads: [...new Set([...document.querySelectorAll('main > section:not(.hero)')].map((s) => getComputedStyle(s).paddingTop))],
    dashes: (document.body.innerText.match(/\u2014/g) || []).length,
    legal: !!document.querySelector('a[href="privacy.html"]') && !!document.querySelector('a[href="terms.html"]'),
  }));
  ok('A few strong reviews, not a wall of testimonials', extra.reviews <= 5, extra.reviews + ' reviews');
  ok('Every review links to its source (Google or Yelp)', extra.sourced);
  ok('Consistent section spacing', extra.pads.length === 1, extra.pads.join(', '));
  ok('No em dashes in the copy', extra.dashes === 0, extra.dashes + ' found');
  ok('Privacy policy and terms linked', extra.legal && fs.existsSync(dir + '/privacy.html') && fs.existsSync(dir + '/terms.html'));

  await p.screenshot({ path: `${out}/audit-desktop-full.png`, fullPage: true });
  await p.screenshot({ path: `${out}/audit-desktop-hero.png` });
  // dark theme contrast: the same check again after switching to evening
  await p.keyboard.press('t'); await p.waitForTimeout(300);
  const dark = await p.evaluate(() => {
    const parse = (c) => { const v = c.match(/[\d.]+/g).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
    const lum = ({ r, g, b }) => [r, g, b].map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
    const bgOf = (el) => {
      for (let e = el; e; e = e.parentElement) {
        if (e.matches('.nav:not(.solid)')) return parse(getComputedStyle(document.querySelector('.hero')).backgroundColor);
        const c = parse(getComputedStyle(e).backgroundColor); if (c.a > 0.5) return c;
      }
      return parse(getComputedStyle(document.body).backgroundColor); };
    const low = [];
    for (const e of document.querySelectorAll('body *')) {
      if (e.closest('dialog:not([open]), .pop:not(.open), template, #tip, [hidden], .mbar') || !e.getClientRects().length) continue;
      const cs = getComputedStyle(e); if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || cs.visibility === 'hidden') continue;
      const fg = parse(cs.color), bg = bgOf(e), mix = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
      const [x, y] = [lum(mix), lum(bg)].sort((a, b) => b - a), ratio = (x + 0.05) / (y + 0.05), size = parseFloat(cs.fontSize);
      if (ratio < (size >= 24 ? 3 : 4.5)) low.push(`${e.tagName}.${e.className} ${ratio.toFixed(2)}`);
    }
    return low;
  });
  ok('Evening (dark) mode passes WCAG AA contrast too', dark.length === 0, dark.join(' | '));
  await p.screenshot({ path: `${out}/audit-dark-full.png`, fullPage: true });
  const phc = await b.newContext({ ...devices['iPhone 13'] });
  await phc.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
  const ph = await phc.newPage();
  await ph.goto(url); await ph.waitForTimeout(3200);
  ok('No sideways scroll on phone', await ph.evaluate(() => document.documentElement.scrollWidth - innerWidth) === 0);
  await ph.screenshot({ path: `${out}/audit-phone-full.png`, fullPage: true });

  // favicon PNG + social preview image
  const ic = await (await b.newContext({ viewport: { width: 180, height: 180 } })).newPage();
  await ic.goto('file://' + dir + '/favicon.svg'); await ic.waitForTimeout(300);
  await ic.screenshot({ path: `${dir}/apple-touch-icon.png` });
  const ogc = await b.newContext({ viewport: { width: 1200, height: 630 } });
  await ogc.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
  const og = await ogc.newPage();
  await og.goto(url); await og.waitForTimeout(3200); await og.screenshot({ path: `${dir}/og-image.png` });

  for (const [s, n, d] of res) console.log(`${s}  ${n}${d ? '  (' + d + ')' : ''}`);
  await b.close();
})();
