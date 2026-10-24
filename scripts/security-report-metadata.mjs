import fs from 'node:fs';
// Only public location metadata is emitted. Never emit Match, Secret, hashes or report bodies.
const findings = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(findings)) throw new Error('Scanner report is not an array');
for (const finding of findings) {
  const metadata = {
    RuleID: typeof finding.RuleID === 'string' ? finding.RuleID : null,
    File: typeof finding.File === 'string' ? finding.File : null,
    StartLine: Number.isInteger(finding.StartLine) ? finding.StartLine : null,
    EndLine: Number.isInteger(finding.EndLine) ? finding.EndLine : null,
    Commit: typeof finding.Commit === 'string' && /^[a-f0-9]{40}$/.test(finding.Commit) ? finding.Commit : null,
  };
  console.log(JSON.stringify(metadata));
}
