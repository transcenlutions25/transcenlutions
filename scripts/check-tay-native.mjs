import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = join(root, 'android/tay');
const source = join(base, 'src/com/transcenlutions/tay');
const out = mkdtempSync(join(tmpdir(), 'tay-native-core-'));
const run = (args) => execFileSync('java', args, { stdio: 'inherit', cwd: root, timeout: 30000 });
try {
  // Host JVM tests use Java-8 language/bytecode; only the SDK build uses android.jar.
  run(['-m', 'jdk.compiler/com.sun.tools.javac.Main', '-source', '8', '-target', '8', '-d', out,
    ...['LocalDraft.java', 'VoiceTurn.java', 'TrustedEndpoint.java'].map(name => join(source, name)), join(base, 'tests/NativeCoreTest.java')]);
  run(['-cp', out, 'com.transcenlutions.tay.NativeCoreTest']);
  run(['-m', 'jdk.compiler/com.sun.tools.javac.Main', '-d', out, join(base, 'tests/ParseJavaSources.java')]);
  run(['-cp', out, 'ParseJavaSources', ...readdirSync(source).filter(name => name.endsWith('.java')).map(name => join(source, name))]);
  const manifest = readFileSync(join(base, 'AndroidManifest.xml'), 'utf8');
  const permissions = [...manifest.matchAll(/<uses-permission android:name="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(permissions.sort(), ['ACCESS_NETWORK_STATE', 'INTERNET', 'RECORD_AUDIO'].map(name => `android.permission.${name}`).sort());
  assert.match(manifest, /android:allowBackup="false"/); assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android:minSdkVersion="31"/); assert.match(manifest, /android:targetSdkVersion="36"/);
  assert.doesNotMatch(manifest, /<service|<receiver|<provider/);
  const voice = readFileSync(join(source, 'NativeVoiceController.java'), 'utf8');
  assert.match(voice, /createOnDeviceSpeechRecognizer/); assert.doesNotMatch(voice, /createSpeechRecognizer\(|triggerModelDownload/);
  const transport = readFileSync(join(source, 'AuthenticatedIdentityTransport.java'), 'utf8');
  assert.match(transport, /setInstanceFollowRedirects\(false\)/); assert.doesNotMatch(transport, /HostnameVerifier|SSLSocketFactory|x-tay-dev|POST/);
  const activity = readFileSync(join(source, 'MainActivity.java'), 'utf8');
  assert.match(activity, /onPause\(\)\s*\{\s*visible = false/); assert.match(activity, /setSaveEnabled\(false\)/);
  assert.match(activity, /onRetainNonConfigurationInstance\(\)/); assert.match(activity, /getLastNonConfigurationInstance\(\)/);
  assert.match(activity, /setMinHeight\(dp\(56\)\)/);
  const recipe = readFileSync(join(root, '.github/workflows/tay-native-source.yml'), 'utf8');
  assert.match(recipe, /pull_request:/); assert.match(recipe, /contents: read/); assert.match(recipe, /runs-on: ubuntu-24.04/);
  assert.match(recipe, /types: \[opened, synchronize, reopened\]/); assert.match(recipe, /persist-credentials: false/);
  assert.doesNotMatch(recipe, /upload-artifact|actions\/cache|setup-gradle|pull_request_target:|push:|secrets\./);
  execFileSync('bash', ['-n', join(base, 'scripts/build-sdk.sh')]);
  const build = readFileSync(join(base, 'scripts/build-sdk.sh'), 'utf8');
  assert.match(build, /grep -Fx "minSdkVersion:'31'"/); // Observed Build Tools36 AAPT2 label.
  assert.throws(() => execFileSync('bash', [join(base, 'scripts/build-sdk.sh'), join(out, 'missing-sdk')],
    { env: { ...process.env, ANDROID_HOME: '' }, stdio: 'pipe' }), error => error.status === 1 && /already installed Android SDK/.test(String(error.stderr)));
  assert.equal(existsSync(join(out, 'missing-sdk')), false, 'No build output before required SDK check');
  execFileSync('python3', ['-c', 'import pathlib,sys,xml.etree.ElementTree as E; [E.parse(p) for p in pathlib.Path(sys.argv[1]).rglob("*.xml")]; print("Native XML is well formed")', base], { stdio: 'inherit' });
  console.log('Native source safeguards passed. SDK compilation, device voice/storage/UI and real auth remain unverified.');
} finally { rmSync(out, { recursive: true, force: true }); }
