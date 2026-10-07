(() => {
  'use strict';
  const links = document.querySelectorAll('[data-checkout-link]');
  const closed = document.querySelectorAll('[data-checkout-closed]');
  const open = document.querySelectorAll('[data-checkout-open]');
  let generation = 0;

  function closeCheckout() {
    links.forEach(link => { link.hidden = true; link.removeAttribute('href'); });
    closed.forEach(node => { node.hidden = false; });
    open.forEach(node => { node.hidden = true; });
  }
  async function checkCheckout() {
    const current = ++generation;
    closeCheckout();
    try {
      const response = await fetch('/api/apex/checkout', {
        cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return;
      const offer = await response.json();
      if (current !== generation || offer?.enabled !== true || typeof offer.checkoutUrl !== 'string') return;
      // Defense in depth: never turn an arbitrary status URL into a checkout link.
      if (offer.checkoutUrl !== 'https://buy.stripe.com/5kQdRbc7ndJM6Cr9HT6sw05') return;
      links.forEach(link => { link.href = offer.checkoutUrl; link.hidden = false; });
      closed.forEach(node => { node.hidden = true; });
      open.forEach(node => { node.hidden = false; });
    } catch { /* Keep the sample and inquiry-only fallback on every failure. */ }
  }
  checkCheckout();
  // Clear a restored/stale link before rechecking when the visitor returns.
  function invalidateCheckout() { generation++; closeCheckout(); }
  window.addEventListener('pagehide', invalidateCheckout);
  window.addEventListener('pageshow', event => { if (event.persisted) checkCheckout(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkCheckout();
    else invalidateCheckout();
  });
})();
