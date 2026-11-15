const h = require('./harness');
const C = Object.fromEntries(h.codeNodes(h.load('../workflows/a1.js')).map((c) => [c.name, c.code]));
let fails = 0;
const expect = (l, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + l + (ok ? '' : ' got=' + JSON.stringify(g) + ' want=' + JSON.stringify(w))); };
const cfg = { ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/X/edit', crmId: 'X', isDemo: true, systemPaused: false, osmEnabled: false, discoveryMaxNew: 25,
  targetCities: 'Atlanta, Decatur, Marietta, Smyrna, Sandy Springs, Alpharetta'.split(', '), osmBbox: '33.40,-84.85,34.20,-83.90', timezone: 'America/New_York' };
const inbox = [
  ['Peachtree Pro Plumbing (DEMO)','Plumbing','Decatur','GA','https://peachtree-pro-plumbing.example','404-555-0101','info@peachtree-pro-plumbing.example'],
  ['Buckhead Comfort HVAC (DEMO)','HVAC','Atlanta','GA','https://buckhead-comfort-hvac.example','404-555-0102',''],
  ['Marietta Ridge Roofing (DEMO)','Roofing','Marietta','GA','https://marietta-ridge-roofing.example','770-555-0103','hello@marietta-ridge-roofing.example'],
  ['Glow Lab Med Spa (DEMO)','Med spa','Alpharetta','GA','https://glowlab-medspa.example','678-555-0104','frontdesk@glowlab-medspa.example'],
  ['Iron Oak Fitness (DEMO)','Fitness','Smyrna','GA','https://ironoak-fitness.example','770-555-0105',''],
  ['Peachtree Pro Plumbing (DEMO)','Plumbing','Decatur','GA','https://www.peachtree-pro-plumbing.example/contact','404-555-0101',''],
  ['Savannah Shine Auto (DEMO)','Auto repair','Savannah','GA','https://savannah-shine-auto.example','912-555-0107',''],
  ['','Salon','Atlanta','GA','https://no-name-salon.example','404-555-0108','not-an-email']
].map((r, i) => ({ row_number: i + 2, 'Business Name': r[0], Industry: r[1], City: r[2], State: r[3], Website: r[4], 'Public Phone': r[5], 'Public Email': r[6], Source: 'Fictional demo', 'Source URL': r[4], 'Source License': 'Fictional test data', Imported: 'NO' }));
inbox.push({ row_number: 10, 'Business Name': 'Already Done Co', Website: 'https://done.example', Imported: 'YES' });
(async () => {
  const g = (await h.run(C['Gather Inbox Rows'], inbox, { 'Load Agency Config': [cfg] }))[0].json;
  expect('gather skips already-imported rows', g.inboxRows.length, 8);
  expect('OSM off by default', g.osmEnabled, false);
  const col = (await h.run(C['Collect And Check Candidates'], [g], { 'Load Agency Config': [cfg], 'Gather Inbox Rows': [g] }))[0].json;
  const byRow = Object.fromEntries(col.candidates.map((c) => [c.rowNumber, c]));
  expect('valid lead id from domain', byRow[2].leadId, 'L-peachtree-pro-plumbing.example');
  expect('www + path normalized to same domain', byRow[7].leadId, 'L-peachtree-pro-plumbing.example');
  expect('Savannah rejected (outside area)', byRow[8].reject.indexOf('outside target area') === 0, true);
  expect('missing name rejected', byRow[9].reject, 'missing business name');
  expect('website stored as clean origin', byRow[2].row.Website, 'https://peachtree-pro-plumbing.example');
  const existing = [{ 'Lead ID': 'L-glowlab-medspa.example', Website: 'https://www.glowlab-medspa.example', 'Business Name': 'Glow Lab Med Spa (DEMO)', City: 'Alpharetta' }];
  const sup = [{ 'Email Or Domain': 'marietta-ridge-roofing.example', Type: 'domain' }];
  const p = (await h.run(C['Remove Duplicates And Plan'], sup, { 'Load Agency Config': [cfg], 'Collect And Check Candidates': [col], 'Read Existing Leads': existing }))[0].json;
  expect('added: Peachtree, Buckhead, Iron Oak', p.newLeads.map((r) => r['Lead ID']), ['L-peachtree-pro-plumbing.example', 'L-buckhead-comfort-hvac.example', 'L-ironoak-fitness.example']);
  expect('summary counts', [p.summary.added, p.summary.duplicates, p.summary.rejected, p.summary.suppressed], [3, 2, 2, 1]);
  const res = Object.fromEntries(p.inboxResults.map((r) => [r.rowNumber, r.result]));
  expect('in-run duplicate detected', res[7], 'Duplicate of L-peachtree-pro-plumbing.example');
  expect('existing lead duplicate detected', res[5], 'Duplicate of L-glowlab-medspa.example');
  expect('suppressed domain skipped', res[4], 'Skipped: on Suppression List');
  expect('new leads are Not researched + demo', [p.newLeads[0]['Pipeline Status'], p.newLeads[0]['Is Demo']], ['Not researched', 'YES']);
  const p2 = (await h.run(C['Remove Duplicates And Plan'], [{ error: { message: 'boom' } }], { 'Load Agency Config': [cfg], 'Collect And Check Candidates': [col], 'Read Existing Leads': existing }))[0].json;
  expect('unreadable suppression list -> add nothing, retry later', [p2.newLeads.length, p2.inboxResults.every((r) => r.imported === 'NO')], [0, true]);
  const p3 = (await h.run(C['Remove Duplicates And Plan'], sup, { 'Load Agency Config': [Object.assign({}, cfg, { discoveryMaxNew: 1 })], 'Collect And Check Candidates': [col], 'Read Existing Leads': existing }))[0].json;
  expect('run cap respected, rest wait', [p3.newLeads.length, p3.summary.waiting], [1, 2]);
  const upd = (await h.run(C['Inbox Status Updates'], [p]))[0].json;
  expect('inbox write-back ranges', upd.body.data[0].range, "'Discovery Inbox'!M2:N2");
  // OSM path with fictional elements
  const g2 = Object.assign({}, g, { osmEnabled: true, inboxRows: [] });
  const osmResp = { elements: [
    { type: 'node', id: 101, lat: 33.75, lon: -84.39, tags: { name: 'Fictional Atlanta Plumbers', craft: 'plumber', website: 'fictional-atl-plumbers.example', phone: '+1 404 555 0111', 'addr:city': 'Atlanta' } },
    { type: 'way', id: 202, center: { lat: 33.95, lon: -84.55 }, tags: { name: 'Fictional Gym', leisure: 'fitness_centre', phone: '770-555-0112' } },
    { type: 'node', id: 303, lat: 32.08, lon: -81.09, tags: { name: 'Far Away Salon', shop: 'hairdresser', website: 'far.example' } },
    { type: 'node', id: 404, lat: 33.8, lon: -84.3, tags: { craft: 'roofer', website: 'noname.example' } }
  ] };
  const col2 = (await h.run(C['Collect And Check Candidates'], [g2], { 'Load Agency Config': [cfg], 'Gather Inbox Rows': [g2], 'Ask OpenStreetMap': [osmResp] }))[0].json;
  expect('OSM: 4 found, 2 ok', [col2.osmCount, col2.candidates.filter((c) => !c.reject).length], [4, 2]);
  expect('OSM: id + license recorded', [col2.candidates[1].leadId, col2.candidates[1].row['Source License']], ['L-osm-way-202', 'Data (c) OpenStreetMap contributors, ODbL']);
  const col3 = (await h.run(C['Collect And Check Candidates'], [g2], { 'Load Agency Config': [cfg], 'Gather Inbox Rows': [g2], 'Ask OpenStreetMap': [{ error: { message: '429 Too Many Requests' } }] }))[0].json;
  expect('OSM error handled', [col3.osmCount, col3.osmError.indexOf('429') !== -1], [0, true]);
  const ev = await h.run(C['Activity Events'], [p], { 'Load Agency Config': [cfg] });
  expect('activity events', ev.map((e) => e.json.event + ':' + e.json.count), ['leads_added:3', 'duplicates_skipped:2', 'candidates_rejected:2', 'suppressed_skipped:1']);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
})();
