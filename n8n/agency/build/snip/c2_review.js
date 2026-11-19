// Records the founder's decisions in Outreach Drafts. Any change to the To / Subject / Body text
// creates a new version and cancels approval, so an edited email always needs a fresh approval.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
__HASH__
const rows = $input.all().map((i) => i.json || {});
if (rows.some((r) => r.error)) throw new Error('C2 could not read the Outreach Drafts tab');
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const today = now.toFormat('yyyy-LL-dd');
const out = { crmUrl: cfg.crmUrl, draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] };
const ev = (event, leadId, details) => out.events.push({ crmUrl: cfg.crmUrl, workflow: 'C2 Record Approvals', runId: String($execution.id), isDemo: cfg.isDemo !== false, event, leadId: leadId || '', count: 1, details: details || '' });
const DONE = ['sent', 'sending', 'failed', 'suppressed'];
rows.forEach((d) => {
  const draftId = clean(d['Draft ID']);
  const leadId = clean(d['Lead ID']);
  if (!draftId || !leadId) return;
  if (DONE.indexOf(clean(d['Send Status']).toLowerCase()) !== -1) return;
  const status = clean(d['Review Status']);
  const cur = draftHash(d['To Email'], d.Subject, d.Body);
  const version = Number(d.Version) || 1;
  const hist = (event, v) => out.historyRows.push({ Time: stamp, 'Draft ID': draftId, Version: String(v), Event: event, 'Draft Hash': cur, Subject: clean(d.Subject), Body: clean(d.Body), By: clean(d['Reviewed By']) || 'C2 automation' });
  if (cur !== clean(d['Draft Hash'])) {
    const wasApproved = status === 'Approved' || clean(d['Approved Hash']);
    out.draftUpdates.push({ 'Draft ID': draftId, Version: String(version + 1), 'Draft Hash': cur, 'Review Status': 'Pending review', 'Approved Hash': '', 'Approved At': '', 'Reviewed At': '', 'Updated At': stamp, 'Review Notes': 'Edited (version ' + (version + 1) + ') on ' + stamp + '. Please review and approve again.' });
    out.leadUpdates.push({ 'Lead ID': leadId, 'Outreach Status': 'Pending', 'Email Subject': clean(d.Subject), 'Email Draft': clean(d.Body), 'Approved By': '', 'Approved At': '', 'Last Updated': today });
    hist('edited', version + 1);
    if (wasApproved) out.reviewItems.push({ 'Item ID': 'RQ-' + draftId + '-v' + (version + 1), 'Created At': stamp, Type: 'Edited draft needs approval', 'Lead ID': leadId, Summary: clean(d['Business Name']) + ': the email changed after it was approved. Approval was cancelled; approve the new version to send it.', Link: cfg.crmUrl, Status: 'Open' });
    ev('draft_edited', leadId, 'version ' + (version + 1) + (wasApproved ? ' (approval cancelled)' : ''));
    return;
  }
  if (status === 'Approved') {
    if (!clean(d['Reviewed By'])) {
      out.draftUpdates.push({ 'Draft ID': draftId, 'Review Status': 'Pending review', 'Updated At': stamp, 'Review Notes': 'Approval needs your name or initials in Reviewed By. Add it and approve again.' });
      ev('approval_missing_name', leadId, draftId);
      return;
    }
    if (clean(d['Approved Hash']) === cur && clean(d['Approved At'])) return;
    out.draftUpdates.push({ 'Draft ID': draftId, 'Approved Hash': cur, 'Approved At': stamp, 'Reviewed At': stamp, 'Updated At': stamp, 'Review Notes': 'Approved (version ' + version + ') by ' + clean(d['Reviewed By']) + ' on ' + stamp });
    out.leadUpdates.push({ 'Lead ID': leadId, 'Outreach Status': 'Approved', 'Approved By': clean(d['Reviewed By']), 'Approved At': stamp, 'Pipeline Status': 'Outreach approved', 'Last Updated': today });
    hist('approved', version);
    ev('draft_approved', leadId, 'version ' + version + ' by ' + clean(d['Reviewed By']));
    return;
  }
  if (status === 'Rejected') {
    if (clean(d['Reviewed At']) && !clean(d['Approved Hash'])) return;
    out.draftUpdates.push({ 'Draft ID': draftId, 'Approved Hash': '', 'Approved At': '', 'Reviewed At': stamp, 'Updated At': stamp, 'Review Notes': 'Rejected' + (clean(d['Reviewed By']) ? ' by ' + clean(d['Reviewed By']) : '') + ' on ' + stamp + '. It will never be sent.' });
    out.leadUpdates.push({ 'Lead ID': leadId, 'Outreach Status': 'Rejected', 'Approved By': '', 'Approved At': '', 'Last Updated': today });
    hist('rejected', version);
    ev('draft_rejected', leadId, draftId);
    return;
  }
  if (clean(d['Approved Hash']) || clean(d['Approved At'])) {
    out.draftUpdates.push({ 'Draft ID': draftId, 'Approved Hash': '', 'Approved At': '', 'Updated At': stamp, 'Review Notes': 'Approval withdrawn on ' + stamp });
    out.leadUpdates.push({ 'Lead ID': leadId, 'Outreach Status': 'Pending', 'Approved By': '', 'Approved At': '', 'Last Updated': today });
    hist('approval withdrawn', version);
    ev('approval_withdrawn', leadId, draftId);
  }
});
return [{ json: out }];
