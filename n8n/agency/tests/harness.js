// Loads an n8n SDK workflow file with mocked SDK functions, so every Code node's jsCode
// is produced exactly as JavaScript cooks the template literals. Then syntax-checks them.
const fs = require('fs');
const { DateTime } = require('luxon');
function load(file) {
  const nodes = [];
  const mk = (kind) => (o) => { const n = { kind, ...o }; nodes.push(n); const self = new Proxy(n, { get: (t, p) => (p in t ? t[p] : () => self) }); return self; };
  const wf = new Proxy({}, { get: () => () => wf });
  const g = {
    trigger: mk('trigger'), node: mk('node'), languageModel: mk('model'), memory: mk('memory'), tool: mk('tool'), outputParser: mk('parser'),
    ifElse: (o) => mk('if')({ type: 'n8n-nodes-base.if', ...o }), switchCase: (o) => mk('switch')({ type: 'n8n-nodes-base.switch', ...o }),
    merge: (o) => mk('merge')({ type: 'n8n-nodes-base.merge', ...o }), splitInBatches: (o) => mk('sib')({ type: 'n8n-nodes-base.splitInBatches', ...o }),
    nextBatch: () => ({}), sticky: () => ({}), expr: (s) => '=' + s, newCredential: (n) => ({ name: n }), placeholder: (s) => s,
    fromAi: (k) => '$fromAI(' + k + ')', nodeJson: () => 'nodeJson', workflow: () => wf,
  };
  let src = fs.readFileSync(file, 'utf8').replace('export default', 'module.exports =');
  const fn = new Function(...Object.keys(g), 'module', src);
  fn(...Object.values(g), { exports: {} });
  return nodes;
}
function codeNodes(nodes) { return nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => ({ name: n.config.name, code: n.config.parameters.jsCode })); }
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function check(file) {
  const nodes = load(file);
  let bad = 0;
  for (const c of codeNodes(nodes)) {
    try { new AsyncFunction('$input', '$', 'DateTime', '$execution', '$getWorkflowStaticData', '$json', c.code); console.log('  OK syntax:', c.name); }
    catch (e) { bad++; console.log('  BAD syntax:', c.name, e.message); }
  }
  return { nodes, bad };
}
// Runs one Code node with fake n8n helpers. nodeData: { 'Node Name': [json, ...] }, input: [json,...]
async function run(code, input, nodeData = {}, opts = {}) {
  const wrap = (arr) => ({ all: () => arr.map((j) => ({ json: j })), first: () => ({ json: arr[0] }), get item() { return { json: arr[opts.itemIndex || 0] }; } });
  const $ = (name) => { if (!(name in nodeData)) throw new Error('Node not executed: ' + name); return wrap(nodeData[name]); };
  const $input = { ...wrap(input), item: { json: input[opts.itemIndex || 0] } };
  const fn = new AsyncFunction('$input', '$', 'DateTime', '$execution', '$getWorkflowStaticData', '$json', code);
  return fn($input, $, DateTime, { id: 'test-1', mode: opts.mode || 'test' }, () => (opts.static || {}), input[0]);
}
module.exports = { load, codeNodes, check, run };
if (require.main === module) { for (const f of process.argv.slice(2)) { console.log(f); const r = check(f); if (r.bad) process.exitCode = 1; } }
