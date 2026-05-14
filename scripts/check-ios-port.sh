#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export REQUIRE_TRACKED_IOS_FILES="${REQUIRE_TRACKED_IOS_FILES:-1}"

node scripts/check-tracked-release-files.mjs
node scripts/check-ios-project.mjs

if [[ "${IOS_ALLOW_RELEASE_UNSAFE_SKIP_XCODE_ARTIFACTS:-0}" == "1" ]]; then
  echo "iOS Xcode artifact gate skipped by IOS_ALLOW_RELEASE_UNSAFE_SKIP_XCODE_ARTIFACTS=1"
  exit 0
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required for the iOS artifact gate. Set IOS_ALLOW_RELEASE_UNSAFE_SKIP_XCODE_ARTIFACTS=1 only for non-release structural checks." >&2
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is required for simulator install/launch verification." >&2
  exit 1
fi

derived_data="${IOS_DERIVED_DATA:-$(mktemp -d /tmp/jii-kobushi-ios-derived.XXXXXX)}"
project="ios/JiiKobushi.xcodeproj"
scheme="JiiKobushi"

xcodebuild \
  -project "$project" \
  -scheme "$scheme" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$derived_data" \
  clean build

app_path="$(find "$derived_data/Build/Products" -type d -name 'JiiKobushi.app' | head -n 1)"
if [[ -z "$app_path" ]]; then
  echo "JiiKobushi.app was not produced under $derived_data" >&2
  exit 1
fi

test -f "$app_path/index.html"
test -f "$app_path/src/main.js"
test -d "$app_path/assets"

if [[ -d "switch-port/traces" ]]; then
  test -d "$app_path/GameResources/expected-traces"
fi

codesign --verify --deep --strict "$app_path"

booted_device="$(xcrun simctl list devices booted | awk -F '[()]' '/Booted/ { print $2; exit }')"
if [[ -z "$booted_device" ]]; then
  if [[ "${IOS_ALLOW_RELEASE_UNSAFE_SKIP_SIM_LAUNCH:-0}" == "1" ]]; then
    echo "iOS simulator install/launch skipped because no booted simulator was found."
    exit 0
  fi
  echo "No booted iOS simulator found for install/launch verification." >&2
  exit 1
fi

bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_path/Info.plist")"
xcrun simctl install "$booted_device" "$app_path"
xcrun simctl launch "$booted_device" "$bundle_id"

echo "iOS port artifact gate: pass"
