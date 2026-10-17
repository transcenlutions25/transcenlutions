import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import './build-offline.mjs';

test('The actual standalone file boots all four games and opens privacy without external assets', t => {
  return (async () => {
    const html = await readFile(new URL('../../dist/arcade/Transcenlutions-Arcade.html', import.meta.url), 'utf8');
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error=>errors.push(error.message));
    const dom = new JSDOM(html, {
      url: 'file:///Transcenlutions-Arcade.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
      beforeParse(w) {
        w.matchMedia = () => ({matches:false});
        w.scrollTo = () => {};
        w.HTMLDialogElement.prototype.showModal = function(){this.setAttribute('open','');};
        w.HTMLDialogElement.prototype.close = function(){this.removeAttribute('open');};
        w.addEventListener('error',event=>{errors.push(event.message);event.preventDefault();});
      },
    });
    t.after(()=>dom.window.close());
    const d = dom.window.document;
    assert.equal(d.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="manifest"]').length,0);
    assert.ok(dom.window.TranscenlutionsArcade, 'Production script executes directly from the exported file.');
    for(const [kind,board] of [['grid','.grid-board'],['sort','.tube-board'],['orbit','.orbit-board'],['runner','.run-track']]){
      d.querySelector(`[data-play="${kind}"]`).click();
      assert.ok(d.querySelector(board),`${kind} engine constructs its playable board.`);
      d.querySelector('#back-home').click();
    }
    d.querySelector('#privacy-link').click();
    assert.ok(d.querySelector('#modal').open);
    assert.match(d.querySelector('#modal-body').textContent,/standalone edition/);
    assert.deepEqual(errors,[]);
  })();
});
