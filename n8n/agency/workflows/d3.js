const manualStart = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: "Draft Follow-ups Now" }, output: [{}] });
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
  output: [{ ok: true, crmUrl: 'x', systemPaused: false, settings: {} }]
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
  output: [{ 'Lead ID': 'L-x' }]
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
  output: [{ 'Draft ID': 'D-L-x-initial' }]
});
const pick = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Pick Follow-ups Due", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Finds leads whose follow-up is due: first email Sent, NO reply of any kind, not opted out, date
// reached, fewer than MAX_FOLLOWUPS (at most 2). Stops (fail closed) if a tab can't be read.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const today = now.toFormat('yyyy-LL-dd');
const leads = $('Read Leads').all().map((i) => i.json || {});
const drafts = $input.all().map((i) => i.json || {});
if (leads.some((r) => r.error)) throw new Error('D3 could not read the Leads tab');
if (drafts.some((r) => r.error)) throw new Error('D3 could not read the Outreach Drafts tab');
const maxF = Math.min(Math.max(Number(clean(s.MAX_FOLLOWUPS) || 2), 0), 2);
const batch = Math.min(Math.max(Number(s.DRAFT_BATCH_SIZE) || 5, 1), 10);
const demoFlag = cfg.isDemo === false ? 'NO' : 'YES';
const byId = {};
drafts.forEach((d) => { if (clean(d['Draft ID'])) byId[clean(d['Draft ID'])] = d; });
const picked = [];
const skipped = [];
leads.forEach((l) => {
  const id = clean(l['Lead ID']);
  if (!id || clean(l['Is Demo']).toUpperCase() !== demoFlag || clean(l['Opted Out']).toUpperCase() === 'YES') return;
  if (['contacted', 'follow-up pending'].indexOf(clean(l['Pipeline Status']).toLowerCase()) === -1) return;
  if (clean(l['Reply Status']) || clean(l['Reply Category']) && clean(l['Reply Category']).indexOf('Out of office') !== 0) return;
  const due = clean(l['Next Allowed Follow-up']);
  if (!due || due > today) return;
  const count = Number(clean(l['Follow-up Count']) || 0) || 0;
  if (count >= maxF) return;
  const step = 'followup' + (count + 1);
  const did = 'D-' + id + '-' + step;
  if (byId[did]) return;
  const init = byId['D-' + id + '-initial'];
  if (!init || clean(init['Send Status']) !== 'Sent') { skipped.push(id + ': first email not marked Sent'); return; }
  const thread = clean(init['Gmail Thread ID']) || clean(l['Gmail Thread ID']);
  if (!thread) { skipped.push(id + ': no Gmail thread recorded'); return; }
  const to = clean(init['To Email']).toLowerCase();
  if (!to || to !== clean(l['Public Email']).toLowerCase()) { skipped.push(id + ': lead email changed since the first email'); return; }
  if (count > 0 && !(byId['D-' + id + '-followup' + count] && clean(byId['D-' + id + '-followup' + count]['Send Status']) === 'Sent')) { skipped.push(id + ': previous follow-up not marked Sent'); return; }
  if (picked.length < batch) picked.push({ leadId: id, email: to, ref: did, step, count, thread, crmUrl: cfg.crmUrl, runId: String($execution.id) });
});
return picked.map((x, i) => ({ json: Object.assign({}, x, { skipped: i === 0 ? skipped : [] }) }));` } },
  output: [{ leadId: 'L-x', email: 'info@x.example', ref: 'D-L-x-followup1', step: 'followup1', count: 0 }]
});
const supCheck = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Suppression Check",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "Xq13OdqjXhOLBWZr", cachedResultName: "[AGENCY] H6 Helper: Suppression Check" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ref: 'D-L-x-followup1', allowed: true, checkedOk: true }]
});
const build = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Build Follow-up Drafts", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Builds short, fixed-wording follow-up drafts (no AI, no new claims). They reuse the first email's
// greeting, footer and unsubscribe token, go in the same Gmail thread, and need approval like any draft.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const NL = String.fromCharCode(10);
const hashText = (s) => { let a = 2166136261; let b = 5381; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = (Math.imul(b, 33) + c) >>> 0; } return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + b.toString(16)).slice(-8); };
const draftHash = (to, subject, body) => hashText(clean(to).toLowerCase() + '|' + clean(subject) + '|' + clean(body).split(String.fromCharCode(13)).join(''));
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const today = now.toFormat('yyyy-LL-dd');
const leadsById = {};
$('Read Leads').all().forEach((i) => { const l = i.json || {}; if (clean(l['Lead ID'])) leadsById[clean(l['Lead ID'])] = l; });
const draftsById = {};
$('Read Outreach Drafts').all().forEach((i) => { const d = i.json || {}; if (clean(d['Draft ID'])) draftsById[clean(d['Draft ID'])] = d; });
const ok = {};
$input.all().forEach((i) => { const a = i.json || {}; if (a.allowed === true && a.checkedOk === true && clean(a.ref)) ok[clean(a.ref)] = clean(a.email).toLowerCase(); });
const maxF = Math.min(Math.max(Number(clean(s.MAX_FOLLOWUPS) || 2), 0), 2);
const mins = clean(s.DISCOVERY_CALL_MINUTES) || '20';
const out = { crmUrl: cfg.crmUrl, draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] };
const ev = (event, leadId, details) => out.events.push({ crmUrl: cfg.crmUrl, workflow: 'D3 Follow-up Tracker', runId: String($execution.id), isDemo: cfg.isDemo !== false, event, leadId: leadId || '', count: 1, details: clean(details).slice(0, 300) });
const picks = $('Pick Follow-ups Due').all().map((i) => i.json || {});
if (picks[0] && (picks[0].skipped || []).length) ev('followup_candidates_skipped', '', picks[0].skipped.join(' | '));
picks.forEach((p) => {
  if (!ok[p.ref] || ok[p.ref] !== p.email) { ev('followup_skipped_suppressed', p.leadId, 'suppressed or not verified'); return; }
  const l = leadsById[p.leadId];
  const init = draftsById['D-' + p.leadId + '-initial'];
  if (!l || !init) return;
  const lines = clean(init.Body).split(NL);
  const greet = lines[0].indexOf('Hi ') === 0 ? lines[0] : 'Hi,';
  const cut = lines.lastIndexOf('--');
  if (cut === -1) { ev('followup_skipped_no_footer', p.leadId, 'first email has no footer to reuse'); return; }
  const footer = lines.slice(cut).join(NL);
  const opp = clean(l['Primary Opportunity']) || 'the idea I mentioned';
  const sender = clean(s.SENDER_NAME) && clean(s.SENDER_NAME).indexOf('[FILL IN]') === -1 ? clean(s.SENDER_NAME) : '[MISSING: SENDER_NAME]';
  const n = p.count + 1;
  const middle = n < maxF
    ? ['Just following up on my email below about ' + opp.toLowerCase() + '.', '', 'If a short ' + mins + '-minute call would be useful, reply with a time that suits you. If now is not a good time, no problem.']
    : ['One last note from me about ' + opp.toLowerCase() + '.', '', 'If you would like to talk it through on a ' + mins + '-minute call, just reply. Otherwise I will not follow up again.'];
  const body = [greet, ''].concat(middle).concat(['', 'Thanks,', sender, '', footer]).join(NL);
  const subj0 = clean(init.Subject);
  const subject = subj0.toLowerCase().indexOf('re:') === 0 ? subj0 : 'Re: ' + subj0;
  const did = p.ref;
  const h = draftHash(p.email, subject, body);
  out.draftUpdates.push({
    'Draft ID': did, 'Lead ID': p.leadId, Step: p.step, Version: '1', 'Created At': stamp, 'Updated At': stamp,
    'Business Name': clean(l['Business Name']), 'To Email': p.email, Subject: subject, Body: body,
    'Evidence Used': '', 'Research Sources': clean(init['Research Sources']), 'Removed Claims': '', 'Draft Hash': h,
    'Review Status': 'Pending review', 'Reviewed By': '', 'Reviewed At': '', 'Approved Hash': '', 'Approved At': '',
    'Review Notes': 'Follow-up ' + n + ' of ' + maxF + ', fixed wording, same Gmail thread. Cancelled automatically if the lead replies.',
    'Send Status': 'Not sent', 'Gmail Thread ID': p.thread, 'Unsubscribe Token': clean(init['Unsubscribe Token']), 'Last Error': ''
  });
  out.historyRows.push({ Time: stamp, 'Draft ID': did, Version: '1', Event: 'created', 'Draft Hash': h, Subject: subject, Body: body, By: 'D3 Follow-up Tracker' });
  out.leadUpdates.push({ 'Lead ID': p.leadId, 'Pipeline Status': 'Follow-up pending', 'Outreach Status': 'Pending', 'Last Updated': today });
  out.reviewItems.push({ 'Item ID': 'RQ-' + did, 'Created At': stamp, Type: 'Follow-up draft ready', 'Lead ID': p.leadId, Summary: 'Follow-up ' + n + ' for ' + clean(l['Business Name']) + ' is waiting for approval in Outreach Drafts.', Link: cfg.crmUrl, Status: 'Open' });
  ev('followup_draft_created', p.leadId, p.step);
});
return [{ json: out }];` } },
  output: [{ crmUrl: 'x', draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] }]
});
const save = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Save Follow-up Drafts",
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
    name: "Follow-up Summary",
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "summary0", name: "draftsCreated", value: expr('{{ $("Build Follow-up Drafts").first().json.draftUpdates.length }}'), type: "number" }
    ] } }
  },
  output: [{ done: true }]
});
const note = sticky("## D3 Follow-up Tracker (Stage 4-5) - INACTIVE\nDrafts at most **MAX_FOLLOWUPS (2)** short, fixed-wording follow-ups per lead, only when: first email Sent, **no reply of any kind**, not opted out, not suppressed, follow-up date reached.\n\nDrafts go to **Outreach Drafts** as *Pending review* and need your approval like any email (C2), then C3 sends them in the same Gmail thread. If the lead replies first, the follow-up is cancelled automatically (by D2, and again by C3 just before sending).", [pick], { color: 6 });

export default workflow("agency-d3-followups", "[AGENCY] D3 Follow-up Tracker")
  .add(manualStart)
  .to(loadConfig)
  .add(calledStart)
  .to(loadConfig)
  .add(loadConfig)
  .to(allowed
    .onTrue(readLeads.to(readDrafts).to(pick).to(supCheck).to(build).to(save).to(summary))
    .onFalse(stopped))
  .add(note);
