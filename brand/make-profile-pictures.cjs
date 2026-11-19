const { chromium } = require("playwright");
const fs = require("fs");
// the JIDO mark (same squares as app/icon.svg), centred with room for Google's round crop
const R = [[5.6,1.8],[13.2,1.8],[20.8,1.8],[28.4,1.8],[28.4,9.4],[28.4,17.0],[5.6,24.6],[28.4,24.6],[13.2,32.2],[20.8,32.2]];
const svg = (bg, fg) => {
  const S = 1024, k = 14.6, w = 28.8 * k, h = 36.4 * k, ox = (S - w) / 2 - 5.6 * k, oy = (S - h) / 2 - 1.8 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="${bg}"/><g fill="${fg}">${R.map(([x, y]) => `<rect x="${(ox + x * k).toFixed(1)}" y="${(oy + y * k).toFixed(1)}" width="${(6 * k).toFixed(1)}" height="${(6 * k).toFixed(1)}"/>`).join("")}</g></svg>`;
};
const out = process.argv[2], prev = process.argv[3];
const variants = [["jido-profile-dark", "#14181b", "#f5f5dc"], ["jido-profile-light", "#f5f5dc", "#14181b"]];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [name, bg, fg] of variants) {
    const s = svg(bg, fg);
    fs.writeFileSync(`${out}/${name}.svg`, s);
    await p.setContent(`<html><body style="margin:0">${s}</body></html>`);
    await p.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  }
  // preview: how Google shows it (round), big and inbox-sized
  const img = (n) => "data:image/png;base64," + fs.readFileSync(`${out}/${n}.png`).toString("base64");
  const row = (n, label) => `<div style="display:flex;align-items:center;gap:28px;margin:18px 0"><div style="width:190px;font:600 17px system-ui">${label}</div>
    ${[160, 64, 40, 24].map((s) => `<img src="${img(n)}" style="width:${s}px;height:${s}px;border-radius:50%">`).join("")}
    <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #ddd;border-radius:10px;padding:8px 14px;font:14px system-ui;color:#222"><img src="${img(n)}" style="width:32px;height:32px;border-radius:50%"> <b>JIDO</b>&nbsp; Your discovery call is booked</div></div>`;
  const page = await b.newPage({ viewport: { width: 1180, height: 470 }, deviceScaleFactor: 2 });
  await page.setContent(`<html><body style="margin:0;padding:24px 32px;background:#f1f3f4;color:#202124">
    <div style="font:700 24px system-ui">JIDO profile picture: how Google will show it (round crop)</div>
    <div style="font:15px system-ui;color:#555;margin-top:4px">Sizes: 160 px · 64 px · 40 px · 24 px · inside an inbox row</div>
    ${row("jido-profile-dark", "Dark (recommended)")}${row("jido-profile-light", "Light")}</body></html>`);
  await page.screenshot({ path: prev, fullPage: true });
  await b.close();
})();
