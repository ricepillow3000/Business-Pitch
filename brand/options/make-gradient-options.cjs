const { chromium } = require("playwright");
const fs = require("fs");
const R = [[5.6,1.8],[13.2,1.8],[20.8,1.8],[28.4,1.8],[28.4,9.4],[28.4,17.0],[5.6,24.6],[28.4,24.6],[13.2,32.2],[20.8,32.2]];
const S = 1024, k = 14.6, ox = (S - 28.8 * k) / 2 - 5.6 * k, oy = (S - 36.4 * k) / 2 - 1.8 * k;
const mark = (fg) => `<g fill="${fg}">${R.map(([x, y]) => `<rect x="${(ox + x * k).toFixed(1)}" y="${(oy + y * k).toFixed(1)}" width="${(6 * k).toFixed(1)}" height="${(6 * k).toFixed(1)}"/>`).join("")}</g>`;
// brand colours: beige #f5f5dc, flag blue #6e9bf0, dark slate #14181b
const variants = {
  "jido-profile-light-gradient-soft": `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f5dc"/><stop offset="1" stop-color="#c9d9f5"/></linearGradient>`,
  "jido-profile-light-gradient-bold": `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f5dc"/><stop offset=".55" stop-color="#dfe6ee"/><stop offset="1" stop-color="#8fb2f2"/></linearGradient>`,
  "jido-profile-light-gradient-glow": `<radialGradient id="g" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#fbfbee"/><stop offset=".6" stop-color="#f5f5dc"/><stop offset="1" stop-color="#b9cdf3"/></radialGradient>`,
};
const svg = (def) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${def}</defs><rect width="${S}" height="${S}" fill="url(#g)"/>${mark("#14181b")}</svg>`;
const dir = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: S, height: S } });
  for (const [name, def] of Object.entries(variants)) {
    await p.setContent(`<html><body style="margin:0">${svg(def)}</body></html>`);
    await p.screenshot({ path: `${dir}/${name}.png`, clip: { x: 0, y: 0, width: S, height: S } });
  }
  const img = (n) => "data:image/png;base64," + fs.readFileSync(n).toString("base64");
  const rows = [["brand/jido-profile-light.png", "Light (plain, current)"], ...Object.keys(variants).map((n, i) => [`${dir}/${n}.png`, ["A · Soft gradient (beige → pale blue)", "B · Bold gradient (beige → JIDO blue)", "C · Glow (beige centre, blue edge)"][i]])];
  const page = await b.newPage({ viewport: { width: 1180, height: 600 }, deviceScaleFactor: 2 });
  await page.setContent(`<html><body style="margin:0;padding:24px 32px;background:#f1f3f4;color:#202124;font-family:system-ui">
    <div style="font:700 24px system-ui">Light profile picture with a gradient: how Google will show it</div>
    ${rows.map(([f, l]) => `<div style="display:flex;align-items:center;gap:28px;margin:16px 0"><div style="width:300px;font:600 16px system-ui">${l}</div>
      ${[150, 64, 40].map((s) => `<img src="${img(f)}" style="width:${s}px;height:${s}px;border-radius:50%">`).join("")}
      <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #ddd;border-radius:10px;padding:8px 14px;font:14px system-ui"><img src="${img(f)}" style="width:32px;height:32px;border-radius:50%"><b>JIDO</b>&nbsp; Your call is booked</div></div>`).join("")}</body></html>`);
  await page.screenshot({ path: `${dir}/gradient-preview.png`, fullPage: true });
  await b.close();
})();
