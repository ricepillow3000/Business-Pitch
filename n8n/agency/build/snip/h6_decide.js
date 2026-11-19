// Central suppression check. Answers allowed / blocked for each address, matched by Lead ID + email.
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
});
