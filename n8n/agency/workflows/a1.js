const manualStart = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Run Discovery Now' },
  output: [{}]
});

const calledStart = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: { name: 'When Called By Scheduler', parameters: { inputSource: 'passthrough' } },
  output: [{}]
});

const loadConfig = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Load Agency Config',
    executeOnce: true,
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'EwEgjWyFneyjExzI', cachedResultName: '[AGENCY] H0 Helper: Agency Config' },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', crmId: 'SAMPLE', environment: 'DEMO', isDemo: true, systemPaused: false, osmEnabled: false, discoveryMaxNew: 25, targetCities: ['Atlanta'], osmBbox: '33.40,-84.85,34.20,-83.90' }]
});

const allowed = ifElse({
  version: 2.2,
  config: {
    name: 'Allowed To Run?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.ok }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' },
          { leftValue: expr('{{ $json.systemPaused }}'), operator: { type: 'boolean', operation: 'false', singleValue: true }, rightValue: '' }
        ],
        combinator: 'and'
      }
    }
  }
});

const stopped = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Stopped: Paused Or Not Set Up',
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: 'st-1', name: 'stopped', value: true, type: 'boolean' },
      { id: 'st-2', name: 'reason', value: expr('{{ $json.problems || "SYSTEM_PAUSED is YES in the CRM Settings tab." }}'), type: 'string' }
    ] } }
  },
  output: [{ stopped: true, reason: 'SYSTEM_PAUSED is YES' }]
});

const readInbox = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Read Discovery Inbox',
    executeOnce: true,
    alwaysOutputData: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'read',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Discovery Inbox' },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ row_number: 2, 'Business Name': 'Peachtree Pro Plumbing (DEMO)', Industry: 'Plumbing', City: 'Decatur', State: 'GA', Website: 'https://peachtree-pro-plumbing.example', Imported: 'NO' }]
});

const gather = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Gather Inbox Rows',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Collects inbox rows that still need importing, and prepares the (optional) OpenStreetMap query.
const cfg = $('Load Agency Config').first().json;
const NL = String.fromCharCode(10);
const rows = $input.all().map((i) => i.json || {});
const readError = rows.find((r) => r.error);
const pending = readError ? [] : rows.filter((r) => r.row_number && String(r.Imported || '').trim().toUpperCase() !== 'YES' && (String(r['Business Name'] || '').trim() || String(r.Website || '').trim()));
const bbox = String(cfg.osmBbox || '33.40,-84.85,34.20,-83.90');
const osmQuery = [
  '[out:json][timeout:60];',
  '(',
  '  nwr["craft"~"^(plumber|hvac|roofer|electrician|gardener)$"](' + bbox + ');',
  '  nwr["shop"~"^(car_repair|hairdresser|beauty)$"](' + bbox + ');',
  '  nwr["leisure"="fitness_centre"](' + bbox + ');',
  '  nwr["amenity"="dentist"](' + bbox + ');',
  ');',
  'out center tags 200;'
].join(NL);
return [{ json: { inboxRows: pending, inboxReadError: readError ? String((readError.error && readError.error.message) || readError.error) : '', osmEnabled: cfg.osmEnabled === true, osmQuery } }];` }
  },
  output: [{ inboxRows: [], inboxReadError: '', osmEnabled: false, osmQuery: '[out:json];' }]
});

const useOsm = ifElse({
  version: 2.2,
  config: {
    name: 'Use OpenStreetMap?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.osmEnabled }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});

const askOsm = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Ask OpenStreetMap',
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 5000,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://overpass-api.de/api/interpreter',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: { parameters: [{ name: 'User-Agent', value: 'AgencyLeadResearch/0.1 (n8n; low-volume weekly queries)' }] },
      sendBody: true,
      contentType: 'form-urlencoded',
      bodyParameters: { parameters: [{ name: 'data', value: expr('{{ $json.osmQuery }}') }] },
      options: { timeout: 90000 }
    }
  },
  output: [{ elements: [{ type: 'node', id: 1, lat: 33.77, lon: -84.29, tags: { name: 'Sample Plumbing', craft: 'plumber', website: 'https://sample.example' } }] }]
});

const collect = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Collect And Check Candidates',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Turns inbox rows and OpenStreetMap results into checked candidates. Never invents data.
const cfg = $('Load Agency Config').first().json;
const g = $('Gather Inbox Rows').first().json;
let osm = [];
let osmError = '';
if (g.osmEnabled) {
  try {
    const r = $('Ask OpenStreetMap').first().json;
    if (r.error) osmError = String((r.error && r.error.message) || r.error).slice(0, 200);
    else osm = Array.isArray(r.elements) ? r.elements : [];
  } catch (e) { osmError = 'OpenStreetMap step did not run'; }
}
const cities = (cfg.targetCities || []).map((c) => String(c).trim().toLowerCase());
const bb = String(cfg.osmBbox || '').split(',').map(Number);
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const slug = (s) => clean(s).toLowerCase().split('').map((ch) => ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') ? ch : '-')).join('').split('-').filter(Boolean).join('-');
const normSite = (u) => {
  let s = clean(u).toLowerCase();
  if (!s) return null;
  if (s.indexOf('http://') !== 0 && s.indexOf('https://') !== 0) {
    if (s.indexOf('://') !== -1) return null;
    s = 'https://' + s;
  }
  let host = s.split('://')[1].split('/')[0].split('?')[0].split('#')[0];
  if (host.indexOf('www.') === 0) host = host.slice(4);
  const okChars = host.split('').every((ch) => (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '.' || ch === '-');
  if (!host || !okChars || host.indexOf('.') === -1) return null;
  return { website: 'https://' + host, domain: host };
};
const validEmail = (e) => {
  const s = clean(e).toLowerCase();
  const parts = s.split('@');
  if (parts.length !== 2 || !parts[0] || s.indexOf(' ') !== -1) return '';
  const d = parts[1];
  if (d.indexOf('.') === -1 || d[0] === '.' || d[d.length - 1] === '.') return '';
  return s;
};
const digits = (p) => clean(p).split('').filter((ch) => ch >= '0' && ch <= '9').length;
const osmIndustry = (t) => {
  if (t.craft === 'plumber') return 'Plumbing';
  if (t.craft === 'hvac') return 'HVAC';
  if (t.craft === 'roofer') return 'Roofing';
  if (t.craft === 'electrician') return 'Electrical';
  if (t.craft === 'gardener') return 'Landscaping';
  if (t.shop === 'car_repair') return 'Auto repair';
  if (t.shop === 'hairdresser') return 'Salon';
  if (t.shop === 'beauty') return 'Salon / beauty';
  if (t.leisure === 'fitness_centre') return 'Fitness';
  if (t.amenity === 'dentist') return 'Dental';
  return 'Home services';
};
const today = DateTime.now().setZone(cfg.timezone || 'America/New_York').toFormat('yyyy-LL-dd');
const raw = [];
(g.inboxRows || []).forEach((r) => raw.push({
  origin: 'inbox', rowNumber: r.row_number,
  name: clean(r['Business Name']), industry: clean(r.Industry), city: clean(r.City), state: clean(r.State),
  street: '', zip: '', websiteRaw: clean(r.Website), phone: clean(r['Public Phone']), emailRaw: clean(r['Public Email']),
  source: clean(r.Source) || 'Manual / Discovery Inbox', sourceUrl: clean(r['Source URL']) || clean(r.Website),
  license: clean(r['Source License']) || 'Entered by hand', osmKey: '', lat: null, lon: null
}));
osm.forEach((el) => {
  const t = el.tags || {};
  const lat = el.lat !== undefined ? el.lat : (el.center ? el.center.lat : null);
  const lon = el.lon !== undefined ? el.lon : (el.center ? el.center.lon : null);
  raw.push({
    origin: 'osm', rowNumber: null,
    name: clean(t.name), industry: osmIndustry(t), city: clean(t['addr:city']), state: clean(t['addr:state']),
    street: [clean(t['addr:housenumber']), clean(t['addr:street'])].filter(Boolean).join(' '), zip: clean(t['addr:postcode']),
    websiteRaw: clean(t.website || t['contact:website']), phone: clean(t.phone || t['contact:phone']), emailRaw: clean(t.email || t['contact:email']),
    source: 'OpenStreetMap', sourceUrl: 'https://www.openstreetmap.org/' + el.type + '/' + el.id,
    license: 'Data (c) OpenStreetMap contributors, ODbL', osmKey: el.type + '-' + el.id, lat, lon
  });
});
const candidates = raw.map((c) => {
  const notes = [];
  let reject = '';
  const site = c.websiteRaw ? normSite(c.websiteRaw) : null;
  if (c.websiteRaw && !site) notes.push('website could not be read and was ignored');
  const email = validEmail(c.emailRaw);
  if (c.emailRaw && !email) notes.push('email looked invalid and was ignored');
  const state = c.state.toUpperCase();
  const inBox = c.lat !== null && bb.length === 4 && c.lat >= bb[0] && c.lat <= bb[2] && c.lon >= bb[1] && c.lon <= bb[3];
  const cityOk = c.city ? cities.indexOf(c.city.toLowerCase()) !== -1 : inBox;
  if (c.name.length < 2) reject = 'missing business name';
  else if (state && state !== 'GA' && state !== 'GEORGIA') reject = 'not in Georgia';
  else if (!cityOk) reject = 'outside target area' + (c.city ? ' (' + c.city + ')' : '');
  else if (!site && digits(c.phone) < 10) reject = 'no usable website or phone';
  const leadId = site ? 'L-' + site.domain : (c.osmKey ? 'L-osm-' + c.osmKey : 'L-' + slug(c.name) + '-' + slug(c.city || 'atl'));
  return {
    origin: c.origin, rowNumber: c.rowNumber, reject, notes: notes.join('; '),
    leadId, domain: site ? site.domain : '', nameKey: slug(c.name) + '|' + slug(c.city), osmKey: c.osmKey,
    row: {
      'Lead ID': leadId, 'Is Demo': cfg.isDemo === false ? 'NO' : 'YES', 'Business Name': c.name, Industry: c.industry,
      'Street Address': c.street, City: c.city || 'Unknown (inside Atlanta metro area)', State: 'GA', ZIP: c.zip,
      Website: site ? site.website : '', 'Public Email': email, 'Email Found At': email ? c.sourceUrl : '',
      'Public Phone': c.phone, 'Discovery Source': c.source, 'Source URL': c.sourceUrl, 'Source License': c.license,
      'Discovered At': today, 'Pipeline Status': 'Not researched', 'Opted Out': 'NO', 'Last Updated': today,
      Notes: notes.join('; ')
    }
  };
});
return [{ json: { candidates, osmCount: osm.length, osmError, inboxReadError: g.inboxReadError } }];` }
  },
  output: [{ candidates: [], osmCount: 0, osmError: '', inboxReadError: '' }]
});

const readLeads = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Read Existing Leads',
    executeOnce: true,
    alwaysOutputData: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'read',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Leads' },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Lead ID': 'L-existing.example', Website: 'https://existing.example', 'Business Name': 'Existing Co', City: 'Atlanta' }]
});

const readSuppression = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Read Suppression List',
    executeOnce: true,
    alwaysOutputData: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'read',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Suppression List' },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Email Or Domain': 'donotcontact@blocked-demo.example', Type: 'email' }]
});

const plan = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Remove Duplicates And Plan',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Skips anything already in Leads (same Lead ID, website domain, OSM id, or name + city),
// anything on the Suppression List, and caps how many new leads one run may add.
const cfg = $('Load Agency Config').first().json;
const c = $('Collect And Check Candidates').first().json;
const leadRows = $('Read Existing Leads').all().map((i) => i.json || {});
const supRows = $input.all().map((i) => i.json || {});
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const slug = (s) => clean(s).toLowerCase().split('').map((ch) => ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') ? ch : '-')).join('').split('-').filter(Boolean).join('-');
const readErrors = [];
if (leadRows.some((r) => r.error)) readErrors.push('could not read Leads');
if (supRows.some((r) => r.error)) readErrors.push('could not read Suppression List');
const ids = new Map();
const domains = new Map();
const names = new Map();
leadRows.filter((r) => !r.error).forEach((r) => {
  const id = clean(r['Lead ID']);
  if (!id) return;
  ids.set(id, id);
  const w = clean(r.Website).toLowerCase().split('://').pop().split('/')[0];
  if (w) domains.set(w.indexOf('www.') === 0 ? w.slice(4) : w, id);
  names.set(slug(r['Business Name']) + '|' + slug(r.City), id);
  const su = clean(r['Source URL']);
  if (su.indexOf('openstreetmap.org/') !== -1) ids.set('L-osm-' + su.split('openstreetmap.org/')[1].split('/').join('-'), id);
});
const suppressed = supRows.filter((r) => !r.error).map((r) => clean(r['Email Or Domain']).toLowerCase()).filter(Boolean);
const isSuppressed = (cand) => {
  const email = clean(cand.row['Public Email']).toLowerCase();
  const emailDomain = email.indexOf('@') !== -1 ? email.split('@')[1] : '';
  return suppressed.some((s) => s === email || (s.indexOf('@') === -1 && (s === cand.domain || s === emailDomain)));
};
const max = Number(cfg.discoveryMaxNew) > 0 ? Number(cfg.discoveryMaxNew) : 25;
const newLeads = [];
const results = [];
let duplicates = 0;
let rejected = 0;
let suppressedCount = 0;
let overLimit = 0;
(c.candidates || []).forEach((cand) => {
  let result;
  let imported = 'YES';
  if (readErrors.length) { result = 'Not processed: ' + readErrors.join(', '); imported = 'NO'; }
  else if (cand.reject) { result = 'Rejected: ' + cand.reject; rejected++; }
  else {
    const dupOf = ids.get(cand.leadId) || (cand.domain && domains.get(cand.domain)) || names.get(cand.nameKey) || (cand.osmKey && ids.get('L-osm-' + cand.osmKey));
    if (dupOf) { result = 'Duplicate of ' + dupOf; duplicates++; }
    else if (isSuppressed(cand)) { result = 'Skipped: on Suppression List'; suppressedCount++; }
    else if (newLeads.length >= max) { result = 'Waiting: run limit reached, will retry next run'; imported = 'NO'; overLimit++; }
    else {
      newLeads.push(cand.row);
      ids.set(cand.leadId, cand.leadId);
      if (cand.domain) domains.set(cand.domain, cand.leadId);
      names.set(cand.nameKey, cand.leadId);
      result = 'Added as ' + cand.leadId + (cand.notes ? ' (' + cand.notes + ')' : '');
    }
  }
  if (cand.origin === 'inbox' && cand.rowNumber) results.push({ rowNumber: cand.rowNumber, imported, result });
});
return [{ json: {
  newLeads, inboxResults: results,
  summary: { added: newLeads.length, duplicates, rejected, suppressed: suppressedCount, waiting: overLimit, osmFound: c.osmCount, osmError: c.osmError, readErrors: readErrors.join(', '), inboxReadError: c.inboxReadError }
} }];` }
  },
  output: [{ newLeads: [], inboxResults: [], summary: { added: 0, duplicates: 0, rejected: 0 } }]
});

const newRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'New Lead Rows',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.newLeads || []).map((r) => ({ json: r }));` }
  },
  output: [{ 'Lead ID': 'L-sample.example', 'Business Name': 'Sample' }]
});


const addLeads = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Add New Leads',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Leads' },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: 'Lead ID', displayName: 'Lead ID', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Is Demo', displayName: 'Is Demo', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Business Name', displayName: 'Business Name', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Industry', displayName: 'Industry', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Street Address', displayName: 'Street Address', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'City', displayName: 'City', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'State', displayName: 'State', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'ZIP', displayName: 'ZIP', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Website', displayName: 'Website', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Public Email', displayName: 'Public Email', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Email Found At', displayName: 'Email Found At', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Public Phone', displayName: 'Public Phone', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Discovery Source', displayName: 'Discovery Source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Source URL', displayName: 'Source URL', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Source License', displayName: 'Source License', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Discovered At', displayName: 'Discovered At', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Pipeline Status', displayName: 'Pipeline Status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Opted Out', displayName: 'Opted Out', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Last Updated', displayName: 'Last Updated', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Notes', displayName: 'Notes', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Lead ID': 'L-sample.example' }]
});

const inboxUpdates = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Inbox Status Updates',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Writes Imported + Import Result back next to each inbox row (columns M and N).
const res = $input.first().json.inboxResults || [];
if (!res.length) return [];
const data = res.map((r) => ({ range: "'Discovery Inbox'!M" + r.rowNumber + ':N' + r.rowNumber, values: [[r.imported, r.result]] }));
return [{ json: { body: { valueInputOption: 'RAW', data } } }];` }
  },
  output: [{ body: { valueInputOption: 'RAW', data: [] } }]
});

const markInbox = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Mark Inbox Rows',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr('https://sheets.googleapis.com/v4/spreadsheets/{{ $("Load Agency Config").first().json.crmId }}/values:batchUpdate'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json.body) }}'),
      options: { timeout: 30000 }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ totalUpdatedRows: 1 }]
});

const events = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Activity Events',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Builds Activity Log events from what this run actually did.
const cfg = $('Load Agency Config').first().json;
const s = $input.first().json.summary || {};
const base = { crmUrl: cfg.crmUrl, workflow: 'A1 Discover Businesses', runId: String($execution.id), isDemo: cfg.isDemo !== false, leadId: '' };
const ev = [
  Object.assign({}, base, { event: 'leads_added', count: s.added || 0, details: 'New leads added to Leads (status Not researched)' }),
  Object.assign({}, base, { event: 'duplicates_skipped', count: s.duplicates || 0, details: 'Already in Leads' }),
  Object.assign({}, base, { event: 'candidates_rejected', count: s.rejected || 0, details: 'Failed checks (name, area, contact)' }),
  Object.assign({}, base, { event: 'suppressed_skipped', count: s.suppressed || 0, details: 'On Suppression List' })
];
const problems = [s.readErrors, s.inboxReadError, s.osmError].filter(Boolean);
if (problems.length) ev.push(Object.assign({}, base, { event: 'discovery_warning', count: problems.length, details: problems.join(' | ') }));
return ev.map((e) => ({ json: e }));` }
  },
  output: [{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', event: 'leads_added', count: 0 }]
});

const logActivity = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Log Activity',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'W4IqWN9nxt1abIKb', cachedResultName: '[AGENCY] H4 Helper: Log Activity' },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ logged: true, rows: 4 }]
});

const summary = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Discovery Summary',
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: 'ds-1', name: 'summary', value: expr('{{ $("Remove Duplicates And Plan").first().json.summary }}'), type: 'object' }
    ] } }
  },
  output: [{ summary: { added: 0 } }]
});

const note = sticky('## A1 Discover Businesses (Stage 1)\nSources: the CRM **Discovery Inbox** tab (added by hand or from an approved data export) and, only when OSM_DISCOVERY_ENABLED = YES, a small OpenStreetMap search of the Atlanta metro box.\n\nChecks every candidate (name, Georgia, target city, usable website or phone, valid email), skips duplicates and Suppression List entries, caps new leads per run, writes them to **Leads** as "Not researched", and marks each inbox row with the result.\n\nNever invents contact details. Never scrapes Google Maps or Yelp.', [readInbox], { color: 6 });

export default workflow('agency-a1-discover', '[AGENCY] A1 Discover Businesses')
  .add(manualStart)
  .to(loadConfig)
  .add(calledStart)
  .to(loadConfig)
  .add(loadConfig)
  .to(allowed
    .onTrue(readInbox.to(gather).to(useOsm
      .onTrue(askOsm.to(collect))
      .onFalse(collect)))
    .onFalse(stopped))
  .add(collect)
  .to(readLeads)
  .to(readSuppression)
  .to(plan)
  .add(plan)
  .to(newRows)
  .to(addLeads)
  .add(plan)
  .to(inboxUpdates)
  .to(markInbox)
  .add(plan)
  .to(events)
  .to(logActivity)
  .to(summary)
  .add(note);
