/* Port of the approved Mac standing-pose decoration; never an agent status.
 * The only implemented motion is whole-cutout sway. There is no rig, blink,
 * gesture, speech or listening animation. Preference is local to this device. */
(function () {
  'use strict';
  // Same versioned contract as the reviewed TayHeaderPresence component.
  const MOTION_KEY = 'tay.header.motion.v1';
  function readPaused() {
    try {
      const raw = window.localStorage?.getItem(MOTION_KEY);
      if (raw === null || raw === undefined) return false;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && typeof parsed.paused === 'boolean') return parsed.paused;
    } catch { /* Unreadable or denied storage fails safely to still. */ }
    return true;
  }
  function writePaused(value) {
    try { window.localStorage?.setItem(MOTION_KEY, JSON.stringify({ version: 1, paused: value })); }
    catch { /* Keep the choice in memory without affecting chat. */ }
  }
  let paused = readPaused();
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
      const visible = ready && inView && document.visibilityState === 'visible';
      const playing = !unavailable && !reduced && !paused && !suspended && visible;
      const state = unavailable ? 'unavailable' : reduced ? 'reduced-motion' : suspended ? 'suspended' : paused ? 'paused' : !ready ? 'loading' : !visible ? 'not-visible' : 'playing';
      identity.dataset.motion = playing ? 'playing' : 'still';
      identity.dataset.motionState = state;
      button.disabled = unavailable || reduced || suspended;
      button.textContent = suspended ? 'Paused' : button.disabled ? 'Off' : paused ? 'Resume' : 'Pause';
      button.setAttribute('aria-pressed', String(paused));
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
    button.onclick = () => { if (!button.disabled) { paused = !paused; writePaused(paused); sync(); } };
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
