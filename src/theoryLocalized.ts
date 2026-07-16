import { catalogue } from "./catalog";
import type { MachineKind } from "./domain";
import { translate, type Language } from "./i18n";
import { theories, type MachineTheory } from "./theory";
import { theoryInEnglish } from "./theoryEnglish";

type Pack = {
  acceptance: [string, string, string, string, string, string, string, string];
  power: [string, string, string, string, string, string, string, string, string];
  notes: [string, string, string, string, string, string, string, string, string, string, string, string];
};

const packs: Record<Exclude<Language, "it">, Pack> = {
  en: {
    acceptance: [
      "Does not recognize: transduces Σ* → Γ*",
      "By final state or empty stack",
      "Halts in state qₐ on a global configuration",
      "Through the ε-NFA produced by Thompson's construction",
      "Generates the word at generation n",
      "Generates configurations by generation",
      "Samples a derivation by generation",
      "Reachability of a target marking or enabling of a sequence",
    ],
    power: [
      "Regular languages · Type 3",
      "Deterministic rational transductions",
      "Context-free languages · Type 2",
      "Recursively enumerable languages · Type 0",
      "Equivalent to a single-tape Turing machine",
      "Parallel rewriting systems",
      "Languages and forms sensitive to local context",
      "Parallel probabilistic generative models",
      "Models of concurrent, distributed, resource-sharing systems",
    ],
    notes: [
      "The transition rules determine each computation step.",
      "Equivalent formalisms preserve the recognized language.",
      "Output is determined by the current transition or state.",
      "The model transforms input sequences into output sequences.",
      "The auxiliary memory is part of every configuration.",
      "An execution may be unbounded or fail to terminate.",
      "Productions define the permitted derivation steps.",
      "The start symbol determines the initial sentential form.",
      "Productions are applied according to the selected rewriting semantics.",
      "Symbol order and generation boundaries remain significant.",
      "Independent transitions may occur concurrently.",
      "The marking is the global state of the net.",
    ],
  },
  fr: {
    acceptance: [
      "Ne reconnaît pas : transduit Σ* → Γ*",
      "Par état final ou pile vide",
      "Arrêt dans l'état qₐ sur une configuration globale",
      "Par l'ε-AFN issu de la construction de Thompson",
      "Génère le mot de la génération n",
      "Génère des configurations par générations",
      "Échantillonne une dérivation par générations",
      "Accessibilité d'un marquage cible ou activation d'une séquence",
    ],
    power: [
      "Langages réguliers · Type 3",
      "Transductions rationnelles déterministes",
      "Langages hors contexte · Type 2",
      "Langages récursivement énumérables · Type 0",
      "Équivalente à une machine de Turing à un ruban",
      "Systèmes de réécriture parallèle",
      "Langages et formes sensibles au contexte local",
      "Modèles génératifs probabilistes parallèles",
      "Modèles de systèmes concurrents, distribués et à ressources partagées",
    ],
    notes: [
      "Les règles de transition déterminent chaque étape du calcul.",
      "Les formalismes équivalents conservent le langage reconnu.",
      "La sortie dépend de la transition ou de l'état courant.",
      "Le modèle transforme des suites d'entrée en suites de sortie.",
      "La mémoire auxiliaire fait partie de chaque configuration.",
      "Une exécution peut être non bornée ou ne pas terminer.",
      "Les productions définissent les étapes de dérivation autorisées.",
      "Le symbole initial détermine la forme sentencielle de départ.",
      "Les productions suivent la sémantique de réécriture choisie.",
      "L'ordre des symboles et les générations restent significatifs.",
      "Des transitions indépendantes peuvent être concurrentes.",
      "Le marquage est l'état global du réseau.",
    ],
  },
  de: {
    acceptance: [
      "Erkennt nicht: transduziert Σ* → Γ*",
      "Durch Endzustand oder leeren Keller",
      "Hält im Zustand qₐ in einer globalen Konfiguration",
      "Über den ε-NEA aus der Thompson-Konstruktion",
      "Erzeugt das Wort der Generation n",
      "Erzeugt Konfigurationen generationsweise",
      "Zieht generationsweise eine Ableitung",
      "Erreichbarkeit einer Zielmarkierung oder Schaltbarkeit einer Folge",
    ],
    power: [
      "Reguläre Sprachen · Typ 3",
      "Deterministische rationale Transduktionen",
      "Kontextfreie Sprachen · Typ 2",
      "Rekursiv aufzählbare Sprachen · Typ 0",
      "Äquivalent zu einer Einband-Turingmaschine",
      "Parallele Umschreibungssysteme",
      "Sprachen und Formen mit lokalem Kontextbezug",
      "Parallele probabilistische generative Modelle",
      "Modelle nebenläufiger, verteilter Systeme mit Ressourcenteilung",
    ],
    notes: [
      "Die Übergangsregeln bestimmen jeden Berechnungsschritt.",
      "Äquivalente Formalismen erhalten die erkannte Sprache.",
      "Die Ausgabe hängt vom aktuellen Übergang oder Zustand ab.",
      "Das Modell wandelt Eingabefolgen in Ausgabefolgen um.",
      "Der Hilfsspeicher gehört zu jeder Konfiguration.",
      "Eine Ausführung kann unbeschränkt sein oder nicht terminieren.",
      "Produktionen legen die zulässigen Ableitungsschritte fest.",
      "Das Startsymbol bestimmt die anfängliche Satzform.",
      "Produktionen werden gemäß der gewählten Umschreibungssemantik angewendet.",
      "Symbolreihenfolge und Generationsgrenzen bleiben bedeutsam.",
      "Unabhängige Transitionen können nebenläufig schalten.",
      "Die Markierung ist der globale Zustand des Netzes.",
    ],
  },
  es: {
    acceptance: [
      "No reconoce: transduce Σ* → Γ*",
      "Por estado final o pila vacía",
      "Se detiene en el estado qₐ sobre una configuración global",
      "Mediante el ε-AFN obtenido con la construcción de Thompson",
      "Genera la palabra de la generación n",
      "Genera configuraciones por generaciones",
      "Muestrea una derivación por generaciones",
      "Alcanzabilidad de un marcado objetivo o habilitación de una secuencia",
    ],
    power: [
      "Lenguajes regulares · Tipo 3",
      "Transducciones racionales deterministas",
      "Lenguajes independientes del contexto · Tipo 2",
      "Lenguajes recursivamente enumerables · Tipo 0",
      "Equivalente a una máquina de Turing de una cinta",
      "Sistemas de reescritura paralela",
      "Lenguajes y formas sensibles al contexto local",
      "Modelos generativos probabilísticos paralelos",
      "Modelos de sistemas concurrentes, distribuidos y con recursos compartidos",
    ],
    notes: [
      "Las reglas de transición determinan cada paso del cálculo.",
      "Los formalismos equivalentes conservan el lenguaje reconocido.",
      "La salida depende de la transición o del estado actual.",
      "El modelo transforma secuencias de entrada en secuencias de salida.",
      "La memoria auxiliar forma parte de cada configuración.",
      "Una ejecución puede ser ilimitada o no terminar.",
      "Las producciones definen los pasos de derivación permitidos.",
      "El símbolo inicial determina la forma sentencial de partida.",
      "Las producciones se aplican según la semántica de reescritura elegida.",
      "El orden de los símbolos y las generaciones siguen siendo significativos.",
      "Las transiciones independientes pueden ejecutarse concurrentemente.",
      "El marcado es el estado global de la red.",
    ],
  },
  pt: {
    acceptance: [
      "Não reconhece: transduz Σ* → Γ*",
      "Por estado final ou pilha vazia",
      "Para no estado qₐ numa configuração global",
      "Através do ε-AFN obtido pela construção de Thompson",
      "Gera a palavra da geração n",
      "Gera configurações por gerações",
      "Amostra uma derivação por gerações",
      "Alcançabilidade de uma marcação alvo ou habilitação de uma sequência",
    ],
    power: [
      "Linguagens regulares · Tipo 3",
      "Transduções racionais determinísticas",
      "Linguagens independentes do contexto · Tipo 2",
      "Linguagens recursivamente enumeráveis · Tipo 0",
      "Equivalente a uma máquina de Turing de uma fita",
      "Sistemas de reescrita paralela",
      "Linguagens e formas sensíveis ao contexto local",
      "Modelos generativos probabilísticos paralelos",
      "Modelos de sistemas concorrentes, distribuídos e com recursos partilhados",
    ],
    notes: [
      "As regras de transição determinam cada passo do cálculo.",
      "Os formalismos equivalentes preservam a linguagem reconhecida.",
      "A saída depende da transição ou do estado atual.",
      "O modelo transforma sequências de entrada em sequências de saída.",
      "A memória auxiliar faz parte de cada configuração.",
      "Uma execução pode ser ilimitada ou não terminar.",
      "As produções definem os passos de derivação permitidos.",
      "O símbolo inicial determina a forma sentencial de partida.",
      "As produções seguem a semântica de reescrita selecionada.",
      "A ordem dos símbolos e as gerações continuam significativas.",
      "Transições independentes podem ocorrer concorrentemente.",
      "A marcação é o estado global da rede.",
    ],
  },
};

const acceptanceIndex: Record<MachineKind, number | null> = {
  dfa: null,
  nfa: null,
  mealy: 0,
  moore: 0,
  pda: 1,
  turing: null,
  multiTuring: 2,
  regularGrammar: null,
  cfg: null,
  unrestrictedGrammar: null,
  regex: 3,
  lsystem: 4,
  contextualLsystem: 5,
  stochasticLsystem: 6,
  petri: 7,
};
const powerIndex: Record<MachineKind, number> = {
  dfa: 0,
  nfa: 0,
  mealy: 1,
  moore: 1,
  pda: 2,
  turing: 3,
  multiTuring: 4,
  regularGrammar: 0,
  cfg: 2,
  unrestrictedGrammar: 3,
  regex: 0,
  lsystem: 5,
  contextualLsystem: 6,
  stochasticLsystem: 7,
  petri: 8,
};
const noteIndex: Record<MachineKind, number> = {
  dfa: 0,
  nfa: 0,
  mealy: 2,
  moore: 2,
  pda: 4,
  turing: 4,
  multiTuring: 4,
  regularGrammar: 6,
  cfg: 6,
  unrestrictedGrammar: 6,
  regex: 0,
  lsystem: 8,
  contextualLsystem: 8,
  stochasticLsystem: 8,
  petri: 10,
};

function localizedDynamics(source: string, language: Exclude<Language, "it">) {
  const words = {
    en: ["if", "with parallel application at every position", "enabled"],
    fr: ["si", "avec application parallèle à toutes les positions", "activée"],
    de: ["wenn", "mit paralleler Anwendung an allen Positionen", "schaltbar"],
    es: ["si", "con aplicación paralela en todas las posiciones", "habilitada"],
    pt: ["se", "com aplicação paralela em todas as posições", "habilitada"],
  }[language];
  return source
    .replaceAll(" se ", ` ${words[0]} `)
    .replace("con applicazione parallela su tutte le posizioni", words[1])
    .replace("abilitata", words[2]);
}

export function theoryForLanguage(kind: MachineKind, language: Language): MachineTheory {
  if (language === "it") return theories[kind];
  const base = theories[kind];
  const pack = packs[language];
  const model = catalogue.find((item) => item.kind === kind)!;
  const acceptance =
    acceptanceIndex[kind] === null
      ? localizedDynamics(base.acceptance, language)
      : pack.acceptance[acceptanceIndex[kind]!];
  const notesStart = noteIndex[kind];
  const english = language === "en" ? theoryInEnglish(kind) : undefined;
  return {
    tuple: base.tuple,
    summary: english?.summary ?? translate(language, model.description),
    components: base.components.map((component, index) => ({
      symbol: component.symbol,
      label: english?.components[index]?.label ?? translate(language, component.label),
    })),
    dynamics: localizedDynamics(base.dynamics, language),
    acceptance,
    power: english?.power ?? pack.power[powerIndex[kind]],
    notes: english?.notes ?? [pack.notes[notesStart], pack.notes[notesStart + 1]],
  };
}
