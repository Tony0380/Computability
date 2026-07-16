export type MachineKind =
  | "dfa"
  | "nfa"
  | "mealy"
  | "moore"
  | "pda"
  | "turing"
  | "multiTuring"
  | "regularGrammar"
  | "cfg"
  | "unrestrictedGrammar"
  | "regex"
  | "lsystem"
  | "contextualLsystem"
  | "stochasticLsystem"
  | "petri";

export type Definition = Record<string, unknown>;

export const examples: Record<MachineKind, Definition> = {
  dfa: {
    states: ["q0", "q1", "q2", "q3"],
    alphabet: ["0", "1"],
    start_state: "q0",
    accepting_states: ["q3"],
    transitions: [
      { from: "q0", symbol: "0", to: "q1" },
      { from: "q0", symbol: "1", to: "q0" },
      { from: "q1", symbol: "0", to: "q1" },
      { from: "q1", symbol: "1", to: "q2" },
      { from: "q2", symbol: "0", to: "q1" },
      { from: "q2", symbol: "1", to: "q3" },
      { from: "q3", symbol: "0", to: "q1" },
      { from: "q3", symbol: "1", to: "q0" },
    ],
  },
  nfa: {
    states: ["q0", "q1", "q2", "q3"],
    alphabet: ["a", "b"],
    start_state: "q0",
    accepting_states: ["q3"],
    transitions: [
      { from: "q0", symbol: "a", to: "q0" },
      { from: "q0", symbol: "b", to: "q0" },
      { from: "q0", symbol: "a", to: "q1" },
      { from: "q1", symbol: "b", to: "q2" },
      { from: "q2", symbol: "b", to: "q3" },
    ],
  },
  mealy: {
    states: ["even", "odd"],
    start_state: "even",
    transitions: [
      { from: "even", input: "1", output: "odd", to: "odd" },
      { from: "even", input: "0", output: "even", to: "even" },
      { from: "odd", input: "1", output: "even", to: "even" },
      { from: "odd", input: "0", output: "odd", to: "odd" },
    ],
  },
  moore: {
    states: ["even", "odd"],
    start_state: "even",
    state_outputs: { even: "even", odd: "odd" },
    transitions: [
      { from: "even", symbol: "1", to: "odd" },
      { from: "even", symbol: "0", to: "even" },
      { from: "odd", symbol: "1", to: "even" },
      { from: "odd", symbol: "0", to: "odd" },
    ],
  },
  pda: {
    states: ["push", "pop", "accept"],
    start_state: "push",
    accepting_states: ["accept"],
    accept_by_empty_stack: false,
    max_configurations: 1000,
    transitions: [
      { from: "push", input: "a", pop: [], push: ["A"], to: "push" },
      { from: "push", input: "b", pop: ["A"], push: [], to: "pop" },
      { from: "pop", input: "b", pop: ["A"], push: [], to: "pop" },
      { from: "pop", input: "ε", pop: [], push: [], to: "accept" },
    ],
  },
  turing: {
    states: ["scan", "accept"],
    start_state: "scan",
    accepting_states: ["accept"],
    rejecting_states: [],
    transitions: [
      { from: "scan", read: "1", write: "1", movement: "Right", to: "scan" },
      { from: "scan", read: "□", write: "□", movement: "Stay", to: "accept" },
    ],
  },
  multiTuring: {
    states: ["copy", "accept"],
    start_state: "copy",
    accepting_states: ["accept"],
    rejecting_states: [],
    tape_count: 2,
    transitions: [
      { from: "copy", read: ["1", "□"], write: ["1", "1"], movements: ["Right", "Right"], to: "copy" },
      { from: "copy", read: ["□", "□"], write: ["□", "□"], movements: ["Stay", "Stay"], to: "accept" },
    ],
  },
  regularGrammar: {
    variables: ["S", "A"],
    terminals: ["a", "b"],
    start_variable: "S",
    productions: [
      { left: "S", terminal: "a", next_variable: "A" },
      { left: "A", terminal: "b", next_variable: "A" },
      { left: "A", terminal: "b", next_variable: null },
    ],
  },
  cfg: {
    variables: ["S", "A", "B"],
    terminals: ["a", "b"],
    start_variable: "S",
    max_derivations: 1000,
    rules: [
      { left: "S", right: ["A", "B"] },
      { left: "A", right: ["a"] },
      { left: "B", right: ["b"] },
    ],
  },
  unrestrictedGrammar: {
    variables: ["S"],
    terminals: ["a"],
    start_variable: "S",
    max_derivations: 1000,
    rules: [
      { left: ["S"], right: ["a", "S"] },
      { left: ["S"], right: [] },
    ],
  },
  regex: { expression: "a(b|c)*" },
  lsystem: { axiom: ["F"], rules: [{ predecessor: "F", successor: ["F", "+", "F"] }] },
  contextualLsystem: {
    axiom: ["A", "B", "A"],
    rules: [{ left_context: ["A"], symbol: "B", right_context: ["A"], successor: ["C"] }],
  },
  stochasticLsystem: {
    axiom: ["F"],
    seed: 42,
    rules: [
      {
        predecessor: "F",
        alternatives: [
          { weight: 3, symbols: ["F", "+", "F"] },
          { weight: 1, symbols: ["F", "-", "F"] },
        ],
      },
    ],
  },
  petri: {
    marking: { ready: 1, done: 0 },
    transitions: [
      { id: "complete", inputs: [{ place: "ready", weight: 1 }], outputs: [{ place: "done", weight: 1 }] },
    ],
  },
};

export function isFinite(definition: Definition): boolean {
  return "alphabet" in definition;
}
