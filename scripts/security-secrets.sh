#!/usr/bin/env bash
set -euo pipefail
# Pinned release and SHA-256 verified against the publisher's release asset digest.
scan_dir=$(mktemp -d)
trap 'rm -rf "$scan_dir"' EXIT
# Pinned release assets and digests. Keep the owner's macOS gate runnable
# without weakening the same verification used in CI.
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)
    asset='gitleaks_8.30.1_darwin_arm64.tar.gz'
    digest='b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5'
    ;;
  Darwin-x86_64)
    asset='gitleaks_8.30.1_darwin_x64.tar.gz'
    digest='dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709'
    ;;
  Linux-x86_64)
    asset='gitleaks_8.30.1_linux_x64.tar.gz'
    digest='551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'
    ;;
  *)
    echo "No pinned gitleaks release for $(uname -s)-$(uname -m); refusing an unverified download." >&2
    exit 2
    ;;
esac
curl --fail --silent --show-error --location --max-time 60 \
  "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/$asset" \
  --output "$scan_dir/gitleaks.tar.gz"
if [ "$(uname -s)" = 'Darwin' ]; then
  printf '%s  %s\n' "$digest" "$scan_dir/gitleaks.tar.gz" | shasum -a 256 --check --status
else
  printf '%s  %s\n' "$digest" "$scan_dir/gitleaks.tar.gz" | sha256sum --check --status
fi
tar -xzf "$scan_dir/gitleaks.tar.gz" -C "$scan_dir" gitleaks
"$scan_dir/gitleaks" git --config .gitleaks.toml --redact --no-banner --verbose --log-opts="--all"
# Scan checked-in working files too so local pre-commit edits are covered.
mkdir "$scan_dir/source"
git ls-files -z | while IFS= read -r -d '' file; do
  if [[ -f "$file" && ! -L "$file" ]]; then
    mkdir -p "$scan_dir/source/$(dirname "$file")"
    cp "./$file" "$scan_dir/source/$file"
  fi
done
"$scan_dir/gitleaks" dir "$scan_dir/source" --config .gitleaks.toml --redact --no-banner --verbose
