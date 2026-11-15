const h = require('./harness');
const code = (f, name) => h.codeNodes(h.load(f)).find((c) => c.name === name).code;
const appt = 'plumbing, hvac, roofing, electrical, home services, auto repair, fitness, med spa, salon, dental, cleaning, landscaping, pest control, contractor'.split(', ');
let fails = 0;
const expect = (label, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : ' got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want))); };
(async () => {
  const a3 = code('../workflows/a3.js', 'Apply Scoring Rules');
  const base = { appointmentIndustries: appt, warmMinScore: 60 };
  const cases = [
    ['strong fit -> Warm 100', { industry: 'Plumbing', websiteReachable: true, hasPublicEmail: true, onlineBookingSeen: false, phoneOrFormOnly: true, inTargetArea: true, researchConfidence: 'High' }, [100, 'Warm', 'Ready for review']],
    ['no email -> Cold', { industry: 'HVAC', websiteReachable: true, hasPublicEmail: false, onlineBookingSeen: false, phoneOrFormOnly: true, inTargetArea: true, researchConfidence: 'High' }, [85, 'Cold', 'Ready for review']],
    ['low confidence -> Cold', { industry: 'Roofing', websiteReachable: true, hasPublicEmail: true, onlineBookingSeen: false, phoneOrFormOnly: true, inTargetArea: true, researchConfidence: 'Low' }, [85, 'Cold', 'Ready for review']],
    ['booking exists, medium -> 70 Warm', { industry: 'Med spa', websiteReachable: true, hasPublicEmail: true, onlineBookingSeen: true, phoneOrFormOnly: false, inTargetArea: true, researchConfidence: 'Medium' }, [70, 'Warm', 'Ready for review']],
    ['unreachable no contact -> Invalid', { industry: 'Fitness', websiteReachable: false, hasPublicEmail: false, inTargetArea: true, researchConfidence: 'Low', publicPhone: '' }, [30, 'Cold', 'Invalid contact']],
    ['unreachable but phone -> Ready', { industry: 'Fitness', websiteReachable: false, hasPublicEmail: false, inTargetArea: true, researchConfidence: 'Low', publicPhone: '770-555-0105' }, [30, 'Cold', 'Ready for review']],
    ['interested reply -> Hot', { industry: 'Plumbing', websiteReachable: true, hasPublicEmail: true, inTargetArea: true, researchConfidence: 'Medium', replyCategory: 'Interested', currentPipelineStatus: 'Contacted' }, [80, 'Hot', 'Contacted']],
    ['high score alone never Hot', { industry: 'Plumbing', websiteReachable: true, hasPublicEmail: true, phoneOrFormOnly: true, inTargetArea: true, researchConfidence: 'High' }, [100, 'Warm', 'Ready for review']],
    ['opted out -> Unsubscribed', { industry: 'Salon', websiteReachable: true, hasPublicEmail: true, inTargetArea: true, researchConfidence: 'High', optedOut: 'YES' }, [90, 'Warm', 'Unsubscribed']],
    ['unknown industry, outside area', { industry: 'Law firm', websiteReachable: true, hasPublicEmail: true, inTargetArea: false, researchConfidence: 'Medium' }, [50, 'Cold', 'Ready for review']],
    ['bad confidence text treated Low', { industry: 'Plumbing', websiteReachable: true, hasPublicEmail: true, inTargetArea: true, researchConfidence: 'very sure' }, [75, 'Cold', 'Ready for review']]
  ];
  for (const [label, f, want] of cases) {
    const out = (await h.run(a3, [Object.assign({}, base, f)]))[0].json;
    expect('A3 ' + label, [out.fitScore, out.temperature, out.pipelineStatus], want);
  }
  const h0 = code('../workflows/h0.js', 'Build Agency Config');
  const loc = { 'CRM Location': [{ crmUrl: 'https://docs.google.com/spreadsheets/d/AbC_123-x/edit#gid=0', crmEnvironment: 'DEMO' }] };
  const rows = [{ Key: 'ENVIRONMENT', Value: 'DEMO' }, { Key: 'SYSTEM_PAUSED', Value: 'no' }, { Key: 'OUTREACH_PAUSED', Value: 'YES' }, { Key: 'RESEARCH_BATCH_SIZE', Value: '5' }, { Key: 'TARGET_CITIES', Value: 'Atlanta, Decatur' }];
  let o = (await h.run(h0, rows, loc))[0].json;
  expect('H0 good config', [o.ok, o.crmId, o.systemPaused, o.outreachPaused, o.targetCities.length], [true, 'AbC_123-x', false, true, 2]);
  o = (await h.run(h0, rows, { 'CRM Location': [{ crmUrl: 'https://docs.google.com/spreadsheets/d/PASTE_DEMO_CRM_ID_HERE/edit', crmEnvironment: 'DEMO' }] }))[0].json;
  expect('H0 missing link -> paused', [o.ok, o.systemPaused, o.outreachPaused], [false, true, true]);
  o = (await h.run(h0, [{ Key: 'ENVIRONMENT', Value: 'LIVE' }, { Key: 'SYSTEM_PAUSED', Value: 'NO' }], loc))[0].json;
  expect('H0 DEMO/LIVE mismatch -> paused', [o.ok, o.systemPaused], [false, true]);
  o = (await h.run(h0, [{ error: { message: 'The caller does not have permission' } }], loc))[0].json;
  expect('H0 unreadable sheet -> paused', [o.ok, o.systemPaused], [false, true]);
  o = (await h.run(h0, rows.concat([{ Key: 'SYSTEM_PAUSED', Value: 'YES' }]), loc))[0].json;
  expect('H0 emergency pause YES', [o.ok, o.systemPaused], [true, true]);
  const h4 = code('../workflows/h4.js', 'Format Log Rows');
  const lg = await h.run(h4, [{ crmUrl: 'u', workflow: 'A1', event: 'leads_added', count: '3', isDemo: true }, { workflow: 'x' }]);
  expect('H4 formats valid events only', [lg.length, lg[0].json.Count, lg[0].json['Is Demo']], [1, 3, 'YES']);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
})();
