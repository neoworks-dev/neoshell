#!/usr/bin/env fish
# Build and run the render host against the SDK that ul-next-sys downloaded, so
# the runtime libraries match the ones the binary linked against (ABI-safe).
# Usage: ./run.fish [--release] [-- <neobar-render args>]
#   ./run.fish --test-url https://example.com
#   ./run.fish --release --test-url http://localhost:5173

set script_dir (dirname (status --current-filename))
cd $script_dir

set profile debug
set cargo_flags
if contains -- --release $argv
    set profile release
    set cargo_flags --release
    set argv (string match -v -- --release $argv)
end

cargo build $cargo_flags; or exit $status

# Newest downloaded SDK (there can be stale build dirs).
set sdk (ls -dt target/$profile/build/ul-next-sys-*/out/ul-sdk 2>/dev/null)[1]
if test -z "$sdk"
    echo "error: no downloaded Ultralight SDK under target/$profile/build/" >&2
    echo "       run a clean build so ul-next-sys fetches it." >&2
    exit 1
end

set -x LD_LIBRARY_PATH $sdk/bin $LD_LIBRARY_PATH
# main.rs reads ULTRALIGHT_SDK_ROOT/resources for icudt/cacert.
set -x ULTRALIGHT_SDK_ROOT $sdk
set -x RUST_LOG (set -q RUST_LOG; and echo $RUST_LOG; or echo info)

echo "render host: profile=$profile sdk=$sdk" >&2
exec ./target/$profile/neobar-render $argv
