import type { MachineKind } from "./domain";

export type TheoryComponent = { symbol: string; label: string };
export type MachineTheory = {
  tuple: string;
  summary: string;
  components: TheoryComponent[];
  dynamics: string;
  acceptance: string;
  power: string;
  notes: string[];
};

const finiteComponents: TheoryComponent[] = [
  { symbol: "Q", label: "Insieme finito degli stati" },
  { symbol: "Σ", label: "Alfabeto di input" },
  { symbol: "δ", label: "Funzione di transizione" },
  { symbol: "q₀", label: "Stato iniziale" },
  { symbol: "F", label: "Insieme degli stati finali" },
];

export const theories: Record<MachineKind, MachineTheory> = {
  dfa: {
    tuple: "M = (Q, Σ, δ, q₀, F)",
    summary: "Un automa deterministico associa a ogni coppia stato-simbolo un unico stato successivo.",
    components: finiteComponents,
    dynamics: "δ̂(q, ε) = q   ·   δ̂(q, wa) = δ(δ̂(q, w), a)",
    acceptance: "w ∈ L(M) ⇔ δ̂(q₀, w) ∈ F",
    power: "Linguaggi regolari · Tipo 3 nella gerarchia di Chomsky",
    notes: ["La funzione δ è totale e univoca.", "Ogni parola determina un solo cammino di esecuzione."],
  },
  nfa: {
    tuple: "M = (Q, Σ, δ, q₀, F)",
    summary:
      "Un automa non deterministico può seguire più cammini e attraversare transizioni ε senza consumare input.",
    components: finiteComponents,
    dynamics: "δ : Q × (Σ ∪ {ε}) → 𝒫(Q)   ·   Sᵢ₊₁ = ε-closure(δ(Sᵢ, aᵢ))",
    acceptance: "w ∈ L(M) ⇔ ε-closure(δ̂({q₀}, w)) ∩ F ≠ ∅",
    power: "Linguaggi regolari · Equivalente a DFA e regex",
    notes: [
      "Il non determinismo non aumenta il potere espressivo rispetto agli automi DFA.",
      "La costruzione dei sottoinsiemi produce un DFA equivalente.",
    ],
  },
  mealy: {
    tuple: "M = (Q, Σ, Γ, δ, λ, q₀)",
    summary:
      "Una macchina di Mealy produce l'output sulle transizioni, quindi reagisce immediatamente a ogni simbolo letto.",
    components: [
      ...finiteComponents.slice(0, 4),
      { symbol: "Γ", label: "Alfabeto di output" },
      { symbol: "λ", label: "Funzione di output" },
    ],
    dynamics: "qᵢ₊₁ = δ(qᵢ, aᵢ)   ·   bᵢ = λ(qᵢ, aᵢ)",
    acceptance: "Non riconosce: trasduce Σ* → Γ*",
    power: "Trasduzioni razionali deterministiche",
    notes: ["L'output ha la stessa lunghezza dell'input.", "L'etichetta canonica è input / output."],
  },
  moore: {
    tuple: "M = (Q, Σ, Γ, δ, λ, q₀)",
    summary: "Una macchina di Moore associa l'output agli stati e lo emette quando uno stato viene visitato.",
    components: [
      ...finiteComponents.slice(0, 4),
      { symbol: "Γ", label: "Alfabeto di output" },
      { symbol: "λ", label: "Output associato agli stati" },
    ],
    dynamics: "qᵢ₊₁ = δ(qᵢ, aᵢ)   ·   bᵢ = λ(qᵢ)",
    acceptance: "Non riconosce: trasduce Σ* → Γ*",
    power: "Equivalente alle macchine di Mealy a meno di una traslazione dell'output",
    notes: [
      "L'output dipende solo dallo stato corrente.",
      "Lo stato iniziale può produrre un output prima della lettura.",
    ],
  },
  pda: {
    tuple: "M = (Q, Σ, Γ, δ, q₀, Z₀, F)",
    summary: "Un automa a pila aggiunge una memoria LIFO non limitata a un controllo a stati finiti.",
    components: [
      ...finiteComponents,
      { symbol: "Γ", label: "Alfabeto della pila" },
      { symbol: "Z₀", label: "Simbolo iniziale della pila" },
    ],
    dynamics: "δ : Q × (Σ ∪ {ε}) × Γ* → 𝒫(Q × Γ*)",
    acceptance: "Per stato finale: (q₀, w, Z₀) ⊢* (q, ε, γ), q ∈ F · oppure per pila vuota",
    power: "Linguaggi context-free · Tipo 2",
    notes: [
      "Una configurazione contiene stato, input residuo e pila.",
      "Il non determinismo è essenziale per tutti i linguaggi context-free.",
    ],
  },
  turing: {
    tuple: "M = (Q, Σ, Γ, δ, q₀, qₐ, qᵣ)",
    summary:
      "Una macchina di Turing legge e riscrive un nastro illimitato muovendo una testina a ogni passo.",
    components: [
      { symbol: "Q", label: "Insieme finito degli stati" },
      { symbol: "Σ", label: "Alfabeto di input" },
      { symbol: "Γ", label: "Alfabeto del nastro, con □" },
      { symbol: "δ", label: "Funzione di transizione" },
      { symbol: "qₐ, qᵣ", label: "Stati di arresto" },
    ],
    dynamics: "δ(q, a) ⊆ Q × Γ × {L, R, S}",
    acceptance: "w ∈ L(M) ⇔ (q₀, w) ⊢* (qₐ, τ)",
    power: "Linguaggi ricorsivamente enumerabili · Tipo 0",
    notes: [
      "Il nastro funge sia da input sia da memoria di lavoro.",
      "La non terminazione è un possibile risultato semantico.",
    ],
  },
  multiTuring: {
    tuple: "M = (Q, Σ, Γ, δ, q₀, qₐ, qᵣ, k)",
    summary: "Una macchina multinastro coordina k nastri indipendenti in una singola transizione globale.",
    components: [
      { symbol: "Q, Σ, Γ", label: "Stati e alfabeti" },
      { symbol: "k", label: "Numero di nastri" },
      { symbol: "δ", label: "Transizione su k simboli" },
      { symbol: "H₁...Hₖ", label: "Posizioni delle testine" },
    ],
    dynamics: "δ : Q × Γᵏ → Q × Γᵏ × {L, R, S}ᵏ",
    acceptance: "Arresto nello stato qₐ su una configurazione globale",
    power: "Equivalente alla macchina a nastro singolo, con possibili vantaggi di complessità",
    notes: [
      "Ogni passo legge e scrive tutti i nastri.",
      "Un singolo nastro può simulare k nastri tramite codifica.",
    ],
  },
  regularGrammar: {
    tuple: "G = (V, Σ, P, S)",
    summary:
      "Una grammatica regolare usa produzioni lineari destre e genera esattamente i linguaggi regolari.",
    components: [
      { symbol: "V", label: "Insieme delle variabili" },
      { symbol: "Σ", label: "Insieme dei terminali" },
      { symbol: "P", label: "Produzioni A → aB oppure A → a" },
      { symbol: "S", label: "Variabile iniziale" },
    ],
    dynamics: "S ⇒ a₁A₁ ⇒ a₁a₂A₂ ⇒* w",
    acceptance: "w ∈ L(G) ⇔ S ⇒* w",
    power: "Linguaggi regolari · Equivalente agli automi finiti",
    notes: [
      "Le produzioni mantengono al più una variabile sul lato destro.",
      "La conversione in NFA associa uno stato a ogni variabile.",
    ],
  },
  cfg: {
    tuple: "G = (V, Σ, P, S)",
    summary:
      "Una grammatica context-free sostituisce una singola variabile indipendentemente dal suo contesto.",
    components: [
      { symbol: "V", label: "Insieme delle variabili" },
      { symbol: "Σ", label: "Insieme dei terminali" },
      { symbol: "P", label: "Produzioni A → α" },
      { symbol: "S", label: "Variabile iniziale" },
    ],
    dynamics: "uAv ⇒ uαv   se   (A → α) ∈ P",
    acceptance: "w ∈ L(G) ⇔ S ⇒* w",
    power: "Linguaggi context-free · Equivalente agli automi PDA non deterministici",
    notes: [
      "CYK richiede la forma normale di Chomsky.",
      "LL(1) richiede una tabella predittiva senza conflitti.",
    ],
  },
  unrestrictedGrammar: {
    tuple: "G = (V, Σ, P, S)",
    summary:
      "Una grammatica non ristretta consente produzioni generali e descrive la classe più ampia della gerarchia di Chomsky.",
    components: [
      { symbol: "V", label: "Insieme delle variabili" },
      { symbol: "Σ", label: "Insieme dei terminali" },
      { symbol: "P", label: "Produzioni α → β con α contenente una variabile" },
      { symbol: "S", label: "Variabile iniziale" },
    ],
    dynamics: "uαv ⇒ uβv   se   (α → β) ∈ P",
    acceptance: "w ∈ L(G) ⇔ S ⇒* w",
    power: "Linguaggi ricorsivamente enumerabili · Equivalente alle macchine di Turing",
    notes: [
      "La ricerca di una derivazione può non terminare.",
      "Un limite operativo rende l'esplorazione osservabile nell'app.",
    ],
  },
  regex: {
    tuple: "r ::= ∅ | ε | a | (r·r) | (r|r) | r*",
    summary:
      "Un'espressione regolare compone simboli tramite concatenazione, alternativa e chiusura di Kleene.",
    components: [
      { symbol: "∅, ε", label: "Linguaggio vuoto e parola vuota" },
      { symbol: "·", label: "Concatenazione" },
      { symbol: "|", label: "Alternativa" },
      { symbol: "*", label: "Chiusura di Kleene" },
    ],
    dynamics: "L(rs)=L(r)L(s)   ·   L(r|s)=L(r)∪L(s)   ·   L(r*)=L(r)*",
    acceptance: "w ∈ L(r) tramite l'ε-NFA ottenuto dalla costruzione di Thompson",
    power: "Linguaggi regolari · Equivalente a DFA e NFA",
    notes: [
      "La costruzione di Thompson è composizionale.",
      "Il matching usa la semantica formale, non il motore regex del sistema.",
    ],
  },
  lsystem: {
    tuple: "G = (V, ω, P)",
    summary:
      "Un L-system riscrive tutti i simboli in parallelo per modellare crescita e strutture ricorsive.",
    components: [
      { symbol: "V", label: "Alfabeto del sistema" },
      { symbol: "ω", label: "Assioma iniziale" },
      { symbol: "P", label: "Produzioni parallele" },
    ],
    dynamics: "a₁...aₙ ⇒ P(a₁)...P(aₙ)",
    acceptance: "Non riconosce: genera la parola della generazione n",
    power: "Sistemi di riscrittura parallela",
    notes: ["Le produzioni si applicano simultaneamente.", "L'ordine dei simboli resta significativo."],
  },
  contextualLsystem: {
    tuple: "G = (V, ω, P),   P : (l, a, r) → α",
    summary:
      "Un L-system contestuale abilita una produzione soltanto quando i vicini del simbolo soddisfano il contesto richiesto.",
    components: [
      { symbol: "l, r", label: "Contesto sinistro e destro" },
      { symbol: "a", label: "Simbolo riscritto" },
      { symbol: "α", label: "Successore" },
      { symbol: "ω", label: "Assioma iniziale" },
    ],
    dynamics: "lar ⇒ lαr   con applicazione parallela su tutte le posizioni",
    acceptance: "Non riconosce: genera configurazioni per generazioni",
    power: "Linguaggi e forme sensibili al contesto locale",
    notes: [
      "Il contesto viene letto dalla generazione precedente.",
      "Le sostituzioni non influenzano altre scelte nello stesso passo.",
    ],
  },
  stochasticLsystem: {
    tuple: "G = (V, ω, P, π, s)",
    summary:
      "Un L-system stocastico sceglie tra produzioni pesate mantenendo la riproducibilità tramite un seme.",
    components: [
      { symbol: "P", label: "Alternative di produzione" },
      { symbol: "π", label: "Distribuzione dei pesi" },
      { symbol: "s", label: "Seme pseudo-casuale" },
      { symbol: "ω", label: "Assioma iniziale" },
    ],
    dynamics: "Pr[a → αᵢ] = πᵢ / Σⱼπⱼ",
    acceptance: "Non riconosce: campiona una derivazione per generazioni",
    power: "Modelli generativi probabilistici paralleli",
    notes: ["Pesi uguali producono una scelta uniforme.", "Lo stesso seme riproduce la stessa derivazione."],
  },
  petri: {
    tuple: "N = (P, T, F, W, M₀)",
    summary:
      "Una rete di Petri rappresenta concorrenza e sincronizzazione mediante token distribuiti nei luoghi.",
    components: [
      { symbol: "P", label: "Insieme dei luoghi" },
      { symbol: "T", label: "Insieme delle transizioni" },
      { symbol: "F", label: "Archi del flusso" },
      { symbol: "W", label: "Pesi degli archi" },
      { symbol: "M₀", label: "Marcatura iniziale" },
    ],
    dynamics: "t abilitata ⇔ ∀p, M(p) ≥ W(p,t)   ·   M′ = M − W(·,t) + W(t,·)",
    acceptance: "Raggiungibilità di una marcatura obiettivo oppure abilitazione di una sequenza",
    power: "Modelli di sistemi concorrenti, distribuiti e a risorse condivise",
    notes: [
      "Transizioni indipendenti possono essere concorrenti.",
      "La marcatura è lo stato globale della rete.",
    ],
  },
};
