#!/usr/bin/env bash
set -euo pipefail
# Pinned release and SHA-256 verified against the publisher's release asset digest.
scan_dir=$(mktemp -d)
trap 'rm -rf "$scan_dir"' EXIT
curl --fail --silent --show-error --location --max-time 60 \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz \
  --output "$scan_dir/gitleaks.tar.gz"
printf '%s  %s\n' '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb' "$scan_dir/gitleaks.tar.gz" | sha256sum --check --status
tar --no-same-owner -xzf "$scan_dir/gitleaks.tar.gz" -C "$scan_dir" gitleaks
umask 077
scan_status=0
"$scan_dir/gitleaks" git --config .gitleaks.toml --redact --no-banner --log-opts="--all" --report-format json --report-path "$scan_dir/history-redacted.json" || scan_status=$?
if [[ -s "$scan_dir/history-redacted.json" ]]; then
  node scripts/security-report-metadata.mjs "$scan_dir/history-redacted.json"
fi
# Preserve original failure: no bypass, no allowlist edits.
if [[ "$scan_status" -ne 0 ]]; then exit "$scan_status"; fi
# Scan checked-in working files too so local pre-commit edits are covered.
mkdir "$scan_dir/source"
git ls-files -z | while IFS= read -r -d '' file; do
  if [[ -f "$file" && ! -L "$file" ]]; then
    mkdir -p "$scan_dir/source/$(dirname "$file")"
    cp -- "$file" "$scan_dir/source/$file"
  fi
done
"$scan_dir/gitleaks" dir "$scan_dir/source" --config .gitleaks.toml --redact --no-banner
