#!/usr/bin/env bash
# Wraps the binary in a macOS .app so it gets a dock icon, a name in Cmd-Tab,
# and the logo instead of the generic terminal icon `cargo run` gives you.
#
#   scripts/bundle-macos.sh            # release build (default)
#   scripts/bundle-macos.sh --debug    # reuse the existing debug build
#
# The bundle is written to target/botttle.app.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
profile="release"
[ "${1:-}" = "--debug" ] && profile="debug"

app="$root/target/botttle.app"
version="$(sed -n 's/^version = "\(.*\)"/\1/p' "$root/Cargo.toml" | head -1)"

if [ "$profile" = "release" ]; then
  cargo build --release --manifest-path "$root/Cargo.toml"
else
  cargo build --manifest-path "$root/Cargo.toml"
fi

rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp "$root/target/$profile/botttle" "$app/Contents/MacOS/botttle"

# The icon: every size macOS asks for, from the one source image.
iconset="$(mktemp -d)/botttle.iconset"
mkdir -p "$iconset"
for size in 16 32 128 256 512; do
  sips -Z "$size" "$root/assets/logo.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  sips -Z "$((size * 2))" "$root/assets/logo.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$app/Contents/Resources/botttle.icns"
rm -rf "$(dirname "$iconset")"

cat > "$app/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key>
	<string>botttle</string>
	<key>CFBundleDisplayName</key>
	<string>botttle</string>
	<key>CFBundleExecutable</key>
	<string>botttle</string>
	<key>CFBundleIdentifier</key>
	<string>dev.botttle</string>
	<key>CFBundleIconFile</key>
	<string>botttle</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>$version</string>
	<key>CFBundleVersion</key>
	<string>$version</string>
	<key>LSMinimumSystemVersion</key>
	<string>11.0</string>
	<key>NSHighResolutionCapable</key>
	<true/>
</dict>
</plist>
PLIST

echo "built $app"
echo "run it with:  open $app"
