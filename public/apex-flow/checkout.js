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
   if (data.state === 'unavailable' && data.reason === 'quantity-lock-unverified') {
    status.textContent = 'Test checkout remains closed: fixed checkout quantity cannot yet be verified. No payment is requested.';
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
