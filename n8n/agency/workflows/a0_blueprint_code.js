// Builds the Google Sheets API request that creates "Agency CRM - DEMO".
// All rows below are FICTIONAL test data (".example" domains never exist; 555 phone numbers).
const today = DateTime.now().setZone('America/New_York').toFormat('yyyy-LL-dd');

const tabs = [
  { id: 0, title: 'README', color: [0.4, 0.4, 0.4], headers: ['Topic', 'Explanation'], rows: [
    ['What is this?', 'Agency CRM - DEMO. Internal business-development records for the AI agency. FICTIONAL TEST DATA ONLY. Do not add real businesses here.'],
    ['Pipeline Status', 'Not researched -> Ready for review -> Outreach approved -> Contacted -> Follow-up pending -> Interested -> Meeting booked. End states: Not interested, Unsubscribed, Invalid contact.'],
    ['Outreach Status', 'Pending review (draft waiting for a person) -> Approved (a person approved it) -> Sending -> Sent, or Failed / Suppressed. Only a person sets Approved.'],
    ['Temperature', 'HOT = a real reply showed buying interest (interested, pricing question, meeting request). WARM = evidence-backed fit (score >= WARM_MIN_SCORE, public email, confidence Medium/High). COLD = everything else. WARM is NOT a prediction that they will buy.'],
    ['Fit Score rules', 'Website works +15 | Appointment/quote-based industry +20 | Public email on own website +15 | No online booking seen +15 (or booking exists +5) | Phone-only or basic contact form +10 | Inside target area +10 | Research confidence High +15 / Medium +5 / Low 0. Every point is listed in Score Breakdown.'],
    ['Emergency pause', 'Settings tab: SYSTEM_PAUSED = YES stops every agency workflow. OUTREACH_PAUSED = YES stops all email sending. Both are checked at the start of every run.'],
    ['Evidence rule', 'AI notes are only kept when the quoted evidence really appears on the business website. Unknowns are listed, never guessed.'],
    ['Discovery Inbox', 'Add businesses here by hand or from an approved data export. The Discover workflow checks, de-duplicates and moves them into Leads.']
  ]},
  { id: 100, title: 'Leads', color: [0.2, 0.5, 0.9], headers: ['Lead ID','Is Demo','Business Name','Industry','Street Address','City','State','ZIP','Website','Public Email','Email Found At','Public Phone','Discovery Source','Source URL','Source License','Discovered At','Research Date','Booking / Contact Options Seen','Primary Opportunity','Evidence','Evidence Sources','Proposed Solution','Why It May Help','Unknowns To Verify','Research Confidence','Fit Score','Score Breakdown','Temperature','Pipeline Status','Outreach Status','Email Subject','Email Draft','Approved By','Approved At','Sent At','Gmail Message ID','Gmail Thread ID','Follow-up Count','Last Contact Date','Next Allowed Follow-up','Reply Status','Reply Category','Meeting Status','Meeting Time','Assigned Owner','Opted Out','Error Status','Last Updated','Notes'], rows: [] },
  { id: 200, title: 'Settings', color: [0.9, 0.6, 0.1], headers: ['Key', 'Value', 'What it means'], rows: [
    ['ENVIRONMENT', 'DEMO', 'DEMO = fictional data only. Never change this file to LIVE; LIVE uses a separate file.'],
    ['SYSTEM_PAUSED', 'NO', 'YES stops every agency workflow at its first step (emergency stop).'],
    ['OUTREACH_PAUSED', 'YES', 'YES blocks all email sending. Keep YES during development.'],
    ['OSM_DISCOVERY_ENABLED', 'NO', 'YES lets the Discover workflow ask OpenStreetMap for businesses. Keep NO in DEMO.'],
    ['DAILY_SEND_LIMIT', '10', 'Maximum outreach emails per day (Phase C).'],
    ['RESEARCH_BATCH_SIZE', '5', 'How many leads one research run handles.'],
    ['DISCOVERY_MAX_NEW_PER_RUN', '25', 'Maximum new leads added by one discovery run.'],
    ['WARM_MIN_SCORE', '60', 'Minimum Fit Score for WARM.'],
    ['TARGET_CITIES', 'Atlanta, Decatur, Marietta, Smyrna, Sandy Springs, Dunwoody, Brookhaven, Roswell, Alpharetta, Johns Creek, Kennesaw, Duluth, Lawrenceville, Peachtree Corners, Tucker, East Point, College Park, Stone Mountain, Chamblee, Doraville, Norcross, Lilburn, Snellville, Woodstock, Canton, Cumming, Fayetteville, Peachtree City, McDonough, Stockbridge', 'Atlanta metro communities counted as inside the target area.'],
    ['TARGET_INDUSTRIES', 'Plumbing, HVAC, Roofing, Electrical, Home services, Auto repair, Fitness, Med spa, Salon, Dental, Cleaning, Landscaping, Pest control', 'Industries to look for.'],
    ['APPOINTMENT_INDUSTRIES', 'plumbing, hvac, roofing, electrical, home services, auto repair, fitness, med spa, salon, dental, cleaning, landscaping, pest control, contractor', 'Industries that run on appointments or quotes (worth +20 points).'],
    ['OSM_BBOX', '33.40,-84.85,34.20,-83.90', 'Atlanta metro search box for OpenStreetMap (south,west,north,east).'],
    ['AGENCY_NAME', '[FILL IN]', 'Phase C: legal or trade name used in emails.'],
    ['SENDER_NAME', '[FILL IN]', 'Phase C: person who signs outreach emails.'],
    ['SENDER_EMAIL', '[FILL IN]', 'Phase C: the only address allowed to send outreach.'],
    ['AGENCY_MAILING_ADDRESS', '[FILL IN]', 'Phase C: physical postal address required in commercial emails.'],
    ['OWNER_ALERT_EMAIL', '[FILL IN]', 'Where reports and error alerts go.'],
    ['TIMEZONE', 'America/New_York', 'Time zone for all dates.'],
    ['AI_MODEL_LABEL', 'Gemini 3 Flash (free tier)', 'Update when the AI model is swapped.'],
    ['AI_INPUT_PRICE_PER_M', '0.50', 'USD per 1M input tokens if on a paid tier (estimate only).'],
    ['AI_OUTPUT_PRICE_PER_M', '3.00', 'USD per 1M output tokens if on a paid tier (estimate only).']
  ]},
  { id: 300, title: 'Discovery Inbox', color: [0.3, 0.7, 0.4], headers: ['Business Name','Industry','City','State','Website','Public Phone','Public Email','Source','Source URL','Source License','Added By','Added At','Imported','Import Result'], rows: [
    ['Peachtree Pro Plumbing (DEMO)','Plumbing','Decatur','GA','https://peachtree-pro-plumbing.example','404-555-0101','info@peachtree-pro-plumbing.example','Fictional demo','https://peachtree-pro-plumbing.example','Fictional test data','Claude (setup)',today,'NO',''],
    ['Buckhead Comfort HVAC (DEMO)','HVAC','Atlanta','GA','https://buckhead-comfort-hvac.example','404-555-0102','','Fictional demo','https://buckhead-comfort-hvac.example','Fictional test data','Claude (setup)',today,'NO',''],
    ['Marietta Ridge Roofing (DEMO)','Roofing','Marietta','GA','https://marietta-ridge-roofing.example','770-555-0103','hello@marietta-ridge-roofing.example','Fictional demo','https://marietta-ridge-roofing.example','Fictional test data','Claude (setup)',today,'NO',''],
    ['Glow Lab Med Spa (DEMO)','Med spa','Alpharetta','GA','https://glowlab-medspa.example','678-555-0104','frontdesk@glowlab-medspa.example','Fictional demo','https://glowlab-medspa.example','Fictional test data','Claude (setup)',today,'NO',''],
    ['Iron Oak Fitness (DEMO)','Fitness','Smyrna','GA','https://ironoak-fitness.example','770-555-0105','','Fictional demo','https://ironoak-fitness.example','Fictional test data','Claude (setup)',today,'NO',''],
    ['Peachtree Pro Plumbing (DEMO)','Plumbing','Decatur','GA','https://www.peachtree-pro-plumbing.example/contact','404-555-0101','','Fictional demo (duplicate test)','https://www.peachtree-pro-plumbing.example/contact','Fictional test data','Claude (setup)',today,'NO',''],
    ['Savannah Shine Auto (DEMO)','Auto repair','Savannah','GA','https://savannah-shine-auto.example','912-555-0107','','Fictional demo (out-of-area test)','https://savannah-shine-auto.example','Fictional test data','Claude (setup)',today,'NO',''],
    ['','Salon','Atlanta','GA','https://no-name-salon.example','404-555-0108','not-an-email','Fictional demo (bad data test)','https://no-name-salon.example','Fictional test data','Claude (setup)',today,'NO','']
  ]},
  { id: 400, title: 'Rulebook', color: [0.6, 0.3, 0.8], headers: ['Topic','Approved Answer','Needs Human','Notes'], rows: [
    ['Business description','[DEMO PLACEHOLDER] We are a small Atlanta-based agency that builds AI automations for appointment-based businesses.','NO','Replace with your real approved description in Phase C.'],
    ['Services we offer','[DEMO PLACEHOLDER] AI receptionist (chat), missed-call follow-up, appointment scheduling and reminders, lead follow-up, simple CRM automation.','NO','Only list services you can actually deliver.'],
    ['Supported integrations','[DEMO PLACEHOLDER] Google Calendar, Google Sheets, Gmail.','NO','Only list integrations you have built and tested.'],
    ['Pricing policy','[DEMO PLACEHOLDER] Pricing depends on scope. We share a written quote after a short discovery call.','NO','The AI must never state a price.'],
    ['Discovery call','[DEMO PLACEHOLDER] A free 20-minute video call to understand your current process. No obligation.','NO',''],
    ['Contracts, guarantees, custom pricing, legal, data handling, refunds','(none - always a human)','YES','AI flags these for the evening review.'],
    ['Results, case studies, client names','(none - never claim)','YES','We have no published results yet.']
  ]},
  { id: 500, title: 'Suppression List', color: [0.8, 0.2, 0.2], headers: ['Email Or Domain','Type','Reason','Added At','Added By','Source'], rows: [
    ['donotcontact@blocked-demo.example','email','Fictional opt-out test record',today,'Claude (setup)','Fictional test data']
  ]},
  { id: 600, title: 'Send Ledger', color: [0.8, 0.4, 0.2], headers: ['Ledger Key','Lead ID','Step','To Email','Status','Created At','Updated At','Gmail Message ID','Error'], rows: [] },
  { id: 700, title: 'Replies', color: [0.2, 0.6, 0.6], headers: ['Gmail Message ID','Gmail Thread ID','Lead ID','Received At','Category','Confidence','Summary','Draft ID','Needs Human','Handled','Processed At'], rows: [] },
  { id: 800, title: 'Review Queue', color: [0.9, 0.3, 0.5], headers: ['Item ID','Created At','Type','Lead ID','Summary','Link','Status','Resolved By','Resolution'], rows: [] },
  { id: 900, title: 'Meetings', color: [0.3, 0.3, 0.8], headers: ['Meeting ID','Lead ID','Business Name','Start','End','Calendar Event ID','Status','Notes'], rows: [] },
  { id: 1000, title: 'Activity Log', color: [0.5, 0.5, 0.5], headers: ['Time','Run ID','Workflow','Event','Lead ID','Count','Details','Is Demo'], rows: [] },
  { id: 1100, title: 'Usage Log', color: [0.5, 0.5, 0.5], headers: ['Time','Run ID','Workflow','Task','Lead ID','AI Model','AI Requests','Est Input Tokens','Est Output Tokens','Est Cost If Paid (USD)','Result'], rows: [] },
  { id: 1200, title: 'Error Log', color: [0.5, 0.5, 0.5], headers: ['Time','Workflow','Failed Step','Error','Execution Link'], rows: [] }
];

const cell = (v) => ({ userEnteredValue: { stringValue: String(v) } });
const sheets = tabs.map((t, index) => ({
  properties: {
    sheetId: t.id,
    title: t.title,
    index,
    gridProperties: { rowCount: Math.max(1000, t.rows.length + 50), columnCount: Math.max(t.headers.length, 5), frozenRowCount: 1 },
    tabColorStyle: { rgbColor: { red: t.color[0], green: t.color[1], blue: t.color[2] } }
  },
  data: [{ startRow: 0, startColumn: 0, rowData: [t.headers].concat(t.rows).map((r) => ({ values: r.map(cell) })) }]
}));

const createBody = { properties: { title: 'Agency CRM - DEMO', timeZone: 'America/New_York', locale: 'en_US' }, sheets };

const colOf = (tabId, header) => tabs.find((t) => t.id === tabId).headers.indexOf(header);
const dropdown = (tabId, header, options) => ({ setDataValidation: {
  range: { sheetId: tabId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: colOf(tabId, header), endColumnIndex: colOf(tabId, header) + 1 },
  rule: { condition: { type: 'ONE_OF_LIST', values: options.map((o) => ({ userEnteredValue: o })) }, strict: true, showCustomUi: true }
}});
const requests = [];
tabs.forEach((t) => {
  requests.push({ repeatCell: { range: { sheetId: t.id, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColorStyle: { rgbColor: { red: 0.93, green: 0.93, blue: 0.93 } } } }, fields: 'userEnteredFormat(textFormat,backgroundColorStyle)' } });
  requests.push({ autoResizeDimensions: { dimensions: { sheetId: t.id, dimension: 'COLUMNS', startIndex: 0, endIndex: t.headers.length } } });
});
requests.push(dropdown(100, 'Is Demo', ['YES', 'NO']));
requests.push(dropdown(100, 'Temperature', ['Hot', 'Warm', 'Cold']));
requests.push(dropdown(100, 'Pipeline Status', ['Not researched', 'Ready for review', 'Outreach approved', 'Contacted', 'Follow-up pending', 'Interested', 'Meeting booked', 'Not interested', 'Unsubscribed', 'Invalid contact']));
requests.push(dropdown(100, 'Outreach Status', ['Pending review', 'Approved', 'Sending', 'Sent', 'Failed', 'Suppressed']));
requests.push(dropdown(100, 'Research Confidence', ['High', 'Medium', 'Low']));
requests.push(dropdown(100, 'Opted Out', ['YES', 'NO']));
requests.push(dropdown(300, 'Imported', ['YES', 'NO']));
requests.push(dropdown(600, 'Status', ['Sending', 'Sent', 'Failed', 'Suppressed']));
requests.push(dropdown(800, 'Status', ['Open', 'Resolved']));
requests.push({ updateDimensionProperties: { range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 900 }, fields: 'pixelSize' } });
requests.push({ repeatCell: { range: { sheetId: 0, startRowIndex: 1, endRowIndex: 20, startColumnIndex: 1, endColumnIndex: 2 }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat.wrapStrategy' } });

return [{ json: { createBody, formatRequests: requests, tabCount: tabs.length } }];
