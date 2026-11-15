const h0 = require('./harness');
const C = Object.fromEntries(h0.codeNodes(h0.load('../workflows/a10.js')).map((c) => [c.name, c.code]));
let fails = 0;
const expect = (l, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + l + (ok ? '' : ' got=' + JSON.stringify(g) + ' want=' + JSON.stringify(w))); };
(async () => {
  const cfg = { ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/X/edit', crmId: 'X', timezone: 'America/New_York', settings: { OWNER_ALERT_EMAIL: '[FILL IN]' } };
  const ev = { execution: { id: '9', url: 'https://x.example/e/9', error: { message: '=HYPERLINK("bad")\nline2' }, lastNodeExecuted: 'Read Leads' }, workflow: { name: '[AGENCY] A2 Research & Analyze' } };
  let r = (await h0.run(C['Format Error Row'], [cfg], { 'When An Agency Workflow Fails': [ev] }))[0].json;
  expect('full error captured', [r.row.Workflow, r.row['Failed Step'], r.row['Execution Link'], r.canLog], ['[AGENCY] A2 Research & Analyze', 'Read Leads', 'https://x.example/e/9', true]);
  expect('formula neutralised + one line', r.row.Error, "'=HYPERLINK(\"bad\") line2");
  expect('placeholder owner email not used', r.ownerEmail, '');
  r = (await h0.run(C['Format Error Row'], [{ error: { message: 'H0 failed' } }], { 'When An Agency Workflow Fails': [{ trigger: { error: { message: 'Could not start' } }, workflow: { name: 'A1' } }] }))[0].json;
  expect('no execution data + no CRM -> safe fallback', [r.row['Failed Step'], r.row.Error, r.canLog], ['Unknown (workflow may not have started)', 'Could not start', false]);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
})();
