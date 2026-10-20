import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const packageJson = JSON.parse(read("package.json"));
const launchGate = read(".github/workflows/launch-gate.yml");
const launcher = read("integrations/tay-desktop/legacy/launch_shared.py");
const nextConfig = read("next.config.mjs");
const androidBuild = read("android/arcade/app/build.gradle");
const androidWorkflow = read(".github/workflows/arcade-android.yml");
const buildInfo = read("app/api/build-info/route.ts");
const canon = read("docs/canon/MASTER_CANON_AND_SYSTEM_MAP.md");
const readiness = read("docs/handoffs/tay-platform-readiness-and-sync.md");

assert.equal(
  packageJson.scripts?.["test:platform-sync"],
  "node scripts/check-platform-sync.mjs",
  "package.json must expose the platform synchronization gate",
);
assert.match(
  launchGate,
  /- run: npm run test:platform-sync\n/,
  "the Launch gate must run the platform synchronization check",
);

// Desktop and web are one versioned application source. The desktop launcher
// must validate and run the root app, while keeping its build output separate.
assert.match(launcher, /root \/ 'app\/page\.tsx'/, "desktop launcher must validate the root shared app");
assert.match(launcher, /get\('name'\) != 'transcenlutions'/, "desktop launcher must validate the canonical package");
assert.match(launcher, /\.next-desktop\/BUILD_ID/, "desktop launcher must require the desktop build output");
assert.match(launcher, /env\['TAY_DESKTOP_BRIDGE_URL'\] = bridge/, "desktop-only capabilities must remain behind the loopback bridge");
assert.match(
  nextConfig,
  /distDir:\s*process\.env\.TAY_DESKTOP_BRIDGE_URL \? "\.next-desktop" : "\.next"/,
  "hosted and desktop builds must not overwrite each other",
);

// Android Arcade must package the canonical web assets instead of keeping a
// second hand-maintained frontend copy.
assert.match(
  androidBuild,
  /rootProject\.file\('\.\.\/\.\.\/public\/arcade'\)/,
  "Android Arcade must source its frontend from public/arcade",
);
assert.match(androidBuild, /tasks\.register\('syncArcadeAssets', Sync\)/, "Android build must define the asset synchronization task");
assert.match(androidBuild, /dependsOn tasks\.named\('syncArcadeAssets'\)/, "Android preBuild must depend on synchronized assets");
for (const required of [
  "index.html",
  "arcade.css",
  "engine.mjs",
  "app.mjs",
  "manifest.webmanifest",
  "sw.js",
  "icon.svg",
  "privacy.html",
]) {
  assert.ok(androidBuild.includes(`'${required}'`), `Android asset contract must require ${required}`);
}
assert.ok(
  androidWorkflow.includes("name: transcenlutions-arcade-android-${{ github.sha }}"),
  "Android artifacts must identify the exact source commit",
);
assert.ok(
  androidWorkflow.includes("android/arcade/build/release-artifacts/"),
  "Android workflow must publish the verified release-artifact directory",
);

// Hosted surfaces report their exact build commit for release comparison.
assert.match(buildInfo, /commit:\s*process\.env\.NEXT_PUBLIC_TAY_BUILD_SHA/, "build-info must expose the deployed commit");
assert.match(nextConfig, /NEXT_PUBLIC_TAY_BUILD_SHA:\s*process\.env\.COMMIT_REF/, "host builds must inject their commit reference");

// Do not let source alignment be misrepresented as synchronized user data.
assert.ok(
  canon.includes("private Mac files and SQLite state are not automatically synchronized to the hosted app"),
  "canon must retain the private Mac data boundary",
);
assert.ok(
  readiness.includes("## Data synchronization is not implemented yet"),
  "readiness must state the current data-sync limitation",
);
assert.ok(
  readiness.includes("## Cross-surface acceptance test"),
  "readiness must define the acceptance test for future real synchronization",
);

console.log(
  "Platform source synchronization passed: shared web/desktop source, Android Arcade asset provenance, commit identity, and honest data-sync boundaries.",
);
