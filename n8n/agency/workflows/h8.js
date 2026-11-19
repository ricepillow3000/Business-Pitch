const whenCalled = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: "When Called With Updates", parameters: { inputSource: 'passthrough' } }, output: [{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', leadUpdates: [], draftUpdates: [], events: [] }] });
const split0 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Lead Rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.leadUpdates || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));` } },
  output: [{ ok: true }]
});
const save0 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Save Lead Rows",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'appendOrUpdate',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Updates").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Leads" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        matchingColumns: ["Lead ID"],
        schema: [
          { id: "Lead ID", displayName: "Lead ID", required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Temperature", displayName: "Temperature", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Reply Status", displayName: "Reply Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Reply Category", displayName: "Reply Category", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Outreach Status", displayName: "Outreach Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Email Subject", displayName: "Email Subject", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Email Draft", displayName: "Email Draft", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Approved By", displayName: "Approved By", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Approved At", displayName: "Approved At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Sent At", displayName: "Sent At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Gmail Message ID", displayName: "Gmail Message ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Gmail Thread ID", displayName: "Gmail Thread ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Follow-up Count", displayName: "Follow-up Count", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Last Contact Date", displayName: "Last Contact Date", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Next Allowed Follow-up", displayName: "Next Allowed Follow-up", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Pipeline Status", displayName: "Pipeline Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Opted Out", displayName: "Opted Out", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Error Status", displayName: "Error Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Last Updated", displayName: "Last Updated", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Notes", displayName: "Notes", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const split1 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Draft Rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.draftUpdates || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));` } },
  output: [{ ok: true }]
});
const save1 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Save Draft Rows",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'appendOrUpdate',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Updates").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Outreach Drafts" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        matchingColumns: ["Draft ID"],
        schema: [
          { id: "Draft ID", displayName: "Draft ID", required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Lead ID", displayName: "Lead ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Step", displayName: "Step", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Version", displayName: "Version", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Created At", displayName: "Created At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Updated At", displayName: "Updated At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Business Name", displayName: "Business Name", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "To Email", displayName: "To Email", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Subject", displayName: "Subject", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Body", displayName: "Body", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Evidence Used", displayName: "Evidence Used", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Research Sources", displayName: "Research Sources", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Removed Claims", displayName: "Removed Claims", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Draft Hash", displayName: "Draft Hash", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Review Status", displayName: "Review Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Reviewed By", displayName: "Reviewed By", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Reviewed At", displayName: "Reviewed At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Approved Hash", displayName: "Approved Hash", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Approved At", displayName: "Approved At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Review Notes", displayName: "Review Notes", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Send Status", displayName: "Send Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Ledger Row ID", displayName: "Ledger Row ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Gmail Message ID", displayName: "Gmail Message ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Gmail Thread ID", displayName: "Gmail Thread ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Sent At", displayName: "Sent At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Unsubscribe Token", displayName: "Unsubscribe Token", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Last Error", displayName: "Last Error", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const split2 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "History Rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.historyRows || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));` } },
  output: [{ ok: true }]
});
const save2 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Add Draft History",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Updates").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Draft History" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: "Time", displayName: "Time", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Draft ID", displayName: "Draft ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Version", displayName: "Version", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Event", displayName: "Event", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Draft Hash", displayName: "Draft Hash", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Subject", displayName: "Subject", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Body", displayName: "Body", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "By", displayName: "By", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const split3 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Ledger Rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.ledgerUpdates || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));` } },
  output: [{ ok: true }]
});
const save3 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Save Send Ledger Rows",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'appendOrUpdate',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Updates").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Send Ledger" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        matchingColumns: ["Ledger Row ID"],
        schema: [
          { id: "Ledger Key", displayName: "Ledger Key", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Lead ID", displayName: "Lead ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Step", displayName: "Step", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "To Email", displayName: "To Email", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Status", displayName: "Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Created At", displayName: "Created At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Updated At", displayName: "Updated At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Gmail Message ID", displayName: "Gmail Message ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Error", displayName: "Error", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Ledger Row ID", displayName: "Ledger Row ID", required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Draft ID", displayName: "Draft ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Run ID", displayName: "Run ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Gmail Thread ID", displayName: "Gmail Thread ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const split4 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Suppression Rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.suppressionAppends || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));` } },
  output: [{ ok: true }]
});
const save4 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Add To Suppression List",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Updates").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Suppression List" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: "Email Or Domain", displayName: "Email Or Domain", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Type", displayName: "Type", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Reason", displayName: "Reason", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Added At", displayName: "Added At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Added By", displayName: "Added By", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Source", displayName: "Source", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const split5 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Unsubscribe Log Rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.unsubscribeLog || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));` } },
  output: [{ ok: true }]
});
const save5 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Add Unsubscribe Request Log",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Updates").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Unsubscribe Requests" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: "Time", displayName: "Time", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Channel", displayName: "Channel", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Reference", displayName: "Reference", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Email", displayName: "Email", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Lead ID", displayName: "Lead ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Result", displayName: "Result", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Details", displayName: "Details", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const split6 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Review Items", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.reviewItems || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));` } },
  output: [{ ok: true }]
});
const save6 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Add To Review Queue",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Updates").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Review Queue" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: "Item ID", displayName: "Item ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Created At", displayName: "Created At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Type", displayName: "Type", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Lead ID", displayName: "Lead ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Summary", displayName: "Summary", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Link", displayName: "Link", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Status", displayName: "Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const split7 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Reply Rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.replyRows || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));` } },
  output: [{ ok: true }]
});
const save7 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Save Reply Rows",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'appendOrUpdate',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("When Called With Updates").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Replies" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        matchingColumns: ["Gmail Message ID"],
        schema: [
          { id: "Gmail Message ID", displayName: "Gmail Message ID", required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Gmail Thread ID", displayName: "Gmail Thread ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Lead ID", displayName: "Lead ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Received At", displayName: "Received At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Category", displayName: "Category", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Confidence", displayName: "Confidence", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Summary", displayName: "Summary", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Draft ID", displayName: "Draft ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Needs Human", displayName: "Needs Human", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Handled", displayName: "Handled", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Processed At", displayName: "Processed At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "From Email", displayName: "From Email", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Subject", displayName: "Subject", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Reply Draft", displayName: "Reply Draft", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: "Rulebook Topics", displayName: "Rulebook Topics", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const splitEv = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Activity Events", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.events || []).filter((r) => r && r.event).map((r) => ({ json: r }));` } },
  output: [{ event: 'x' }]
});
const logAct = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Log Activity",
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "W4IqWN9nxt1abIKb", cachedResultName: "[AGENCY] H4 Helper: Log Activity" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true }]
});
const note = sticky("## H8 Helper: Save CRM Updates\nOne place that writes outreach and reply changes to the CRM: Leads, Outreach Drafts, Draft History, Send Ledger, Suppression List, Unsubscribe Requests, Review Queue, Replies, Activity Log.\n\nRows are matched by **Lead ID / Draft ID / Ledger Row ID / Gmail Message ID** (never by position). Updates only touch the columns given. If a write fails, the calling workflow fails visibly (and A10 logs it once active).", [split0], { color: 6 });

export default workflow("agency-h8-save-updates", "[AGENCY] H8 Helper: Save CRM Updates")
  .add(whenCalled)
  .to(split0)
  .to(save0)
  .add(whenCalled)
  .to(split1)
  .to(save1)
  .add(whenCalled)
  .to(split2)
  .to(save2)
  .add(whenCalled)
  .to(split3)
  .to(save3)
  .add(whenCalled)
  .to(split4)
  .to(save4)
  .add(whenCalled)
  .to(split5)
  .to(save5)
  .add(whenCalled)
  .to(split6)
  .to(save6)
  .add(whenCalled)
  .to(split7)
  .to(save7)
  .add(whenCalled)
  .to(splitEv)
  .to(logAct)
  .add(note);
