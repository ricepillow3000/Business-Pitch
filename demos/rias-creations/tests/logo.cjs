// The logo is her storefront sign: measured from the page's own pixels, it must keep the sign's DNA
// and proportions, be bigger than the old wordmark, and fit every phone header.
//   - "Ria's / Creations" stacked, in her salon's colors (John 2026-11-20: no white backing): her mirror
//     brass gold, deeper gold on white; readable wherever it sits
//   - the apostrophe and both i-dots in pink; "SALON" in heavy capitals beside it
//   - name width / SALON width 0.82 and name height / SALON height 0.87 on the sign (within 8%)
//   - on a laptop the logo is at least 240 px wide (the old wordmark was 204 px)
//   - from 320 to 430 px wide phones, the logo, Book now and the menu share one row inside the screen
// Run: node tests/logo.cjs <site folder>
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const os = require('os'), path = require('path');
let failed = 0;
const rec = (name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(42)}  ${detail}`); };

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await c.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
  const p = await c.newPage();
  await p.goto('file://' + process.argv[2] + '/index.html'); await p.waitForTimeout(2600);
  await p.evaluate(() => document.fonts.ready);

  // 1. the parts of her sign, read from the page itself
  const parts = await p.evaluate(() => {
    const n = document.querySelector('#nav .logo-name'), cs = getComputedStyle(n);
    const dots = [...n.querySelectorAll(':scope > .logo-i')].map((i) => getComputedStyle(i, '::after').backgroundColor);
    const ap = getComputedStyle(n.querySelector(':scope > .logo-ap')).color;
    const salon = document.querySelector('#nav .logo-salon'), ss = getComputedStyle(salon);
    return { ink: cs.color, family: cs.fontFamily, lines: n.querySelectorAll(':scope > br').length + 1, panel: !!document.querySelector('.logo-panel'),
             dots, ap, salonText: salon.textContent, salonUpper: ss.textTransform, salonWeight: +ss.fontWeight, salonFamily: ss.fontFamily, text: n.textContent };
  });
  const pinks = ['rgb(194, 79, 124)', 'rgb(217, 112, 143)'];   // her roses' pink; a lighter shade of it over dark areas
  rec('gold name in two stacked lines', parts.ink === 'rgb(223, 182, 119)' && parts.lines === 2 && /Merriweather/.test(parts.family),
    `${parts.ink} (her mirror brass, over the photo), ${parts.lines} lines, ${parts.family.split(',')[0]}`);
  rec('no white backing', !parts.panel, parts.panel ? 'a backing is still there' : 'the letters sit straight on the page');
  // the name is read on what is behind it: gold over the dark photo, deeper gold on the white header
  const lum = (h) => { const c = h.match(/\d+/g).slice(0, 3).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  await p.evaluate(() => scrollTo(0, document.getElementById('services').offsetTop)); await p.waitForTimeout(600);
  const light = await p.evaluate(() => [getComputedStyle(document.querySelector('#nav .logo-name')).color, getComputedStyle(document.getElementById('nav')).backgroundColor]);
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
  const onDark = cr(parts.ink, 'rgb(32, 25, 23)'), onLight = cr(light[0], light[1]);
  rec('the name reads clearly everywhere', onDark >= 4.5 && onLight >= 4.5, `${onDark.toFixed(1)}:1 gold over the dark photo, ${onLight.toFixed(1)}:1 deeper gold on the white header (4.5 needed)`);
  rec('pink apostrophe and both i-dots', pinks.includes(parts.ap) && parts.dots.length === 2 && parts.dots.every((d) => pinks.includes(d)), `apostrophe ${parts.ap}, dots ${parts.dots.join(' / ')}`);
  rec('a heavy SALON in capitals', /salon/i.test(parts.salonText) && parts.salonUpper === 'uppercase' && parts.salonWeight >= 800 && /Archivo/.test(parts.salonFamily),
    `${parts.salonFamily.split(',')[0]} ${parts.salonWeight}, ${parts.salonUpper}`);

  // 2. proportions, measured from the drawn letters: the logo on a plain grey card, name tinted so it can be told apart
  await p.evaluate(() => {
    const card = document.createElement('div');
    card.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#808080;padding:30px;font-size:40px';
    const l = document.querySelector('#nav .logo').cloneNode(true); l.style.cssText = 'color:#ffffff;--logo-ink:rgb(80,104,149);--logo-pink:#808080';   // letters only: the dots blend into the card
    card.appendChild(l); document.body.appendChild(card);
  });
  await p.waitForTimeout(300);
  const shot = path.join(os.tmpdir(), 'ria-logo-measure.png');
  await p.screenshot({ path: shot, clip: { x: 0, y: 0, width: 1000, height: 300 } });
  const m = JSON.parse(execFileSync('python3', ['-c', `
import numpy as np, json
from PIL import Image
a = np.asarray(Image.open('${shot}').convert('RGB')).astype(int)
slate = (abs(a[...,0]-80)<30) & (abs(a[...,1]-104)<30) & (abs(a[...,2]-149)<30)
white = a.min(2) > 235
ys, xs = np.where(slate); ys2, xs2 = np.where(white)
print(json.dumps([int(xs.max()-xs.min()+1), int(ys.max()-ys.min()+1), int(xs2.max()-xs2.min()+1), int(ys2.max()-ys2.min()+1)]))`]).toString());
  const wr = m[0] / m[2], hr = m[1] / m[3];
  rec('proportions of her sign', Math.abs(wr - .82) / .82 < .08 && Math.abs(hr - .87) / .87 < .08,
    `name/SALON width ${wr.toFixed(2)} (sign 0.82), height ${hr.toFixed(2)} (sign 0.87)`);
  await p.evaluate(() => document.querySelector('body > div:last-child').remove());

  // 3. bigger than the old wordmark
  const w = await p.evaluate(() => document.querySelector('#nav .logo').getBoundingClientRect().width);
  rec('bigger on a laptop', w >= 240, `${Math.round(w)} px wide (the old wordmark: 204 px)`);
  await c.close();

  // 4. every phone header fits
  const bad = [];
  for (const vw of [320, 340, 360, 375, 390, 414, 430]) {
    const pc = await b.newContext({ viewport: { width: vw, height: 760 }, isMobile: true, hasTouch: true });
    await pc.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
    const pp = await pc.newPage(); await pp.goto('file://' + process.argv[2] + '/index.html'); await pp.waitForTimeout(2200);
    await pp.evaluate(() => scrollTo(0, document.querySelector('.hero').offsetHeight + 20)); await pp.waitForTimeout(400);
    const r = await pp.evaluate(() => { const l = document.querySelector('#nav .logo').getBoundingClientRect(), bk = document.querySelector('#nav .nav-book').getBoundingClientRect(), mb = document.getElementById('menuBtn').getBoundingClientRect();
      return { ok: innerWidth === screen.width && mb.right <= innerWidth && bk.left - l.right >= 8, gap: Math.round(bk.left - l.right) }; });
    if (!r.ok) bad.push(vw + ' px'); await pc.close();
  }
  rec('fits every phone header', !bad.length, bad.length ? 'too wide at ' + bad.join(', ') : 'logo, Book now and menu on one row from 320 to 430 px');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
