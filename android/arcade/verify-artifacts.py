#!/usr/bin/env python3
"""Validate real Android outputs before making a test download available."""

from pathlib import Path
import hashlib
import os
import re
import shutil
import subprocess
import zipfile

project = Path(__file__).resolve().parent
web = project.parent.parent / "public" / "arcade"
apk = project / "app/build/outputs/apk/debug/app-debug.apk"
aab = project / "app/build/outputs/bundle/release/app-release.aab"
required = ("index.html", "arcade.css", "engine.mjs", "app.mjs", "manifest.webmanifest", "sw.js", "icon.svg", "privacy.html")

for artifact, prefix in ((apk, "assets/www/"), (aab, "base/assets/www/")):
    with zipfile.ZipFile(artifact) as archive:
        assert archive.testzip() is None, f"Corrupt archive: {artifact.name}"
        for name in required:
            packaged = archive.read(prefix + name)
            assert packaged == (web / name).read_bytes(), f"Stale or missing packaged asset: {name}"
        if artifact == aab:
            assert "BundleConfig.pb" in archive.namelist(), "Missing Android App Bundle configuration"
            assert "base/manifest/AndroidManifest.xml" in archive.namelist(), "Missing AAB manifest"
            assert not any(re.fullmatch(r"META-INF/[^/]+\.(RSA|DSA|EC|SF)", name, re.I)
                           for name in archive.namelist()), "Release AAB must remain unsigned"

sdk = Path(os.environ["ANDROID_HOME"]) / "build-tools" / "35.0.0"
permissions = subprocess.check_output([str(sdk / "aapt"), "dump", "permissions", str(apk)], text=True)
assert "uses-permission" not in permissions, "Offline Android app must not request permissions"
subprocess.run([str(sdk / "apksigner"), "verify", "--verbose", str(apk)], check=True)

destination = project / "build/release-artifacts"
destination.mkdir(parents=True, exist_ok=True)
outputs = []
for source, name in ((apk, "Transcenlutions-Arcade-debug.apk"), (aab, "Transcenlutions-Arcade-unsigned.aab")):
    output = destination / name
    shutil.copy2(source, output)
    outputs.append(f"{hashlib.sha256(output.read_bytes()).hexdigest()}  {name}\n")
(destination / "SHA256SUMS").write_text("".join(outputs), encoding="utf-8")
print("Verified packaged assets, zero permissions, debug signature, and unsigned release bundle.")
print(destination)
