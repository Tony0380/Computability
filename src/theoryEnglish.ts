import type { MachineKind } from "./domain";
import { theories, type MachineTheory } from "./theory";

type EnglishTheory = Pick<MachineTheory, "summary" | "power" | "notes"> & { components: string[] };

const english: Record<MachineKind, EnglishTheory> = {
  dfa: {
    summary: "A deterministic automaton maps every state-symbol pair to exactly one next state.",
    components: [
      "Finite set of states",
      "Input alphabet",
      "Transition function",
      "Initial state",
      "Set of accepting states",
    ],
    power: "Regular languages · Type 3 in the Chomsky hierarchy",
    notes: [
      "The transition function is total and single-valued.",
      "Every word determines exactly one execution path.",
    ],
  },
  nfa: {
    summary:
      "A nondeterministic automaton may follow several paths and cross ε-transitions without consuming input.",
    components: [
      "Finite set of states",
      "Input alphabet",
      "Transition relation",
      "Initial state",
      "Set of accepting states",
    ],
    power: "Regular languages · Equivalent to DFA and regular expressions",
    notes: [
      "Nondeterminism does not add expressive power over DFAs.",
      "The subset construction produces an equivalent DFA.",
    ],
  },
  mealy: {
    summary: "A Mealy machine emits output on transitions and reacts immediately to each input symbol.",
    components: [
      "Finite set of states",
      "Input alphabet",
      "Transition function",
      "Initial state",
      "Output alphabet",
      "Output function",
    ],
    power: "Deterministic rational transductions",
    notes: ["The output has the same length as the input.", "The canonical edge label is input / output."],
  },
  moore: {
    summary: "A Moore machine associates output with states and emits it whenever a state is visited.",
    components: [
      "Finite set of states",
      "Input alphabet",
      "Transition function",
      "Initial state",
      "Output alphabet",
      "State output function",
    ],
    power: "Equivalent to Mealy machines up to an output shift",
    notes: [
      "Output depends only on the current state.",
      "The initial state may emit output before any input is read.",
    ],
  },
  pda: {
    summary: "A pushdown automaton adds unbounded LIFO memory to a finite-state control.",
    components: [
      "Finite set of states",
      "Input alphabet",
      "Transition relation",
      "Initial state",
      "Set of accepting states",
      "Stack alphabet",
      "Initial stack symbol",
    ],
    power: "Context-free languages · Type 2",
    notes: [
      "A configuration contains the state, remaining input, and stack.",
      "Nondeterminism is essential for recognizing all context-free languages.",
    ],
  },
  turing: {
    summary: "A Turing machine reads and rewrites an unbounded tape while moving its head at every step.",
    components: [
      "Finite set of states",
      "Input alphabet",
      "Tape alphabet including □",
      "Transition function",
      "Halting states",
    ],
    power: "Recursively enumerable languages · Type 0",
    notes: [
      "The tape stores both input and working memory.",
      "Non-termination is a possible semantic result.",
    ],
  },
  multiTuring: {
    summary: "A multitape machine coordinates k independent tapes in one global transition.",
    components: ["States and alphabets", "Number of tapes", "Transition over k symbols", "Head positions"],
    power: "Equivalent to a single-tape machine, with possible complexity advantages",
    notes: ["Every step reads and writes all tapes.", "One tape can simulate k tapes through encoding."],
  },
  regularGrammar: {
    summary: "A regular grammar uses right-linear productions and generates exactly the regular languages.",
    components: ["Set of variables", "Set of terminals", "Productions A → aB or A → a", "Start variable"],
    power: "Regular languages · Equivalent to finite automata",
    notes: [
      "At most one variable appears on the right-hand side.",
      "Conversion to NFA associates one state with each variable.",
    ],
  },
  cfg: {
    summary: "A context-free grammar replaces one variable independently of its surrounding context.",
    components: ["Set of variables", "Set of terminals", "Productions A → α", "Start variable"],
    power: "Context-free languages · Equivalent to nondeterministic PDAs",
    notes: ["CYK requires Chomsky normal form.", "LL(1) requires a conflict-free predictive table."],
  },
  unrestrictedGrammar: {
    summary: "An unrestricted grammar permits general productions and captures the broadest Chomsky class.",
    components: [
      "Set of variables",
      "Set of terminals",
      "Productions α → β where α contains a variable",
      "Start variable",
    ],
    power: "Recursively enumerable languages · Equivalent to Turing machines",
    notes: [
      "Searching for a derivation may not terminate.",
      "An operational bound keeps exploration inspectable in the app.",
    ],
  },
  regex: {
    summary: "A regular expression combines symbols through concatenation, alternation, and Kleene closure.",
    components: ["Empty language and empty word", "Concatenation", "Alternation", "Kleene closure"],
    power: "Regular languages · Equivalent to DFA and NFA",
    notes: [
      "Thompson construction is compositional.",
      "Matching follows formal semantics, not the system regex engine.",
    ],
  },
  lsystem: {
    summary: "An L-system rewrites all symbols in parallel to model growth and recursive structures.",
    components: ["System alphabet", "Initial axiom", "Parallel productions"],
    power: "Parallel rewriting systems",
    notes: ["Productions are applied simultaneously.", "Symbol order remains significant."],
  },
  contextualLsystem: {
    summary:
      "A context-sensitive L-system enables a production only when adjacent symbols match its context.",
    components: ["Left and right context", "Rewritten symbol", "Successor", "Initial axiom"],
    power: "Languages and forms sensitive to local context",
    notes: [
      "Context is read from the previous generation.",
      "Replacements do not affect choices within the same step.",
    ],
  },
  stochasticLsystem: {
    summary: "A stochastic L-system chooses weighted productions and remains reproducible through a seed.",
    components: ["Production alternatives", "Weight distribution", "Pseudo-random seed", "Initial axiom"],
    power: "Parallel probabilistic generative models",
    notes: ["Equal weights produce uniform choice.", "The same seed reproduces the same derivation."],
  },
  petri: {
    summary:
      "A Petri net represents concurrency and synchronization through tokens distributed across places.",
    components: ["Set of places", "Set of transitions", "Flow arcs", "Arc weights", "Initial marking"],
    power: "Models of concurrent, distributed, resource-sharing systems",
    notes: ["Independent transitions may occur concurrently.", "The marking is the global state of the net."],
  },
};

export function theoryInEnglish(kind: MachineKind): MachineTheory {
  const base = theories[kind];
  const translation = english[kind];
  return {
    ...base,
    ...translation,
    components: base.components.map((component, index) => ({
      symbol: component.symbol,
      label: translation.components[index] ?? component.label,
    })),
  };
}
