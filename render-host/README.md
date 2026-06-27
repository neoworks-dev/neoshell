# neobar-render

Ultralight OSR render host. Owns wlr-layer-shell surfaces, paints HTML views into
them via dmabuf, forwards Wayland input to Ultralight. Driven by the Go core over
`$XDG_RUNTIME_DIR/neobar-render.sock`. See `../MIGRATION.md` for the design.

## Status

Skeleton (stage 1). Control protocol parses; rendering pipeline is stubbed. The
modules carry stage-tagged TODOs (`wayland.rs`, `ultralight.rs`, `surface.rs`,
`input.rs`).

## Ultralight SDK

Ultralight is a proprietary binary SDK. The `.so` files are not on crates.io.

**Build (needs network):** `ul-next-sys`'s build script auto-downloads the SDK
revision it pins (currently `158d65c`) from Ultralight's CDN into the crate's
`OUT_DIR` and links against it. There is no `ULTRALIGHT_SDK_ROOT` override — the
revision is fixed by the crate so the bindings match the ABI.

**Runtime:** the loader needs the `.so` files and Ultralight needs its
`resources/` (icudt67l.dat, cacert.pem). Use the *same* SDK the build linked
against (ABI match), not an arbitrary download. `run.fish` resolves the
build's downloaded SDK and sets `LD_LIBRARY_PATH` + the resources path for you.

A manually downloaded free SDK is extracted to `render-host/lib/` (git-ignored)
as an offline fallback for `resources/`, but prefer the build-matched libraries.

## Build & run

```fish
cargo build
./run.fish --test-url https://example.com     # standalone, no Go core
```

`run.fish` builds, locates the SDK, exports the runtime env, and launches the
host. The `--test-url` form creates a fullscreen overlay so rendering and fps can
be eyeballed without the Go core. To drive it for real, the Go core connects to
the control socket (see `../MIGRATION.md`).

## License / attribution

Ultralight is proprietary. The required attribution notice ships in
`THIRD_PARTY.md` — keep it in any distributed build. The Rust glue here is part of
neobar and carries neobar's own license.
