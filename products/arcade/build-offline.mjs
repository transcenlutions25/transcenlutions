import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'public/arcade');
const read = name => readFileSync(path.join(source,name),'utf8');
const icon = `data:image/svg+xml;base64,${Buffer.from(read('icon.svg')).toString('base64')}`;
const engineSource = read('engine.mjs');
const exports = [...engineSource.matchAll(/^export (?:function|const) (\w+)/gm)].map(match=>match[1]);
const engine = `const offlineEngine = (() => {\n${engineSource.replace(/^export /gm,'')}\nreturn { ${exports.join(', ')} };\n})();`;
const importPattern = /^import\s*\{([\s\S]*?)\}\s*from\s*['"]\.\/engine\.mjs['"];?/;
const appSource = read('app.mjs');
const imports = appSource.match(importPattern);
if(!imports)throw new Error('The shared game-engine import was not found.');
const bindings = imports[1].split(',').map(binding=>binding.trim().replace(/\s+as\s+/, ': ')).join(', ');
const app = appSource.replace(importPattern,`const { ${bindings} } = offlineEngine;`);
let html = read('index.html')
  .replace('<link rel="stylesheet" href="./arcade.css">',`<style>${read('arcade.css')}</style>`)
  .replace('<link rel="manifest" href="./manifest.webmanifest">','')
  .replace('href="./icon.svg"',`href="${icon}"`)
  .replace('<html lang="en">','<html lang="en" data-standalone="true">')
  .replace('href="./privacy.html"','href="#privacy"')
  .replace('<script type="module" src="./app.mjs"></script>',`<script>\n${(engine+'\n'+app).replace(/<\/script/gi,'<\\/script')}\n</script>`);
// Standalone files do not install a service worker, even when served from HTTPS.
html=html.replace("if('serviceWorker'in navigator&&location.protocol==='https:'", "if(false&&'serviceWorker'in navigator&&location.protocol==='https:'");
const output=path.join(root,'dist/arcade');mkdirSync(output,{recursive:true});
const target=path.join(output,'Transcenlutions-Arcade.html');writeFileSync(target,html);
console.log(`Built ${target} (${Buffer.byteLength(html)} bytes).`);
