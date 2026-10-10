// Stylesheet contract checks, not browser layout or pixel verification.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
const css = readFileSync('app/mobile-chat.css', 'utf8');
const root = postcss.parse(css);
const mobile = [];
root.walkAtRules('media', at => {
  if (at.params === '(max-width: 900px)') at.walkRules(rule => mobile.push(rule));
});
function value(selector, property) {
  return mobile.filter(rule => rule.selector.split(',').map(s => s.trim()).includes(selector))
    .flatMap(rule => rule.nodes.filter(node => node.type === 'decl' && node.prop === property)).at(-1)?.value;
}
assert.equal(value('.tay-app .tay-message > p', 'font-size'), '16px');
assert.equal(value('.tay-app .tay-composer-input-row textarea', 'font-size'), '16px');
assert.equal(value('.tay-app .tay-mobile-send', 'min-height'), '44px');
assert.equal(value('.tay-app .tay-mobile-composer-options', 'min-height'), '44px');
assert.equal(value('.tay-app .tay-mobile-title', 'min-height'), '48px');
assert.equal(value('.tay-app .tay-message--tay .writing-block__editor', 'field-sizing'), 'content');
assert.equal(value('.tay-app .tay-message--tay .writing-block__editor', 'min-height'), '3em');
assert.equal(value('.tay-app .tay-message--tay .writing-block__editor', 'color'), '#211930');
assert.equal(value('.tay-app .tay-message--tay .writing-block__editor', 'background'), '#fff');
assert.equal(value('.tay-app .tay-queue-strip[data-active=false]', 'display'), 'none');
assert.equal(value('body:has(> iframe#nl-badge-frame) .tay-app', '--tay-host-badge-space'), '72px');
assert.match(value('.tay-app', 'height'), /--tay-viewport-height/);
assert.equal(value('.tay-app.tay-drawer-open .tay-rail', 'overflow-y'), 'auto');
assert.equal(value('.tay-app.tay-drawer-open .tay-navigation', 'flex'), '0 0 auto');
assert.match(value('.tay-app .tay-composer-dock', 'padding'), /safe-area-inset-bottom/);
for (const rule of mobile) {
  if (!rule.selector.includes('nl-badge-frame')) continue;
  assert(rule.nodes.every(node => node.type !== 'decl' || !['display','visibility','opacity','transform','clip-path','pointer-events'].includes(node.prop)), 'Host badge is only accommodated, never hidden or disabled');
}
console.log('Mobile stylesheet contracts passed; actual browser layout remains unverified.');
