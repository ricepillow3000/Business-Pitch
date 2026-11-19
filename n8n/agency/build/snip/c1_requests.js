// Builds one AI request per lead that passed the suppression check. Website-derived text is
// passed as DATA; the AI only writes the middle of the email (we add greeting, sign-off, footer).
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const NL = String.fromCharCode(10);
const leadsById = {};
$('Read Leads').all().forEach((i) => { const l = i.json || {}; if (clean(l['Lead ID'])) leadsById[clean(l['Lead ID'])] = l; });
const okIds = {};
$input.all().forEach((i) => { const d = i.json || {}; if (d.allowed === true && clean(d.leadId)) okIds[clean(d.leadId)] = clean(d.email); });
const filled = (v) => clean(v) && clean(v).indexOf('[FILL IN]') === -1;
const agency = filled(s.AGENCY_NAME) ? clean(s.AGENCY_NAME) : 'our agency';
const sender = filled(s.SENDER_NAME) ? clean(s.SENDER_NAME) : 'the founder';
const callLen = clean(s.DISCOVERY_CALL_MINUTES) || '20';
const safe = (v, n) => clean(v).split('<<<').join('').split('>>>').join('').slice(0, n);
return $('Pick Leads To Draft').all().map((i) => i.json).filter((p) => okIds[p.leadId] && okIds[p.leadId] === p.email && leadsById[p.leadId]).map((p) => {
  const l = leadsById[p.leadId];
  const instructions = [
    'TASK: Write the middle part of a short, honest first-contact email from ' + sender + ' at ' + agency + ' (a small AI automation agency in Atlanta) to the business described below.',
    'RULES:',
    '- Mention exactly ONE idea: ' + safe(l['Primary Opportunity'], 80) + '. Describe it as something we could build together, never as something that already exists.',
    '- You may mention one or two facts from the evidence quotes. If you quote, copy only a few words exactly.',
    '- No results, numbers, percentages, prices, guarantees, testimonials, other clients, case studies or awards.',
    '- Do not say or suggest the business has a problem (no "you are losing customers"). Use "may" or "could".',
    '- End by inviting them to a short ' + callLen + '-minute discovery call. No links.',
    '- 60-120 words, plain text. NO greeting line and NO signature: we add those.',
    'Return subject (max 60 characters, no "Re:"), body, opportunity_used, evidence_used (the exact quotes you relied on, as a list).'
  ].join(NL);
  const data = [
    'Business: ' + safe(l['Business Name'], 120), 'Industry: ' + safe(l.Industry, 60), 'City: ' + safe(l.City, 60),
    'Evidence quotes from their own website: ' + safe(l.Evidence, 1500),
    'Contact options seen: ' + safe(l['Booking / Contact Options Seen'], 300),
    'Idea we could propose: ' + safe(l['Proposed Solution'], 600), 'Why it may help: ' + safe(l['Why It May Help'], 600)
  ].join(NL);
  return { json: {
    task: 'outreach_draft', instructions, untrustedContent: data,
    outputExample: JSON.stringify({ subject: 'An idea for after-hours calls', body: 'I came across your website and saw that you offer same-day service. One idea we could build together is a simple text-back that replies when a call is missed. It may help callers get a quicker answer. Would you be open to a short ' + callLen + '-minute call to see if it fits?', opportunity_used: 'Missed-call text back', evidence_used: ['same-day service'] }),
    requiredKeys: 'subject,body,opportunity_used,evidence_used',
    leadId: p.leadId, callerWorkflow: 'C1 Draft Outreach', crmUrl: cfg.crmUrl, aiModelLabel: cfg.aiModelLabel,
    aiInputPricePerM: cfg.aiInputPricePerM, aiOutputPricePerM: cfg.aiOutputPricePerM, runId: p.runId
  } };
});
