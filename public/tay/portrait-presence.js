/* Port of the approved Mac standing-pose decoration; never an agent status. */
(function () {
  'use strict';
  let paused = false; // Page-memory preference only; never an account setting.
  function mount(identity, portrait, { suspended = false } = {}) {
    let connected = true, inView = false, failed = false;
    let ready = portrait.complete && portrait.naturalWidth > 0;
    let media = null, observer = null, mediaCleanup = () => {};
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary portrait-motion';
    const description = document.createElement('span');
    description.id = 'portraitMotionDescription';
    description.className = 'workspace-visually-hidden';
    description.textContent = 'Decorative standing pose only. This animation does not indicate thinking, listening or task progress. Pause changes only this decoration.';
    button.setAttribute('aria-describedby', description.id);
    identity.append(button, description);
    try { media = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null; } catch { /* Stay still. */ }
    const modern = typeof media?.addEventListener === 'function' && typeof media?.removeEventListener === 'function';
    const legacy = typeof media?.addListener === 'function' && typeof media?.removeListener === 'function';
    let visibilitySupported = false;
    function sync() {
      if (!connected) return;
      const reduced = media?.matches === true;
      const unavailable = failed || !media || !(modern || legacy) || !visibilitySupported;
      const playing = !unavailable && !reduced && !paused && !suspended && ready && inView && document.visibilityState === 'visible';
      identity.dataset.motion = playing ? 'playing' : 'still';
      button.disabled = unavailable || reduced || suspended;
      button.textContent = suspended ? 'Still' : button.disabled ? 'Off' : paused ? 'Resume' : 'Pause';
      button.setAttribute('aria-label', reduced ? 'Tay animation off: reduced motion is enabled' : suspended ? 'Tay animation suspended while a workspace panel is open' : unavailable ? 'Tay animation off: unavailable' : paused ? 'Resume Tay animation' : 'Pause Tay animation');
      button.title = button.getAttribute('aria-label');
    }
    if (modern) {
      media.addEventListener('change', sync);
      mediaCleanup = () => media.removeEventListener('change', sync);
    } else if (legacy) {
      media.addListener(sync);
      mediaCleanup = () => media.removeListener(sync);
    }
    try {
      if (typeof window.IntersectionObserver === 'function') {
        observer = new window.IntersectionObserver(entries => {
          if (!connected) return;
          const entry = entries.find(candidate => candidate.target === identity);
          if (entry) inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
          sync();
        }, { threshold: [0, 0.25] });
        observer.observe(identity);
        visibilitySupported = true;
      }
    } catch { observer?.disconnect(); observer = null; }
    const onLoad = () => { ready = true; sync(); };
    const onError = () => { failed = true; ready = false; portrait.hidden = true; sync(); };
    portrait.addEventListener('load', onLoad);
    portrait.addEventListener('error', onError);
    document.addEventListener('visibilitychange', sync);
    button.onclick = () => { if (!button.disabled) { paused = !paused; sync(); } };
    sync();
    const dispose = () => {
      connected = false;
      identity.dataset.motion = 'still';
      observer?.disconnect();
      mediaCleanup();
      portrait.removeEventListener('load', onLoad);
      portrait.removeEventListener('error', onError);
      document.removeEventListener('visibilitychange', sync);
      button.onclick = null;
    };
    dispose.setSuspended = value => { suspended = value === true; sync(); };
    return dispose;
  }
  window.TayPortraitPresentation = { mount };
}());
