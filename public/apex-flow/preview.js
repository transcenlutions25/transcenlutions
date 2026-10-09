(function () {
  'use strict';
  // Fixed, local-only guidance. No provider calls, storage, notes or checkout changes.
  const checks = [
    {id: 'c3', actions: {
      unknown: 'Check first: Send a clearly labeled test through your form and look for the matching record in the system your business uses.',
      yes: 'Keep the evidence: Confirm the stored fields match your test and the person responsible can find the record. Recheck after changing your form.',
      partial: 'Next action: Find which fields or notifications are missing, then fix that gap and submit another labeled test.',
      no: 'Next action: Close the form-to-record gap. Check the form destination, field mapping and notification route, then submit another labeled test.'
    }},
    {id: 'o3', actions: {
      unknown: 'Check first: Compare your page’s sample and claims with what a customer actually receives today.',
      yes: 'Keep the evidence: Make sure the sample stays accurate when the product changes. Keep only claims you can support.',
      partial: 'Next action: Update the parts of your sample that are incomplete or out of date, and remove any claims you cannot support.',
      no: 'Next action: Replace unsupported claims with a small, accurate sample. Explain what it demonstrates and what it does not include.'
    }}
  ];
  const summary = document.getElementById('preview-summary');
  const reset = document.getElementById('preview-reset');
  const rows = checks.map(check => ({...check,
    input: document.getElementById('preview-' + check.id + '-answer'),
    result: document.getElementById('preview-' + check.id + '-result')}));
  if (!summary || !reset || rows.some(row => !row.input || !row.result)) return;
  function render() {
    let verified = 0, attention = 0, unknown = 0;
    for (const row of rows) {
      const value = Object.hasOwn(row.actions, row.input.value) ? row.input.value : 'unknown';
      row.result.textContent = row.actions[value];
      if (value === 'yes') verified++;
      else if (value === 'unknown') unknown++;
      else attention++;
    }
    summary.textContent = verified + ' verified · ' + attention + ' needing attention · ' + unknown + ' not checked. Based only on your answers to these 2 checks.';
  }
  rows.forEach(row => row.input.addEventListener('change', render));
  reset.addEventListener('click', function () {
    rows.forEach(row => { row.input.value = 'unknown'; });
    render();
  });
  window.addEventListener('pageshow', render);
  render();
  document.querySelectorAll('#sample .preview-controls').forEach(node => { node.hidden = false; });
})();
