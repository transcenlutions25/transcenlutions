import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib"];
const blockedPhrases = [
  "Box 1",
  "Detected intent",
  "Suggested action",
  "Permission status",
  "Governance Placeholder",
  "Supporting Agents",
  "CEO Operator + Orchestrator",
  "agent dashboard",
];

const ignoredFiles = new Set(["lib/types.ts", "lib/public-copy.ts"]);
const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      walk(filePath);
      continue;
    }

    if (!/\.(tsx?|jsx?)$/.test(filePath) || ignoredFiles.has(filePath)) {
      continue;
    }

    const contents = readFileSync(filePath, "utf8");
    for (const phrase of blockedPhrases) {
      if (contents.includes(phrase)) {
        hits.push(`${filePath}: ${phrase}`);
      }
    }
  }
}

for (const root of roots) {
  walk(root);
}

if (hits.length > 0) {
  console.error("Public copy guard failed. Remove internal-only language:");
  for (const hit of hits) {
    console.error(`- ${hit}`);
  }
  process.exit(1);
}

console.log("Public copy guard passed.");
