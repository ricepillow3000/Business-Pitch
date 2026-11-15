const manualStart = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: "Run Setup Once" }, output: [{}] });
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
  output: [{ ok: true, crmId: 'SAMPLE', crmUrl: 'x' }]
});
const hasCrm = ifElse({
  version: 2.2,
  config: {
    name: "CRM Link Set?",
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ !!$json.crmId && $json.crmUrl.indexOf("PASTE_") === -1 }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});
const noCrm = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: "Stopped: CRM Link Not Set",
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "noCrm0", name: "reason", value: 'Paste the DEMO CRM link into H0 CRM Location first.', type: "string" }
    ] } }
  },
  output: [{ done: true }]
});
const readStruct = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: "Read CRM Structure",
    parameters: {
      method: 'GET',
      url: expr("https://sheets.googleapis.com/v4/spreadsheets/{{ $(\"Load Agency Config\").first().json.crmId }}?fields=sheets.properties(sheetId,title)"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      options: { timeout: 30000 }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ sheets: [{ properties: { sheetId: 100, title: 'Leads' } }] }]
});
const readVals = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: "Read Headings And Settings",
    parameters: {
      method: 'GET',
      url: expr("https://sheets.googleapis.com/v4/spreadsheets/{{ $(\"Load Agency Config\").first().json.crmId }}/values:batchGet?ranges=Settings!A:A&ranges=%27Send%20Ledger%27!1:1&ranges=Leads!1:1"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      options: { timeout: 30000 }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ valueRanges: [] }]
});
const plan = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Plan Changes", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Plans the Phase C additions to the DEMO CRM. Only adds what is missing (safe to run twice).
// Never deletes or overwrites existing rows.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const meta = $('Read CRM Structure').first().json || {};
const vals = $input.first().json || {};
if (meta.error || vals.error) throw new Error('A0b could not read the CRM structure');
const sheets = (meta.sheets || []).map((s) => s.properties || {});
const byTitle = {};
sheets.forEach((p) => { byTitle[p.title] = p.sheetId; });
const ranges = vals.valueRanges || [];
const rangeVals = (i) => ((ranges[i] || {}).values || []);
const settingsKeys = rangeVals(0).map((r) => clean(r[0]));
const ledgerHeader = (rangeVals(1)[0] || []).map(clean);
const leadsHeader = (rangeVals(2)[0] || []).map(clean);
const NEW_TABS = [
  { id: 1300, title: 'Outreach Drafts', headers: ['Draft ID', 'Lead ID', 'Step', 'Version', 'Created At', 'Updated At', 'Business Name', 'To Email', 'Subject', 'Body', 'Evidence Used', 'Research Sources', 'Removed Claims', 'Draft Hash', 'Review Status', 'Reviewed By', 'Reviewed At', 'Approved Hash', 'Approved At', 'Review Notes', 'Send Status', 'Ledger Row ID', 'Gmail Message ID', 'Gmail Thread ID', 'Sent At', 'Unsubscribe Token', 'Last Error'] },
  { id: 1400, title: 'Draft History', headers: ['Time', 'Draft ID', 'Version', 'Event', 'Draft Hash', 'Subject', 'Body', 'By'] },
  { id: 1500, title: 'Unsubscribe Requests', headers: ['Time', 'Channel', 'Reference', 'Email', 'Lead ID', 'Result', 'Details'] }
];
const NEW_SETTINGS = [
  ['GMAIL_SENDING_ENABLED', 'NO', 'Second lock for sending. Must be YES (and OUTREACH_PAUSED = NO) before C3 will send. Leave NO until go-live is approved.'],
  ['SEND_BATCH_SIZE', '3', 'Most emails C3 may send in one run (max 10).'],
  ['DRAFT_BATCH_SIZE', '5', 'Most drafts C1 may write in one run (max 10).'],
  ['SEND_WINDOW_START', '9', 'Earliest hour (24h, in TIMEZONE) emails may be sent, weekdays only.'],
  ['SEND_WINDOW_END', '16', 'Sending stops at this hour.'],
  ['DISCOVERY_CALL_MINUTES', '20', 'Length of the discovery call offered in emails.'],
  ['AGENCY_WEBSITE', '[FILL IN]', 'Shown in the email footer (optional).'],
  ['AD_DISCLOSURE_LINE', '', 'Optional line identifying the email as a business offer, if your lawyer recommends one.'],
  ['UNSUBSCRIBE_BASE_URL', '', 'Production URL of C4 Unsubscribe once it is approved and active. Empty = reply-STOP opt-out only.'],
  ['ONE_CLICK_UNSUBSCRIBE_VERIFIED', 'NO', 'Set YES only after a real one-click unsubscribe test has passed.']
];
const LEDGER_EXTRA = ['Ledger Row ID', 'Draft ID', 'Run ID', 'Gmail Thread ID'];
const requests = [];
const data = [];
const colLetter = (n) => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const q = (t) => "'" + t + "'";
const dropdown = (sheetId, col, values) => ({ setDataValidation: { range: { sheetId, startRowIndex: 1, endRowIndex: 5000, startColumnIndex: col, endColumnIndex: col + 1 }, rule: { condition: { type: 'ONE_OF_LIST', values: values.map((v) => ({ userEnteredValue: v })) }, showCustomUi: true, strict: false } } });
const added = [];
NEW_TABS.forEach((t) => {
  if (byTitle[t.title] !== undefined) return;
  requests.push({ addSheet: { properties: { sheetId: t.id, title: t.title, gridProperties: { rowCount: 1000, columnCount: t.headers.length, frozenRowCount: 1 } } } });
  data.push({ range: q(t.title) + '!A1:' + colLetter(t.headers.length - 1) + '1', values: [t.headers] });
  byTitle[t.title] = t.id;
  added.push('tab ' + t.title);
});
const draftsId = byTitle['Outreach Drafts'];
requests.push(dropdown(draftsId, 14, ['Pending review', 'Approved', 'Rejected']));
requests.push(dropdown(draftsId, 20, ['Not sent', 'Sending', 'Sent', 'Failed', 'Suppressed']));
if (byTitle['Send Ledger'] === undefined || byTitle.Settings === undefined || byTitle.Leads === undefined) throw new Error('This does not look like the Agency CRM (missing Leads, Settings or Send Ledger tab)');
const missingLedger = LEDGER_EXTRA.filter((h) => ledgerHeader.indexOf(h) === -1);
if (missingLedger.length) {
  const start = ledgerHeader.length;
  data.push({ range: q('Send Ledger') + '!' + colLetter(start) + '1:' + colLetter(start + missingLedger.length - 1) + '1', values: [missingLedger] });
  added.push('Send Ledger columns: ' + missingLedger.join(', '));
}
const statusCol = ledgerHeader.indexOf('Status');
if (statusCol !== -1) requests.push(dropdown(byTitle['Send Ledger'], statusCol, ['Sending', 'Sent', 'Failed', 'Not sent - duplicate', 'Not sent - paused', 'Not sent - suppressed', 'Not sent - Gmail step off', 'Not sent - could not verify', 'Cleared for retry']));
const outCol = leadsHeader.indexOf('Outreach Status');
if (outCol !== -1) requests.push(dropdown(byTitle.Leads, outCol, ['Pending', 'Approved', 'Sending', 'Sent', 'Failed', 'Suppressed', 'Rejected']));
const missingSettings = NEW_SETTINGS.filter((r) => settingsKeys.indexOf(r[0]) === -1);
if (missingSettings.length) {
  const start = settingsKeys.length + 1;
  data.push({ range: q('Settings') + '!A' + start + ':C' + (start + missingSettings.length - 1), values: missingSettings });
  added.push('Settings: ' + missingSettings.map((r) => r[0]).join(', '));
}
return [{ json: { crmId: cfg.crmId, structureBody: { requests }, valuesBody: { valueInputOption: 'RAW', data }, added, hasValues: data.length > 0 } }];` } },
  output: [{ crmId: 'SAMPLE', structureBody: { requests: [] }, valuesBody: { data: [] }, added: [], hasValues: false }]
});
const addTabs = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: "Add Tabs And Dropdowns",
    parameters: {
      method: 'POST',
      url: expr("https://sheets.googleapis.com/v4/spreadsheets/{{ $(\"Load Agency Config\").first().json.crmId }}:batchUpdate"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify($(\"Plan Changes\").first().json.structureBody) }}"),
      options: { timeout: 30000 }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ replies: [] }]
});
const hasVals = ifElse({
  version: 2.2,
  config: {
    name: "Headings To Write?",
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $("Plan Changes").first().json.hasValues }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});
const writeVals = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: "Write Headings And Settings",
    parameters: {
      method: 'POST',
      url: expr("https://sheets.googleapis.com/v4/spreadsheets/{{ $(\"Load Agency Config\").first().json.crmId }}/values:batchUpdate"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify($(\"Plan Changes\").first().json.valuesBody) }}"),
      options: { timeout: 30000 }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ replies: [] }]
});
const done = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: "Setup Summary",
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "done0", name: "added", value: expr('{{ $("Plan Changes").first().json.added.join(" | ") || "Nothing to add - already set up" }}'), type: "string" }
    ] } }
  },
  output: [{ done: true }]
});
const note = sticky("## A0b Setup: Add Phase C Tabs (DEMO)\nRun once, after the CRM link is set in H0. Adds only what is missing (safe to run twice):\n- tabs **Outreach Drafts**, **Draft History**, **Unsubscribe Requests**\n- 4 new **Send Ledger** columns\n- new **Settings** rows (all sending switches start OFF)\n- dropdowns for review and send statuses\n\nNever deletes or overwrites existing data.", [plan], { color: 6 });

export default workflow("agency-a0b-phase-c-tabs", "[AGENCY] A0b Setup: Add Phase C Tabs (DEMO)")
  .add(manualStart)
  .to(loadConfig)
  .to(hasCrm
    .onTrue(readStruct.to(readVals).to(plan).to(addTabs).to(hasVals
      .onTrue(writeVals.to(done))
      .onFalse(done)))
    .onFalse(noCrm))
  .add(note);
