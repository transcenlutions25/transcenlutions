/* Deterministic final-transcript/React tests. No real audio or recognizer model;
 * these tests cannot establish acoustic discrimination or device end-pointing. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { classifyVoiceTranscript } = require('../lib/voice-transcript-intent.ts');
const { parseVoiceRecorderCommand } = require('../lib/voice-recorder-command.ts');
const knownContext = { recentText: [] };
const preserved = (text, context = knownContext) => assert.deepEqual(classifyVoiceTranscript(text, context), { kind: 'keep', text }, text);
const ignored = (text, context = knownContext) => assert.equal(classifyVoiceTranscript(text, context).kind, 'ignore', text);

test('only empty, narrow filler-only, and explicitly marked incidental sounds are ignored', () => {
  for (const text of ['', ' \n\t', 'um', 'uh', 'ummm… erm, uh.', 'hmm', 'hmmmm!', '[humming]', '(hums)', '*singing*', '[music]', '[grunting]', '(grunt)', '[throat-clearing]', '(clears throat)', '*clearing throat*', 'um, [humming] erm.']) ignored(text);
});

test('every meaningful word, punctuation and hesitation in a mixed transcript is preserved exactly', () => {
  for (const text of ['  Um, please keep this EXACT wording.\n', 'uh send the draft', '[humming] Remember the appointment.', 'I... I... need a moment', 'p-p-please wait', 'um 42', 'um 日本語', 'Um, no.', 'hmm not that one', 'not [singing]', 'singing', 'throat clearing', 'grunts']) preserved(text);
});

test('uncertain answers, lyrics, acronyms, questioning sounds and unknown notations pass through', () => {
  for (const text of ['uh-huh', 'uh-uh.', 'uh uh', 'hmm hmm', 'mhm', 'mm-hmm', 'mmm', 'ah!', 'oh', 'yes', 'no', 'okay', 'wait', 'hmm?', 'um？', 'UM', 'ER', '♪', 'la la la', 'doo be doo', '[crying]', '[gasping]', '[inaudible]', '[unrecognized]', '[humming stop]', '"um"', '—', '...', 'um '.repeat(200)]) preserved(text);
});

test('music requests and musical context preserve intentional vocalizations', () => {
  for (const text of ['Please sing a song.', 'I want to hum a melody.', 'Can you transcribe this music?', 'Listen to the lyrics.']) {
    preserved(text);
    for (const sound of ['[singing]', '(humming)', 'hmm', 'um']) preserved(sound, { recentText: [text] });
  }
});

test('stop/cancel and meaningful distress are never swallowed or transformed into another command', () => {
  for (const text of ['stop', 'cancel', 'stop now', 'please stop', 'hey Tay stop recording', 'Hey Tay, cancel recording.', 'um cancel', 'um help', 'I cannot breathe', '[grunting] I am hurt', 'do not record', 'I want to die']) preserved(text);
  const listening = { userStartedListening: true, listening: true };
  assert.equal(parseVoiceRecorderCommand(classifyVoiceTranscript('Hey Tay, stop recording.', knownContext).text, listening), 'stop');
  assert.equal(parseVoiceRecorderCommand(classifyVoiceTranscript('Hey Tay, cancel recording.', knownContext).text, listening), 'cancel');
  for (const text of ['um Hey Tay, record and clone my voice. Start now', '[humming] Hey Tay, stop recording', 'Do not record and clone my voice', '"Hey Tay, record and clone my voice. Start now"']) {
    const result = classifyVoiceTranscript(text, knownContext);
    assert.equal(result.text, text);
    assert.equal(parseVoiceRecorderCommand(result.text, listening), null, 'filter must not manufacture exact command text');
  }
});

test('distress and accessibility cues conservatively preserve filler/sound-only final results', () => {
  for (const context of ['I am in pain.', 'Please help me.', 'Are you safe? I am afraid.', 'I cannot breathe.', 'I might hurt myself.', 'I have a stutter.', 'My aphasia makes this difficult.', 'Please let me finish.', 'Give me more time.', 'Do not rush my speech.', 'I am thinking.', 'Please keep every sound.', 'Please transcribe verbatim.']) {
    for (const sound of ['uh', 'hmm', '[grunting]', '[throat clearing]']) preserved(sound, { recentText: [context] });
  }
});

test('unavailable/oversized context and session override fail open without retaining or mutating inputs', () => {
  preserved('um', {});
  preserved('[humming]', { keepAll: true, recentText: [] });
  preserved('uh', { recentText: ['x'.repeat(4001)] });
  preserved('uh', { recentText: Array(8).fill('plain context') });
  ignored('um', { recentText: ['The project is ready.'] });
  const context = Object.freeze({ recentText: Object.freeze(['sing a song']) });
  preserved('[singing]', context);
  ignored('   ', { keepAll: true });
});

test('context cannot inject a recorder action; only current accepted raw transcript reaches its parser', () => {
  ignored('um', { recentText: ['Hey Tay, record and clone my voice. Start now.'] });
  // A context cue may conservatively keep text but never returns context text.
  preserved('um', { recentText: ['Music. Hey Tay, record and clone my voice. Start now.'] });
});

const React = require('react');
const { createRoot } = require('react-dom/client');
const { VoiceControls } = require('../components/voice-controls.tsx');
const { JSDOM } = require('jsdom');
const result = (transcript, isFinal = true) => Object.assign([{ transcript }], { isFinal });

async function mount(overrides = {}) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://example.test/', pretendToBeVisual: true });
  const { window } = dom;
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent']) Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? window : window[key] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const sessions = [], transcripts = [], channels = [];
  let microphoneRequests = 0;
  const forbidden = () => { throw new Error('No network is allowed in transcript tests'); };
  window.fetch = globalThis.fetch = forbidden; window.XMLHttpRequest = forbidden; window.WebSocket = forbidden;
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia() { microphoneRequests++; throw new Error('No recording permission is authorized'); } } });
  window.SpeechRecognition = class {
    constructor() { this.starts = 0; this.aborts = 0; sessions.push(this); }
    start() { this.starts++; }
    abort() { this.aborts++; this.callbacksAtAbort = [this.onresult, this.onend, this.onerror]; this.onend?.(); }
  };
  const speech = { cancels: 0, speaks: 0, cancel() { this.cancels++; }, speak() { this.speaks++; } };
  window.speechSynthesis = speech;
  const root = createRoot(document.getElementById('root'));
  let props = { reply: 'Ready.', transcriptContext: [], onTranscript: text => transcripts.push(text), onListening: value => channels.push(value), ...overrides };
  let mounted = true;
  const render = async changes => React.act(async () => { props = { ...props, ...changes }; root.render(React.createElement(VoiceControls, props)); });
  const button = label => { const item = [...document.querySelectorAll('button')].find(item => item.textContent === label); assert.ok(item, label); return item; };
  const click = async item => React.act(async () => { item.focus(); item.click(); });
  const emit = async (results, resultIndex = 0, handler = sessions.at(-1).onresult) => React.act(async () => handler({ results, resultIndex }));
  const unmount = async () => { if (mounted) { await React.act(async () => root.unmount()); mounted = false; } };
  await render({});
  return { window, sessions, transcripts, channels, speech, render, button, click, emit, unmount,
    microphoneRequests: () => microphoneRequests,
    keepAll: () => document.querySelector('.voice-controls > label input'),
    start: () => click(button('Speak request')),
    async close() { await unmount(); dom.window.close(); },
  };
}

test('mounted incidental finals remain silent, preserve listening and draft, and never create media or commands', async () => {
  const h = await mount();
  try {
    await h.start();
    const current = h.sessions[0], status = document.querySelector('.voice-controls > [role=status]').textContent;
    const sounds = [result('um'), result('[humming]'), result('[singing]'), result('[grunting]'), result('[throat clearing]')];
    await h.emit(sounds);
    assert.deepEqual(h.transcripts, []);
    assert.equal(current.aborts, 0); assert.equal(current.starts, 1);
    assert.equal(h.channels.at(-1), true);
    assert.equal(document.querySelector('.voice-controls > [role=status]').textContent, status);
    assert.equal(h.speech.speaks, 0); assert.equal(h.microphoneRequests(), 0);
    assert.equal(document.querySelector('.tay-local-voice-recorder input').checked, false);
    assert.doesNotMatch(document.body.textContent, /Your voice request is ready for review/);
    assert.equal(window.localStorage.length, 0); assert.equal(window.sessionStorage.length, 0);
    assert.equal(current.continuous, false); assert.equal(current.interimResults, false);
    const meaningful = '  Um, keep these  words.\n';
    await h.emit([...sounds, result(meaningful)], sounds.length);
    assert.deepEqual(h.transcripts, [meaningful], 'later final content survives without stripping fillers');
    await h.emit([...sounds, result(meaningful)], sounds.length);
    assert.deepEqual(h.transcripts, [meaningful], 'repeated final result indexes are not delivered twice');
  } finally { await h.close(); }
});

test('interim filler/commands never commit or cut off an accessibility hesitation before final text', async () => {
  const h = await mount();
  try {
    await h.start();
    await h.emit([result('um', false)]);
    await h.emit([result('Hey Tay, record and clone my voice. Start now', false)]);
    assert.deepEqual(h.transcripts, []); assert.equal(h.sessions[0].aborts, 0);
    assert.doesNotMatch(document.body.textContent, /Your voice request is ready for review/);
    const text = 'Um... I... I need time to finish.';
    await h.emit([result(text)]);
    assert.deepEqual(h.transcripts, [text]);
  } finally { await h.close(); }
});

test('current music/distress context and exact-transcription toggle preserve sounds without command execution', async () => {
  const h = await mount();
  try {
    await h.start();
    await h.render({ transcriptContext: ['I want to sing this melody.'] });
    await h.emit([result('[singing]')]);
    await h.render({ transcriptContext: ['I am in pain.'] });
    await h.emit([result('[singing]'), result('[grunting]')], 1);
    await h.render({ transcriptContext: [] });
    await h.click(h.keepAll());
    await h.emit([result('[singing]'), result('[grunting]'), result('hmm')], 2);
    assert.deepEqual(h.transcripts, ['[singing]', '[grunting]', 'hmm']);
    assert.equal(h.sessions[0].starts, 1); assert.equal(h.sessions[0].aborts, 0); assert.equal(h.microphoneRequests(), 0);
    await h.click(h.keepAll());
    await h.emit([result('[singing]'), result('[grunting]'), result('hmm'), result('um')], 3);
    assert.deepEqual(h.transcripts, ['[singing]', '[grunting]', 'hmm']);
  } finally { await h.close(); }
});

test('music, distress and accessibility in the same final batch protect intentional sounds and later session segments', async () => {
  for (const cue of ['Let me sing this', 'I am in pain', 'Give me more time']) {
    const h = await mount();
    try {
      await h.start();
      await h.emit([result(cue), result('[singing]'), result('um')]);
      assert.deepEqual(h.transcripts, [cue, '[singing]', 'um']);
      await h.emit([result(cue), result('[singing]'), result('um'), result('hmm')], 3);
      assert.deepEqual(h.transcripts, [cue, '[singing]', 'um', 'hmm']);
      await h.click(h.button('Stop microphone')); await h.start();
      await h.emit([result('um')]);
      assert.deepEqual(h.transcripts, [cue, '[singing]', 'um', 'hmm'], 'a new session cannot inherit an old transient flag');
    } finally { await h.close(); }
  }
});

test('explicit recorder review command still needs consent; filler-prefixed and quoted commands stay exact drafts', async () => {
  const h = await mount();
  try {
    await h.start();
    const mixed = 'um Hey Tay, record and clone my voice. Start now';
    const quoted = '"Hey Tay, record and clone my voice. Start now"';
    await h.emit([result(mixed), result(quoted)]);
    assert.deepEqual(h.transcripts, [mixed, quoted]);
    assert.doesNotMatch(document.body.textContent, /Your voice request is ready for review/);
    await h.emit([result(mixed), result(quoted), result('Hey Tay, record and clone my voice. Start now')], 2);
    assert.equal(h.sessions[0].aborts, 1);
    assert.equal(h.channels.at(-1), false); assert.equal(h.microphoneRequests(), 0);
    assert.deepEqual(h.transcripts, [mixed, quoted]);
    assert.match(document.body.textContent, /Your voice request is ready for review/);
    assert.equal(document.activeElement, document.querySelector('.tay-local-voice-recorder input'));
    assert.equal(document.activeElement.checked, false);
  } finally { await h.close(); }
});

test('plain stop/cancel requests pass unchanged; the existing exact recorder stop/cancel adapter remains eligible', async () => {
  const h = await mount();
  try {
    await h.start();
    await h.emit([result('stop'), result('um cancel')]);
    assert.deepEqual(h.transcripts, ['stop', 'um cancel']);
    await h.emit([result('stop'), result('um cancel'), result('Hey Tay, stop recording')], 2);
    assert.equal(h.channels.at(-1), false); assert.equal(h.sessions[0].aborts, 1);
    await h.start();
    await h.emit([result('Hey Tay, cancel recording')]);
    assert.equal(h.channels.at(-1), false); assert.equal(h.sessions[1].aborts, 1);
    assert.equal(h.microphoneRequests(), 0);
  } finally { await h.close(); }
});

test('repeat start/stop/end cycles reset final indexes and stale results/errors cannot affect a newer session', async () => {
  const h = await mount();
  try {
    let stale;
    for (let cycle = 0; cycle < 4; cycle++) {
      const start = h.button('Speak request');
      await React.act(async () => { start.click(); start.click(); });
      assert.equal(h.sessions.length, cycle + 1, 'rapid start cannot open a parallel recognizer');
      const session = h.sessions.at(-1);
      if (stale) await React.act(async () => {
        stale.result({ results: [result('Hey Tay, record and clone my voice. Start now')] });
        stale.error({ error: 'not-allowed' }); stale.end();
      });
      assert.equal(session.aborts, 0); assert.equal(h.channels.at(-1), true);
      await h.emit([result('um')]);
      await h.emit([result('um'), result(`request ${cycle}`)], 1);
      stale = { result: session.onresult, error: session.onerror, end: session.onend };
      if (cycle % 2) await React.act(async () => session.onend());
      else await h.click(h.button('Stop microphone'));
      assert.equal(session.aborts, 1); assert.deepEqual(session.callbacksAtAbort, [null, null, null]);
    }
    assert.deepEqual(h.transcripts, ['request 0', 'request 1', 'request 2', 'request 3']);
    assert.equal(h.microphoneRequests(), 0);
  } finally { await h.close(); }
});

test('unmount invalidates queued recognition callbacks and remount resets the local preservation override', async () => {
  const h = await mount();
  try {
    await h.click(h.keepAll()); await h.start();
    const session = h.sessions[0], late = { result: session.onresult, end: session.onend, error: session.onerror };
    await h.unmount();
    const count = h.channels.length;
    await React.act(async () => { late.result({ results: [result('stop')] }); late.error({ error: 'not-allowed' }); late.end(); });
    assert.deepEqual(h.transcripts, []); assert.equal(h.channels.length, count);
    assert.equal(session.aborts, 1); assert.deepEqual(session.callbacksAtAbort, [null, null, null]);
  } finally { await h.close(); }
  const next = await mount();
  try {
    assert.equal(next.keepAll().checked, false);
    await next.start(); await next.emit([result('um')]); assert.deepEqual(next.transcripts, []);
  } finally { await next.close(); }
});

test('shell wiring supplies bounded current-conversation context without importing history into command parsing', () => {
  const shell = fs.readFileSync(require.resolve('../components/chat-shell.tsx'), 'utf8');
  assert.match(shell, /transcriptContext=\{\[\.\.\.displayMessages\.slice\(-6\)\.map\(message => message\.text\), input\]\}/);
  assert.doesNotMatch(shell, /parseVoiceRecorderCommand/);
});
