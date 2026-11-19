import json, os
S = 'snip/'
HASH = open(S + 'hash_helpers.txt').read().strip()
def snip(name):
    s = open(S + name).read().rstrip('\n')
    s = s.replace('__HASH__', HASH)
    assert '`' not in s and '${' not in s and '\\' not in s, name
    return s
IDS = {'H0': 'EwEgjWyFneyjExzI', 'H1': 'wD2yN7CAk0xz0oiW', 'H4': 'W4IqWN9nxt1abIKb'}
if os.path.exists('ids.json'): IDS.update(json.load(open('ids.json')))
NAMES = {'H0': '[AGENCY] H0 Helper: Agency Config', 'H1': '[AGENCY] H1 Helper: AI Brain', 'H4': '[AGENCY] H4 Helper: Log Activity', 'H6': '[AGENCY] H6 Helper: Suppression Check', 'H7': '[AGENCY] H7 Helper: Send One Email (OFF)', 'H8': '[AGENCY] H8 Helper: Save CRM Updates', 'C4': '[AGENCY] C4 Unsubscribe', 'D2': '[AGENCY] D2 Handle One Reply'}
def js(v): return json.dumps(v)
def col(c, match=False): return "{ id: %s, displayName: %s, required: false, defaultMatch: %s, display: true, type: 'string', canBeUsedToMatch: true }" % (js(c), js(c), 'true' if match else 'false')
def schema(cols, match=None): return '[\n          ' + ',\n          '.join(col(c, c == match) for c in cols) + '\n        ]'
CFG = '$("Load Agency Config").first().json.crmUrl'
def code(var, name, fname, sample, mode='runOnceForAllItems', extra=''):
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{ name: {js(name)},{extra} parameters: {{ mode: '{mode}', language: 'javaScript', jsCode: `{snip(fname)}` }} }},
  output: [{sample}]
}});
"""
def inline_code(var, name, src, sample):
    assert '`' not in src and '${' not in src and '\\' not in src
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{ name: {js(name)}, parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `{src}` }} }},
  output: [{sample}]
}});
"""
def read(var, name, tab, crm=CFG, sample="{ row_number: 2 }"):
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {{
    name: {js(name)},
    executeOnce: true,
    alwaysOutputData: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    parameters: {{
      resource: 'sheet',
      operation: 'read',
      documentId: {{ __rl: true, mode: 'url', value: expr('{{{{ {crm} }}}}') }},
      sheetName: {{ __rl: true, mode: 'name', value: {js(tab)} }},
      options: {{}}
    }},
    credentials: {{ googleSheetsOAuth2Api: newCredential('Google Sheets account') }}
  }},
  output: [{sample}]
}});
"""
def write(var, name, tab, cols, match=None, crm=CFG, retry=True, onerr=False):
    op = 'appendOrUpdate' if match else 'append'
    mc = f"\n        matchingColumns: [{js(match)}]," if match else ''
    r = "\n    retryOnFail: true,\n    maxTries: 3,\n    waitBetweenTries: 3000," if retry else ''
    oe = "\n    onError: 'continueRegularOutput'," if onerr else ''
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {{
    name: {js(name)},{r}{oe}
    parameters: {{
      resource: 'sheet',
      operation: '{op}',
      documentId: {{ __rl: true, mode: 'url', value: expr('{{{{ {crm} }}}}') }},
      sheetName: {{ __rl: true, mode: 'name', value: {js(tab)} }},
      columns: {{
        mappingMode: 'autoMapInputData',
        value: {{}},{mc}
        schema: {schema(cols, match)}
      }},
      options: {{ cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }}
    }},
    credentials: {{ googleSheetsOAuth2Api: newCredential('Google Sheets account') }}
  }},
  output: [{{ ok: true }}]
}});
"""
def call(var, name, key, mode='once', once=False, onerr=False, sample="{ ok: true }"):
    eo = "\n    executeOnce: true," if once else ''
    oe = "\n    onError: 'continueRegularOutput'," if onerr else ''
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {{
    name: {js(name)},{eo}{oe}
    parameters: {{
      source: 'database',
      workflowId: {{ __rl: true, mode: 'id', value: {js(IDS.get(key, key + '_ID'))}, cachedResultName: {js(NAMES[key])} }},
      mode: '{mode}',
      options: {{ waitForSubWorkflow: true }}
    }}
  }},
  output: [{sample}]
}});
"""
def ifb(var, name, left, op='true'):
    return f"""const {var} = ifElse({{
  version: 2.2,
  config: {{
    name: {js(name)},
    parameters: {{
      conditions: {{
        options: {{ caseSensitive: true, leftValue: '', typeValidation: 'loose' }},
        conditions: [{{ leftValue: expr('{{{{ {left} }}}}'), operator: {{ type: 'boolean', operation: '{op}', singleValue: true }}, rightValue: '' }}],
        combinator: 'and'
      }}
    }}
  }}
}});
"""
def setn(var, name, assigns, sample="{ done: true }", once=False):
    a = ',\n      '.join("{ id: %s, name: %s, value: %s, type: %s }" % (js(var + str(i)), js(n), v, js(t)) for i, (n, v, t) in enumerate(assigns))
    eo = "\n    executeOnce: true," if once else ''
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{
    name: {js(name)},{eo}
    parameters: {{ mode: 'manual', assignments: {{ assignments: [
      {a}
    ] }} }}
  }},
  output: [{sample}]
}});
"""
def trig_manual(var, name): return f"const {var} = trigger({{ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {{ name: {js(name)} }}, output: [{{}}] }});\n"
def trig_called(var, name, sample='{}'): return f"const {var} = trigger({{ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: {{ name: {js(name)}, parameters: {{ inputSource: 'passthrough' }} }}, output: [{sample}] }});\n"
def sticky(text, var): return "const note = sticky(%s, [%s], { color: 6 });\n" % (js(text), var)
ALLOWED = """const allowed = ifElse({
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
"""
STOPPED = setn('stopped', 'Stopped: Paused Or Not Set Up', [('stopped', 'true', 'boolean'), ('reason', "expr('{{ $json.problems || \"SYSTEM_PAUSED is YES in the CRM Settings tab.\" }}')", 'string')])
LEADS_COLS = ['Lead ID', 'Temperature', 'Reply Status', 'Reply Category', 'Outreach Status', 'Email Subject', 'Email Draft', 'Approved By', 'Approved At', 'Sent At', 'Gmail Message ID', 'Gmail Thread ID', 'Follow-up Count', 'Last Contact Date', 'Next Allowed Follow-up', 'Pipeline Status', 'Opted Out', 'Error Status', 'Last Updated', 'Notes']
DRAFT_COLS = ['Draft ID', 'Lead ID', 'Step', 'Version', 'Created At', 'Updated At', 'Business Name', 'To Email', 'Subject', 'Body', 'Evidence Used', 'Research Sources', 'Removed Claims', 'Draft Hash', 'Review Status', 'Reviewed By', 'Reviewed At', 'Approved Hash', 'Approved At', 'Review Notes', 'Send Status', 'Ledger Row ID', 'Gmail Message ID', 'Gmail Thread ID', 'Sent At', 'Unsubscribe Token', 'Last Error']
HIST_COLS = ['Time', 'Draft ID', 'Version', 'Event', 'Draft Hash', 'Subject', 'Body', 'By']
LEDGER_COLS = ['Ledger Key', 'Lead ID', 'Step', 'To Email', 'Status', 'Created At', 'Updated At', 'Gmail Message ID', 'Error', 'Ledger Row ID', 'Draft ID', 'Run ID', 'Gmail Thread ID']
SUP_COLS = ['Email Or Domain', 'Type', 'Reason', 'Added At', 'Added By', 'Source']
UNSUB_COLS = ['Time', 'Channel', 'Reference', 'Email', 'Lead ID', 'Result', 'Details']
REVIEW_COLS = ['Item ID', 'Created At', 'Type', 'Lead ID', 'Summary', 'Link', 'Status']
REPLY_COLS = ['Gmail Message ID', 'Gmail Thread ID', 'Lead ID', 'Received At', 'Category', 'Confidence', 'Summary', 'Draft ID', 'Needs Human', 'Handled', 'Processed At', 'From Email', 'Subject', 'Reply Draft', 'Rulebook Topics']
