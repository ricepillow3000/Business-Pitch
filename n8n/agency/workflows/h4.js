const whenCalled = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: { name: 'When Called', parameters: { inputSource: 'passthrough' } },
  output: [{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', workflow: 'A1 Discover', event: 'leads_added', leadId: '', count: 3, details: 'sample', isDemo: true }]
});

const formatRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Format Log Rows',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// One Activity Log row per incoming event. Reports are counted from these rows only.
const now = DateTime.now().setZone('America/New_York').toFormat('yyyy-LL-dd HH:mm:ss');
return $input.all()
  .map((i) => i.json || {})
  .filter((e) => e.crmUrl && e.event)
  .map((e) => ({ json: {
    crmUrl: String(e.crmUrl),
    Time: now,
    'Run ID': String(e.runId || ''),
    Workflow: String(e.workflow || ''),
    Event: String(e.event),
    'Lead ID': String(e.leadId || ''),
    Count: Number(e.count) || 0,
    Details: String(e.details || '').slice(0, 500),
    'Is Demo': e.isDemo === false ? 'NO' : 'YES'
  } }));` }
  },
  output: [{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', Time: '2026-11-15 09:00:00', Event: 'leads_added', Count: 3 }]
});

const appendLog = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Append To Activity Log',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Activity Log' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          Time: expr('{{ $json.Time }}'),
          'Run ID': expr('{{ $json["Run ID"] }}'),
          Workflow: expr('{{ $json.Workflow }}'),
          Event: expr('{{ $json.Event }}'),
          'Lead ID': expr('{{ $json["Lead ID"] }}'),
          Count: expr('{{ $json.Count }}'),
          Details: expr('{{ $json.Details }}'),
          'Is Demo': expr('{{ $json["Is Demo"] }}')
        },
        schema: [
          { id: 'Time', displayName: 'Time', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Run ID', displayName: 'Run ID', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Workflow', displayName: 'Workflow', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Event', displayName: 'Event', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Lead ID', displayName: 'Lead ID', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Count', displayName: 'Count', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Details', displayName: 'Details', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Is Demo', displayName: 'Is Demo', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ Time: '2026-11-15 09:00:00' }]
});

const done = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Logged',
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: 'lg-ok', name: 'logged', value: true, type: 'boolean' },
      { id: 'lg-n', name: 'rows', value: expr('{{ $("Format Log Rows").all().length }}'), type: 'number' }
    ] } }
  },
  output: [{ logged: true, rows: 1 }]
});

const note = sticky('## H4 Log Activity (helper)\nWrites one row per event to the CRM **Activity Log** tab (leads added, researched, duplicates skipped...).\n\nThe morning and evening reports will be counted ONLY from these rows, so numbers are never made up.\n\nIf logging fails, the calling workflow keeps going.', [formatRows], { color: 4 });

export default workflow('agency-h4-log-activity', '[AGENCY] H4 Helper: Log Activity')
  .add(whenCalled)
  .to(formatRows)
  .to(appendLog)
  .to(done)
  .add(note);
