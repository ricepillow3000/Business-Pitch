const manualStart = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Run Research Now' },
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
  output: [{ ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', crmId: 'SAMPLE', isDemo: true, systemPaused: false, researchBatchSize: 5, warmMinScore: 60, targetCities: ['Atlanta'], appointmentIndustries: ['plumbing'], timezone: 'America/New_York', aiModelLabel: 'Gemini 3 Flash (free tier)', aiInputPricePerM: 0.5, aiOutputPricePerM: 3 }]
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

const readLeads = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Read Leads',
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
  output: [{ row_number: 2, 'Lead ID': 'L-sample.example', 'Is Demo': 'YES', 'Business Name': 'Sample (DEMO)', Industry: 'Plumbing', City: 'Atlanta', Website: 'https://sample.example', 'Pipeline Status': 'Not researched' }]
});

const pick = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Pick Leads To Research',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Picks a small batch of "Not researched" leads (same DEMO/LIVE flag as the CRM).
// Each lead keeps its permanent Lead ID through every later step.
const cfg = $('Load Agency Config').first().json;
const rows = $input.all().map((i) => i.json || {});
const bad = rows.find((r) => r.error);
if (bad) throw new Error('A2 could not read the Leads tab: ' + String((bad.error && bad.error.message) || bad.error).slice(0, 200));
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const demoFlag = cfg.isDemo === false ? 'NO' : 'YES';
const failCount = (s) => {
  const t = clean(s).toLowerCase();
  const key = 'research failed x';
  return t.indexOf(key) === 0 ? (Number(t.slice(key.length)) || 0) : 0;
};
const max = Number(cfg.researchBatchSize) > 0 ? Math.min(Number(cfg.researchBatchSize), 20) : 5;
const picked = rows.filter((r) => clean(r['Lead ID'])
  && clean(r['Pipeline Status']).toLowerCase() === 'not researched'
  && clean(r['Is Demo']).toUpperCase() === demoFlag
  && clean(r['Opted Out']).toUpperCase() !== 'YES'
  && failCount(r['Error Status']) < 3).slice(0, max);
const ctx = { crmUrl: cfg.crmUrl, aiModelLabel: cfg.aiModelLabel, aiInputPricePerM: cfg.aiInputPricePerM, aiOutputPricePerM: cfg.aiOutputPricePerM, runId: String($execution.id) };
return picked.map((r) => ({ json: { leadId: clean(r['Lead ID']), lead: r, failCount: failCount(r['Error Status']), ctx } }));` }
  },
  output: [{ leadId: 'L-sample.example', failCount: 0, lead: {}, ctx: {} }]
});

const readEach = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Read Each Website',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'yzcEwRluSeGL8h3O', cachedResultName: '[AGENCY] H5 Helper: Read One Business Website' },
      mode: 'each',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ leadId: 'L-sample.example', needsAi: true, facts: {}, pageText: 'Sample' }]
});

const match = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Match Website Results',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Matches every website result to its lead by Lead ID (never by list order).
// Missing, duplicated or unknown results are handled safely.
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const picked = $('Pick Leads To Research').all().map((i) => i.json || {});
const results = $input.all().map((i) => i.json || {});
const byId = {};
const warnings = [];
results.forEach((r) => {
  const id = clean(r.leadId);
  if (!id) { warnings.push('website result without a Lead ID ignored'); return; }
  if (byId[id]) { warnings.push('duplicate website result for ' + id + ' ignored'); return; }
  byId[id] = r;
});
const pickedIds = picked.map((p) => clean(p.leadId));
Object.keys(byId).forEach((id) => { if (pickedIds.indexOf(id) === -1) warnings.push('website result for a lead that was not picked (' + id + ') ignored'); });
return picked.map((p, i) => {
  const id = clean(p.leadId);
  const r = byId[id];
  if (r && !r.error && clean(r.leadId) === id) return { json: Object.assign({}, r, { matchWarnings: i === 0 ? warnings : [] }) };
  const next = (Number(p.failCount) || 0) + 1;
  return { json: {
    leadId: id, lead: p.lead || {}, failCount: Number(p.failCount) || 0, ctx: p.ctx || {},
    needsAi: false, retryLater: next < 3, facts: { websiteReachable: false },
    skipReason: 'Website step returned no result for this lead' + (r && r.error ? ' (' + clean(r.error.message || r.error).slice(0, 120) + ')' : ''),
    pageText: '', matchWarnings: i === 0 ? warnings : []
  } };
});` }
  },
  output: [{ leadId: 'L-sample.example', needsAi: true, facts: {}, pageText: 'Sample' }]
});

const needsAi = ifElse({
  version: 2.2,
  config: {
    name: 'Needs AI?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.needsAi }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});

const askBrain = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Ask AI Brain',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'wD2yN7CAk0xz0oiW', cachedResultName: '[AGENCY] H1 Helper: AI Brain' },
      mode: 'each',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, data: { research_confidence: 'Medium' }, error: '', leadId: 'L-sample.example', estInputTokens: 1000, estOutputTokens: 200 }]
});

const checkAi = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Check AI Findings',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Never trusts the AI blindly: keeps only quotes that really appear on the page, lowers
// confidence when evidence is thin, flags hidden instructions and over-promising words.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const facts = {};
$('Match Website Results').all().forEach((it) => { const j = it.json || {}; if (j.leadId) facts[clean(j.leadId)] = j; });
const OPPS = ['Online booking / scheduling', 'Missed-call text back', 'Quote / lead follow-up', 'Appointment reminders', 'Website chat / FAQ assistant', 'Review requests', 'Intake form automation', 'No clear opportunity'];
const LEVEL = { low: 0, medium: 1, high: 2 };
const NAME = ['Low', 'Medium', 'High'];
const Q = [[8216, "'"], [8217, "'"], [8220, '"'], [8221, '"'], [8211, '-'], [8212, '-'], [160, ' ']];
const SP = new RegExp('[ ' + String.fromCharCode(9, 10, 13) + ']+', 'g');
const norm = (s) => { let t = clean(s).toLowerCase(); Q.forEach((q) => { t = t.split(String.fromCharCode(q[0])).join(q[1]); }); return t.replace(SP, ' ').trim(); };
const safe = (v, n) => {
  let t = (Array.isArray(v) ? v.map(clean).join('; ') : clean(v)).split('<<<').join('').split('>>>').join('').replace(SP, ' ').slice(0, n);
  if (t && '=+-@'.indexOf(t[0]) !== -1) t = "'" + t;
  return t;
};
const PROMISE = ['we built', 'we have built', 'already built', 'we created', 'already set up', 'guarantee', 'will increase', 'will double', '100%'];
const cities = (cfg.targetCities || []).map((x) => clean(x).toLowerCase());
const out = [];
const warnings = [];
$('Match Website Results').first().json.matchWarnings && ($('Match Website Results').first().json.matchWarnings || []).forEach((w) => warnings.push(w));
// Two ways in: leads that needed no AI arrive as themselves; on the AI path every lead that
// needed AI is processed, and its answer is found by Lead ID (missing answer = failure).
const inputs = $input.all().map((it) => it.json || {});
const aiPath = inputs.length > 0 && !Object.prototype.hasOwnProperty.call(inputs[0], 'needsAi');
const answers = {};
if (aiPath) inputs.forEach((a) => { const id = clean(a.leadId); if (!id) { warnings.push('AI answer without a Lead ID ignored'); return; } if (answers[id]) { warnings.push('second AI answer for ' + id + ' ignored'); return; } if (!facts[id]) { warnings.push('AI answer for unknown lead ' + id + ' ignored'); return; } answers[id] = a; });
const todo = aiPath ? Object.keys(facts).filter((id) => facts[id].needsAi === true).map((id) => ({ f: facts[id], ai: answers[id] || null })) : inputs.map((j) => ({ f: facts[clean(j.leadId)] || j, ai: null }));
todo.forEach((t) => {
  const f = t.f;
  const ai = t.ai;
  const lead = f.lead || {};
  const fx = f.facts || {};
  const next = (Number(f.failCount) || 0) + 1;
  const flags = { suspicious: false, wording: false, aiFailedFinal: false };
  const base = {
    leadId: f.leadId, industry: lead.Industry, websiteReachable: !!fx.websiteReachable,
    hasPublicEmail: !!(clean(lead['Public Email']) || fx.firstEmail), onlineBookingSeen: !!fx.onlineBookingSeen,
    phoneOrFormOnly: !!fx.phoneOrFormOnly,
    inTargetArea: cities.indexOf(clean(lead.City).toLowerCase()) !== -1 || clean(lead.City).toLowerCase().indexOf('unknown (inside') === 0,
    warmMinScore: cfg.warmMinScore, appointmentIndustries: cfg.appointmentIndustries,
    currentPipelineStatus: lead['Pipeline Status'], previousTemperature: lead.Temperature, replyCategory: lead['Reply Category'],
    optedOut: lead['Opted Out'], publicPhone: clean(lead['Public Phone']) || (fx.phonesFound || [])[0] || '',
    businessName: lead['Business Name'], oldNotes: clean(lead.Notes)
  };
  // Website problem that may fix itself: try again on a later run (max 3 tries)
  if (f.retryLater) { out.push(Object.assign(base, { researchFailed: true, errorStatus: 'Research failed x' + next, note: f.skipReason, flags })); return; }
  let aiData = null;
  let aiError = '';
  if (f.needsAi) {
    if (ai && ai.ok && ai.data && typeof ai.data === 'object') aiData = ai.data;
    else aiError = clean((ai && ai.error) || 'AI step did not answer').slice(0, 200);
    if (!aiData && next < 3) { out.push(Object.assign(base, { researchFailed: true, errorStatus: 'Research failed x' + next, note: 'AI step failed: ' + aiError, flags })); return; }
    if (!aiData) flags.aiFailedFinal = true;
  }
  const options = [];
  if (fx.websiteReachable) {
    options.push('Online booking: ' + (fx.onlineBookingSeen ? 'yes' + ((fx.platforms || []).length ? ' (' + fx.platforms.join(', ') + ')' : '') : 'not seen'));
    options.push('Contact form: ' + (fx.contactForm ? 'yes' : 'no'));
    options.push('Chat: ' + (fx.chatWidget ? 'yes' : 'no'));
    options.push('Phones on site: ' + (fx.phonesFound || []).length);
    if (fx.emergency) options.push('Mentions 24/7 or emergency service');
  } else options.push(f.skipReason || 'Website not read');
  let conf = 'Low';
  let quotes = [];
  let dropped = 0;
  let research = {};
  const notes = [];
  if (aiData) {
    const pageNorm = norm(f.pageText);
    (Array.isArray(aiData.evidence_quotes) ? aiData.evidence_quotes : []).forEach((q) => {
      const text = clean(q && typeof q === 'object' ? q.quote : q);
      const where = clean(q && typeof q === 'object' ? q.page : '') || 'website';
      if (norm(text).length >= 12 && pageNorm.indexOf(norm(text)) !== -1 && quotes.length < 4) quotes.push({ text, where });
      else dropped++;
    });
    let level = LEVEL[clean(aiData.research_confidence).toLowerCase()];
    if (level === undefined) level = 0;
    if (quotes.length === 0) level = 0;
    else if (quotes.length === 1 || dropped >= 2) level = Math.min(level, 1);
    let opp = clean(aiData.primary_opportunity);
    if (OPPS.indexOf(opp) === -1) { opp = 'Unknown'; level = Math.min(level, 1); notes.push('AI gave an opportunity outside the list'); }
    flags.suspicious = aiData.suspicious_instructions_detected === true || (fx.injectionPhrases || []).length > 0;
    if (flags.suspicious) { level = 0; notes.push('Website text contained instructions aimed at AI tools (' + safe((fx.injectionPhrases || []).join(', ') || aiData.suspicious_instructions_note, 150) + '); needs human review'); }
    const wordingLow = (clean(aiData.proposed_solution) + ' ' + clean(aiData.why_it_may_help)).toLowerCase();
    flags.wording = PROMISE.some((w) => wordingLow.indexOf(w) !== -1);
    if (flags.wording) notes.push('AI wording sounds like a promise; check before using it');
    if (dropped) notes.push(dropped + ' AI quote(s) removed because they were not found on the page');
    conf = NAME[level];
    research = {
      'Primary Opportunity': opp,
      Evidence: quotes.map((q) => '"' + safe(q.text, 300) + '" (' + q.where + ')').join(' || '),
      'Proposed Solution': safe(aiData.proposed_solution, 600),
      'Why It May Help': safe(aiData.why_it_may_help, 600),
      'Unknowns To Verify': safe(aiData.unknowns_to_verify, 600)
    };
    const summary = safe(aiData.business_summary, 300);
    if (summary) notes.unshift('Summary: ' + summary);
  } else {
    research = {
      'Primary Opportunity': 'Unknown', Evidence: '', 'Proposed Solution': '', 'Why It May Help': '',
      'Unknowns To Verify': fx.websiteReachable ? 'AI analysis unavailable; review the website by hand' : 'Website not read automatically; check by hand or by phone'
    };
    if (flags.aiFailedFinal) notes.push('AI analysis failed 3 times (' + aiError + '); facts only');
    if (f.skipReason) notes.push(f.skipReason);
  }
  research['Booking / Contact Options Seen'] = options.join(' | ');
  research['Evidence Sources'] = (fx.pagesRead || []).join(' ');
  if (!clean(lead['Public Email']) && fx.firstEmail) { research['Public Email'] = fx.firstEmail; research['Email Found At'] = fx.firstEmailPage; notes.push('Email found on own website'); }
  if (!clean(lead['Public Phone']) && (fx.phonesFound || []).length) research['Public Phone'] = fx.phonesFound[0];
  out.push(Object.assign(base, {
    researchFailed: false, researchConfidence: conf, research, flags,
    errorStatus: flags.aiFailedFinal ? 'AI failed x3' : '',
    note: notes.join('; ')
  }));
});
return out.map((o, i) => ({ json: Object.assign(o, { warnings: i === 0 ? warnings : [] }) }));` }
  },
  output: [{ leadId: 'L-sample.example', researchFailed: false, researchConfidence: 'Medium', research: {}, flags: {} }]
});

const score = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Score With Fixed Rules',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'mMSUbBxUdWhbLP5e', cachedResultName: '[AGENCY] A3 Score & Qualify' },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ leadId: 'L-sample.example', fitScore: 75, scoreBreakdown: '+15 website works', temperature: 'Warm', temperatureReason: 'evidence-backed fit', pipelineStatus: 'Ready for review' }]
});

const buildUpdates = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Lead Updates',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Turns scored research into Leads rows, Review Queue items and Activity Log events.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const today = now.toFormat('yyyy-LL-dd');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const updates = [];
const review = [];
const s = { researched: 0, retryLater: 0, aiFailedFinal: 0, suspicious: 0, hot: 0, warm: 0, cold: 0, warnings: [] };
$input.all().forEach((it) => {
  const j = it.json || {};
  (j.warnings || []).forEach((w) => s.warnings.push(w));
  if (!j.leadId) return;
  const addNote = (n) => [j.oldNotes, n ? 'A2 ' + today + ': ' + n : ''].filter(Boolean).join(' | ').slice(-1500);
  if (j.researchFailed) {
    s.retryLater++;
    updates.push({ 'Lead ID': j.leadId, 'Error Status': j.errorStatus, 'Last Updated': today, Notes: addNote(j.note) });
    return;
  }
  s.researched++;
  if (j.flags && j.flags.aiFailedFinal) s.aiFailedFinal++;
  if (j.temperature === 'Hot') s.hot++; else if (j.temperature === 'Warm') s.warm++; else s.cold++;
  updates.push(Object.assign({ 'Lead ID': j.leadId }, j.research || {}, {
    'Research Date': today, 'Research Confidence': j.researchConfidence,
    'Fit Score': String(j.fitScore), 'Score Breakdown': j.scoreBreakdown,
    Temperature: j.temperature, 'Pipeline Status': j.pipelineStatus,
    'Error Status': j.errorStatus || '', 'Last Updated': today, Notes: addNote(j.note)
  }));
  const item = (type, summary) => review.push({ 'Item ID': 'RQ-' + j.leadId + '-' + type.toLowerCase().split(' ').join('-'), 'Created At': stamp, Type: type, 'Lead ID': j.leadId, Summary: summary.slice(0, 500), Link: cfg.crmUrl, Status: 'Open' });
  if (j.flags && j.flags.suspicious) { s.suspicious++; item('Suspicious website text', clean(j.businessName) + ': website text tried to give instructions to AI tools. Research confidence set to Low. Check the site by hand.'); }
  if (j.flags && j.flags.wording) item('AI wording check', clean(j.businessName) + ': proposed solution wording sounds like a promise. Edit before any outreach.');
  if (j.flags && j.flags.aiFailedFinal) item('Research needs a human', clean(j.businessName) + ': AI analysis failed 3 times. Facts were saved; review by hand.');
  if ((j.temperature === 'Warm' || j.temperature === 'Hot') && j.pipelineStatus === 'Ready for review') item('Lead ready for review', clean(j.businessName) + ' is ' + j.temperature + ' (score ' + j.fitScore + ', confidence ' + j.researchConfidence + '). ' + clean(j.temperatureReason));
});
return [{ json: { updates, review, summary: s } }];` }
  },
  output: [{ updates: [], review: [], summary: { researched: 0 } }]
});

const updateRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Lead Update Rows',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.updates || []).map((r) => ({ json: r }));` }
  },
  output: [{ 'Lead ID': 'L-sample.example' }]
});

const saveLeads = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Save Research To Leads',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'appendOrUpdate',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Leads' },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        matchingColumns: ['Lead ID'],
        schema: [
          { id: 'Lead ID', displayName: 'Lead ID', required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Public Email', displayName: 'Public Email', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Email Found At', displayName: 'Email Found At', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Public Phone', displayName: 'Public Phone', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Research Date', displayName: 'Research Date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Booking / Contact Options Seen', displayName: 'Booking / Contact Options Seen', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Primary Opportunity', displayName: 'Primary Opportunity', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Evidence', displayName: 'Evidence', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Evidence Sources', displayName: 'Evidence Sources', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Proposed Solution', displayName: 'Proposed Solution', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Why It May Help', displayName: 'Why It May Help', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Unknowns To Verify', displayName: 'Unknowns To Verify', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Research Confidence', displayName: 'Research Confidence', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Fit Score', displayName: 'Fit Score', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Score Breakdown', displayName: 'Score Breakdown', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Temperature', displayName: 'Temperature', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Pipeline Status', displayName: 'Pipeline Status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Error Status', displayName: 'Error Status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Last Updated', displayName: 'Last Updated', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Notes', displayName: 'Notes', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Lead ID': 'L-sample.example' }]
});

const reviewRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Review Queue Rows',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.review || []).map((r) => ({ json: r }));` }
  },
  output: [{ 'Item ID': 'RQ-L-sample.example-lead-ready-for-review' }]
});

const addReview = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Add To Review Queue',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Review Queue' },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: 'Item ID', displayName: 'Item ID', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Created At', displayName: 'Created At', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Type', displayName: 'Type', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Lead ID', displayName: 'Lead ID', required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Summary', displayName: 'Summary', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Link', displayName: 'Link', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Status', displayName: 'Status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Item ID': 'RQ-L-sample.example-lead-ready-for-review' }]
});

const events = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Activity Events',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Activity Log rows describing what this run actually did.
const cfg = $('Load Agency Config').first().json;
const s = $input.first().json.summary || {};
const base = { crmUrl: cfg.crmUrl, workflow: 'A2 Research & Analyze', runId: String($execution.id), isDemo: cfg.isDemo !== false, leadId: '' };
const ev = [
  Object.assign({}, base, { event: 'leads_researched', count: s.researched || 0, details: 'Hot ' + (s.hot || 0) + ', Warm ' + (s.warm || 0) + ', Cold ' + (s.cold || 0) }),
  Object.assign({}, base, { event: 'research_retry_later', count: s.retryLater || 0, details: 'Website or AI problem; will try again (max 3 tries)' })
];
if (s.suspicious) ev.push(Object.assign({}, base, { event: 'suspicious_website_text', count: s.suspicious, details: 'Sent to Review Queue' }));
if (s.aiFailedFinal) ev.push(Object.assign({}, base, { event: 'ai_failed_3_times', count: s.aiFailedFinal, details: 'Facts saved, sent to Review Queue' }));
if ((s.warnings || []).length) ev.push(Object.assign({}, base, { event: 'research_warning', count: s.warnings.length, details: s.warnings.join(' | ').slice(0, 500) }));
return ev.map((e) => ({ json: e }));` }
  },
  output: [{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', event: 'leads_researched', count: 0 }]
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
  output: [{ logged: true, rows: 2 }]
});

const summary = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Research Summary',
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: 'rs-1', name: 'summary', value: expr('{{ $("Build Lead Updates").first().json.summary }}'), type: 'object' }
    ] } }
  },
  output: [{ summary: { researched: 0 } }]
});

const note = sticky('## A2 Research & Analyze (Stage 2)\nPicks up to RESEARCH_BATCH_SIZE leads with status **Not researched**.\n\nEach lead\'s **own** website is read by helper **H5**, one lead per run (robots.txt first, then homepage and /contact). Results come back stamped with the **Lead ID** and are matched by ID, never by list order.\n\nFixed rules find emails, phones, booking tools, forms and chat. The **AI Brain (H1)** writes the analysis; website text is treated as DATA only. Quotes the AI gives are kept only if they really appear on the page. Hidden instructions found on a site lower confidence to Low and go to the **Review Queue**.\n\nThen **A3** scores the lead with fixed rules and the result is saved to Leads. Problems retry up to 3 times.', [pick], { color: 6 });

export default workflow('agency-a2-research', '[AGENCY] A2 Research & Analyze')
  .add(manualStart)
  .to(loadConfig)
  .add(calledStart)
  .to(loadConfig)
  .add(loadConfig)
  .to(allowed
    .onTrue(readLeads.to(pick).to(readEach).to(match))
    .onFalse(stopped))
  .add(match)
  .to(needsAi
    .onTrue(askBrain.to(checkAi))
    .onFalse(checkAi))
  .add(checkAi)
  .to(score)
  .to(buildUpdates)
  .add(buildUpdates)
  .to(updateRows)
  .to(saveLeads)
  .add(buildUpdates)
  .to(reviewRows)
  .to(addReview)
  .add(buildUpdates)
  .to(events)
  .to(logActivity)
  .to(summary)
  .add(note);
