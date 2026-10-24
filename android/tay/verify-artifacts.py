#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent
DEBUG_APK = ROOT / "app/build/outputs/apk/debug/app-debug.apk"
RELEASE_APK = ROOT / "app/build/outputs/apk/release/app-release-unsigned.apk"
AAB = ROOT / "app/build/outputs/bundle/release/app-release.aab"
OUTPUT = ROOT / "build/release-artifacts"


def require_file(path: Path) -> None:
    if not path.is_file() or path.stat().st_size < 1024:
        raise SystemExit(f"Missing or unexpectedly small Android artifact: {path}")


def require_zip_entries(path: Path, entries: tuple[str, ...]) -> None:
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
    missing = [entry for entry in entries if entry not in names]
    if missing:
        raise SystemExit(f"{path.name} is missing required entries: {', '.join(missing)}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


for path in (DEBUG_APK, RELEASE_APK, AAB):
    require_file(path)
require_zip_entries(DEBUG_APK, ("AndroidManifest.xml", "classes.dex", "resources.arsc"))
require_zip_entries(RELEASE_APK, ("AndroidManifest.xml", "classes.dex", "resources.arsc"))
require_zip_entries(AAB, ("base/manifest/AndroidManifest.xml", "base/dex/classes.dex"))

OUTPUT.mkdir(parents=True, exist_ok=True)
for child in OUTPUT.iterdir():
    if child.is_file():
        child.unlink()

debug_out = OUTPUT / "Tay-Cloud-Android-debug.apk"
release_out = OUTPUT / "Tay-Cloud-Android-unsigned.apk"
aab_out = OUTPUT / "Tay-Cloud-Android-unsigned.aab"
shutil.copy2(DEBUG_APK, debug_out)
shutil.copy2(RELEASE_APK, release_out)
shutil.copy2(AAB, aab_out)

checksums = OUTPUT / "SHA256SUMS"
checksums.write_text(
    "".join(f"{sha256(path)}  {path.name}\n" for path in (debug_out, release_out, aab_out)),
    encoding="utf-8",
)
metadata = OUTPUT / "BUILD-METADATA.txt"
metadata.write_text(
    "\n".join(
        [
            f"commit={os.environ.get('GITHUB_SHA', 'local')}",
            "applicationId=com.transcenlutions.tay",
            "debugApplicationId=com.transcenlutions.tay.debug",
            "versionName=0.3.0-alpha",
            "versionCode=3",
            "backend=https://efmbtmlfqeiaczcqovkb.supabase.co/functions/v1/tay-api",
            "web=https://efmbtmlfqeiaczcqovkb.supabase.co/functions/v1/tay-web",
            "cleartextTraffic=false",
            "releaseSigning=unsigned-owner-handoff",
            "",
        ]
    ),
    encoding="utf-8",
)
print(f"Verified {debug_out}, {release_out}, and {aab_out}")
