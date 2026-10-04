(() => {
  'use strict';
  const form = document.getElementById('checklist-interest-form');
  const button = document.getElementById('interest-send');
  const status = document.getElementById('interest-status');
  const endpoint = '/apex-flow/intake.html';
  let ready = false, sending = false, sent = false;
  const reference = crypto.randomUUID();
  // Reuse the already registered intake schema; no new marketing subscription.
  fetch(endpoint, {cache:'no-store'}).then(async response => {
    if (!response.ok) throw new Error('Unavailable');
    const html = new DOMParser().parseFromString(await response.text(), 'text/html');
    const registered = html.querySelector('form[name="apex-flow-intake"]');
    if (!registered || registered.hasAttribute('data-netlify') || registered.hasAttribute('netlify')) throw new Error('Unregistered');
    ready = true; button.disabled = false;
    status.textContent = 'You can request launch details here. No payment or booking is made.';
  }).catch(() => { status.textContent = 'Please use the email link below to request launch details.'; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || sending || sent || !form.reportValidity()) return;
    const values = new FormData(form);
    if (values.get('bot-field')) {status.textContent='Please use the email link below.';return;}
    const name = String(values.get('name') || '').trim().slice(0,100);
    const email = String(values.get('email') || '').trim();
    const goal = String(values.get('goal') || '').trim().slice(0,500);
    const inquiry = 'PRODUCT INTEREST: Funnel Leak Emergency Checklist.\nDisplayed price: USD 27 one-time.\nNo order, payment or booking.\nOptional question: '+goal;
    const body = new URLSearchParams({'form-name':'apex-flow-intake',name,email,inquiry,reference,consent:'Email me about availability and my inquiry for the $27 checklist only. No newsletter enrollment.','bot-field':''});
    sending = true;button.disabled = true;status.textContent='Sending your request…';
    try {
      const response = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('Not accepted');
      sent = true;status.textContent='Your request was accepted. Reference: '+reference+'. This is not a purchase. Keep the reference if you contact transcenlutions@gmail.com.';
    } catch {
      status.textContent='We could not confirm receipt. Email transcenlutions@gmail.com with reference '+reference+' instead of submitting repeatedly.';
    } finally {sending=false;button.disabled=sent;}
  });
})();
