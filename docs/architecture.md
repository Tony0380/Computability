# Model architecture

## Core principle

A model definition is a mathematical object, not an incidental JSON shape.
Each aggregate has a validation boundary and simulation is a method on that
aggregate. `Machine` provides the shared executable contract:

```rust
pub trait Machine {
    type Input;
    type Output;
    fn validate(&self) -> Result<(), SimulationError>;
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError>;
}
```

The trait is intentionally small. It does not force a Turing-machine tape and
a Petri-net marking into the same shared configuration type.

## Invariants

- A finite automaton declares its start state, states and alphabet. DFA
  simulation rejects duplicate `(state, symbol)` transitions.
- An NFA computes epsilon closure before every next-symbol set.
- A PDA explores immutable configurations with a configurable bound, avoiding
  non-termination on epsilon cycles.
- A Turing machine rejects ambiguous transition functions and caps execution.
- A context-free grammar uses bounded leftmost derivation; the bound is part of
  the definition to keep recognition finite for arbitrary grammars.
- A regular expression is parsed with Thompson construction into an epsilon-NFA;
  the regular-expression model never delegates its semantics to the UI.
- Mealy and Moore machines are deterministic transducers, so they return output
  traces instead of an accept/reject result.
- A multi-tape machine validates tape arity and transition vectors before it
  executes a transition function over independent sparse tapes.
- A Petri transition fires only when every input place contains its required
  token weight; weights are positive.

## Boundary with TypeScript

The frontend sends an explicit model discriminator and a definition to the
`simulate` command. It does not reproduce formal-language algorithms. This
keeps Rust as the single source of truth and allows a future browser or CLI
client to reuse the same core.

## Desktop delivery boundary

The desktop shell owns release discovery and installation through Tauri's
updater and process plugins. The interface can request a check and display
download progress, but it cannot bypass signature verification. GitHub Releases
hosts the platform installer, its detached signature and `latest.json`; the
private signing key exists only as encrypted Actions secrets.

The visual catalogue and workspace share one localization provider. Formal
theory is stored separately from machine definitions so educational copy cannot
alter simulation semantics. Italian and English theory records preserve the
same tuples and formula fields.
