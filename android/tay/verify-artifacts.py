#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent
APK = ROOT / "app/build/outputs/apk/debug/app-debug.apk"
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


require_file(APK)
require_file(AAB)
require_zip_entries(APK, ("AndroidManifest.xml", "classes.dex", "resources.arsc"))
require_zip_entries(AAB, ("base/manifest/AndroidManifest.xml", "base/dex/classes.dex"))

OUTPUT.mkdir(parents=True, exist_ok=True)
for child in OUTPUT.iterdir():
    if child.is_file():
        child.unlink()

apk_out = OUTPUT / "Tay-Android-debug.apk"
aab_out = OUTPUT / "Tay-Android-unsigned.aab"
shutil.copy2(APK, apk_out)
shutil.copy2(AAB, aab_out)

checksums = OUTPUT / "SHA256SUMS"
checksums.write_text(
    f"{sha256(apk_out)}  {apk_out.name}\n{sha256(aab_out)}  {aab_out.name}\n",
    encoding="utf-8",
)
metadata = OUTPUT / "BUILD-METADATA.txt"
metadata.write_text(
    "\n".join(
        [
            f"commit={os.environ.get('GITHUB_SHA', 'local')}",
            "applicationId=com.transcenlutions.tay",
            "debugApplicationId=com.transcenlutions.tay.debug",
            "versionName=0.1.0-alpha",
            "versionCode=1",
            "releaseSigning=unsigned",
            "",
        ]
    ),
    encoding="utf-8",
)
print(f"Verified {apk_out} and {aab_out}")
