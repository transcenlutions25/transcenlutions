(() => {
  'use strict';
  const form = document.getElementById('brief-form');
  const result = document.getElementById('result');
  const status = document.getElementById('status');
  let brief = '';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = (id) => document.getElementById(id).value.trim();
    if (['task', 'tools', 'trigger', 'outcome'].some((id) => !value(id))) {
      status.textContent = 'Please describe the task, tools, trigger and desired outcome.';
      return;
    }
    brief = `APEX FLOW — WORKFLOW BRIEF\nPlanning draft — feasibility and delivery not yet confirmed.\n\nTASK\n${value('task')}\n\nTOOLS\n${value('tools')}\n\nTRIGGER\n${value('trigger')}\n\nDESIRED OUTCOME\n${value('outcome')}\n\nAPPROVAL BOUNDARY\n${value('review')}\n\nSCOPING QUESTIONS\n- Can the existing tools support the required trigger and action?\n- Who owns the accounts and maintains the workflow?\n- What data is required, and what must never be transmitted?\n- What happens on duplicates, missing data and service failures?\n\nPROPOSED ACCEPTANCE CHECKS\n- A representative test produces the agreed output.\n- Missing or invalid data stops safely with a visible explanation.\n- Repeated triggers do not create unintended duplicate actions.\n- External actions respect the agreed approval boundary.\n- The owner can explain how to run, pause and recover the workflow.\n\nHANDOVER REQUIREMENTS\nWorkflow map, test evidence, operating notes and known limitations.\n\nBEFORE PAYMENT\nConfirm scope, session schedule, price, tool costs, support and cancellation terms in writing.\nNo account connection, implementation or payment has occurred through this brief builder.`;
    document.getElementById('brief-text').textContent = brief;
    document.getElementById('email').href = 'mailto:transcenlutions@gmail.com?subject=' + encodeURIComponent('Apex Flow — workflow fit inquiry') + '&body=' + encodeURIComponent('I would like to discuss this workflow. Please confirm feasibility, scope, availability and price before booking.\n\n' + brief);
    result.hidden = false;
    document.getElementById('empty').hidden = true;
    status.textContent = 'Brief created locally. Nothing has been sent.';
  });
  document.getElementById('download').addEventListener('click', () => {
    if (!brief) return;
    const url = URL.createObjectURL(new Blob([brief], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'apex-flow-workflow-brief.txt';
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Download requested. Nothing has been sent.';
  });
  form.addEventListener('reset', () => {
    brief = ''; result.hidden = true;
    document.getElementById('brief-text').textContent = '';
    document.getElementById('email').href = 'mailto:transcenlutions@gmail.com';
    document.getElementById('empty').hidden = false;
    status.textContent = 'Brief cleared.';
  });
})();
