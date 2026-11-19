// The walk-in never blurs the photo: freezes the doorway at its last frame on an iPhone-sized
// screen and compares its sharpness with the finished hero (the walk-in lands exactly on it).
// (Before the fix the doorway was a small box zoomed about 9x, so the photo inside went soft
// and blocky until the hero replaced it.)
// Run: node tests/sharp.cjs <site folder> <folder for two screenshots>
const { chromium, devices } = require('playwright');
const { execFileSync } = require('child_process');
const site = process.argv[2], out = process.argv[3] || '/tmp';

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'] });
  await c.route(/^https?:/, (r) => r.abort());
  // a switch that stops animation frames, so the walk can be held still at its last frame
  await c.addInitScript(() => { const real = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => (window.__rafOff ? 0 : real(cb)); });
  const p = await c.newPage();
  await p.goto('file://' + site + '/index.html');
  await p.waitForFunction(() => {
    const door = document.getElementById('entryDoor'), hero = document.getElementById('heroImg');
    if (!door) return false;
    if (!window.__w0) window.__w0 = door.offsetWidth;                          // the doorway's size before the walk
    if (!document.querySelector('#entry.walking')) return false;
    const w0 = window.__w0, h0 = w0 * 4 / 3, grow = door.getBoundingClientRect().width / w0;   // on-screen size: a zoom or a real resize
    const end = 4 * Math.max(innerWidth / w0, innerHeight / h0, hero.getBoundingClientRect().width * 1.04 / w0);
    if (Math.log(grow) / Math.log(end) > 0.97) { window.__rafOff = true; return true; }   // the last few frames (the photo has landed)
    return false;
  }, null, { polling: 5, timeout: 20000 });
  await p.waitForTimeout(150);
  const clip = { x: 60, y: 300, width: 260, height: 220 };
  await p.screenshot({ path: out + '/sharp-walk.png', clip });
  await p.evaluate(() => (window.__rafOff = false));
  await p.waitForFunction(() => document.documentElement.classList.contains('intro-done'), null, { timeout: 15000 });
  await p.addStyleTag({ content: '.hero-main, .hero-bar, .hero-scrim, #nav { visibility: hidden !important; }' });
  await p.waitForTimeout(200);
  await p.screenshot({ path: out + '/sharp-hero.png', clip });
  await b.close();
  // sharpness = variance of the Laplacian (higher is sharper)
  const ratio = parseFloat(execFileSync('python3', ['-c', `
import numpy as np
from PIL import Image
def sharp(f):
    a = np.asarray(Image.open(f).convert('L'), dtype=float)
    l = a[1:-1, 1:-1] * 4 - a[:-2, 1:-1] - a[2:, 1:-1] - a[1:-1, :-2] - a[1:-1, 2:]
    return l.var()
print(sharp('${out}/sharp-walk.png') / sharp('${out}/sharp-hero.png'))
`]).toString());
  const ok = ratio >= 0.9;
  console.log(`${ok ? 'PASS' : 'FAIL'}  the walk-in's last frame is ${(ratio * 100).toFixed(0)}% as sharp as the finished hero (needs 90% or more)`);
  process.exit(ok ? 0 : 1);
})();
