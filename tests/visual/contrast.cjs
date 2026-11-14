// WCAG 2.x contrast for the palette (≥ 4.5:1 for text on the void / panels).
const L = (hex) => { const c = hex.match(/\w\w/g).map(h => parseInt(h, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const C = { void: '#14181b', slate: '#2b3237', slateDeep: '#1e2428', signal: '#6e9bf0', beige: '#f5f5dc', flag: '#0a3161' };
const pairs = [['signal', 'void'], ['beige', 'void'], ['signal', 'slateDeep'], ['beige', 'slateDeep'], ['signal', 'slate'], ['beige', 'slate'], ['flag', 'beige']];
let ok = true;
for (const [fg, bg] of pairs) { const r = ratio(C[fg], C[bg]); const pass = r >= 4.5; ok &&= pass; console.log(`${pass ? 'PASS' : 'FAIL'} ${fg} ${C[fg]} on ${bg} ${C[bg]}: ${r.toFixed(2)}:1`); }
console.log('info: flag on void (colour-block only, never text):', ratio(C.flag, C.void).toFixed(2) + ':1');
process.exit(ok ? 0 : 1);
