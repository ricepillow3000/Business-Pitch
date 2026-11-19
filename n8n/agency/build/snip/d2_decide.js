// Decides what happens with ONE reply. Nothing is ever sent from here: replies that deserve an
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
return [{ json: out }];
