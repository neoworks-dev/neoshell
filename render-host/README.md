# neobar-render

Ultralight OSR render host. Owns wlr-layer-shell surfaces, paints HTML views into
them via dmabuf, forwards Wayland input to Ultralight. Driven by the Go core over
`$XDG_RUNTIME_DIR/neobar-render.sock`. See `../MIGRATION.md` for the design.

## Status

Skeleton (stage 1). Control protocol parses; rendering pipeline is stubbed. The
modules carry stage-tagged TODOs (`wayland.rs`, `ultralight.rs`, `surface.rs`,
`input.rs`).

## Ultralight SDK setup

Ultralight is a proprietary binary SDK — not on crates.io as the actual libraries.
The `ul-next` crate is bindings only; the `.so` files come from the SDK.

1. Download the SDK for Linux x64 from <https://ultralig.ht> (or the
   `ultralight-ux/Ultralight` GitHub releases). Accept the free license.
2. Place the runtime libraries where the linker and loader find them, e.g.:

   ```
   render-host/lib/
     libUltralight.so
     libUltralightCore.so
     libWebCore.so
     libAppCore.so          # only if using the App API
     resources/             # cacert.pem, icudt67l.dat, etc.
   ```

3. Point the build/run at them (dynamic linking is required by the license —
   never static-link):

   ```fish
   set -x ULTRALIGHT_SDK_ROOT (pwd)/lib
   set -x LD_LIBRARY_PATH $ULTRALIGHT_SDK_ROOT $LD_LIBRARY_PATH
   ```

   `ul-next`'s build script reads `ULTRALIGHT_SDK_ROOT`; confirm against its docs
   for the exact env var name and version it targets.

## Build & run

```fish
cargo build --release
RUST_LOG=info ./target/release/neobar-render
```

The host expects the Go core to connect and drive it. To exercise the protocol
standalone, pipe newline-delimited JSON into the socket (see `../MIGRATION.md`).

## License / attribution

Ultralight is proprietary. The required attribution notice ships in
`THIRD_PARTY.md` — keep it in any distributed build. The Rust glue here is part of
neobar and carries neobar's own license.
