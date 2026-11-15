const whenCalled = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: "When Called With Addresses", parameters: { inputSource: 'passthrough' } }, output: [{ leadId: 'L-sample.example', email: 'info@sample.example', ref: 'D-L-sample.example-initial', crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit' }] });
const readSup = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Suppression List",
    executeOnce: true,
    alwaysOutputData: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'read',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Addresses").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Suppression List" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Email Or Domain': 'donotcontact@blocked-demo.example' }]
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
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Addresses").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Leads" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Lead ID': 'L-sample.example', 'Opted Out': 'NO' }]
});
const decide = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Decide Allowed Or Blocked", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Central suppression check. Answers allowed / blocked for each address, matched by Lead ID + email.
// FAIL CLOSED: if the Suppression List or Leads tab can't be read, nothing is allowed.
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const reqs = $('When Called With Addresses').all().map((i) => i.json || {});
const supRows = $('Read Suppression List').all().map((i) => i.json || {});
const leadRows = $input.all().map((i) => i.json || {});
const crmOk = reqs.length > 0 && clean(reqs[0].crmUrl).indexOf('/spreadsheets/d/') !== -1;
const supErr = supRows.some((r) => r.error);
const leadErr = leadRows.some((r) => r.error);
const entries = supErr ? [] : supRows.map((r) => clean(r['Email Or Domain']).toLowerCase()).filter(Boolean);
const optedIds = {};
const optedEmails = {};
if (!leadErr) leadRows.forEach((r) => {
  if (clean(r['Opted Out']).toUpperCase() === 'YES') {
    if (clean(r['Lead ID'])) optedIds[clean(r['Lead ID'])] = true;
    if (clean(r['Public Email'])) optedEmails[clean(r['Public Email']).toLowerCase()] = true;
  }
});
const validEmail = (s) => { const p = s.split('@'); return p.length === 2 && p[0] && p[1].indexOf('.') > 0 && s.indexOf(' ') === -1 && !p[1].endsWith('.'); };
return reqs.map((r) => {
  const email = clean(r.email).toLowerCase();
  const leadId = clean(r.leadId);
  const domain = email.indexOf('@') !== -1 ? email.split('@')[1] : '';
  let allowed = true;
  let reason = 'not on the Suppression List';
  if (!crmOk || supErr || leadErr) { allowed = false; reason = 'suppression could not be verified (' + (!crmOk ? 'CRM link missing' : supErr ? 'Suppression List unreadable' : 'Leads tab unreadable') + ') - blocked to be safe'; }
  else if (!validEmail(email)) { allowed = false; reason = 'invalid email address'; }
  else if (entries.indexOf(email) !== -1) { allowed = false; reason = 'email is on the Suppression List'; }
  else if (entries.some((e) => e.indexOf('@') === -1 ? (e === domain || domain.endsWith('.' + e)) : (e[0] === '@' && e.slice(1) === domain))) { allowed = false; reason = 'domain is on the Suppression List'; }
  else if (optedIds[leadId] || optedEmails[email]) { allowed = false; reason = 'lead has opted out'; }
  return { json: { ref: clean(r.ref), leadId, email, allowed, reason, checkedOk: crmOk && !supErr && !leadErr } };
});` } },
  output: [{ leadId: 'L-sample.example', email: 'info@sample.example', allowed: true, reason: '', checkedOk: true }]
});
const note = sticky("## H6 Helper: Suppression Check (central)\nEvery workflow that might email someone asks this helper first.\n\nAnswers allowed / blocked per address, matched by **Lead ID + email**. Blocks exact emails, whole domains and opted-out leads.\n\n**Fails closed:** if the Suppression List or Leads tab can't be read, nobody is allowed.", [decide], { color: 6 });

export default workflow("agency-h6-suppression", "[AGENCY] H6 Helper: Suppression Check")
  .add(whenCalled)
  .to(readSup)
  .to(readLeads)
  .to(decide)
  .add(note);
