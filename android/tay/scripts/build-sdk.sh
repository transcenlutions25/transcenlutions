#!/usr/bin/env bash
# Dependency-free native build. No network, installer, license acceptance or signing.
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
: "${ANDROID_HOME:?An already installed Android SDK is required}"
: "${JAVA_HOME:?An already installed JDK 17 is required}"
OUT="${1:?Supply a fresh absolute output directory}"
[[ "$OUT" = /* && ! -e "$OUT" ]] || { echo 'Output must be an absent absolute path' >&2; exit 1; }
BT="$ANDROID_HOME/build-tools/36.0.0"
ANDROID_JAR="$ANDROID_HOME/platforms/android-36/android.jar"
test -r "$ANDROID_JAR"
test -r "$BT/core-lambda-stubs.jar"
for tool in aapt2 d8 zipalign; do test -x "$BT/$tool"; done
for tool in java javac jar; do test -x "$JAVA_HOME/bin/$tool"; done
for tool in python3 zip unzip sha256sum; do command -v "$tool" >/dev/null; done
"$JAVA_HOME/bin/javac" -version 2>&1 | grep -Eq '^javac 17([.]|$)'
# Verify installed package license records, without accepting or writing any license.
python3 - "$ANDROID_HOME" <<'PY'
import hashlib, pathlib, sys, xml.etree.ElementTree as ET
sdk = pathlib.Path(sys.argv[1])
def name(element): return element.tag.rsplit('}', 1)[-1]
for relative in ('platforms/android-36', 'build-tools/36.0.0'):
    metadata = sdk / relative / 'package.xml'
    if not metadata.is_file(): raise SystemExit('Missing installed SDK metadata: ' + relative)
    root = ET.parse(metadata).getroot()
    licenses = {e.attrib['id']: ''.join(e.itertext()) for e in root.iter() if name(e) == 'license' and 'id' in e.attrib}
    refs = [e.attrib.get('ref') for e in root.iter() if name(e) == 'uses-license']
    if not refs: raise SystemExit('Missing license reference: ' + relative)
    for ref in refs:
        if not ref or pathlib.Path(ref).name != ref or ref not in licenses: raise SystemExit('Invalid license metadata')
        accepted = sdk / 'licenses' / ref
        digest = hashlib.sha1(licenses[ref].encode('utf-8')).hexdigest()
        if not accepted.is_file() or digest not in accepted.read_text().splitlines():
            raise SystemExit('Preaccepted SDK license missing: ' + relative)
print('Required installed SDK license records verified; no licenses accepted')
PY
mkdir "$OUT"
mkdir "$OUT/generated" "$OUT/classes" "$OUT/dex" "$OUT/res"
cp -R "$HERE/res/." "$OUT/res/"
mkdir "$OUT/res/drawable-nodpi"
# Reuse the canonical artwork byte-for-byte, without duplicating its source file.
cp "$ROOT/public/assets/tay-command-v1.png" "$OUT/res/drawable-nodpi/tay_command.png"
"$BT/aapt2" version
"$BT/d8" --version
"$BT/aapt2" compile --dir "$OUT/res" -o "$OUT/resources.zip"
"$BT/aapt2" link "$OUT/resources.zip" -I "$ANDROID_JAR" \
  --manifest "$HERE/AndroidManifest.xml" --java "$OUT/generated" \
  --min-sdk-version 31 --target-sdk-version 36 -o "$OUT/unaligned.apk"
mapfile -d '' sources < <(find "$HERE/src" "$OUT/generated" -type f -name '*.java' -print0)
"$JAVA_HOME/bin/javac" -encoding UTF-8 -source 8 -target 8 -proc:none \
  -bootclasspath "$ANDROID_JAR:$BT/core-lambda-stubs.jar" -classpath "$OUT/classes" -d "$OUT/classes" "${sources[@]}"
"$JAVA_HOME/bin/jar" --create --file "$OUT/classes.jar" -C "$OUT/classes" .
"$BT/d8" --release --min-api 31 --lib "$ANDROID_JAR" --output "$OUT/dex" "$OUT/classes.jar"
test -s "$OUT/dex/classes.dex"
zip -q -j -0 "$OUT/unaligned.apk" "$OUT"/dex/classes*.dex
"$BT/zipalign" -P 16 -f 4 "$OUT/unaligned.apk" "$OUT/tay-unsigned.apk"
"$BT/zipalign" -c -P 16 4 "$OUT/tay-unsigned.apk"
unzip -tq "$OUT/tay-unsigned.apk"
"$BT/aapt2" dump badging "$OUT/tay-unsigned.apk" | tee "$OUT/badging.txt"
grep -Eq "^package: name='com.transcenlutions.tay' versionCode='1'" "$OUT/badging.txt"
grep -Fx "minSdkVersion:'31'" "$OUT/badging.txt"
grep -Fx "targetSdkVersion:'36'" "$OUT/badging.txt"
grep -Eq "^launchable-activity: name='com.transcenlutions.tay.MainActivity'" "$OUT/badging.txt"
python3 - "$OUT/tay-unsigned.apk" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as apk:
    names = set(apk.namelist())
    assert {'AndroidManifest.xml', 'resources.arsc', 'classes.dex'} <= names
    assert not any(name.startswith('META-INF/') and name.endswith(('.RSA','.DSA','.EC')) for name in names)
print('Unsigned APK contents verified. This is not an installable or connected delivery.')
PY
sha256sum "$OUT/tay-unsigned.apk"
