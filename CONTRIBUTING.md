# Contributing

## Design boundary

The Rust core is deterministic, side-effect free, and independent of Tauri.
New models belong in `crates/computability-core`; the TypeScript application
only gathers a definition and renders a trace returned by the core.

Model validation is part of the model, not the interface. Do not add UI-only
guards that make malformed definitions impossible to represent: the core must
return a precise domain error for them.

## Local checks

```powershell
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
npm.cmd ci
npm.cmd run lint
npm.cmd run build
```

Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Keep
each change focused and add acceptance/rejection tests for any simulation rule.
