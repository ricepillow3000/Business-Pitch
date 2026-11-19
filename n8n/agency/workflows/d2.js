const whenCalled = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: "When Called With One Reply", parameters: { inputSource: 'passthrough' } }, output: [{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', leadId: 'L-sample.example', fromEmail: 'Owner <info@sample.example>', fromAddr: 'info@sample.example', subject: 'Re: idea', text: 'Sounds interesting', gmailMessageId: 'm1', gmailThreadId: 't1', receivedAt: '2026-11-18 10:00', senderMatchesLead: true }] });
const optOut = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Opt-out Check First",
    executeOnce: true,
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "epz2HgdmEtiua5pF", cachedResultName: "[AGENCY] C4 Unsubscribe" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ result: 'Not an opt-out request' }]
});
const loadConfig = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Load Agency Config",
    executeOnce: true,
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "EwEgjWyFneyjExzI", cachedResultName: "[AGENCY] H0 Helper: Agency Config" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, crmUrl: 'x', isDemo: true, settings: {} }]
});
const readLeads = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Leads",
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
      sheetName: { __rl: true, mode: 'name', value: "Leads" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Lead ID': 'L-sample.example' }]
});
const readRulebook = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Rulebook",
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
      sheetName: { __rl: true, mode: 'name', value: "Rulebook" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ Topic: 'Pricing policy', 'Approved Answer': 'Pricing depends on scope.', 'Needs Human': 'NO' }]
});
const readDrafts = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Outreach Drafts",
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
      sheetName: { __rl: true, mode: 'name', value: "Outreach Drafts" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Draft ID': 'D-L-sample.example-initial' }]
});
const presort = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Pre-sort Reply", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Step 1 was the opt-out check (C4, fixed rules, no AI). Here certain cases are sorted by fixed
// rules too (bounces, out-of-office). Only real human replies go to the AI, as DATA.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const r = $('When Called With One Reply').first().json || {};
const opt = $('Opt-out Check First').first().json || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const NL = String.fromCharCode(10);
const leads = $('Read Leads').all().map((i) => i.json || {});
const rulebook = $('Read Rulebook').all().map((i) => i.json || {});
const drafts = $input.all().map((i) => i.json || {});
const problems = [];
if (cfg.ok !== true) problems.push('Agency config not OK: ' + clean(cfg.problems));
if (leads.some((x) => x.error)) problems.push('Leads tab unreadable');
if (rulebook.some((x) => x.error)) problems.push('Rulebook tab unreadable');
if (drafts.some((x) => x.error)) problems.push('Outreach Drafts tab unreadable');
const lead = leads.find((l) => clean(l['Lead ID']) === clean(r.leadId));
if (!lead && !leads.some((x) => x.error)) problems.push('Lead ' + clean(r.leadId) + ' not found');
const optResult = clean(opt.result);
const text = clean(r.text);
const subj = clean(r.subject);
const low = (subj + ' ' + text).toLowerCase();
const fromAddr = clean(r.fromAddr || r.fromEmail).toLowerCase();
let pre = '';
if (optResult === 'Suppressed' || optResult === 'Already suppressed') pre = 'Unsubscribe';
else if (optResult !== 'Not an opt-out request') { pre = 'Needs human'; problems.push('Opt-out check could not finish: ' + (optResult || 'no answer')); }
else if (problems.length) pre = 'Needs human';
else if (fromAddr.indexOf('mailer-daemon') === 0 || fromAddr.indexOf('postmaster@') === 0 || ['delivery status notification', 'undeliverable', 'address not found', 'delivery has failed'].some((p) => low.indexOf(p) !== -1)) pre = 'Bounce';
else if (['out of office', 'automatic reply', 'auto-reply', 'autoreply', 'away from the office', 'on vacation', 'on leave until', 'currently out of'].some((p) => low.indexOf(p) !== -1)) pre = 'Out of office';
else if (!text) pre = 'Empty';
const needsAi = pre === '';
const safe = (v, n) => clean(v).split('<<<').join('').split('>>>').join('').slice(0, n);
const topics = rulebook.map((x) => clean(x.Topic)).filter(Boolean).join('; ');
const instructions = [
  'TASK: Sort one reply to our short sales email into exactly ONE category, and list the questions it asks.',
  'Categories:',
  '- Interested: wants to hear more or says yes, but did not ask to book a specific time.',
  '- Meeting request: asks for a call/meeting or proposes times.',
  '- Question: mainly asks a question before deciding.',
  '- Not now: maybe later, busy, check back another time.',
  '- Not interested: says no, already has a solution, not a fit.',
  '- Unsubscribe: asks not to be emailed again.',
  '- Other: anything else (wrong person, unclear, spam).',
  'confidence: High, Medium or Low. summary: one neutral sentence, max 25 words.',
  'questions: short topics they ask about (for example "pricing", "which calendars you support"); empty list if none.',
  'wants_meeting: true or false. proposed_times: any dates/times they mention, copied as written; empty list if none.',
  'Our approved answer topics (for reference only): ' + safe(topics, 400)
].join(NL);
const data = ['Business: ' + safe(lead ? lead['Business Name'] : r.businessName, 120), 'Subject: ' + safe(subj, 200), 'Reply text:', safe(text, 4000)].join(NL);
return [{ json: {
  needsAi, pre, problems, optResult, leadFound: !!lead,
  task: 'reply_classify', instructions, untrustedContent: data,
  outputExample: JSON.stringify({ category: 'Question', confidence: 'High', summary: 'Asks how pricing works and whether it works with Google Calendar.', questions: ['pricing', 'google calendar'], wants_meeting: false, proposed_times: [] }),
  requiredKeys: 'category,confidence,summary,questions,wants_meeting,proposed_times',
  leadId: clean(r.leadId), callerWorkflow: 'D2 Handle One Reply', crmUrl: cfg.crmUrl, aiModelLabel: cfg.aiModelLabel,
  aiInputPricePerM: cfg.aiInputPricePerM, aiOutputPricePerM: cfg.aiOutputPricePerM, runId: clean(r.runId) || String($execution.id)
} }];` } },
  output: [{ needsAi: true, pre: '', task: 'reply_classify' }]
});
const needsAi = ifElse({
  version: 2.2,
  config: {
    name: "Needs AI?",
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.needsAi }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});
const askAi = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Sort Reply With AI",
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "wD2yN7CAk0xz0oiW", cachedResultName: "[AGENCY] H1 Helper: AI Brain" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, leadId: 'L-sample.example', data: { category: 'Question', confidence: 'High', summary: 'Asks about pricing.', questions: ['pricing'], wants_meeting: false, proposed_times: [] } }]
});
const decide = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Decide Action", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Decides what happens with ONE reply. Nothing is ever sent from here: replies that deserve an
// answer get a DRAFT built only from approved Rulebook text, and a person reviews it.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const r = $('When Called With One Reply').first().json || {};
const p = $('Pre-sort Reply').first().json || {};
const ai = p.needsAi ? ($input.first().json || {}) : null;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const NL = String.fromCharCode(10);
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const today = now.toFormat('yyyy-LL-dd');
const plusBiz = (n) => { let d = now; let k = 0; while (k < n) { d = d.plus({ days: 1 }); if (d.weekday <= 5) k++; } return d.toFormat('yyyy-LL-dd'); };
const leads = $('Read Leads').all().map((i) => i.json || {});
const rulebook = $('Read Rulebook').all().map((i) => i.json || {}).filter((x) => !x.error);
const drafts = $('Read Outreach Drafts').all().map((i) => i.json || {}).filter((x) => !x.error);
const leadId = clean(r.leadId);
const lead = leads.find((l) => clean(l['Lead ID']) === leadId);
const msgId = clean(r.gmailMessageId);
const fromAddr = clean(r.fromAddr || r.fromEmail).toLowerCase();
const text = clean(r.text);
const low = (clean(r.subject) + ' ' + text).toLowerCase();
const CATS = ['Interested', 'Meeting request', 'Question', 'Not now', 'Not interested', 'Unsubscribe', 'Other'];
const why = (p.problems || []).slice();
let category = p.pre || '';
let confidence = p.pre ? 'Rule' : '';
let summary = '';
let questions = [];
let proposedTimes = [];
let suspicious = false;
const INJECT = ['ignore previous', 'ignore all previous', 'ignore your instructions', 'system prompt', 'you are now', 'disregard the above', 'act as'];
if (INJECT.some((x) => low.indexOf(x) !== -1)) { suspicious = true; why.push('Reply text contains wording that tries to instruct an AI'); }
if (p.needsAi) {
  if (!ai || ai.ok !== true || !ai.data) { category = 'Needs human'; why.push('AI could not sort this reply (' + clean((ai && ai.error) || 'no answer') + ')'); }
  else {
    const d = ai.data;
    category = CATS.find((c) => c.toLowerCase() === clean(d.category).toLowerCase()) || 'Other';
    confidence = ['High', 'Medium', 'Low'].find((c) => c.toLowerCase() === clean(d.confidence).toLowerCase()) || 'Low';
    summary = clean(d.summary).slice(0, 200);
    questions = (Array.isArray(d.questions) ? d.questions : []).map((x) => clean(x).slice(0, 80)).filter(Boolean).slice(0, 8);
    proposedTimes = (Array.isArray(d.proposed_times) ? d.proposed_times : []).map((x) => clean(x).slice(0, 80)).filter(Boolean).slice(0, 5);
    if (d.suspicious_instructions_detected === true) { suspicious = true; why.push('AI reported instructions hidden in the reply'); }
    if (confidence === 'Low') why.push('AI confidence is Low');
    if (category === 'Other') why.push('Reply did not fit a category');
    if (category === 'Unsubscribe') why.push('AI thinks this may be an opt-out, but the opt-out rules did not match: check by hand (follow-ups stopped)');
  }
}
if (category === 'Empty') { category = 'Other'; why.push('Reply had no readable text'); }
if (category === 'Needs human' && !why.length) why.push('Could not be handled automatically');
if (!r.senderMatchesLead && category !== 'Bounce') why.push('Reply came from ' + fromAddr + ', which is not the address or domain we emailed');
if (suspicious && category !== 'Unsubscribe') category = 'Needs human';
const out = { crmUrl: cfg.crmUrl, replyRows: [], leadUpdates: [], draftUpdates: [], reviewItems: [], events: [], category, needsHuman: false };
const ev = (event, details) => out.events.push({ crmUrl: cfg.crmUrl, workflow: 'D2 Handle One Reply', runId: clean(r.runId) || String($execution.id), isDemo: cfg.isDemo !== false, event, leadId, count: 1, details: clean(details).slice(0, 300) });
const review = (type, sum) => out.reviewItems.push({ 'Item ID': 'RQ-R-' + msgId, 'Created At': stamp, Type: type, 'Lead ID': leadId, Summary: clean(sum).slice(0, 900), Link: cfg.crmUrl, Status: 'Open' });
// Rulebook answers (Question replies only). Anything sensitive or not covered goes to a human.
const TOPICS = [
  { rb: 'Pricing policy', words: ['price', 'pricing', 'cost', 'how much', 'quote', 'fee', 'charge', 'rates'] },
  { rb: 'Supported integrations', words: ['integrat', 'work with', 'works with', 'compatible', 'connect to', 'calendar', 'software', 'crm'] },
  { rb: 'Services we offer', words: ['what do you do', 'what exactly', 'services', 'what you offer', 'what does it do'] },
  { rb: 'Discovery call', words: ['a call', 'the call', 'quick call', 'phone call', 'video call', 'discovery call', 'meeting', 'a demo', 'schedule', 'book a', 'talk about it'] },
  { rb: 'Business description', words: ['who are you', 'your company', 'about you', 'where are you', 'how did you find'] }
];
const HUMAN = ['contract', 'guarantee', 'refund', 'legal', 'lawyer', 'liabil', 'privacy', 'hipaa', 'security', 'personal data', 'patient data', 'insurance', 'case stud', 'results', 'references', 'testimonial', 'other clients', 'discount', 'invoice', 'payment terms', 'cancel'];
// Only the reply text and the AI's question list count (the subject repeats OUR words, e.g. 'missed calls').
const askText = (questions.join(' ') + ' ' + text).toLowerCase();
const humanHits = HUMAN.filter((w) => askText.indexOf(w) !== -1);
const rbRow = (topic) => rulebook.find((x) => clean(x.Topic).toLowerCase() === topic.toLowerCase());
let draft = '';
let usedTopics = [];
if (category === 'Question') {
  usedTopics = TOPICS.filter((t) => t.words.some((w) => askText.indexOf(w) !== -1)).map((t) => t.rb);
  const unusable = usedTopics.filter((t) => { const row = rbRow(t); const a = row ? clean(row['Approved Answer']) : ''; return !a || a.indexOf('(none') === 0 || clean(row['Needs Human']).toUpperCase() === 'YES' || (cfg.isDemo === false && a.indexOf('[DEMO PLACEHOLDER]') !== -1); });
  if (humanHits.length) why.push('Asks about a topic only a person may answer: ' + humanHits.join(', '));
  if (!usedTopics.length) why.push('Question is not covered by the Rulebook');
  if (unusable.length) why.push('Rulebook has no approved answer for: ' + unusable.join(', '));
  if (!humanHits.length && usedTopics.length && !unusable.length && !suspicious) {
    const filled = (v) => clean(v) && clean(v).indexOf('[FILL IN]') === -1;
    const sender = filled(s.SENDER_NAME) ? clean(s.SENDER_NAME) : '[MISSING: SENDER_NAME]';
    const mins = clean(s.DISCOVERY_CALL_MINUTES) || '20';
    const answers = usedTopics.map((t) => clean(rbRow(t)['Approved Answer']));
    const parts = ['Hi,', '', 'Thanks for getting back to me.', ''].concat(answers.map((a) => a + NL));
    if (usedTopics.indexOf('Discovery call') === -1) parts.push('If it would help, we could go through this on a short ' + mins + '-minute call. Just reply with a time that suits you.', '');
    parts.push('Thanks,', sender, '', '--', filled(s.AGENCY_NAME) ? clean(s.AGENCY_NAME) : '[MISSING: AGENCY_NAME]', filled(s.AGENCY_MAILING_ADDRESS) ? clean(s.AGENCY_MAILING_ADDRESS) : '[MISSING: AGENCY_MAILING_ADDRESS]', 'To stop all emails from us, reply STOP.');
    draft = parts.join(NL).split(NL + NL + NL).join(NL + NL);
  }
}
// Lead changes. Hot only from a real, clear reply from the address/domain we emailed.
const lu = { 'Lead ID': leadId, 'Reply Status': 'Replied', 'Reply Category': category, 'Last Updated': today };
let stopFollowups = true;
if (category === 'Out of office') {
  stopFollowups = false;
  lu['Reply Status'] = '';
  lu['Reply Category'] = 'Out of office (auto-reply)';
  const cur = clean(lead && lead['Next Allowed Follow-up']);
  const later = plusBiz(5);
  if (cur && cur < later) lu['Next Allowed Follow-up'] = later;
} else if (category === 'Bounce') { lu['Reply Status'] = 'Bounced'; lu['Pipeline Status'] = 'Invalid contact'; }
else if (category === 'Not interested') { lu['Pipeline Status'] = 'Not interested'; lu.Temperature = 'Cold'; }
else if (category === 'Not now') { lu['Pipeline Status'] = 'Follow-up pending'; }
else if ((category === 'Interested' || category === 'Meeting request') && r.senderMatchesLead && confidence !== 'Low' && !suspicious) { lu.Temperature = 'Hot'; lu['Pipeline Status'] = 'Interested'; ev('lead_hot', category); }
if (stopFollowups) lu['Next Allowed Follow-up'] = '';
if (lead) out.leadUpdates.push(lu);
if (stopFollowups) {
  drafts.filter((d) => clean(d['Lead ID']) === leadId && clean(d.Step).indexOf('followup') === 0 && ['', 'not sent'].indexOf(clean(d['Send Status']).toLowerCase()) !== -1 && clean(d['Review Status']) !== 'Rejected').forEach((d) => {
    out.draftUpdates.push({ 'Draft ID': clean(d['Draft ID']), 'Review Status': 'Rejected', 'Review Notes': 'Cancelled automatically: the lead replied (' + category + ').', 'Updated At': stamp, 'Approved Hash': '', 'Approved At': '' });
    ev('followup_cancelled', clean(d['Draft ID']));
  });
}
// Review Queue: a person sees every reply that matters.
const who = clean(lead ? lead['Business Name'] : r.businessName) || leadId;
if (why.length) review('Reply needs a human', who + ': ' + why.join('; ') + (summary ? ' | Summary: ' + summary : ''));
else if (category === 'Interested' || category === 'Meeting request') review('Interested lead - offer meeting times', who + ' replied (' + category + '). ' + summary + (proposedTimes.length ? ' Times mentioned: ' + proposedTimes.join(', ') : ''));
else if (category === 'Question' && draft) review('Reply draft ready - review before sending', who + ' asked about: ' + usedTopics.join(', ') + '. A draft built only from Rulebook answers is in the Replies tab. Nothing was sent.');
else if (category === 'Bounce') review('Email bounced', who + ': the address bounced. Pipeline set to Invalid contact.');
else if (category === 'Not now') review('Asked to check back later', who + ': ' + (summary || 'not now') + '. Automatic follow-ups stopped.');
out.needsHuman = out.reviewItems.length > 0;
out.replyRows.push({
  'Gmail Message ID': msgId, 'Gmail Thread ID': clean(r.gmailThreadId), 'Lead ID': leadId, 'Received At': clean(r.receivedAt),
  Category: category, Confidence: confidence, Summary: summary || category, 'Draft ID': '', 'Needs Human': out.needsHuman ? 'YES' : 'NO',
  Handled: out.needsHuman ? 'NO' : 'YES', 'Processed At': stamp, 'From Email': fromAddr, Subject: clean(r.subject).slice(0, 150),
  'Reply Draft': draft, 'Rulebook Topics': usedTopics.join(', ')
});
ev('reply_processed', category + (why.length ? ' (needs human)' : ''));
if (draft) ev('reply_draft_created', usedTopics.join(', '));
return [{ json: out }];` } },
  output: [{ crmUrl: 'x', replyRows: [], leadUpdates: [], draftUpdates: [], reviewItems: [], events: [], category: 'Question', needsHuman: true }]
});
const save = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Save Reply Updates",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "r3tCCgZ7xETHATMd", cachedResultName: "[AGENCY] H8 Helper: Save CRM Updates" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true }]
});
const ret = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: "Return Result",
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "ret0", name: "gmailMessageId", value: expr('{{ $("When Called With One Reply").first().json.gmailMessageId }}'), type: "string" },
      { id: "ret1", name: "category", value: expr('{{ $("Decide Action").first().json.category }}'), type: "string" },
      { id: "ret2", name: "needsHuman", value: expr('{{ $("Decide Action").first().json.needsHuman }}'), type: "boolean" }
    ] } }
  },
  output: [{ done: true }]
});
const note = sticky("## D2 Handle One Reply (Stage 5) - INACTIVE\nCalled by D1 once per new reply.\n1. **Opt-out first** (C4, fixed rules, no AI): STOP / unsubscribe replies are suppressed immediately.\n2. Bounces and out-of-office are sorted by fixed rules.\n3. Real replies are sorted by the AI Brain (email text passed as DATA; AI is OFF until a free Gemini key is added, so replies go to a human).\n4. Interested / meeting request from the address we emailed = **Hot**. Pending follow-ups are cancelled.\n5. Questions get a **draft** built ONLY from Rulebook answers; sensitive topics (contracts, guarantees, data, refunds...) always go to a human. **Nothing is sent from here.**", [presort], { color: 6 });

export default workflow("agency-d2-handle-reply", "[AGENCY] D2 Handle One Reply")
  .add(whenCalled)
  .to(optOut)
  .to(loadConfig)
  .to(readLeads)
  .to(readRulebook)
  .to(readDrafts)
  .to(presort)
  .to(needsAi
    .onTrue(askAi.to(decide))
    .onFalse(decide))
  .add(decide)
  .to(save)
  .to(ret)
  .add(note);
