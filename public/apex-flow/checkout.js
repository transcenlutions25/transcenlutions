(() => {
 'use strict';
 const status = document.getElementById('checkout-status');
 const link = document.getElementById('checkout-link');
 const retry = document.getElementById('checkout-retry');
 let checking = false;
 async function check() {
  if (checking) return;
  checking = true; retry.disabled = true; link.hidden = true; link.removeAttribute('href');
  status.textContent = 'Checking test checkout availability…';
  status.setAttribute('aria-busy', 'true');
  try {
   const response = await fetch('/api/apex/checkout', {cache:'no-store',signal:AbortSignal.timeout(12000)});
   if (!response.ok) throw Error('unavailable');
   const data = await response.json();
   if (data.state === 'test' && data.amount === 2700 && data.currency === 'usd') {
    const url = new URL(data.checkoutUrl);
    if (url.origin !== 'https://buy.stripe.com' || !/^\/test_[A-Za-z0-9]+$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw Error('unverified');
    link.href = url.href; link.hidden = false;
    status.textContent = 'Sandbox ready: $27 test transaction only. Use Stripe test payment details, never a real card.';
   } else {
    status.textContent = 'Checkout is not open. Read the sample or request launch details below.';
   }
  } catch {
   status.textContent = 'Test checkout availability could not be verified. Check your connection and try again, or request launch details below.';
  } finally {
   checking = false; retry.hidden = false; retry.disabled = false; status.removeAttribute('aria-busy');
  }
 }
 retry.addEventListener('click', check);
 // Recheck after returning from Stripe or restoring a page from the back/forward cache.
 window.addEventListener('pageshow', event => { if (event.persisted) check(); });
 check();
})();
