const whenCalled = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: { name: 'When Called', parameters: { inputSource: 'passthrough' } },
  output: [{}]
});

const location = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'CRM Location',
    executeOnce: true,
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: { assignments: [
        { id: 'loc-url', name: 'crmUrl', value: 'https://docs.google.com/spreadsheets/d/PASTE_DEMO_CRM_ID_HERE/edit', type: 'string' },
        { id: 'loc-env', name: 'crmEnvironment', value: 'DEMO', type: 'string' }
      ] }
    }
  },
  output: [{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', crmEnvironment: 'DEMO' }]
});

const readSettings = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Read Settings Tab',
    executeOnce: true,
    alwaysOutputData: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'read',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Settings' },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ Key: 'ENVIRONMENT', Value: 'DEMO' }, { Key: 'SYSTEM_PAUSED', Value: 'NO' }]
});

const buildConfig = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Agency Config',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Turns the CRM Settings tab into one config object. Fails SAFE: any problem = paused.
const loc = $('CRM Location').first().json;
const rows = $input.all().map((i) => i.json || {});
const problems = [];
const crmUrl = String(loc.crmUrl || '').trim();
const marker = '/spreadsheets/d/';
const at = crmUrl.indexOf(marker);
const crmId = at === -1 ? '' : crmUrl.slice(at + marker.length).split('/')[0].split('?')[0].split('#')[0];
if (!crmId || crmUrl.indexOf('PASTE_') !== -1) problems.push('The CRM link is not set in H0 Agency Config.');
const readError = rows.find((r) => r.error);
if (readError) problems.push('Could not read the Settings tab: ' + String((readError.error && readError.error.message) || readError.error).slice(0, 200));
const s = {};
rows.forEach((r) => {
  const k = String(r.Key || '').trim();
  if (k) s[k] = String(r.Value === undefined || r.Value === null ? '' : r.Value).trim();
});
const expectedEnv = String(loc.crmEnvironment || '').trim().toUpperCase();
const env = String(s.ENVIRONMENT || '').trim().toUpperCase();
if (!readError && crmId && env !== expectedEnv) problems.push('Environment mismatch: these workflows expect ' + expectedEnv + ' but the CRM Settings say ' + (env || 'nothing') + '.');
const yes = (v) => String(v || '').trim().toUpperCase() === 'YES';
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const list = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
const ok = problems.length === 0;
return [{ json: {
  ok,
  problems: problems.join(' '),
  crmUrl,
  crmId,
  environment: expectedEnv,
  isDemo: expectedEnv !== 'LIVE',
  systemPaused: ok ? yes(s.SYSTEM_PAUSED) : true,
  outreachPaused: ok ? (s.OUTREACH_PAUSED === undefined ? true : yes(s.OUTREACH_PAUSED)) : true,
  osmEnabled: ok && yes(s.OSM_DISCOVERY_ENABLED),
  researchBatchSize: Math.min(num(s.RESEARCH_BATCH_SIZE, 5), 20),
  discoveryMaxNew: Math.min(num(s.DISCOVERY_MAX_NEW_PER_RUN, 25), 100),
  dailySendLimit: num(s.DAILY_SEND_LIMIT, 10),
  warmMinScore: num(s.WARM_MIN_SCORE, 60),
  targetCities: list(s.TARGET_CITIES),
  appointmentIndustries: list(s.APPOINTMENT_INDUSTRIES).map((x) => x.toLowerCase()),
  targetIndustries: list(s.TARGET_INDUSTRIES),
  osmBbox: s.OSM_BBOX || '33.40,-84.85,34.20,-83.90',
  timezone: s.TIMEZONE || 'America/New_York',
  aiModelLabel: s.AI_MODEL_LABEL || '',
  aiInputPricePerM: Number(s.AI_INPUT_PRICE_PER_M) || 0,
  aiOutputPricePerM: Number(s.AI_OUTPUT_PRICE_PER_M) || 0,
  settings: s
} }];` }
  },
  output: [{ ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', crmId: 'SAMPLE', environment: 'DEMO', isDemo: true, systemPaused: false, outreachPaused: true }]
});

const note = sticky('## H0 Agency Config (helper)\nEvery agency workflow calls this first.\n\n**EDIT ONCE:** paste the Agency CRM - DEMO link into **CRM Location**.\n\nIt reads the CRM **Settings** tab (pause switches, limits, target cities). If anything is wrong (no link, unreadable sheet, DEMO/LIVE mismatch) it returns ok = false and paused = true, so nothing runs.', [location], { color: 4 });

export default workflow('agency-h0-config', '[AGENCY] H0 Helper: Agency Config')
  .add(whenCalled)
  .to(location)
  .to(readSettings)
  .to(buildConfig)
  .add(note);
