from gen_c import *
def wf(fname, wid, title, body, chain):
    open('wf/' + fname, 'w').write(body + "\nexport default workflow(%s, %s)\n%s;\n" % (js(wid), js(title), chain))

# ---------------- H6 Suppression Check ----------------
H6C = '$("When Called With Addresses").first().json.crmUrl'
body = trig_called('whenCalled', 'When Called With Addresses', "{ leadId: 'L-sample.example', email: 'info@sample.example', ref: 'D-L-sample.example-initial', crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit' }")
body += read('readSup', 'Read Suppression List', 'Suppression List', H6C, "{ 'Email Or Domain': 'donotcontact@blocked-demo.example' }")
body += read('readLeads', 'Read Leads', 'Leads', H6C, "{ 'Lead ID': 'L-sample.example', 'Opted Out': 'NO' }")
body += code('decide', 'Decide Allowed Or Blocked', 'h6_decide.js', "{ leadId: 'L-sample.example', email: 'info@sample.example', allowed: true, reason: '', checkedOk: true }")
body += sticky("## H6 Helper: Suppression Check (central)\nEvery workflow that might email someone asks this helper first.\n\nAnswers allowed / blocked per address, matched by **Lead ID + email**. Blocks exact emails, whole domains and opted-out leads.\n\n**Fails closed:** if the Suppression List or Leads tab can't be read, nobody is allowed.", 'decide')
wf('h6.js', 'agency-h6-suppression', NAMES['H6'], body, "  .add(whenCalled)\n  .to(readSup)\n  .to(readLeads)\n  .to(decide)\n  .add(note)")

# ---------------- H8 Save CRM Updates ----------------
H8C = '$("When Called With Updates").first().json.crmUrl'
parts = [('leadUpdates', 'Lead Rows', 'Save Lead Rows', 'Leads', LEADS_COLS, 'Lead ID'),
         ('draftUpdates', 'Draft Rows', 'Save Draft Rows', 'Outreach Drafts', DRAFT_COLS, 'Draft ID'),
         ('historyRows', 'History Rows', 'Add Draft History', 'Draft History', HIST_COLS, None),
         ('ledgerUpdates', 'Ledger Rows', 'Save Send Ledger Rows', 'Send Ledger', LEDGER_COLS, 'Ledger Row ID'),
         ('suppressionAppends', 'Suppression Rows', 'Add To Suppression List', 'Suppression List', SUP_COLS, None),
         ('unsubscribeLog', 'Unsubscribe Log Rows', 'Add Unsubscribe Request Log', 'Unsubscribe Requests', UNSUB_COLS, None),
         ('reviewItems', 'Review Items', 'Add To Review Queue', 'Review Queue', REVIEW_COLS, None),
         ('replyRows', 'Reply Rows', 'Save Reply Rows', 'Replies', REPLY_COLS, 'Gmail Message ID')]
body = trig_called('whenCalled', 'When Called With Updates', "{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', leadUpdates: [], draftUpdates: [], events: [] }")
chain = "  .add(whenCalled)"
for i, (key, sname, wname, tab, cols, match) in enumerate(parts):
    body += inline_code('split%d' % i, sname, "return ($input.first().json.%s || []).filter((r) => r && typeof r === 'object').map((r) => ({ json: r }));" % key, "{ ok: true }")
    body += write('save%d' % i, wname, tab, cols, match, H8C)
    chain += "\n  .to(split%d)\n  .to(save%d)\n  .add(whenCalled)" % (i, i)
body += inline_code('splitEv', 'Activity Events', "return ($input.first().json.events || []).filter((r) => r && r.event).map((r) => ({ json: r }));", "{ event: 'x' }")
body += call('logAct', 'Log Activity', 'H4', 'once', onerr=True)
chain += "\n  .to(splitEv)\n  .to(logAct)\n  .add(note)"
body += sticky("## H8 Helper: Save CRM Updates\nOne place that writes outreach and reply changes to the CRM: Leads, Outreach Drafts, Draft History, Send Ledger, Suppression List, Unsubscribe Requests, Review Queue, Replies, Activity Log.\n\nRows are matched by **Lead ID / Draft ID / Ledger Row ID / Gmail Message ID** (never by position). Updates only touch the columns given. If a write fails, the calling workflow fails visibly (and A10 logs it once active).", 'split0')
wf('h8.js', 'agency-h8-save-updates', NAMES['H8'], body, chain)

# ---------------- H7 Send One Email (OFF) ----------------
body = trig_called('whenCalled', 'When Called With One Email', "{ ledgerRowId: 'L-x|initial|1', ledgerKey: 'L-x|initial', leadId: 'L-x', draftId: 'D-L-x-initial', to: 'info@x.example', fromName: 'Sender', fromEmail: 'sender@agency.example', subject: 'Hi', body: 'Text' }")
body += code('build', 'Build Gmail Message', 'h7_build.js', "{ raw: 'abc', meta: {}, problems: [] }")
body += ifb('msgOk', 'Message OK?', '$json.problems.length === 0')
body += """const send = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Send Through Gmail API (OFF)',
    disabled: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'gmailOAuth2',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json.threadId ? { raw: $json.raw, threadId: $json.threadId } : { raw: $json.raw }) }}'),
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 30000 }
    }
  },
  output: [{ statusCode: 200, body: { id: 'msg-1', threadId: 'thr-1' } }]
});
"""
body += code('result', 'Read Send Result', 'h7_result.js', "{ outcome: 'sent', gmailMessageId: 'msg-1' }")
body += sticky("## H7 Helper: Send One Email - SWITCHED OFF\nSends exactly ONE email per run through the Gmail API (so we can add List-Unsubscribe headers, which n8n's Gmail node can't).\n\n**The send step is disabled and has NO Gmail login attached.** Nothing can be sent until you approve go-live, attach the Gmail login here and switch the step on.\n\nNever retries: sent / failed / uncertain is reported back by Ledger Row ID.", 'build')
wf('h7.js', 'agency-h7-send-one', NAMES['H7'], body, "  .add(whenCalled)\n  .to(build)\n  .to(msgOk\n    .onTrue(send.to(result))\n    .onFalse(result))\n  .add(note)")

# ---------------- C1 Draft Outreach ----------------
body = trig_manual('manualStart', 'Run Drafting Now') + trig_called('calledStart', 'When Called By Scheduler')
body += call('loadConfig', 'Load Agency Config', 'H0', once=True, sample="{ ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', isDemo: true, systemPaused: false, settings: {} }")
body += ALLOWED + STOPPED
body += read('readLeads', 'Read Leads', 'Leads', sample="{ 'Lead ID': 'L-sample.example', Temperature: 'Warm' }")
body += read('readDrafts', 'Read Outreach Drafts', 'Outreach Drafts', sample="{ 'Draft ID': 'D-L-old.example-initial' }")
body += code('pick', 'Pick Leads To Draft', 'c1_pick.js', "{ leadId: 'L-sample.example', email: 'info@sample.example', crmUrl: 'x', ref: 'D-L-sample.example-initial' }")
body += call('supCheck', 'Suppression Check', 'H6', sample="{ leadId: 'L-sample.example', email: 'info@sample.example', allowed: true, checkedOk: true }")
body += code('requests', 'Build AI Requests', 'c1_requests.js', "{ task: 'outreach_draft', leadId: 'L-sample.example' }")
body += call('askAi', 'Write Drafts With AI', 'H1', mode='each', onerr=True, sample="{ ok: true, leadId: 'L-sample.example', data: { subject: 'Idea', body: 'Text', evidence_used: [] } }")
body += code('check', 'Check Drafts', 'c1_check.js', "{ crmUrl: 'x', draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] }")
body += call('save', 'Save Drafts And Updates', 'H8', sample="{ ok: true }")
body += setn('summary', 'Drafting Summary', [('draftsSaved', "expr('{{ $(\"Check Drafts\").first().json.draftUpdates.length }}')", 'number')], once=True)
body += sticky("## C1 Draft Outreach Emails (Stage 4a)\nWrites ONE personalized draft per Warm/Hot lead (verified research only), checks it, and saves it to **Outreach Drafts** as *Pending review*. Nothing is sent here.\n\nChecks: correct business name, no other business mentioned, no guarantees/results/testimonials/invented problems, quotes must be on the lead's own website, call-to-action, and a fixed footer (sender, mailing address, STOP opt-out). Suppressed addresses are skipped.", 'pick')
wf('c1.js', 'agency-c1-draft', '[AGENCY] C1 Draft Outreach Emails', body,
   "  .add(manualStart)\n  .to(loadConfig)\n  .add(calledStart)\n  .to(loadConfig)\n  .add(loadConfig)\n  .to(allowed\n    .onTrue(readLeads.to(readDrafts).to(pick).to(supCheck).to(requests).to(askAi).to(check).to(save).to(summary))\n    .onFalse(stopped))\n  .add(note)")

# ---------------- C2 Record Approvals ----------------
body = trig_manual('manualStart', 'Run Approval Check Now') + trig_called('calledStart', 'When Called By Scheduler')
body += call('loadConfig', 'Load Agency Config', 'H0', once=True, sample="{ ok: true, crmUrl: 'x', systemPaused: false }")
body += ALLOWED + STOPPED
body += read('readDrafts', 'Read Outreach Drafts', 'Outreach Drafts', sample="{ 'Draft ID': 'D-L-sample.example-initial' }")
body += code('review', 'Review Approvals', 'c2_review.js', "{ crmUrl: 'x', draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] }")
body += call('save', 'Save Review Updates', 'H8')
body += setn('summary', 'Approval Summary', [('changes', "expr('{{ $(\"Review Approvals\").first().json.draftUpdates.length }}')", 'number')], once=True)
body += sticky("## C2 Record Outreach Approvals (Stage 4b)\nThe founder reviews drafts in **Outreach Drafts**: set *Review Status* to Approved or Rejected and type a name in *Reviewed By*. This workflow records it (time stamp + fingerprint of the exact text).\n\n**Any edit** to To / Subject / Body creates a new version and cancels approval, so changed text always needs a fresh approval. Every change is kept in **Draft History**.", 'review')
wf('c2.js', 'agency-c2-approvals', '[AGENCY] C2 Record Outreach Approvals', body,
   "  .add(manualStart)\n  .to(loadConfig)\n  .add(calledStart)\n  .to(loadConfig)\n  .add(loadConfig)\n  .to(allowed\n    .onTrue(readDrafts.to(review).to(save).to(summary))\n    .onFalse(stopped))\n  .add(note)")

# ---------------- C3 Send Approved Outreach ----------------
body = trig_manual('manualStart', 'Run Sending Now') + trig_called('calledStart', 'When Called By Scheduler')
body += call('loadConfig', 'Load Agency Config', 'H0', once=True, sample="{ ok: true, crmUrl: 'x', systemPaused: false, outreachPaused: true, settings: {} }")
body += code('switches', 'Check Send Switches', 'c3_switches.js', "{ allowed: false, reasons: 'OUTREACH_PAUSED is not NO' }")
body += ifb('canSend', 'Allowed To Send?', '$json.allowed')
body += setn('stopped', 'Stopped: Sending Is Switched Off', [('sent', '0', 'number'), ('reason', "expr('{{ $json.reasons }}')", 'string')])
body += read('readDrafts', 'Read Outreach Drafts', 'Outreach Drafts', sample="{ 'Draft ID': 'D-L-x-initial' }")
body += read('readLedger', 'Read Send Ledger', 'Send Ledger', sample="{ 'Ledger Key': 'L-x|initial' }")
body += read('readLeads', 'Read Leads', 'Leads', sample="{ 'Lead ID': 'L-x' }")
body += code('pre', 'Preselect Approved Drafts', 'c3_preselect.js', "{ leadId: 'L-x', email: 'info@x.example', ref: 'D-L-x-initial' }")
body += call('supCheck', 'Check Suppression', 'H6', sample="{ ref: 'D-L-x-initial', allowed: true, checkedOk: true }")
body += code('pickD', 'Pick Approved Drafts', 'c3_pick.js', "{ crmUrl: 'x', candidates: [], draftUpdates: [], leadUpdates: [], reviewItems: [], events: [] }")
body += call('saveBlocked', 'Save Blocked Or Suppressed', 'H8')
body += code('claim', 'Claim Ledger Rows', 'c3_claim.js', "{ 'Ledger Row ID': 'L-x|initial|1', Status: 'Sending' }")
body += write('writeClaim', 'Write Sending Rows To Ledger', 'Send Ledger', LEDGER_COLS, None, retry=False)
body += read('reRead', 'Re-read Send Ledger', 'Send Ledger', sample="{ 'Ledger Row ID': 'L-x|initial|1', 'Ledger Key': 'L-x|initial', Status: 'Sending', row_number: 2 }")
body += call('reCfg', 'Re-check Pause Switch', 'H0', once=True, sample="{ ok: true, systemPaused: false, outreachPaused: false, settings: { GMAIL_SENDING_ENABLED: 'YES' } }")
body += code('reItems', 'Claimed For Re-check', 'c3_recheck_items.js', "{ leadId: 'L-x', email: 'info@x.example', ref: 'L-x|initial|1' }")
body += call('reSup', 'Re-check Suppression', 'H6', sample="{ ref: 'L-x|initial|1', allowed: true, checkedOk: true }")
body += code('final', 'Final Send Check', 'c3_final.js', "{ ledgerRowId: 'L-x|initial|1', send: true, notSentReason: '' }")
body += ifb('sendNow', 'Send Now?', '$json.send')
body += call('sendOne', 'Send One Email', 'H7', mode='each', onerr=True, sample="{ ledgerRowId: 'L-x|initial|1', outcome: 'not_sent_step_off' }")
body += code('record', 'Record Send Results', 'c3_record.js', "{ crmUrl: 'x', ledgerUpdates: [], draftUpdates: [], leadUpdates: [], reviewItems: [], events: [] }")
body += call('saveResults', 'Save Send Results', 'H8')
body += sticky("## C3 Send Approved Outreach (Stage 4c) - SENDING IS OFF\nWill only ever send when ALL of these say go: SYSTEM_PAUSED = NO, OUTREACH_PAUSED = NO, GMAIL_SENDING_ENABLED = YES, sender details + mailing address filled in, weekday sending hours, daily limit not reached.\n\nPer email: approved text unchanged since approval, not suppressed (checked twice), DEMO mode = .example addresses only, footer present, no earlier Sending/Sent/Failed row in the **Send Ledger**. A *Sending* row is written BEFORE Gmail is contacted. Uncertain results are never retried.", 'switches')
wf('c3.js', 'agency-c3-send', '[AGENCY] C3 Send Approved Outreach', body,
   "  .add(manualStart)\n  .to(loadConfig)\n  .add(calledStart)\n  .to(loadConfig)\n  .add(loadConfig)\n  .to(switches)\n  .to(canSend\n    .onTrue(readDrafts.to(readLedger).to(readLeads).to(pre).to(supCheck).to(pickD))\n    .onFalse(stopped))\n  .add(pickD)\n  .to(saveBlocked)\n  .add(pickD)\n  .to(claim)\n  .to(writeClaim)\n  .to(reRead)\n  .to(reCfg)\n  .to(reItems)\n  .to(reSup)\n  .to(final)\n  .to(sendNow\n    .onTrue(sendOne.to(record))\n    .onFalse(record))\n  .add(record)\n  .to(saveResults)\n  .add(note)")

# ---------------- C4 Unsubscribe ----------------
body = f"""const linkGet = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {{ name: 'Unsubscribe Link (GET)', parameters: {{ httpMethod: 'GET', path: 'jido-unsubscribe', responseMode: 'responseNode', options: {{ ignoreBots: true }} }} }},
  output: [{{ headers: {{}}, query: {{ t: 'uabcdefghijklmnopqrstuvwx' }}, body: {{}} }}]
}});

const linkPost = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {{ name: 'One-Click Unsubscribe (POST)', parameters: {{ httpMethod: 'POST', path: 'jido-unsubscribe', responseMode: 'responseNode', options: {{}} }} }},
  output: [{{ headers: {{}}, query: {{ t: 'uabcdefghijklmnopqrstuvwx' }}, body: {{ 'List-Unsubscribe': 'One-Click' }} }}]
}});

"""
body += trig_called('replyIn', 'When Called With A Reply', "{ fromEmail: 'owner@sample.example', subject: 'Re: idea', text: 'STOP', gmailMessageId: 'm1', gmailThreadId: 't1' }")
body += code('readReq', 'Read Request', 'c4_read.js', "{ channel: 'link', token: 'uabcdefghijklmnopqrstuvwx', tokenLooksValid: true, isOptOut: true }")
body += call('loadConfig', 'Load Agency Config', 'H0', once=True, onerr=True, sample="{ ok: true, crmUrl: 'x', settings: {} }")
body += read('readDrafts', 'Read Outreach Drafts', 'Outreach Drafts', sample="{ 'Draft ID': 'D-L-x-initial', 'Unsubscribe Token': 'uabcdefghijklmnopqrstuvwx', 'To Email': 'info@x.example' }")
body += read('readSup', 'Read Suppression List', 'Suppression List', sample="{ 'Email Or Domain': 'donotcontact@blocked-demo.example' }")
body += code('decide', 'Decide Unsubscribe', 'c4_decide.js', "{ result: 'Suppressed', page: '<h2>Done</h2>' }")
body += call('save', 'Save Opt-out', 'H8')
body += ifb('fromLink', 'Came From A Link?', '$("Read Request").first().json.channel === "link"')
body += """const respond = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Show Confirmation Page',
    parameters: {
      respondWith: 'text',
      responseBody: expr('<html><body style="font-family:sans-serif;max-width:520px;margin:40px auto">{{ $("Decide Unsubscribe").first().json.page }}</body></html>'),
      options: { responseCode: 200, responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } }
    }
  }
});
"""
body += setn('ret', 'Return Result', [('result', "expr('{{ $(\"Decide Unsubscribe\").first().json.result }}')", 'string')], once=True)
body += sticky("## C4 Unsubscribe (central) - INACTIVE\nThree ways in: the unsubscribe link in each email (GET), one-click unsubscribe from mail apps (POST), and replies passed in by the future reply monitor (Phase D).\n\nThe link carries only a random token. Other values in the link are ignored, so a link can't unsubscribe anyone else. A reply only unsubscribes its own sender. Opt-outs are added to the Suppression List immediately, the lead is marked Opted Out, unsent drafts become Suppressed, and everything is logged.\n\nThe links only work once this workflow is published (needs your approval).", 'readReq')
wf('c4.js', 'agency-c4-unsubscribe', '[AGENCY] C4 Unsubscribe', body,
   "  .add(linkGet)\n  .to(readReq)\n  .add(linkPost)\n  .to(readReq)\n  .add(replyIn)\n  .to(readReq)\n  .add(readReq)\n  .to(loadConfig)\n  .to(readDrafts)\n  .to(readSup)\n  .to(decide)\n  .to(save)\n  .to(fromLink\n    .onTrue(respond)\n    .onFalse(ret))\n  .add(note)")

# ---------------- A0b Setup: Add Phase C Tabs ----------------
body = trig_manual('manualStart', 'Run Setup Once')
body += call('loadConfig', 'Load Agency Config', 'H0', once=True, sample="{ ok: true, crmId: 'SAMPLE', crmUrl: 'x' }")
body += ifb('hasCrm', 'CRM Link Set?', '!!$json.crmId && $json.crmUrl.indexOf("PASTE_") === -1')
body += setn('noCrm', 'Stopped: CRM Link Not Set', [('reason', "'Paste the DEMO CRM link into H0 CRM Location first.'", 'string')])
def http_get(var, name, url, sample):
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {{
    name: {js(name)},
    parameters: {{
      method: 'GET',
      url: expr({js(url)}),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      options: {{ timeout: 30000 }}
    }},
    credentials: {{ googleSheetsOAuth2Api: newCredential('Google Sheets account') }}
  }},
  output: [{sample}]
}});
"""
def http_post(var, name, url, bodyexpr):
    return f"""const {var} = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {{
    name: {js(name)},
    parameters: {{
      method: 'POST',
      url: expr({js(url)}),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr({js(bodyexpr)}),
      options: {{ timeout: 30000 }}
    }},
    credentials: {{ googleSheetsOAuth2Api: newCredential('Google Sheets account') }}
  }},
  output: [{{ replies: [] }}]
}});
"""
ID = '{{ $("Load Agency Config").first().json.crmId }}'
body += http_get('readStruct', 'Read CRM Structure', 'https://sheets.googleapis.com/v4/spreadsheets/' + ID + '?fields=sheets.properties(sheetId,title,gridProperties(columnCount))', "{ sheets: [{ properties: { sheetId: 100, title: 'Leads' } }] }")
body += http_get('readVals', 'Read Headings And Settings', 'https://sheets.googleapis.com/v4/spreadsheets/' + ID + "/values:batchGet?ranges=Settings!A:A&ranges=%27Send%20Ledger%27!1:1&ranges=Leads!1:1&ranges=Replies!1:1{{ ['Outreach Drafts', 'Draft History', 'Unsubscribe Requests'].filter((t) => ($('Read CRM Structure').first().json.sheets || []).some((x) => (x.properties || {}).title === t)).map((t) => '&ranges=' + encodeURIComponent(String.fromCharCode(39) + t + String.fromCharCode(39) + '!1:1')).join('') }}", "{ valueRanges: [] }")
body += code('plan', 'Plan Changes', 'a0b_plan.js', "{ crmId: 'SAMPLE', structureBody: { requests: [] }, valuesBody: { data: [] }, added: [], hasValues: false }")
body += http_post('addTabs', 'Add Tabs And Dropdowns', 'https://sheets.googleapis.com/v4/spreadsheets/' + ID + ':batchUpdate', '{{ JSON.stringify($("Plan Changes").first().json.structureBody) }}')
body += ifb('hasVals', 'Headings To Write?', '$("Plan Changes").first().json.hasValues')
body += http_post('writeVals', 'Write Headings And Settings', 'https://sheets.googleapis.com/v4/spreadsheets/' + ID + '/values:batchUpdate', '{{ JSON.stringify($("Plan Changes").first().json.valuesBody) }}')
body += setn('done', 'Setup Summary', [('added', "expr('{{ $(\"Plan Changes\").first().json.added.join(\" | \") || \"Nothing to add - already set up\" }}')", 'string')], once=True)
body += sticky("## A0b Setup: Add Phase C Tabs (DEMO)\nRun once, after the CRM link is set in H0. Adds only what is missing (safe to run twice):\n- tabs **Outreach Drafts**, **Draft History**, **Unsubscribe Requests**\n- 4 new **Send Ledger** columns\n- new **Settings** rows (all sending switches start OFF)\n- dropdowns for review and send statuses\n\nNever deletes or overwrites existing data.", 'plan')
wf('a0b.js', 'agency-a0b-phase-c-tabs', '[AGENCY] A0b Setup: Add Phase C Tabs (DEMO)', body,
   "  .add(manualStart)\n  .to(loadConfig)\n  .to(hasCrm\n    .onTrue(readStruct.to(readVals).to(plan).to(addTabs).to(hasVals\n      .onTrue(writeVals.to(done))\n      .onFalse(done)))\n    .onFalse(noCrm))\n  .add(note)")

# ---------------- D2 Handle One Reply ----------------
body = trig_called('whenCalled', 'When Called With One Reply', "{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', leadId: 'L-sample.example', fromEmail: 'Owner <info@sample.example>', fromAddr: 'info@sample.example', subject: 'Re: idea', text: 'Sounds interesting', gmailMessageId: 'm1', gmailThreadId: 't1', receivedAt: '2026-11-18 10:00', senderMatchesLead: true }")
body += call('optOut', 'Opt-out Check First', 'C4', once=True, sample="{ result: 'Not an opt-out request' }")
body += call('loadConfig', 'Load Agency Config', 'H0', once=True, sample="{ ok: true, crmUrl: 'x', isDemo: true, settings: {} }")
body += read('readLeads', 'Read Leads', 'Leads', sample="{ 'Lead ID': 'L-sample.example' }")
body += read('readRulebook', 'Read Rulebook', 'Rulebook', sample="{ Topic: 'Pricing policy', 'Approved Answer': 'Pricing depends on scope.', 'Needs Human': 'NO' }")
body += read('readDrafts', 'Read Outreach Drafts', 'Outreach Drafts', sample="{ 'Draft ID': 'D-L-sample.example-initial' }")
body += code('presort', 'Pre-sort Reply', 'd2_presort.js', "{ needsAi: true, pre: '', task: 'reply_classify' }")
body += ifb('needsAi', 'Needs AI?', '$json.needsAi')
body += call('askAi', 'Sort Reply With AI', 'H1', once=True, onerr=True, sample="{ ok: true, leadId: 'L-sample.example', data: { category: 'Question', confidence: 'High', summary: 'Asks about pricing.', questions: ['pricing'], wants_meeting: false, proposed_times: [] } }")
body += code('decide', 'Decide Action', 'd2_decide.js', "{ crmUrl: 'x', replyRows: [], leadUpdates: [], draftUpdates: [], reviewItems: [], events: [], category: 'Question', needsHuman: true }")
body += call('save', 'Save Reply Updates', 'H8')
body += setn('ret', 'Return Result', [('gmailMessageId', "expr('{{ $(\"When Called With One Reply\").first().json.gmailMessageId }}')", 'string'), ('category', "expr('{{ $(\"Decide Action\").first().json.category }}')", 'string'), ('needsHuman', "expr('{{ $(\"Decide Action\").first().json.needsHuman }}')", 'boolean')], once=True)
body += sticky("## D2 Handle One Reply (Stage 5) - INACTIVE\nCalled by D1 once per new reply.\n1. **Opt-out first** (C4, fixed rules, no AI): STOP / unsubscribe replies are suppressed immediately.\n2. Bounces and out-of-office are sorted by fixed rules.\n3. Real replies are sorted by the AI Brain (email text passed as DATA; AI is OFF until a free Gemini key is added, so replies go to a human).\n4. Interested / meeting request from the address we emailed = **Hot**. Pending follow-ups are cancelled.\n5. Questions get a **draft** built ONLY from Rulebook answers; sensitive topics (contracts, guarantees, data, refunds...) always go to a human. **Nothing is sent from here.**", 'presort')
wf('d2.js', 'agency-d2-handle-reply', NAMES['D2'], body,
   "  .add(whenCalled)\n  .to(optOut)\n  .to(loadConfig)\n  .to(readLeads)\n  .to(readRulebook)\n  .to(readDrafts)\n  .to(presort)\n  .to(needsAi\n    .onTrue(askAi.to(decide))\n    .onFalse(decide))\n  .add(decide)\n  .to(save)\n  .to(ret)\n  .add(note)")

# ---------------- D1 Reply Monitor ----------------
body = trig_manual('manualStart', 'Check Replies Now') + trig_called('calledStart', 'When Called By Scheduler')
body += call('loadConfig', 'Load Agency Config', 'H0', once=True, sample="{ ok: true, crmUrl: 'x', systemPaused: false, settings: {} }")
body += ALLOWED + STOPPED
body += read('readLedger', 'Read Send Ledger', 'Send Ledger', sample="{ 'Ledger Key': 'L-x|initial', Status: 'Sent', 'Gmail Thread ID': 't1', 'Lead ID': 'L-x' }")
body += read('readReplies', 'Read Replies', 'Replies', sample="{ 'Gmail Message ID': 'm0' }")
body += read('readLeads', 'Read Leads', 'Leads', sample="{ 'Lead ID': 'L-x', 'Public Email': 'info@x.example', 'Is Demo': 'YES' }")
body += code('threads', 'List Threads To Check', 'd1_threads.js', "{ threadId: 't1', leadId: 'L-x', leadEmail: 'info@x.example' }")
body += """const fetchThread = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Read Our Thread From Gmail (OFF)',
    disabled: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('https://gmail.googleapis.com/gmail/v1/users/me/threads/{{ $json.threadId }}?format=full'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'gmailOAuth2',
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 30000 }
    }
  },
  output: [{ statusCode: 200, body: { id: 't1', messages: [] } }]
});
"""
body += code('extract', 'Extract New Replies', 'd1_extract.js', "{ crmUrl: 'x', replies: [], problems: [], threadsChecked: 0, events: [] }")
body += inline_code('split', 'One Item Per Reply', "return ($input.first().json.replies || []).map((r) => ({ json: r }));", "{ gmailMessageId: 'm1' }")
body += call('handle', 'Handle Each Reply', 'D2', mode='each', onerr=True, sample="{ gmailMessageId: 'm1', category: 'Question', needsHuman: true }")
body += call('saveLog', 'Log This Check', 'H8')
body += sticky("## D1 Reply Monitor (Stage 5) - INACTIVE, GMAIL READING OFF\nChecks ONLY the Gmail threads of emails we sent (thread IDs from the Send Ledger). It never searches or reads the rest of the inbox.\n\n**The Gmail reading step is disabled and has NO Gmail login attached.** No schedule is set.\n\nNew replies (not ours, not seen before) are handed to D2 one at a time, matched by Gmail Message ID.", 'threads')
wf('d1.js', 'agency-d1-reply-monitor', '[AGENCY] D1 Reply Monitor', body,
   "  .add(manualStart)\n  .to(loadConfig)\n  .add(calledStart)\n  .to(loadConfig)\n  .add(loadConfig)\n  .to(allowed\n    .onTrue(readLedger.to(readReplies).to(readLeads).to(threads).to(fetchThread).to(extract))\n    .onFalse(stopped))\n  .add(extract)\n  .to(split)\n  .to(handle)\n  .add(extract)\n  .to(saveLog)\n  .add(note)")

# ---------------- D3 Follow-up Tracker ----------------
body = trig_manual('manualStart', 'Draft Follow-ups Now') + trig_called('calledStart', 'When Called By Scheduler')
body += call('loadConfig', 'Load Agency Config', 'H0', once=True, sample="{ ok: true, crmUrl: 'x', systemPaused: false, settings: {} }")
body += ALLOWED + STOPPED
body += read('readLeads', 'Read Leads', 'Leads', sample="{ 'Lead ID': 'L-x' }")
body += read('readDrafts', 'Read Outreach Drafts', 'Outreach Drafts', sample="{ 'Draft ID': 'D-L-x-initial' }")
body += code('pick', 'Pick Follow-ups Due', 'd3_pick.js', "{ leadId: 'L-x', email: 'info@x.example', ref: 'D-L-x-followup1', step: 'followup1', count: 0 }")
body += call('supCheck', 'Suppression Check', 'H6', sample="{ ref: 'D-L-x-followup1', allowed: true, checkedOk: true }")
body += code('build', 'Build Follow-up Drafts', 'd3_build.js', "{ crmUrl: 'x', draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] }")
body += call('save', 'Save Follow-up Drafts', 'H8')
body += setn('summary', 'Follow-up Summary', [('draftsCreated', "expr('{{ $(\"Build Follow-up Drafts\").first().json.draftUpdates.length }}')", 'number')], once=True)
body += sticky("## D3 Follow-up Tracker (Stage 4-5) - INACTIVE\nDrafts at most **MAX_FOLLOWUPS (2)** short, fixed-wording follow-ups per lead, only when: first email Sent, **no reply of any kind**, not opted out, not suppressed, follow-up date reached.\n\nDrafts go to **Outreach Drafts** as *Pending review* and need your approval like any email (C2), then C3 sends them in the same Gmail thread. If the lead replies first, the follow-up is cancelled automatically (by D2, and again by C3 just before sending).", 'pick')
wf('d3.js', 'agency-d3-followups', '[AGENCY] D3 Follow-up Tracker', body,
   "  .add(manualStart)\n  .to(loadConfig)\n  .add(calledStart)\n  .to(loadConfig)\n  .add(loadConfig)\n  .to(allowed\n    .onTrue(readLeads.to(readDrafts).to(pick).to(supCheck).to(build).to(save).to(summary))\n    .onFalse(stopped))\n  .add(note)")

print('generated')
