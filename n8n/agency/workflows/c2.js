const manualStart = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: "Run Approval Check Now" }, output: [{}] });
const calledStart = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: "When Called By Scheduler", parameters: { inputSource: 'passthrough' } }, output: [{}] });
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
  output: [{ ok: true, crmUrl: 'x', systemPaused: false }]
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
    name: "Stopped: Paused Or Not Set Up",
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "stopped0", name: "stopped", value: true, type: "boolean" },
      { id: "stopped1", name: "reason", value: expr('{{ $json.problems || "SYSTEM_PAUSED is YES in the CRM Settings tab." }}'), type: "string" }
    ] } }
  },
  output: [{ done: true }]
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
const review = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Review Approvals", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Records the founder's decisions in Outreach Drafts. Any change to the To / Subject / Body text
// creates a new version and cancels approval, so an edited email always needs a fresh approval.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const hashText = (s) => { let a = 2166136261; let b = 5381; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = (Math.imul(b, 33) + c) >>> 0; } return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + b.toString(16)).slice(-8); };
const draftHash = (to, subject, body) => hashText(clean(to).toLowerCase() + '|' + clean(subject) + '|' + clean(body).split(String.fromCharCode(13)).join(''));
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
return [{ json: out }];` } },
  output: [{ crmUrl: 'x', draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] }]
});
const save = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Save Review Updates",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "r3tCCgZ7xETHATMd", cachedResultName: "[AGENCY] H8 Helper: Save CRM Updates" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true }]
});
const summary = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: "Approval Summary",
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "summary0", name: "changes", value: expr('{{ $("Review Approvals").first().json.draftUpdates.length }}'), type: "number" }
    ] } }
  },
  output: [{ done: true }]
});
const note = sticky("## C2 Record Outreach Approvals (Stage 4b)\nThe founder reviews drafts in **Outreach Drafts**: set *Review Status* to Approved or Rejected and type a name in *Reviewed By*. This workflow records it (time stamp + fingerprint of the exact text).\n\n**Any edit** to To / Subject / Body creates a new version and cancels approval, so changed text always needs a fresh approval. Every change is kept in **Draft History**.", [review], { color: 6 });

export default workflow("agency-c2-approvals", "[AGENCY] C2 Record Outreach Approvals")
  .add(manualStart)
  .to(loadConfig)
  .add(calledStart)
  .to(loadConfig)
  .add(loadConfig)
  .to(allowed
    .onTrue(readDrafts.to(review).to(save).to(summary))
    .onFalse(stopped))
  .add(note);
