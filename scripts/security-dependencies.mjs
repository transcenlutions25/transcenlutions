/** Fail on all runtime advisories and all newly reported build-tool advisories. */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const exception = JSON.parse(readFileSync(new URL('../security/dependency-exception.json', import.meta.url)));
for (const production of [true, false]) {
  const result = spawnSync('npm', ['audit', '--json', ...(production ? ['--omit=dev'] : [])], { encoding: 'utf8', timeout: 120000 });
  assert.ok(!result.error && [0, 1].includes(result.status), 'Dependency audit did not complete');
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw Error('Dependency audit returned an unreadable report'); }
  assert.ok(!report.error && report.metadata && report.vulnerabilities, 'Dependency audit unavailable');
  const findings = Object.values(report.vulnerabilities);
  if (production) assert.equal(findings.length, 0, 'Production dependencies have known vulnerabilities');
  else {
    const advisories = findings.flatMap(x => x.via.filter(v => typeof v === 'object'));
    for (const item of advisories) {
      assert.ok(item.url === exception.url && item.name === exception.package && Date.now() < Date.parse(exception.expires),
        `Unaccepted vulnerability: ${item.name} ${item.url}`);
    }
    if (findings.length) {
      assert.ok(advisories.length > 0, 'Unresolved audit dependency chain');
      console.warn(`KNOWN BUILD-ONLY ISSUE: ${exception.url}; exception expires ${exception.expires}. ${exception.reason}`);
    }
  }
  console.log(`${production ? 'Production' : 'All'} dependency audit: ${findings.length} affected packages.`);
}
