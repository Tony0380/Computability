# Feature matrix

This is a conformance ledger, not a feature wishlist. A row is marked
"available" only when a Rust implementation is reachable through a Tauri
command and has a corresponding UI entry or operation.

| Area                | Capability                               | Status            | Notes                                                  |
| ------------------- | ---------------------------------------- | ----------------- | ------------------------------------------------------ |
| Finite automata     | DFA and epsilon-NFA simulation           | Available         | Deterministic validation and epsilon closure.          |
| Finite automata     | NFA to DFA                               | Available         | Subset construction.                                   |
| Finite automata     | DFA minimisation                         | Available         | Partition refinement on reachable states.              |
| Finite automata     | Epsilon-transition elimination           | Available         | Preserves the accepted language and final closures.    |
| Finite automata     | Unreachable-state removal                | Available         | Reachability traversal from the initial state.         |
| Finite automata     | DFA equivalence                          | Available         | Product search with a shortest counterexample.         |
| Finite automata     | FA to regular expression                 | Available         | GNFA state elimination for single-token symbols.       |
| Finite transducers  | Mealy and Moore simulation               | Available         | Produces an output trace.                              |
| Pushdown automata   | Nondeterministic simulation              | Available         | Bounded configuration search.                          |
| Turing machines     | Single-tape nondeterministic simulation  | Available         | Breadth-first bounded search.                          |
| Turing machines     | Multi-tape deterministic simulation      | Available         | Independent sparse tapes.                              |
| Grammars            | Regular grammar recognition              | Available         | Converted to epsilon-NFA.                              |
| Grammars            | CFG brute-force recognition              | Available         | Bounded leftmost derivation.                           |
| Grammars            | CYK parser                               | Available         | CNF validation and triangular table.                   |
| Grammars            | LL(1) table and parser                   | Available         | FIRST/FOLLOW, conflicts and stack trace.               |
| Grammars            | CFG to PDA                               | Available         | Standard stack-expansion construction.                 |
| Grammars            | Chomsky normal form                      | Available         | Epsilon, unit, terminal, binary, and useless passes.   |
| Grammars            | Unrestricted grammar recognition         | Available         | Bounded rewriting search.                              |
| Regular expressions | Recognition and RE to NFA                | Available         | Thompson construction.                                 |
| L-systems           | Context-free deterministic rewriting     | Available         | Token-based generations.                               |
| L-systems           | Contextual rewriting                     | Available         | Left and right token context.                          |
| L-systems           | Stochastic rewriting                     | Available         | Weighted rules with a reproducible seed.               |
| Petri nets          | Place/transition firing sequence         | Available         | Positive weighted arcs.                                |
| Grammars            | PDA to CFG                               | Not yet available | Requires normalising PDA transitions first.            |
| Grammars            | SLR table builder and parser             | Not yet available | Requires LR(0) item-set construction.                  |
| Automata            | FA/grammar/RE reverse conversions        | Not yet available | Need proof-step representations, not only end results. |
| Proof tools         | Pumping lemma for regular languages      | Available         | Enumerates valid splits and selected pumped words.     |
| Proof tools         | Pumping lemma for context-free languages | Available         | Enumerates valid splits and selected pumped words.     |
| Exercises           | Batch simulation modes                   | Not yet available | Requires an input-set and result-comparison design.    |

The matrix is updated together with each executable feature.

The pumping-lemma tools enforce the structural constraints and expose every
candidate decomposition up to a visible safety limit. They do not decide
language membership or replace the language-specific quantifier argument that
a proof requires.
