#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK directory}"
: "${INDUSTRIUM_KEYSTORE:?Set INDUSTRIUM_KEYSTORE to your release keystore}"
: "${INDUSTRIUM_KEYSTORE_PASSWORD:?Set the keystore password in the environment}"
tools="$ANDROID_HOME/build-tools/35.0.0"
platform="$ANDROID_HOME/platforms/android-35/android.jar"
output="${1:-$PWD/INDUSTRIUM.apk}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/assets" "$work/classes" "$work/dex"
cp -R engine js "$work/assets/"
curl -fsSL 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js' -o "$work/assets/engine/phaser.min.js"
sed -i 's|https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js|./phaser.min.js|' "$work/assets/engine/index.html"
"$tools/aapt2" compile --dir android/res -o "$work/res.zip"
"$tools/aapt2" link -I "$platform" --manifest android/AndroidManifest.xml -A "$work/assets" -o "$work/base.apk" "$work/res.zip"
javac --release 8 -classpath "$platform" -d "$work/classes" android/GameActivity.java
jar cf "$work/classes.jar" -C "$work/classes" .
"$tools/d8" --min-api 24 --lib "$platform" --output "$work/dex" "$work/classes.jar"
(cd "$work/dex" && zip -q "$work/base.apk" classes.dex)
"$tools/zipalign" -f 4 "$work/base.apk" "$work/aligned.apk"
"$tools/apksigner" sign --ks "$INDUSTRIUM_KEYSTORE" --ks-key-alias industrium \
  --ks-pass env:INDUSTRIUM_KEYSTORE_PASSWORD --out "$output" "$work/aligned.apk"
"$tools/apksigner" verify --verbose "$output"
