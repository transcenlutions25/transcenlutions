import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const packageJson = JSON.parse(read("package.json"));
const launchGate = read(".github/workflows/launch-gate.yml");
const launcher = read("integrations/tay-desktop/legacy/launch_shared.py");
const nextConfig = read("next.config.mjs");
const arcadeBuild = read("android/arcade/app/build.gradle");
const arcadeWorkflow = read(".github/workflows/arcade-android.yml");
const tayAndroidBuild = read("android/tay/app/build.gradle");
const tayAndroidClient = read("android/tay/app/src/main/java/com/transcenlutions/tay/TayApiClient.java");
const tayAndroidActivity = read("android/tay/app/src/main/java/com/transcenlutions/tay/MainActivity.java");
const tayAndroidWorkflow = read(".github/workflows/tay-android.yml");
const tayAndroidReadme = read("android/tay/README.md");
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

// Android Arcade packages the canonical browser assets instead of maintaining
// a second game frontend.
assert.match(
  arcadeBuild,
  /rootProject\.file\('\.\.\/\.\.\/public\/arcade'\)/,
  "Android Arcade must source its frontend from public/arcade",
);
assert.match(arcadeBuild, /tasks\.register\('syncArcadeAssets', Sync\)/, "Android Arcade must define the asset synchronization task");
assert.match(arcadeBuild, /dependsOn tasks\.named\('syncArcadeAssets'\)/, "Android Arcade preBuild must depend on synchronized assets");
for (const required of ["index.html", "arcade.css", "engine.mjs", "app.mjs", "manifest.webmanifest", "sw.js", "icon.svg", "privacy.html"]) {
  assert.ok(arcadeBuild.includes(`'${required}'`), `Android Arcade asset contract must require ${required}`);
}
assert.ok(
  arcadeWorkflow.includes("name: transcenlutions-arcade-android-${{ github.sha }}"),
  "Android Arcade artifacts must identify the exact source commit",
);

// Native Tay Android uses the canonical authenticated Tay API rather than a
// second account/project implementation or an embedded WebView.
assert.match(tayAndroidBuild, /applicationId 'com\.transcenlutions\.tay'/, "Tay Android must retain the canonical package id");
assert.ok(!tayAndroidActivity.includes("WebView"), "Tay Android must remain a native client rather than embedding the web workspace");
for (const endpoint of ["/api/tay/session", "/api/tay/projects", "/messages"]) {
  assert.ok(tayAndroidClient.includes(endpoint), `Tay Android must use canonical API endpoint ${endpoint}`);
}
assert.ok(tayAndroidClient.includes('"Cookie", cookie'), "Tay Android must send the server-issued session cookie");
assert.ok(tayAndroidActivity.includes("SecureSessionStore"), "Tay Android must retain encrypted session storage");
assert.ok(
  tayAndroidWorkflow.includes("name: tay-android-${{ github.sha }}"),
  "Tay Android artifacts must identify the exact source commit",
);
assert.ok(
  tayAndroidWorkflow.includes("android/tay/build/release-artifacts/"),
  "Tay Android workflow must publish the verified artifact directory",
);
assert.ok(tayAndroidReadme.includes("not a Google Play production release"), "Tay Android release status must remain accurate");

// Hosted surfaces report their exact build commit for release comparison.
assert.match(buildInfo, /commit:\s*process\.env\.NEXT_PUBLIC_TAY_BUILD_SHA/, "build-info must expose the deployed commit");
assert.match(nextConfig, /NEXT_PUBLIC_TAY_BUILD_SHA:\s*process\.env\.COMMIT_REF/, "host builds must inject their commit reference");

// Source alignment is not evidence of synchronized user data.
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
assert.ok(
  readiness.includes("native Tay Android alpha"),
  "readiness must describe the native Tay Android alpha accurately",
);

console.log(
  "Platform source synchronization passed: shared web/desktop source, native Tay API alignment, Android Arcade asset provenance, commit identity, and honest data-sync boundaries.",
);
