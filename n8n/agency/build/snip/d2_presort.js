// Step 1 was the opt-out check (C4, fixed rules, no AI). Here certain cases are sorted by fixed
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
} }];
