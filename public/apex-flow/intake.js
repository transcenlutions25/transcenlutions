(() => {
  'use strict';
  const form = document.getElementById('intake-form');
  const button = document.getElementById('intake-send');
  const status = document.getElementById('intake-status');
  const endpoint = '/apex-flow/intake.html';
  let ready = false;
  let sending = false;
  let sent = false;
  const reference = crypto.randomUUID();
  // Netlify removes data-netlify during registration. Refuse to imply capture
  // works if the host has not processed this exact static form definition.
  fetch(endpoint, {cache:'no-store'}).then(async response => {
    if (!response.ok) throw new Error('Registration unavailable');
    const html = new DOMParser().parseFromString(await response.text(), 'text/html');
    const registered = html.querySelector('form[name="apex-flow-intake"]');
    if (!registered || registered.hasAttribute('data-netlify') || registered.hasAttribute('netlify')) {
      throw new Error('Form not registered');
    }
    ready = true; button.disabled = false;
    status.textContent = 'Direct inquiry submission is available. Generate your brief above first.';
  }).catch(() => {
    status.textContent = 'Direct submission is not available yet. Use Open email draft above, or email your downloaded brief to transcenlutions@gmail.com.';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || sending || sent) return;
    const inquiry = document.getElementById('brief-text').textContent;
    if (!inquiry.trim()) {status.textContent = 'Generate your brief above before sending.'; return;}
    const values = new FormData(form);
    const name = String(values.get('name') || '').trim();
    const email = String(values.get('email') || '').trim();
    if (!name || !email || !form.reportValidity()) return;
    if (values.get('bot-field')) {status.textContent = 'Submission could not be completed. Please use email.'; return;}
    const body = new URLSearchParams({'form-name':'apex-flow-intake', name, email, inquiry,
      reference, consent:'Contact me about this inquiry', 'bot-field':''});
    sending = true; button.disabled = true;
    status.textContent = 'Sending your inquiry…';
    try {
      const response = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:body.toString(), signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('Submission failed');
      sent = true;
      status.textContent = `The form service accepted your request. Reference: ${reference}. This is not a booking or payment confirmation. Keep your brief; if you need to follow up, email transcenlutions@gmail.com with this reference.`;
    } catch {
      status.textContent = `We could not confirm receipt. Keep your brief and email it to transcenlutions@gmail.com. Reference: ${reference}. Avoid repeated submissions.`;
    } finally {sending = false; button.disabled = sent;}
  });
})();
