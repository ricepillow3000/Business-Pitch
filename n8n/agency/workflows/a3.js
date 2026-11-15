const whenCalled = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: { name: 'When Called', parameters: { inputSource: 'passthrough' } },
  output: [{ leadId: 'L-sample.example', industry: 'Plumbing', websiteReachable: true, hasPublicEmail: true, onlineBookingSeen: false, phoneOrFormOnly: true, inTargetArea: true, researchConfidence: 'Medium', warmMinScore: 60 }]
});

const scoring = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Apply Scoring Rules',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Transparent, fixed scoring rules. AI never sets the score or the temperature.
// HOT only comes from a real reply. WARM = evidence-backed fit, NOT a purchase prediction.
const HOT_REPLIES = ['interested', 'pricing question', 'meeting request'];
const LATER_STAGES = ['outreach approved', 'contacted', 'follow-up pending', 'interested', 'meeting booked', 'not interested', 'unsubscribed'];
const lower = (v) => String(v === undefined || v === null ? '' : v).trim().toLowerCase();
const truthy = (v) => v === true || ['yes', 'true', '1'].indexOf(lower(v)) !== -1;
return $input.all().map((it) => {
  const f = it.json || {};
  const parts = [];
  let score = 0;
  const add = (points, why) => { score += points; parts.push((points >= 0 ? '+' : '') + points + ' ' + why); };
  const reachable = truthy(f.websiteReachable);
  const apptList = Array.isArray(f.appointmentIndustries) ? f.appointmentIndustries : String(f.appointmentIndustries || '').split(',');
  const appt = apptList.map(lower).filter(Boolean);
  const industry = lower(f.industry);
  const isApptIndustry = industry !== '' && appt.some((a) => industry.indexOf(a) !== -1 || a.indexOf(industry) !== -1);
  if (reachable) add(15, 'website works'); else parts.push('+0 website not reachable');
  if (isApptIndustry) add(20, 'appointment/quote-based industry (' + f.industry + ')'); else parts.push('+0 industry not on appointment list');
  if (truthy(f.hasPublicEmail)) add(15, 'public email on own website'); else parts.push('+0 no public email on own website');
  if (truthy(f.onlineBookingSeen)) add(5, 'online booking already exists (reminders/follow-up may still help)');
  else if (reachable) add(15, 'no online booking seen');
  else parts.push('+0 booking options unknown');
  if (truthy(f.phoneOrFormOnly)) add(10, 'contact is phone-only or a basic form');
  if (truthy(f.inTargetArea)) add(10, 'inside target area'); else parts.push('+0 outside target area');
  const conf = ['high', 'medium', 'low'].indexOf(lower(f.researchConfidence)) !== -1 ? lower(f.researchConfidence) : 'low';
  if (conf === 'high') add(15, 'research confidence High');
  else if (conf === 'medium') add(5, 'research confidence Medium');
  else parts.push('+0 research confidence Low');
  const warmMin = Number(f.warmMinScore) > 0 ? Number(f.warmMinScore) : 60;
  const reply = lower(f.replyCategory);
  const status = lower(f.currentPipelineStatus);
  let temperature = 'Cold';
  const why = [];
  if (HOT_REPLIES.indexOf(reply) !== -1) { temperature = 'Hot'; why.push('real reply: ' + f.replyCategory); }
  else if (lower(f.previousTemperature) === 'hot' && ['not interested', 'unsubscribed'].indexOf(status) === -1) { temperature = 'Hot'; why.push('kept Hot from an earlier reply'); }
  else {
    const missing = [];
    if (score < warmMin) missing.push('score ' + score + ' below ' + warmMin);
    if (!truthy(f.hasPublicEmail)) missing.push('no public email');
    if (conf === 'low') missing.push('low research confidence');
    if (missing.length === 0) { temperature = 'Warm'; why.push('evidence-backed fit (score ' + score + ')'); }
    else why.push('Cold because: ' + missing.join('; '));
  }
  let pipelineStatus = 'Ready for review';
  if (truthy(f.optedOut)) pipelineStatus = 'Unsubscribed';
  else if (LATER_STAGES.indexOf(status) !== -1) pipelineStatus = f.currentPipelineStatus;
  else if (!reachable && !String(f.publicPhone || '').trim() && !truthy(f.hasPublicEmail)) pipelineStatus = 'Invalid contact';
  return { json: Object.assign({}, f, {
    fitScore: score,
    scoreBreakdown: parts.join(' | '),
    temperature,
    temperatureReason: why.join('; '),
    pipelineStatus
  }) };
});` }
  },
  output: [{ fitScore: 75, scoreBreakdown: '+15 website works', temperature: 'Warm', temperatureReason: 'evidence-backed fit', pipelineStatus: 'Ready for review' }]
});

const note = sticky('## A3 Score & Qualify (Stage 3)\nFixed, written-down point rules. Every point appears in Score Breakdown.\n\n- **HOT** = a real reply showed buying interest.\n- **WARM** = score at least WARM_MIN_SCORE + public email + confidence Medium/High. Not a prediction of buying.\n- **COLD** = everything else, with the reason.\n\nNo AI and no outside services in this step.', [scoring], { color: 6 });

export default workflow('agency-a3-score', '[AGENCY] A3 Score & Qualify')
  .add(whenCalled)
  .to(scoring)
  .add(note);
