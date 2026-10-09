'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {JSDOM} = require('jsdom');
const html = readFileSync('public/apex-flow/offer.html', 'utf8');
const script = readFileSync('public/apex-flow/preview.js', 'utf8');
function preview(run = true) {
  const dom = new JSDOM(html, {url: 'https://preview.invalid/apex-flow/offer.html', runScripts: 'outside-only'});
  const w = dom.window;
  w.fetch = () => { throw Error('Preview must not make network requests'); };
  w.XMLHttpRequest = function () { throw Error('Preview must not make network requests'); };
  w.WebSocket = function () { throw Error('Preview must not make network requests'); };
  w.navigator.sendBeacon = () => { throw Error('Preview must not transmit answers'); };
  for (const name of ['localStorage', 'sessionStorage'])
    Object.defineProperty(w, name, {get() { throw Error('Preview must not use storage'); }});
  if (run) w.eval(script);
  return dom;
}
function answer(dom, id, value) {
  const input = dom.window.document.getElementById('preview-' + id + '-answer');
  input.value = value;
  input.dispatchEvent(new dom.window.Event('change'));
}
test('preview-first CTA and static fallback describe the real two-check scope and limitations', () => {
  const dom = preview(false), d = dom.window.document;
  assert.equal(d.querySelector('.hero .actions a').textContent, 'Try 2 checks free');
  assert.equal(d.querySelector('.hero .actions a').getAttribute('href'), '#sample');
  assert.equal(d.querySelectorAll('#sample details').length, 2);
  for (const node of d.querySelectorAll('#sample .preview-controls')) assert.equal(node.hidden, true);
  assert.match(d.querySelector('#sample').textContent, /guided self-assessment, not an automated audit/);
  assert.match(d.querySelector('#sample').textContent, /This preview contains only the two checks above/);
  assert.match(d.querySelector('noscript').textContent, /read both real checks/);
  assert.match(d.querySelector('.hero').textContent, /No email, account or payment needed/);
  const catalog = JSON.parse(readFileSync('products/funnel-checklist/checks.json', 'utf8'));
  for (const id of ['C3', 'O3']) {
    const check = catalog.find(c => c.id === id);
    assert.ok(d.getElementById('sample').textContent.includes(check.check));
    assert.ok(d.getElementById('sample').textContent.includes(check.fix));
  }
  for (const link of d.querySelectorAll('[data-checkout-link]')) {
    assert.equal(link.hidden, true); assert.equal(link.hasAttribute('href'), false);
  }
  dom.window.close();
});
test('demo answers produce concrete next actions with honest coverage and no provider or storage use', () => {
  const dom = preview(), d = dom.window.document;
  for (const node of d.querySelectorAll('#sample .preview-controls')) assert.equal(node.hidden, false);
  assert.match(d.getElementById('preview-summary').textContent, /0 verified · 0 needing attention · 2 not checked/);
  answer(dom, 'c3', 'no'); answer(dom, 'o3', 'yes');
  assert.match(d.getElementById('preview-c3-result').textContent, /Next action: Close the form-to-record gap/);
  assert.match(d.getElementById('preview-o3-result').textContent, /Keep the evidence/);
  assert.match(d.getElementById('preview-summary').textContent, /1 verified · 1 needing attention · 0 not checked/);
  answer(dom, 'c3', 'partial'); answer(dom, 'o3', 'no');
  assert.match(d.getElementById('preview-c3-result').textContent, /fields or notifications are missing/);
  assert.match(d.getElementById('preview-o3-result').textContent, /small, accurate sample/);
  assert.match(d.getElementById('preview-summary').textContent, /0 verified · 2 needing attention · 0 not checked/);
  dom.window.close();
});
test('reset, repeated changes and history restoration keep the snapshot synchronized', () => {
  const dom = preview(), d = dom.window.document;
  for (let i = 0; i < 3; i++) {
    answer(dom, 'c3', 'yes'); answer(dom, 'o3', 'yes');
    assert.match(d.getElementById('preview-summary').textContent, /2 verified/);
    d.getElementById('preview-reset').click();
    for (const id of ['c3', 'o3']) {
      assert.equal(d.getElementById('preview-' + id + '-answer').value, 'unknown');
      assert.match(d.getElementById('preview-' + id + '-result').textContent, /Check first/);
    }
    assert.match(d.getElementById('preview-summary').textContent, /2 not checked/);
  }
  d.getElementById('preview-c3-answer').value = 'partial';
  dom.window.dispatchEvent(new dom.window.Event('pageshow'));
  assert.match(d.getElementById('preview-summary').textContent, /0 verified · 1 needing attention · 1 not checked/);
  dom.window.close();
});
test('invalid answers are unknown, controls have accessible labels, and checkout stays untouched', () => {
  const dom = preview(), d = dom.window.document;
  answer(dom, 'c3', '<img src=x onerror=alert(1)>');
  assert.match(d.getElementById('preview-summary').textContent, /2 not checked/);
  assert.match(d.getElementById('preview-c3-result').textContent, /Check first/);
  assert.equal(d.querySelectorAll('#sample img').length, 0);
  for (const input of d.querySelectorAll('#sample select')) {
    assert.ok(d.querySelector('label[for="' + input.id + '"]'));
    assert.ok(d.getElementById(input.getAttribute('aria-describedby')));
    assert.equal(input.closest('form'), null);
    assert.equal(input.hasAttribute('name'), false);
  }
  assert.equal(d.getElementById('preview-summary').getAttribute('role'), 'status');
  assert.equal(d.getElementById('preview-reset').type, 'button');
  assert.equal(d.querySelector('.skip-link').getAttribute('href'), '#main');
  for (const link of d.querySelectorAll('[data-checkout-link]')) {
    assert.equal(link.hidden, true); assert.equal(link.hasAttribute('href'), false);
  }
  dom.window.close();
});
test('a partially missing preview fails quietly without changing other page functions', () => {
  const dom = preview(false);
  dom.window.document.getElementById('preview-c3-answer').remove();
  assert.doesNotThrow(() => dom.window.eval(script));
  for (const node of dom.window.document.querySelectorAll('#sample .preview-controls')) assert.equal(node.hidden, true);
  dom.window.close();
});

test('skip link retains high-contrast text after the actual shared brand stylesheet loads', () => {
  const brand = readFileSync('public/transcenlutions-brand.css', 'utf8');
  const styled = html.replace('<link rel="stylesheet" href="/transcenlutions-brand.css">', '<style>' + brand + '</style>');
  const dom = new JSDOM(styled), w = dom.window, d = w.document;
  const link = d.querySelector('a.skip-link');
  const colors = w.getComputedStyle(link);
  assert.equal(colors.color, 'rgb(8, 13, 22)');
  assert.equal(colors.backgroundColor, 'rgb(255, 255, 255)');
  function luminance(rgb) {
    const channels = rgb.match(/\d+/g).map(Number).map(n => n / 255)
      .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const contrast = (luminance(colors.backgroundColor) + 0.05) / (luminance(colors.color) + 0.05);
  assert.ok(contrast >= 7, 'Skip link must retain at least 7:1 contrast with the shared theme');
  link.focus();
  assert.equal(w.getComputedStyle(link).top, '12px');
  assert.equal(d.activeElement, link);
  assert.match(styled, /body\.transcenlutions-product a\.skip-link:focus-visible\{outline:3px solid #dfbd72;outline-offset:4px\}/);
  dom.window.close();
});

test('preview grids and native answer controls have explicit narrow-width safeguards', () => {
  const dom = preview(false), d = dom.window.document;
  const css = [...d.querySelectorAll('style')].map(node => node.textContent).join('\n');
  assert.match(css, /\.two\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)\{\.hero,\.two,\.grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css, /\.hero>\*,\.two>\*,\.grid>\*\{min-width:0\}/);
  for (const select of d.querySelectorAll('#sample select')) {
    const style = dom.window.getComputedStyle(select);
    assert.equal(style.minWidth, '0px');
    assert.equal(style.maxWidth, '100%');
  }
  dom.window.close();
});
