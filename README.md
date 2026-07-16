# Computability

Computability is a desktop workbench for constructing, inspecting and running
formal models of computation. It is written as a Rust simulation core behind a
TypeScript interface, with an explicit separation between the mathematical
model and its presentation.

> Status: active rewrite. The original Java/Gradle terminal application has
> been removed; this repository now builds around a Rust/Tauri architecture.

## Why this project exists

Formal-language tooling is most useful when its result can be checked. Each
simulator therefore validates its own definition and returns a trace or a
precise domain error. The user interface never silently adds a state,
transition, symbol, or token.

## Model coverage

The target catalogue covers the principal models used in computability and
formal-language courses, extended with place/transition Petri nets. "Implemented" means the Rust core has a defined,
serializable model and an execution algorithm reachable from the interface.

| Family | Model | Core | UI |
| --- | --- | --- | --- |
| Finite automata | DFA | Implemented | Implemented |
| Finite automata | NFA with epsilon transitions | Implemented | Implemented |
| Finite-state transducers | Mealy and Moore machines | Implemented | Implemented |
| Pushdown automata | Nondeterministic PDA | Implemented | Implemented |
| Turing machines | Nondeterministic single-tape TM | Implemented | Implemented |
| Turing machines | Deterministic multi-tape TM | Implemented | Implemented |
| Grammars | Regular grammar | Implemented | Implemented |
| Grammars | Context-free grammar, bounded leftmost recognition | Implemented | Implemented |
| Grammars | Unrestricted grammar, bounded rewriting | Implemented | Implemented |
| Regular languages | Regular expression to epsilon-NFA matching | Implemented | Implemented |
| Formal systems | Deterministic, contextual and stochastic L-systems | Implemented | Implemented |
| Petri nets | Place/transition nets | Implemented | Implemented |

Additional conversion wizards, SLR parser-table construction and pumping-lemma
exercises are a separate teaching-tools track. They are not represented as
finished functionality here.

Available transformations are NFA→DFA, DFA minimisation, regular expression→NFA,
regular grammar→NFA and CFG→PDA. CFGs in Chomsky normal form can also be run
through the CYK parser, while predictive CFGs expose an LL(1) table and parser
trace in the interface.

## Architecture

```text
TypeScript / React interface
        │  typed Tauri commands
        ▼
Tauri desktop shell
        │
        ▼
computability-core (Rust)
  ├─ finite automata
  ├─ pushdown automata
  ├─ Turing machines
  ├─ grammars and L-systems
  └─ Petri nets
```

The core has no UI or file-system dependency. Models are objects with explicit
state and invariants; executable models implement the `Machine` trait. This
makes the same algorithms testable independently of desktop rendering.

## Install on Windows

Users do not need Rust, Node.js, Visual Studio, or any development dependency.
Download the `.exe` installer from the matching GitHub Release, run it, and
launch **Computability** from the Start menu. The installer is per-user and
does not require administrator privileges. It automatically installs the
Microsoft WebView2 runtime when it is not already present, so the first
installation needs an internet connection.

Each verified push to `master` receives an immutable version tag and a release
workflow builds both an NSIS `.exe` installer and an MSI package. Releases are
not code-signed until the project owner supplies a Windows code-signing
certificate; Windows may consequently show a publisher warning for unsigned
development releases.

To enable Authenticode signing in the release workflow, configure these GitHub
Actions secrets: `WINDOWS_CERTIFICATE_PFX_BASE64` (the Base64-encoded PFX),
`WINDOWS_CERTIFICATE_PASSWORD`, and `WINDOWS_TIMESTAMP_URL`. When present, the
workflow signs and verifies both installers before publishing them.

## Develop locally

Prerequisites: stable Rust, Node.js 24+ and the [Tauri system
prerequisites](https://v2.tauri.app/start/prerequisites/).

```powershell
npm.cmd ci
npm.cmd run dev
```

For a distributable application:

```powershell
npm.cmd run build:app
```

Before changing a release version, keep the values in `Cargo.toml`,
`package.json`, and `src-tauri/tauri.conf.json` identical, then run:

```powershell
npm.cmd run release:check
```

## Quality gates

The `Quality` workflow runs formatting, Clippy, Rust unit tests, TypeScript
linting and production build on every pull request and every push to `master`.
After a successful push to `master`, it creates an immutable annotated tag in the
form `v<version>-master.<GitHub run number>`. This meets the requirement of a
tag for every accepted master build without rewriting release history.

Dependabot reviews Cargo, npm and GitHub Actions dependencies weekly. See
[CONTRIBUTING.md](CONTRIBUTING.md) for local checks and model-boundary rules.
The detailed feature ledger is in [docs/feature-matrix.md](docs/feature-matrix.md).

## Licence

Distributed under the [MIT License](LICENSE). It is permissive enough for
educational reuse while retaining the copyright and disclaimer notice.
