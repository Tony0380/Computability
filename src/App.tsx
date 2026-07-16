import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { examples, type Definition, type MachineKind, isFinite } from "./domain";

const labels: Record<MachineKind, { name: string; subtitle: string }> = {
  dfa: { name: "Deterministic finite automaton", subtitle: "One state, one valid move for each symbol." },
  nfa: { name: "Nondeterministic finite automaton", subtitle: "Explore branching paths and epsilon transitions." },
  mealy: { name: "Mealy transducer", subtitle: "Emit a symbol while each transition is traversed." },
  moore: { name: "Moore transducer", subtitle: "Read the output assigned to every visited state." },
  pda: { name: "Pushdown automaton", subtitle: "Explore input, state and stack configurations." },
  turing: { name: "Turing machine", subtitle: "Run an explicit tape, head, and transition function." },
  multiTuring: { name: "Multi-tape Turing machine", subtitle: "Coordinate several explicit tapes and heads." },
  regularGrammar: { name: "Regular grammar", subtitle: "Recognize words through a right-linear grammar." },
  cfg: { name: "Context-free grammar", subtitle: "Inspect a bounded leftmost derivation." },
  unrestrictedGrammar: { name: "Unrestricted grammar", subtitle: "Explore a bounded general derivation." },
  regex: { name: "Regular expression", subtitle: "Compile an expression to an epsilon-NFA and run it." },
  lsystem: { name: "L-system", subtitle: "Apply every rewrite simultaneously by generation." },
  contextualLsystem: { name: "Contextual L-system", subtitle: "Rewrite a symbol only when its neighbouring context matches." },
  stochasticLsystem: { name: "Stochastic L-system", subtitle: "Choose weighted rewrites from a reproducible seed." },
  petri: { name: "Petri net", subtitle: "Follow tokens through concurrent places and transitions." },
};

function tokenize(value: string): string[] { return value.trim() ? value.trim().split(/\s+/) : []; }

export default function App() {
  const [kind, setKind] = useState<MachineKind>("dfa");
  const [definition, setDefinition] = useState<Definition>(examples.dfa);
  const [input, setInput] = useState("0 1 1");
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<string>();
  const [source, setSource] = useState(JSON.stringify(examples.dfa, null, 2));
  const current = labels[kind];
  const inputHint = useMemo(() => {
    if (kind === "petri") return "Transition sequence, e.g. complete";
    if (kind === "multiTuring") return "One tape per side of |, e.g. 1 1 |";
    if (["lsystem", "contextualLsystem", "stochasticLsystem"].includes(kind)) return "Generations to render";
    return "Input symbols, separated by spaces";
  }, [kind]);

  function choose(next: MachineKind) {
    setKind(next); setDefinition(examples[next]); setSource(JSON.stringify(examples[next], null, 2)); setResult(undefined); setError(undefined);
    setInput(next === "petri" ? "complete" : next === "turing" ? "1 1 1" : next === "multiTuring" ? "1 1 |" : ["lsystem", "contextualLsystem", "stochasticLsystem"].includes(next) ? "4" : next === "dfa" ? "0 1 1" : next === "regex" ? "a b c" : next === "cfg" ? "a b" : "a b b");
  }
  function applyDefinition() {
    try { setDefinition(JSON.parse(source) as Definition); setError(undefined); }
    catch { setError("The definition is not valid JSON. Correct it before running the machine."); }
  }
  async function convert() {
    const conversion = kind === "nfa" ? "determinize" : kind === "dfa" ? "minimize_dfa" : kind === "regex" ? "regex_to_nfa" : "regular_grammar_to_nfa";
    try {
      const parsed = JSON.parse(source) as Definition;
      const converted = await invoke<Definition>("transform", { request: { kind: conversion, definition: parsed } });
      const nextKind: MachineKind = kind === "dfa" ? "dfa" : "nfa";
      setKind(nextKind); setDefinition(converted); setSource(JSON.stringify(converted, null, 2)); setResult(undefined); setError(undefined);
    } catch (cause) { setError(String(cause)); }
  }
  async function convertCfgToPda() {
    try {
      const parsed = JSON.parse(source) as Definition;
      const converted = await invoke<Definition>("cfg_to_pda", { grammar: parsed });
      setKind("pda"); setDefinition(converted); setSource(JSON.stringify(converted, null, 2)); setResult(undefined); setError(undefined);
    } catch (cause) { setError(String(cause)); }
  }
  async function run() {
    try {
      applyDefinition();
      const parsed = JSON.parse(source) as Definition;
      const requestKind: Record<MachineKind, string> = { dfa: "dfa", nfa: "nfa", mealy: "mealy", moore: "moore", pda: "pda", turing: "turing", multiTuring: "multi_turing", regularGrammar: "regular_grammar", cfg: "cfg", unrestrictedGrammar: "unrestricted_grammar", regex: "regex", lsystem: "lsystem", contextualLsystem: "contextual_lsystem", stochasticLsystem: "stochastic_lsystem", petri: "petri" };
      const definition = kind === "turing" || kind === "multiTuring" ? { machine: parsed, max_steps: 10_000 } : ["lsystem", "contextualLsystem", "stochasticLsystem"].includes(kind) ? { system: parsed, generations: Number(input) || 0 } : parsed;
      const tapeInputs = kind === "multiTuring" ? input.split("|").map(tokenize) : undefined;
      const response = await invoke("simulate", { request: { kind: requestKind[kind], definition }, input: tokenize(input), tapeInputs });
      setResult(response); setError(undefined);
    } catch (cause) { setError(String(cause)); setResult(undefined); }
  }
  async function runCyk() {
    try {
      const parsed = JSON.parse(source) as Definition;
      const response = await invoke("simulate", { request: { kind: "cyk", definition: parsed }, input: tokenize(input) });
      setResult(response); setError(undefined);
    } catch (cause) { setError(String(cause)); setResult(undefined); }
  }
  async function runLl1() {
    try {
      const parsed = JSON.parse(source) as Definition;
      const response = await invoke("simulate", { request: { kind: "ll1", definition: parsed }, input: tokenize(input) });
      setResult(response); setError(undefined);
    } catch (cause) { setError(String(cause)); setResult(undefined); }
  }
  const finite = isFinite(definition);

  return <main className="shell">
    <aside className="rail" aria-label="Machine families">
      <div className="brand"><span className="brand-mark">C</span><div><strong>Computability</strong><small>formal systems workbench</small></div></div>
      <p className="rail-label">Machine laboratory</p>
      {(Object.keys(labels) as MachineKind[]).map((item) => <button className={item === kind ? "machine active" : "machine"} onClick={() => choose(item)} key={item}><span>{item.toUpperCase()}</span>{labels[item].name}</button>)}
      <div className="rail-note"><span>□</span><p>Definitions remain explicit. The simulator never infers missing transitions.</p></div>
    </aside>
    <section className="workbench">
      <header><div><p className="eyebrow">Active model / {kind.toUpperCase()}</p><h1>{current.name}</h1><p className="subtitle">{current.subtitle}</p></div><button className="outline" onClick={() => choose(kind)}>Restore example</button></header>
      <div className="workspace">
        <section className="panel editor"><div className="panel-heading"><div><p className="eyebrow">Definition</p><h2>Machine specification</h2></div><div className="editor-actions"><button className="quiet" onClick={applyDefinition}>Validate JSON</button>{["dfa", "nfa", "regex", "regularGrammar"].includes(kind) && <button className="quiet" onClick={convert}>{kind === "dfa" ? "Minimize" : "Convert to NFA"}</button>}{kind === "cfg" && <button className="quiet" onClick={convertCfgToPda}>Convert to PDA</button>}</div></div>
          <textarea aria-label="Machine definition in JSON" value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
          {finite && <p className="annotation">Use <code>ε</code> for an NFA epsilon transition. States, symbols and transitions are checked by the Rust core before execution.</p>}
        </section>
        <section className="panel runner"><div className="panel-heading"><div><p className="eyebrow">Execution</p><h2>Run a word or sequence</h2></div><span className="status">ready</span></div>
          <label htmlFor="input">{inputHint}</label><input id="input" value={input} onChange={(event) => setInput(event.target.value)} />
          <button className="run" onClick={run}>Run machine <span>→</span></button>{kind === "cfg" && <div className="parser-actions"><button className="quiet" onClick={runCyk}>Run CYK parser</button><button className="quiet" onClick={runLl1}>Run LL(1) parser</button></div>}
          <div className="result" aria-live="polite"><p className="eyebrow">Result</p>{error ? <p className="failure">{error}</p> : result ? <pre>{JSON.stringify(result, null, 2)}</pre> : <p className="placeholder">Run the definition to inspect its accepted state, trace, or marking.</p>}</div>
        </section>
      </div>
      <footer><span>Rust simulation core</span><span>•</span><span>TypeScript desktop interface</span><span>•</span><span>Symbols are tokenized on whitespace</span></footer>
    </section>
  </main>;
}
