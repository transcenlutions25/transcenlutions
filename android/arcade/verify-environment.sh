#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ANDROID_HOME:-}" ]]; then
  echo 'ANDROID_HOME must point to an already installed and licensed Android SDK.' >&2
  exit 1
fi
for required in platforms/android-36/android.jar build-tools/35.0.0/aapt2 licenses/android-sdk-license; do
  if [[ ! -s "$ANDROID_HOME/$required" ]]; then
    echo "Required preinstalled Android component missing: $required" >&2
    echo 'No SDK downloads or license acceptance will be performed by this build.' >&2
    exit 1
  fi
done
if ! command -v javac >/dev/null 2>&1; then
  echo 'A JDK with javac is required; a Java runtime alone cannot build the app.' >&2
  exit 1
fi
java -version
javac -version
echo 'Preinstalled Android platform 36, build tools 35.0.0 and SDK license marker found.'
