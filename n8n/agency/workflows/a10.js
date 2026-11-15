const onError = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'When An Agency Workflow Fails' },
  output: [{ execution: { id: '231', url: 'https://example.app.n8n.cloud/workflow/1/executions/231', error: { message: 'Example error', stack: '' }, lastNodeExecuted: 'Read Leads', mode: 'trigger' }, workflow: { id: '1', name: '[AGENCY] A2 Research & Analyze' } }]
});

const loadConfig = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Load Agency Config',
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'EwEgjWyFneyjExzI', cachedResultName: '[AGENCY] H0 Helper: Agency Config' },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', crmId: 'SAMPLE', timezone: 'America/New_York', settings: { OWNER_ALERT_EMAIL: '[FILL IN]' } }]
});

const format = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Format Error Row',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Builds one Error Log row. Never crashes, even when n8n sends little information.
const e = $('When An Agency Workflow Fails').first().json || {};
let cfg = {};
try { cfg = $input.first().json || {}; } catch (x) { cfg = {}; }
const ex = e.execution || {};
const tr = e.trigger || {};
const wf = e.workflow || {};
const err = ex.error || tr.error || {};
const clean = (v, n) => {
  let t = String(v === undefined || v === null ? '' : v).split(String.fromCharCode(10)).join(' ').trim().slice(0, n);
  if (t && '=+-@'.indexOf(t[0]) !== -1) t = "'" + t;
  return t;
};
const settings = cfg.settings || {};
const owner = String(settings.OWNER_ALERT_EMAIL || '').trim();
const ownerOk = owner.indexOf('@') > 0 && owner.indexOf('[') === -1;
let time = '';
try { time = DateTime.now().setZone(cfg.timezone || 'America/New_York').toFormat('yyyy-LL-dd HH:mm:ss'); } catch (x) { time = new Date().toISOString(); }
const row = {
  Time: time,
  Workflow: clean(wf.name || 'Unknown workflow', 150),
  'Failed Step': clean(ex.lastNodeExecuted || (err.node && err.node.name) || 'Unknown (workflow may not have started)', 150),
  Error: clean(err.message || err.description || 'No error message was provided', 500),
  'Execution Link': clean(ex.url || '', 300)
};
return [{ json: { row, crmUrl: cfg.crmUrl || '', canLog: !!cfg.crmId, ownerEmail: ownerOk ? owner : '',
  subject: 'Agency automation error: ' + row.Workflow,
  body: 'A workflow failed.' + String.fromCharCode(10) + 'Workflow: ' + row.Workflow + String.fromCharCode(10) + 'Step: ' + row['Failed Step'] + String.fromCharCode(10) + 'Error: ' + row.Error + String.fromCharCode(10) + 'Link: ' + row['Execution Link'] } }];` }
  },
  output: [{ row: { Time: '2026-11-15 09:00:00', Workflow: 'A2', 'Failed Step': 'Read Leads', Error: 'Example', 'Execution Link': '' }, crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', canLog: true, ownerEmail: '', subject: 'x', body: 'y' }]
});

const canLog = ifElse({
  version: 2.2,
  config: {
    name: 'CRM Set Up?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.canLog }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});

const rowOut = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Error Log Row',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return [{ json: $input.first().json.row }];` }
  },
  output: [{ Time: '2026-11-15 09:00:00', Workflow: 'A2' }]
});

const append = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Append To Error Log',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Format Error Row").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Error Log' },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: 'Time', displayName: 'Time', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Workflow', displayName: 'Workflow', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Failed Step', displayName: 'Failed Step', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Error', displayName: 'Error', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Execution Link', displayName: 'Execution Link', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ Time: '2026-11-15 09:00:00' }]
});

const alert = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.1,
  config: {
    name: 'Email Owner (OFF until approved)',
    disabled: true,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $("Format Error Row").first().json.ownerEmail }}'),
      subject: expr('{{ $("Format Error Row").first().json.subject }}'),
      emailType: 'text',
      message: expr('{{ $("Format Error Row").first().json.body }}'),
      options: { appendAttribution: false }
    },
    credentials: { gmailOAuth2: newCredential('Gmail account') }
  },
  output: [{ id: 'msg' }]
});

const notSetUp = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Not Logged: CRM Not Set Up',
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: 'ns-1', name: 'logged', value: false, type: 'boolean' },
      { id: 'ns-2', name: 'reason', value: 'CRM link is not set in H0, so the error could only be seen in n8n Executions.', type: 'string' }
    ] } }
  },
  output: [{ logged: false }]
});

const note = sticky('## A10 Agency Error Logger\nRuns automatically when a **published** agency workflow fails (n8n only fires error workflows for published workflows).\n\nWrites Time, Workflow, Failed Step, Error and a link to the **Error Log** tab of the CRM.\n\nThe owner email step is **switched OFF** until you approve emails and fill OWNER_ALERT_EMAIL in Settings.\n\nTo link it: open each agency workflow > Settings > Error workflow > choose this one (needs this workflow published first).', [format], { color: 3 });

export default workflow('agency-a10-error-logger', '[AGENCY] A10 Agency Error Logger')
  .add(onError)
  .to(loadConfig)
  .to(format)
  .to(canLog
    .onTrue(rowOut.to(append).to(alert))
    .onFalse(notSetUp))
  .add(note);
