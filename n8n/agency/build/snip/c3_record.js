// Records what happened to each email, matched by Ledger Row ID. Never retries anything.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const today = now.toFormat('yyyy-LL-dd');
let next = now;
let added = 0;
const gap = Math.min(Math.max(Number(clean((cfg.settings || {}).FOLLOWUP_GAP_BUSINESS_DAYS) || 5), 2), 20);
while (added < gap) { next = next.plus({ days: 1 }); if (next.weekday <= 5) added++; }
const maxF = Math.min(Math.max(Number(clean((cfg.settings || {}).MAX_FOLLOWUPS) || 2), 0), 2);
const stepNo = (st) => (clean(st).indexOf('followup') === 0 ? Number(clean(st).slice(8)) || 0 : 0);
const finals = {};
$('Final Send Check').all().forEach((i) => { const x = i.json || {}; finals[clean(x.ledgerRowId)] = x; });
const inputs = $input.all().map((i) => i.json || {});
const results = inputs.length && Object.prototype.hasOwnProperty.call(inputs[0], 'outcome') ? inputs : inputs.map((x) => Object.assign({}, x, { outcome: 'not_sent_' + x.notSentReason }));
const out = { crmUrl: cfg.crmUrl, ledgerUpdates: [], draftUpdates: [], leadUpdates: [], reviewItems: [], events: [] };
const ev = (event, leadId, details) => out.events.push({ crmUrl: cfg.crmUrl, workflow: 'C3 Send Approved Outreach', runId: String($execution.id), isDemo: cfg.isDemo !== false, event, leadId: leadId || '', count: 1, details: details || '' });
const seen = {};
results.forEach((r) => {
  const rowId = clean(r.ledgerRowId);
  const x = finals[rowId];
  if (!rowId || !x || seen[rowId]) { if (rowId && seen[rowId]) ev('send_result_duplicate_ignored', clean(r.leadId), rowId); return; }
  seen[rowId] = true;
  const o = clean(r.outcome);
  const led = { 'Ledger Row ID': rowId, 'Updated At': stamp };
  if (o === 'sent') {
    Object.assign(led, { Status: 'Sent', 'Gmail Message ID': clean(r.gmailMessageId), 'Gmail Thread ID': clean(r.gmailThreadId), Error: '' });
    out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Sent', 'Ledger Row ID': rowId, 'Gmail Message ID': clean(r.gmailMessageId), 'Gmail Thread ID': clean(r.gmailThreadId), 'Sent At': stamp, 'Updated At': stamp, 'Last Error': '' });
    out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Sent', 'Sent At': stamp, 'Gmail Message ID': clean(r.gmailMessageId), 'Gmail Thread ID': clean(r.gmailThreadId), 'Pipeline Status': 'Contacted', 'Last Contact Date': today, 'Follow-up Count': String(stepNo(x.step)), 'Next Allowed Follow-up': stepNo(x.step) < maxF ? next.toFormat('yyyy-LL-dd') : '', 'Last Updated': today });
    ev('email_sent', x.leadId, x.draftId);
  } else if (o === 'failed') {
    Object.assign(led, { Status: 'Failed', Error: clean(r.error).slice(0, 300) });
    out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Failed', 'Ledger Row ID': rowId, 'Updated At': stamp, 'Last Error': clean(r.error).slice(0, 300) });
    out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Failed', 'Last Updated': today });
    out.reviewItems.push({ 'Item ID': 'RQ-' + rowId, 'Created At': stamp, Type: 'Email failed', 'Lead ID': x.leadId, Summary: 'Gmail refused the email to ' + x.to + '. It will NOT be retried automatically. Error: ' + clean(r.error).slice(0, 200), Link: cfg.crmUrl, Status: 'Open' });
    ev('email_failed', x.leadId, clean(r.error).slice(0, 200));
  } else if (o === 'uncertain') {
    Object.assign(led, { Status: 'Sending', Error: 'UNCERTAIN: ' + clean(r.error).slice(0, 280) });
    out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Sending', 'Ledger Row ID': rowId, 'Updated At': stamp, 'Last Error': 'Delivery uncertain - check the Gmail Sent folder' });
    out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Sending', 'Last Updated': today });
    out.reviewItems.push({ 'Item ID': 'RQ-' + rowId, 'Created At': stamp, Type: 'Delivery uncertain', 'Lead ID': x.leadId, Summary: 'We could not confirm whether the email to ' + x.to + ' was sent. Check the Gmail Sent folder. It will NOT be sent again automatically.', Link: cfg.crmUrl, Status: 'Open' });
    ev('email_delivery_uncertain', x.leadId, clean(r.error).slice(0, 200));
  } else {
    const why = o.split('not_sent_').join('') || 'unknown';
    const label = { duplicate: 'Not sent - duplicate', paused: 'Not sent - paused', suppressed: 'Not sent - suppressed', 'could not verify': 'Not sent - could not verify', step_off: 'Not sent - Gmail step off' }[why] || 'Not sent - ' + why;
    Object.assign(led, { Status: label, Error: clean(r.error || x.suppressionReason || '').slice(0, 300) });
    if (why === 'suppressed') {
      out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Suppressed', 'Updated At': stamp, 'Last Error': 'Suppressed at final check: ' + clean(x.suppressionReason) });
      out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Suppressed', 'Last Updated': today });
      ev('blocked_send_attempt', x.leadId, 'suppressed at final check: ' + clean(x.suppressionReason));
    } else ev('email_not_sent', x.leadId, label);
  }
  out.ledgerUpdates.push(led);
});
// A Gmail step that crashed without an answer leaves us unsure: treat as uncertain, never resend.
if (inputs.length && !Object.prototype.hasOwnProperty.call(inputs[0], 'notSentReason')) {
  Object.keys(finals).forEach((rowId) => {
    const x = finals[rowId];
    if (x.send !== true || seen[rowId]) return;
    out.ledgerUpdates.push({ 'Ledger Row ID': rowId, 'Updated At': stamp, Status: 'Sending', Error: 'UNCERTAIN: no answer from the sending step' });
    out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Sending', 'Updated At': stamp, 'Last Error': 'Delivery uncertain - check the Gmail Sent folder' });
    out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Sending', 'Last Updated': today });
    out.reviewItems.push({ 'Item ID': 'RQ-' + rowId, 'Created At': stamp, Type: 'Delivery uncertain', 'Lead ID': x.leadId, Summary: 'The sending step gave no answer for ' + x.to + '. Check the Gmail Sent folder. It will NOT be sent again automatically.', Link: cfg.crmUrl, Status: 'Open' });
    ev('email_delivery_uncertain', x.leadId, 'no answer from sending step');
  });
}
return [{ json: out }];
