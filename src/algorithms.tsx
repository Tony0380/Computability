import { invoke } from "@tauri-apps/api/core";
import { useRef, useState } from "react";
import { algorithmTheory, type AlgorithmTheoryId } from "./algorithmTheory";
import { metaFor } from "./catalog";
import type { Definition, MachineKind } from "./domain";
import { useI18n, type Language } from "./i18n";
import type { WorkspaceTab } from "./workspace";

type AlgorithmId = AlgorithmTheoryId;

type Localized = Record<Language, string>;

type AlgorithmDescriptor = {
  id: AlgorithmId;
  code: string;
  family: "automata" | "grammar" | "proof";
  sourceKinds?: MachineKind[];
  title: Localized;
  summary: Localized;
  theory: Localized;
};

const l = (it: string, en: string, fr: string, de: string, es: string, pt: string): Localized => ({
  it,
  en,
  fr,
  de,
  es,
  pt,
});

const algorithms: AlgorithmDescriptor[] = [
  {
    id: "thompson",
    code: "RE -> eNFA",
    family: "automata",
    sourceKinds: ["regex"],
    title: l(
      "Costruzione di Thompson",
      "Thompson construction",
      "Construction de Thompson",
      "Thompson-Konstruktion",
      "Construccion de Thompson",
      "Construcao de Thompson",
    ),
    summary: l(
      "Converte un'espressione regolare in un epsilon-NFA.",
      "Converts a regular expression into an epsilon-NFA.",
      "Convertit une expression reguliere en epsilon-AFN.",
      "Wandelt einen regularen Ausdruck in einen epsilon-NFA um.",
      "Convierte una expresion regular en un epsilon-AFN.",
      "Converte uma expressao regular em um epsilon-AFN.",
    ),
    theory: l(
      "Ogni operatore crea un frammento con un solo ingresso e una sola uscita; unione, concatenazione e stella li collegano con transizioni epsilon.",
      "Each operator creates a fragment with one entry and one exit; union, concatenation, and star connect fragments with epsilon transitions.",
      "Chaque operateur cree un fragment a une entree et une sortie; union, concatenation et etoile les relient par epsilon.",
      "Jeder Operator erzeugt ein Fragment mit Ein- und Ausgang; Vereinigung, Verkettung und Stern verbinden sie durch epsilon-Kanten.",
      "Cada operador crea un fragmento con entrada y salida; union, concatenacion y estrella los conectan mediante epsilon.",
      "Cada operador cria um fragmento com entrada e saida; uniao, concatenacao e estrela os ligam por epsilon.",
    ),
  },
  {
    id: "subset_construction",
    code: "NFA -> DFA",
    family: "automata",
    sourceKinds: ["nfa"],
    title: l(
      "Costruzione dei sottoinsiemi",
      "Subset construction",
      "Construction des sous-ensembles",
      "Potenzmengenkonstruktion",
      "Construccion de subconjuntos",
      "Construcao de subconjuntos",
    ),
    summary: l(
      "Determinizza un NFA usando insiemi di stati e chiusure epsilon.",
      "Determinizes an NFA using state sets and epsilon closures.",
      "Determinise un AFN avec des ensembles d'etats et fermetures epsilon.",
      "Determinisiert einen NFA mit Zustandsmengen und epsilon-Abschlussen.",
      "Determiniza un AFN mediante conjuntos de estados y cierres epsilon.",
      "Determiniza um AFN usando conjuntos de estados e fechos epsilon.",
    ),
    theory: l(
      "Uno stato del DFA rappresenta un insieme di stati attivi dell'NFA. Dopo ogni simbolo si applicano movimento e chiusura epsilon.",
      "A DFA state represents a set of active NFA states. Every symbol applies a move followed by epsilon closure.",
      "Un etat de l'AFD represente les etats actifs de l'AFN. Chaque symbole applique mouvement puis fermeture epsilon.",
      "Ein DFA-Zustand reprasentiert aktive NFA-Zustande. Auf jedes Symbol folgen Bewegung und epsilon-Abschluss.",
      "Un estado del AFD representa estados activos del AFN. Cada simbolo aplica movimiento y cierre epsilon.",
      "Um estado do AFD representa estados ativos do AFN. Cada simbolo aplica movimento e fecho epsilon.",
    ),
  },
  {
    id: "dfa_minimization",
    code: "MIN DFA",
    family: "automata",
    sourceKinds: ["dfa"],
    title: l(
      "Minimizzazione DFA",
      "DFA minimization",
      "Minimisation AFD",
      "DFA-Minimierung",
      "Minimizacion AFD",
      "Minimizacao AFD",
    ),
    summary: l(
      "Raffina partizioni fino a un automa quoziente minimo.",
      "Refines partitions into a minimal quotient automaton.",
      "Raffine les partitions vers un automate quotient minimal.",
      "Verfeinert Partitionen zu einem minimalen Quotientenautomaten.",
      "Refina particiones hasta un automata cociente minimo.",
      "Refina particoes ate um automato quociente minimo.",
    ),
    theory: l(
      "Stati equivalenti non possono essere distinti da alcun suffisso. Il raffinamento separa gli stati con comportamenti futuri diversi.",
      "Equivalent states cannot be distinguished by any suffix. Partition refinement separates states with different future behavior.",
      "Des etats equivalents ne sont distingues par aucun suffixe. Le raffinement separe les comportements futurs differents.",
      "Aquivalente Zustande sind durch kein Suffix unterscheidbar. Verfeinerung trennt verschiedenes Zukunftsverhalten.",
      "Estados equivalentes no se distinguen por ningun sufijo. El refinamiento separa comportamientos futuros distintos.",
      "Estados equivalentes nao se distinguem por nenhum sufixo. O refinamento separa comportamentos futuros diferentes.",
    ),
  },
  {
    id: "state_elimination",
    code: "FA -> RE",
    family: "automata",
    sourceKinds: ["dfa", "nfa"],
    title: l(
      "Eliminazione degli stati",
      "State elimination",
      "Elimination d'etats",
      "Zustandselimination",
      "Eliminacion de estados",
      "Eliminacao de estados",
    ),
    summary: l(
      "Ricava un'espressione regolare tramite un automa generalizzato.",
      "Derives a regular expression through a generalized automaton.",
      "Derive une expression reguliere par automate generalise.",
      "Leitet einen regularen Ausdruck uber einen verallgemeinerten Automaten ab.",
      "Obtiene una expresion regular mediante un automata generalizado.",
      "Obtem uma expressao regular por um automato generalizado.",
    ),
    theory: l(
      "Le etichette diventano espressioni regolari. Eliminando uno stato, ogni percorso che lo attraversa viene sostituito da un'etichetta equivalente.",
      "Labels become regular expressions. Eliminating a state replaces every path through it with an equivalent label.",
      "Les etiquettes deviennent des expressions regulieres. Eliminer un etat remplace chaque chemin qui le traverse.",
      "Kanten werden regulare Ausdrucke. Beim Entfernen eines Zustands werden alle Wege durch ihn ersetzt.",
      "Las etiquetas se vuelven expresiones regulares. Eliminar un estado sustituye cada camino que lo atraviesa.",
      "Os rotulos tornam-se expressoes regulares. Eliminar um estado substitui cada caminho que o atravessa.",
    ),
  },
  {
    id: "epsilon_elimination",
    code: "DEL epsilon",
    family: "automata",
    sourceKinds: ["nfa"],
    title: l(
      "Eliminazione epsilon",
      "Epsilon elimination",
      "Elimination epsilon",
      "Epsilon-Elimination",
      "Eliminacion epsilon",
      "Eliminacao epsilon",
    ),
    summary: l(
      "Rimuove le transizioni epsilon preservando il linguaggio.",
      "Removes epsilon transitions while preserving the language.",
      "Supprime les transitions epsilon en preservant le langage.",
      "Entfernt epsilon-Ubergange unter Erhalt der Sprache.",
      "Elimina transiciones epsilon conservando el lenguaje.",
      "Remove transicoes epsilon preservando a linguagem.",
    ),
    theory: l(
      "Le chiusure epsilon trasferiscono transizioni e accettazione agli stati che possono raggiungerle senza consumare input.",
      "Epsilon closures transfer transitions and acceptance to states that reach them without consuming input.",
      "Les fermetures epsilon transferent transitions et acceptation sans consommer l'entree.",
      "Epsilon-Abschlusse ubertragen Ubergange und Akzeptanz ohne Eingabeverbrauch.",
      "Los cierres epsilon transfieren transiciones y aceptacion sin consumir entrada.",
      "Os fechos epsilon transferem transicoes e aceitacao sem consumir entrada.",
    ),
  },
  {
    id: "remove_unreachable",
    code: "TRIM",
    family: "automata",
    sourceKinds: ["dfa", "nfa"],
    title: l(
      "Rimozione irraggiungibili",
      "Remove unreachable states",
      "Supprimer les inaccessibles",
      "Unerreichbare entfernen",
      "Eliminar inalcanzables",
      "Remover inalcancaveis",
    ),
    summary: l(
      "Mantiene solo la parte raggiungibile dall'iniziale.",
      "Keeps only the graph reachable from the start state.",
      "Conserve le graphe accessible depuis l'etat initial.",
      "Behalt nur den vom Start erreichbaren Graphen.",
      "Conserva el grafo alcanzable desde el estado inicial.",
      "Mantem o grafo alcancavel desde o estado inicial.",
    ),
    theory: l(
      "Uno stato mai raggiungibile non partecipa ad alcuna computazione e puo essere eliminato senza cambiare il linguaggio.",
      "A state that is never reachable participates in no computation and can be removed without changing the language.",
      "Un etat inaccessible ne participe a aucun calcul et peut etre retire sans changer le langage.",
      "Ein unerreichbarer Zustand nimmt an keiner Berechnung teil und kann ohne Sprachanderung entfernt werden.",
      "Un estado inalcanzable no participa en computaciones y puede eliminarse sin cambiar el lenguaje.",
      "Um estado inalcancavel nao participa de computacoes e pode ser removido sem alterar a linguagem.",
    ),
  },
  {
    id: "dfa_equivalence",
    code: "DFA = DFA",
    family: "automata",
    sourceKinds: ["dfa"],
    title: l(
      "Equivalenza tra DFA",
      "DFA equivalence",
      "Equivalence des AFD",
      "DFA-Aquivalenz",
      "Equivalencia de AFD",
      "Equivalencia de AFD",
    ),
    summary: l(
      "Confronta due DFA e produce un controesempio minimo.",
      "Compares two DFAs and returns a shortest counterexample.",
      "Compare deux AFD et renvoie un contre-exemple minimal.",
      "Vergleicht zwei DFA und liefert ein kurzestes Gegenbeispiel.",
      "Compara dos AFD y devuelve un contraejemplo minimo.",
      "Compara dois AFD e retorna um contraexemplo minimo.",
    ),
    theory: l(
      "Una visita in ampiezza dell'automa prodotto cerca una coppia in cui un solo lato accetta. La parola del percorso e un testimone.",
      "Breadth-first search of the product automaton looks for a pair where only one side accepts. Its path word is a witness.",
      "Une recherche en largeur du produit cherche une paire ou un seul cote accepte. Le mot du chemin est un temoin.",
      "Breitensuche im Produktautomaten sucht ein Paar, in dem nur eine Seite akzeptiert. Das Pfadwort ist ein Zeuge.",
      "Una busqueda en anchura del producto busca un par donde solo un lado acepta. La palabra del camino es testigo.",
      "Uma busca em largura no produto procura um par em que apenas um lado aceita. A palavra do caminho e testemunha.",
    ),
  },
  {
    id: "regular_grammar_to_nfa",
    code: "RG -> NFA",
    family: "grammar",
    sourceKinds: ["regularGrammar"],
    title: l(
      "Grammatica regolare in NFA",
      "Regular grammar to NFA",
      "Grammaire reguliere vers AFN",
      "Regulare Grammatik zu NFA",
      "Gramatica regular a AFN",
      "Gramatica regular para AFN",
    ),
    summary: l(
      "Traduce produzioni lineari destre in transizioni.",
      "Translates right-linear productions into transitions.",
      "Traduit les productions lineaires droites en transitions.",
      "Ubersetzt rechtslineare Produktionen in Ubergange.",
      "Traduce producciones lineales derechas en transiciones.",
      "Traduz producoes lineares a direita em transicoes.",
    ),
    theory: l(
      "Le variabili sono stati; A -> aB diventa A -a-> B e una produzione terminale raggiunge un nuovo stato finale.",
      "Variables are states; A -> aB becomes A -a-> B and a terminal production reaches a fresh final state.",
      "Les variables sont des etats; A -> aB devient A -a-> B et une production terminale rejoint un nouvel etat final.",
      "Variablen sind Zustande; A -> aB wird A -a-> B und eine terminale Produktion erreicht einen neuen Endzustand.",
      "Las variables son estados; A -> aB se convierte en A -a-> B y una produccion terminal llega a un nuevo estado final.",
      "Variaveis sao estados; A -> aB torna-se A -a-> B e uma producao terminal alcanca um novo estado final.",
    ),
  },
  {
    id: "cfg_to_pda",
    code: "CFG -> PDA",
    family: "grammar",
    sourceKinds: ["cfg"],
    title: l("CFG in PDA", "CFG to PDA", "CFG vers PDA", "CFG zu PDA", "CFG a PDA", "CFG para PDA"),
    summary: l(
      "Simula derivazioni della grammatica sulla pila.",
      "Simulates grammar derivations on the stack.",
      "Simule les derivations de la grammaire sur la pile.",
      "Simuliert Grammatikableitungen auf dem Keller.",
      "Simula derivaciones de la gramatica en la pila.",
      "Simula derivacoes da gramatica na pilha.",
    ),
    theory: l(
      "Una transizione epsilon espande una variabile; una transizione di lettura abbina il terminale in cima alla pila.",
      "An epsilon transition expands a variable; an input transition matches a terminal on top of the stack.",
      "Une transition epsilon developpe une variable; une transition d'entree associe le terminal au sommet.",
      "Ein epsilon-Ubergang expandiert eine Variable; ein Eingabeubergang vergleicht das oberste Terminal.",
      "Una transicion epsilon expande una variable; una transicion de entrada empareja el terminal superior.",
      "Uma transicao epsilon expande uma variavel; uma transicao de entrada combina o terminal no topo.",
    ),
  },
  {
    id: "chomsky_normal_form",
    code: "CNF",
    family: "grammar",
    sourceKinds: ["cfg"],
    title: l(
      "Forma normale di Chomsky",
      "Chomsky normal form",
      "Forme normale de Chomsky",
      "Chomsky-Normalform",
      "Forma normal de Chomsky",
      "Forma normal de Chomsky",
    ),
    summary: l(
      "Normalizza una CFG preservandone il linguaggio.",
      "Normalizes a CFG while preserving its language.",
      "Normalise une CFG en preservant son langage.",
      "Normalisiert eine CFG unter Erhalt ihrer Sprache.",
      "Normaliza una CFG preservando su lenguaje.",
      "Normaliza uma CFG preservando sua linguagem.",
    ),
    theory: l(
      "Si aggiunge un nuovo simbolo iniziale, poi si eliminano epsilon, produzioni unitarie e simboli inutili; infine le produzioni vengono binarizzate.",
      "A new start symbol is added, then epsilon rules, unit rules, and useless symbols are removed before productions are binarized.",
      "On ajoute un nouveau depart, elimine epsilon, unites et symboles inutiles, puis binarise les productions.",
      "Ein neuer Start wird hinzugefugt; epsilon-, Einheits- und nutzlose Regeln werden entfernt, danach wird binarisiert.",
      "Se agrega un nuevo inicio, se eliminan epsilon, reglas unitarias y simbolos inutiles, y se binarizan las producciones.",
      "Adiciona-se um novo inicio, removem-se epsilon, regras unitarias e simbolos inuteis, e binarizam-se as producoes.",
    ),
  },
  {
    id: "cyk",
    code: "CYK",
    family: "grammar",
    sourceKinds: ["cfg"],
    title: l(
      "Algoritmo CYK",
      "CYK algorithm",
      "Algorithme CYK",
      "CYK-Algorithmus",
      "Algoritmo CYK",
      "Algoritmo CYK",
    ),
    summary: l(
      "Riconosce parole con una CFG in forma di Chomsky.",
      "Recognizes words with a CFG in Chomsky normal form.",
      "Reconnait des mots avec une CFG en forme de Chomsky.",
      "Erkennt Worter mit einer CFG in Chomsky-Normalform.",
      "Reconoce palabras con una CFG en forma de Chomsky.",
      "Reconhece palavras com uma CFG na forma de Chomsky.",
    ),
    theory: l(
      "La tabella triangolare registra quali variabili generano ogni sottostringa; la cella finale deve contenere l'iniziale.",
      "The triangular table records which variables derive each substring; the final cell must contain the start variable.",
      "La table triangulaire note les variables qui derivent chaque sous-chaine; la cellule finale doit contenir le depart.",
      "Die Dreieckstabelle speichert Variablen fur jedes Teilwort; die letzte Zelle muss die Startvariable enthalten.",
      "La tabla triangular registra variables para cada subcadena; la celda final debe contener el inicio.",
      "A tabela triangular registra variaveis para cada subcadeia; a celula final deve conter o inicio.",
    ),
  },
  {
    id: "ll1_analysis",
    code: "LL(1)",
    family: "grammar",
    sourceKinds: ["cfg"],
    title: l(
      "FIRST, FOLLOW e LL(1)",
      "FIRST, FOLLOW, and LL(1)",
      "FIRST, FOLLOW et LL(1)",
      "FIRST, FOLLOW und LL(1)",
      "FIRST, FOLLOW y LL(1)",
      "FIRST, FOLLOW e LL(1)",
    ),
    summary: l(
      "Costruisce insiemi, tabella predittiva e segnala conflitti.",
      "Builds sets and a predictive table, reporting conflicts.",
      "Construit les ensembles et la table predictive, avec conflits.",
      "Erstellt Mengen und Vorhersagetabelle samt Konflikten.",
      "Construye conjuntos y tabla predictiva, indicando conflictos.",
      "Constroi conjuntos e tabela preditiva, indicando conflitos.",
    ),
    theory: l(
      "FIRST descrive gli inizi possibili; FOLLOW i simboli successivi a una variabile. Ogni cella LL(1) deve contenere al massimo una produzione.",
      "FIRST describes possible prefixes; FOLLOW describes symbols after a variable. Every LL(1) cell must contain at most one production.",
      "FIRST decrit les debuts possibles; FOLLOW les symboles apres une variable. Chaque cellule LL(1) contient au plus une production.",
      "FIRST beschreibt mogliche Anfange; FOLLOW Symbole nach einer Variable. Jede LL(1)-Zelle darf hochstens eine Produktion enthalten.",
      "FIRST describe inicios posibles; FOLLOW los simbolos tras una variable. Cada celda LL(1) debe tener como maximo una produccion.",
      "FIRST descreve inicios possiveis; FOLLOW os simbolos apos uma variavel. Cada celula LL(1) deve ter no maximo uma producao.",
    ),
  },
  {
    id: "regular_pumping",
    code: "PUMP REG",
    family: "proof",
    title: l(
      "Pumping lemma regolare",
      "Regular pumping lemma",
      "Lemme de pompage regulier",
      "Pumping-Lemma regular",
      "Lema de bombeo regular",
      "Lema do bombeamento regular",
    ),
    summary: l(
      "Enumera tutte le decomposizioni xyz ammissibili.",
      "Enumerates every admissible xyz decomposition.",
      "Enumere toutes les decompositions xyz admissibles.",
      "Listet alle zulassigen xyz-Zerlegungen.",
      "Enumera todas las descomposiciones xyz admisibles.",
      "Enumera todas as decomposicoes xyz admissiveis.",
    ),
    theory: l(
      "Per ogni p esiste una parola lunga e ogni decomposizione valida deve poter essere pompata. Lo strumento organizza i quantificatori ma non decide la regolarita.",
      "For every p a long word is chosen and every valid split must pump. This tool organizes the quantifiers but does not decide regularity.",
      "Pour tout p on choisit un mot long et chaque coupe valide doit etre pompable. L'outil ne decide pas la regularite.",
      "Fur jedes p wird ein langes Wort gewahlt und jede gultige Zerlegung muss pumpbar sein. Das Werkzeug entscheidet Regularitat nicht.",
      "Para cada p se elige una palabra larga y toda division valida debe bombearse. La herramienta no decide regularidad.",
      "Para cada p escolhe-se uma palavra longa e toda divisao valida deve bombear. A ferramenta nao decide regularidade.",
    ),
  },
  {
    id: "context_free_pumping",
    code: "PUMP CFL",
    family: "proof",
    title: l(
      "Pumping lemma context-free",
      "Context-free pumping lemma",
      "Lemme de pompage context-free",
      "Pumping-Lemma kontextfrei",
      "Lema de bombeo context-free",
      "Lema do bombeamento context-free",
    ),
    summary: l(
      "Enumera tutte le decomposizioni uvxyz ammissibili.",
      "Enumerates every admissible uvxyz decomposition.",
      "Enumere toutes les decompositions uvxyz admissibles.",
      "Listet alle zulassigen uvxyz-Zerlegungen.",
      "Enumera todas las descomposiciones uvxyz admisibles.",
      "Enumera todas as decomposicoes uvxyz admissiveis.",
    ),
    theory: l(
      "I segmenti v e y vengono pompati insieme, con |vxy| <= p e |vy| > 0. Il lemma e necessario ma non sufficiente per essere context-free.",
      "Segments v and y pump together, with |vxy| <= p and |vy| > 0. The lemma is necessary but not sufficient for context-freeness.",
      "Les segments v et y sont pompes ensemble, avec |vxy| <= p et |vy| > 0. Le lemme est necessaire mais non suffisant.",
      "v und y werden gemeinsam gepumpt, mit |vxy| <= p und |vy| > 0. Das Lemma ist notwendig, aber nicht hinreichend.",
      "Los segmentos v e y se bombean juntos, con |vxy| <= p y |vy| > 0. El lema es necesario pero no suficiente.",
      "Os segmentos v e y sao bombeados juntos, com |vxy| <= p e |vy| > 0. O lema e necessario, mas nao suficiente.",
    ),
  },
];

const ui = {
  it: {
    back: "Catalogo",
    eyebrow: "Laboratorio algoritmico",
    heading: "Segui la trasformazione, non solo il risultato.",
    intro: "Scegli un algoritmo, collega un progetto compatibile e osserva ogni passaggio formale.",
    all: "Tutti",
    automata: "Automi",
    grammar: "Grammatiche",
    proof: "Strumenti di dimostrazione",
    source: "Modello sorgente",
    current: "Modello corrente",
    noSource: "Apri o crea un modello compatibile per eseguire questo algoritmo.",
    run: "Esegui algoritmo",
    running: "Calcolo in corso",
    word: "Parola testimone",
    p: "Pumping length p",
    exponents: "Esponenti da verificare",
    second: "Secondo DFA",
    theory: "Fondamento formale",
    study: "Studia l'algoritmo",
    definition: "Definizione",
    notation: "Notazione",
    prerequisites: "Prima di eseguire",
    procedure: "Procedura",
    interpretation: "Come leggere il risultato",
    limits: "Limiti e complessita",
    example: "Esempio guidato",
    result: "Risultato",
    steps: "Passaggi",
    export: "Esporta risultato",
    open: "Apri come nuovo progetto",
    decompositions: "Decomposizioni",
  },
  en: {
    back: "Catalogue",
    eyebrow: "Algorithm laboratory",
    heading: "Follow the transformation, not only the result.",
    intro: "Choose an algorithm, connect a compatible project, and inspect every formal step.",
    all: "All",
    automata: "Automata",
    grammar: "Grammars",
    proof: "Proof tools",
    source: "Source model",
    current: "Current model",
    noSource: "Open or create a compatible model to run this algorithm.",
    run: "Run algorithm",
    running: "Computing",
    word: "Witness word",
    p: "Pumping length p",
    exponents: "Exponents to inspect",
    second: "Second DFA",
    theory: "Formal basis",
    study: "Study the algorithm",
    definition: "Definition",
    notation: "Notation",
    prerequisites: "Before you run it",
    procedure: "Procedure",
    interpretation: "How to read the result",
    limits: "Limits and complexity",
    example: "Worked example",
    result: "Result",
    steps: "Steps",
    export: "Export result",
    open: "Open as new project",
    decompositions: "Decompositions",
  },
  fr: {
    back: "Catalogue",
    eyebrow: "Laboratoire d'algorithmes",
    heading: "Suivez la transformation, pas seulement le resultat.",
    intro: "Choisissez un algorithme, reliez un projet compatible et inspectez chaque etape formelle.",
    all: "Tous",
    automata: "Automates",
    grammar: "Grammaires",
    proof: "Outils de preuve",
    source: "Modele source",
    current: "Modele actuel",
    noSource: "Ouvrez ou creez un modele compatible pour executer cet algorithme.",
    run: "Executer l'algorithme",
    running: "Calcul en cours",
    word: "Mot temoin",
    p: "Longueur de pompage p",
    exponents: "Exposants a examiner",
    second: "Deuxieme AFD",
    theory: "Base formelle",
    study: "Etudier l'algorithme",
    definition: "Definition",
    notation: "Notation",
    prerequisites: "Avant l'execution",
    procedure: "Procedure",
    interpretation: "Lire le resultat",
    limits: "Limites et complexite",
    example: "Exemple guide",
    result: "Resultat",
    steps: "Etapes",
    export: "Exporter le resultat",
    open: "Ouvrir comme nouveau projet",
    decompositions: "Decompositions",
  },
  de: {
    back: "Katalog",
    eyebrow: "Algorithmenlabor",
    heading: "Verfolge die Transformation, nicht nur das Ergebnis.",
    intro: "Wahle einen Algorithmus, verbinde ein passendes Projekt und prufe jeden formalen Schritt.",
    all: "Alle",
    automata: "Automaten",
    grammar: "Grammatiken",
    proof: "Beweiswerkzeuge",
    source: "Quellmodell",
    current: "Aktuelles Modell",
    noSource: "Offne oder erstelle ein passendes Modell, um diesen Algorithmus auszufuhren.",
    run: "Algorithmus ausfuhren",
    running: "Berechnung",
    word: "Zeugenwort",
    p: "Pumping-Lange p",
    exponents: "Zu prufende Exponenten",
    second: "Zweiter DFA",
    theory: "Formale Grundlage",
    study: "Algorithmus verstehen",
    definition: "Definition",
    notation: "Notation",
    prerequisites: "Vor der Ausfuhrung",
    procedure: "Verfahren",
    interpretation: "Ergebnis lesen",
    limits: "Grenzen und Komplexitat",
    example: "Gefuhrtes Beispiel",
    result: "Ergebnis",
    steps: "Schritte",
    export: "Ergebnis exportieren",
    open: "Als neues Projekt offnen",
    decompositions: "Zerlegungen",
  },
  es: {
    back: "Catalogo",
    eyebrow: "Laboratorio de algoritmos",
    heading: "Sigue la transformacion, no solo el resultado.",
    intro: "Elige un algoritmo, conecta un proyecto compatible e inspecciona cada paso formal.",
    all: "Todos",
    automata: "Automatas",
    grammar: "Gramaticas",
    proof: "Herramientas de prueba",
    source: "Modelo fuente",
    current: "Modelo actual",
    noSource: "Abre o crea un modelo compatible para ejecutar este algoritmo.",
    run: "Ejecutar algoritmo",
    running: "Calculando",
    word: "Palabra testigo",
    p: "Longitud de bombeo p",
    exponents: "Exponentes a comprobar",
    second: "Segundo AFD",
    theory: "Base formal",
    study: "Estudiar el algoritmo",
    definition: "Definicion",
    notation: "Notacion",
    prerequisites: "Antes de ejecutar",
    procedure: "Procedimiento",
    interpretation: "Como leer el resultado",
    limits: "Limites y complejidad",
    example: "Ejemplo guiado",
    result: "Resultado",
    steps: "Pasos",
    export: "Exportar resultado",
    open: "Abrir como proyecto nuevo",
    decompositions: "Descomposiciones",
  },
  pt: {
    back: "Catalogo",
    eyebrow: "Laboratorio de algoritmos",
    heading: "Acompanhe a transformacao, nao apenas o resultado.",
    intro: "Escolha um algoritmo, conecte um projeto compativel e examine cada passo formal.",
    all: "Todos",
    automata: "Automatos",
    grammar: "Gramaticas",
    proof: "Ferramentas de prova",
    source: "Modelo de origem",
    current: "Modelo atual",
    noSource: "Abra ou crie um modelo compativel para executar este algoritmo.",
    run: "Executar algoritmo",
    running: "Calculando",
    word: "Palavra testemunha",
    p: "Comprimento de bombeamento p",
    exponents: "Expoentes a verificar",
    second: "Segundo AFD",
    theory: "Base formal",
    study: "Estudar o algoritmo",
    definition: "Definicao",
    notation: "Notacao",
    prerequisites: "Antes de executar",
    procedure: "Procedimento",
    interpretation: "Como ler o resultado",
    limits: "Limites e complexidade",
    example: "Exemplo guiado",
    result: "Resultado",
    steps: "Passos",
    export: "Exportar resultado",
    open: "Abrir como novo projeto",
    decompositions: "Decomposicoes",
  },
} satisfies Record<Language, Record<string, string>>;

type AlgorithmStep = { title: string; explanation: string; facts: Record<string, string> };
type AlgorithmResponse = { kind: string; result: Record<string, unknown> };
type PumpedWord = { exponent: number; word: string[] };

function tokenise(value: string): string[] {
  return value.trim() ? value.trim().split(/\s+/) : [];
}

function responseSteps(response?: AlgorithmResponse): AlgorithmStep[] {
  const steps = response?.result.steps;
  return Array.isArray(steps) ? (steps as AlgorithmStep[]) : [];
}

function AlgorithmStudy({ id, language }: { id: AlgorithmId; language: Language }) {
  const text = ui[language];
  const study = algorithmTheory[id];
  const sectionId = `algorithm-study-${id}`;

  return (
    <details className="algorithm-study" open>
      <summary id={sectionId}>{text.study}</summary>
      <div className="algorithm-study-grid" aria-labelledby={sectionId}>
        <section>
          <h3>{text.definition}</h3>
          <p>{study.definition[language]}</p>
        </section>
        <section>
          <h3>{text.notation}</h3>
          <p>{study.notation[language]}</p>
        </section>
        <section>
          <h3>{text.prerequisites}</h3>
          <p>{study.prerequisites[language]}</p>
        </section>
        <section className="algorithm-study-procedure">
          <h3>{text.procedure}</h3>
          <ol>
            {study.procedure.map((step) => (
              <li key={step[language]}>{step[language]}</li>
            ))}
          </ol>
        </section>
        <section>
          <h3>{text.interpretation}</h3>
          <p>{study.interpretation[language]}</p>
        </section>
        <section>
          <h3>{text.limits}</h3>
          <p>{study.limits[language]}</p>
        </section>
        <section className="algorithm-study-example">
          <h3>{text.example}</h3>
          <p>{study.example[language]}</p>
        </section>
      </div>
    </details>
  );
}

export function AlgorithmLab({
  kind,
  definition,
  workspaces,
  onBack,
  onUseWorkspace,
  onOpenResult,
}: {
  kind: MachineKind;
  definition: Definition;
  workspaces: WorkspaceTab[];
  onBack: () => void;
  onUseWorkspace: (workspace: WorkspaceTab) => void;
  onOpenResult: (kind: MachineKind, definition: Definition, name: string) => void;
}) {
  const { language } = useI18n();
  const text = ui[language];
  const [family, setFamily] = useState<"all" | AlgorithmDescriptor["family"]>("all");
  const [selectedId, setSelectedId] = useState<AlgorithmId>("thompson");
  const [word, setWord] = useState("a a b b");
  const [pumpingLength, setPumpingLength] = useState(2);
  const [exponentText, setExponentText] = useState("0 2");
  const [sourceWorkspaceId, setSourceWorkspaceId] = useState("current");
  const [rightWorkspaceId, setRightWorkspaceId] = useState("");
  const [result, setResult] = useState<AlgorithmResponse>();
  const [error, setError] = useState<string>();
  const [running, setRunning] = useState(false);
  const requestId = useRef(0);
  const selected = algorithms.find((item) => item.id === selectedId) ?? algorithms[0];
  const visible = algorithms.filter((item) => family === "all" || item.family === family);
  const compatible = !selected.sourceKinds || selected.sourceKinds.includes(kind);
  const sourceWorkspaces = workspaces.filter((item) => selected.sourceKinds?.includes(item.kind));
  const dfaWorkspaces = workspaces.filter((item) => item.kind === "dfa");

  async function run() {
    const exponentTokens = tokenise(exponentText);
    const exponents = exponentTokens.map((value) => Number(value));
    if (
      (selected.id === "regular_pumping" || selected.id === "context_free_pumping") &&
      (!Number.isSafeInteger(pumpingLength) ||
        pumpingLength < 1 ||
        exponentTokens.length === 0 ||
        exponents.some((value) => !Number.isSafeInteger(value) || value < 0 || value > 64))
    ) {
      setError("Use a positive pumping length and whole-number exponents from 0 to 64.");
      return;
    }
    const activeRequest = ++requestId.current;
    setRunning(true);
    setError(undefined);
    try {
      const sourceDefinition =
        sourceWorkspaceId === "current"
          ? definition
          : (sourceWorkspaces.find((item) => item.id === sourceWorkspaceId)?.definition ?? definition);
      let input: unknown = sourceDefinition;
      if (selected.id === "dfa_equivalence") {
        const right =
          dfaWorkspaces.find((item) => item.id === rightWorkspaceId)?.definition ?? sourceDefinition;
        input = { left: sourceDefinition, right };
      } else if (selected.id === "cyk") {
        input = { grammar: sourceDefinition, word: tokenise(word) };
      } else if (selected.id === "regular_pumping" || selected.id === "context_free_pumping") {
        input = {
          word: tokenise(word),
          pumping_length: pumpingLength,
          exponents,
          max_decompositions: 500,
        };
      }
      const response = await invoke<AlgorithmResponse>("run_algorithm", {
        request: { kind: selected.id, input },
      });
      if (activeRequest !== requestId.current) return;
      setResult(response);
    } catch (cause) {
      if (activeRequest !== requestId.current) return;
      setError(String(cause));
      setResult(undefined);
    } finally {
      if (activeRequest === requestId.current) setRunning(false);
    }
  }

  function exportResult() {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ algorithm: selected.id, response: result }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.id}-result.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openResult() {
    if (!result) return;
    const payload = result.result;
    if (result.kind === "automaton" && payload.result) {
      const algorithm = String(payload.algorithm ?? selected.id);
      const nextKind: MachineKind = ["subset_construction", "dfa_minimization"].includes(algorithm)
        ? "dfa"
        : algorithm === "remove_unreachable" && (kind === "dfa" || kind === "nfa")
          ? kind
          : "nfa";
      onOpenResult(nextKind, payload.result as Definition, selected.title[language]);
    } else if (result.kind === "grammar" && payload.result) {
      onOpenResult("cfg", payload.result as Definition, selected.title[language]);
    } else if (result.kind === "pushdown" && payload.result) {
      onOpenResult("pda", payload.result as Definition, selected.title[language]);
    } else if (result.kind === "regex" && typeof payload.expression === "string") {
      onOpenResult("regex", { expression: payload.expression }, selected.title[language]);
    }
  }

  const canOpen = result && ["automaton", "grammar", "pushdown", "regex"].includes(result.kind);
  const decompositionList = result?.result.decompositions;

  return (
    <main className="algorithm-screen">
      <header className="algorithm-header">
        <button className="back-button" onClick={onBack}>
          {"<-"} {text.back}
        </button>
        <div>
          <p className="kicker">{text.eyebrow}</p>
          <h1>{text.heading}</h1>
          <p>{text.intro}</p>
        </div>
        <div className="algorithm-orbit" aria-hidden="true">
          <span>q0</span>
          <i>epsilon</i>
          <span>q1</span>
        </div>
      </header>

      <div className="algorithm-layout">
        <aside className="algorithm-index" aria-label={text.eyebrow}>
          <div className="algorithm-family-tabs">
            {(["all", "automata", "grammar", "proof"] as const).map((item) => (
              <button key={item} className={family === item ? "active" : ""} onClick={() => setFamily(item)}>
                {text[item]}
              </button>
            ))}
          </div>
          <div className="algorithm-list">
            {visible.map((item) => (
              <button
                key={item.id}
                className={selected.id === item.id ? "active" : ""}
                onClick={() => {
                  requestId.current += 1;
                  setSelectedId(item.id);
                  setResult(undefined);
                  setError(undefined);
                }}
              >
                <span>{item.code}</span>
                <strong>{item.title[language]}</strong>
                <small>{item.summary[language]}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="algorithm-workbench">
          <div className="algorithm-title-row">
            <span className="algorithm-code">{selected.code}</span>
            <div>
              <p className="kicker">{text.theory}</p>
              <h2>{selected.title[language]}</h2>
              <p>{selected.theory[language]}</p>
            </div>
          </div>

          <AlgorithmStudy id={selected.id} language={language} />

          <div className="algorithm-controls">
            {selected.sourceKinds && (
              <label>
                {text.source}
                <select
                  value={sourceWorkspaceId}
                  onChange={(event) => {
                    setSourceWorkspaceId(event.target.value);
                    const workspace = sourceWorkspaces.find((item) => item.id === event.target.value);
                    if (workspace) onUseWorkspace(workspace);
                  }}
                >
                  <option value="current">
                    {text.current}: {metaFor(kind).code}
                  </option>
                  {sourceWorkspaces.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selected.id === "dfa_equivalence" && (
              <label>
                {text.second}
                <select
                  value={rightWorkspaceId}
                  onChange={(event) => setRightWorkspaceId(event.target.value)}
                >
                  <option value="">{text.current}</option>
                  {dfaWorkspaces.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["cyk", "regular_pumping", "context_free_pumping"].includes(selected.id) && (
              <label>
                {text.word}
                <input value={word} onChange={(event) => setWord(event.target.value)} placeholder="a a b b" />
              </label>
            )}
            {["regular_pumping", "context_free_pumping"].includes(selected.id) && (
              <>
                <label>
                  {text.p}
                  <input
                    type="number"
                    min={1}
                    value={pumpingLength}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber;
                      if (Number.isSafeInteger(value) && value >= 1) setPumpingLength(value);
                    }}
                  />
                </label>
                <label>
                  {text.exponents}
                  <input
                    value={exponentText}
                    onChange={(event) => setExponentText(event.target.value)}
                    placeholder="0 2"
                  />
                </label>
              </>
            )}
          </div>

          {!compatible && selected.sourceKinds && <div className="algorithm-guidance">{text.noSource}</div>}
          <button
            className="run-button algorithm-run"
            disabled={running || !compatible}
            onClick={() => void run()}
          >
            {running ? text.running : text.run}
          </button>
          {error && <div className="error-box">{error}</div>}

          {result && (
            <section className="algorithm-result" aria-live="polite">
              <div className="algorithm-result-head">
                <div>
                  <p className="kicker">{text.result}</p>
                  <h3>{selected.title[language]}</h3>
                </div>
                <div>
                  {canOpen && (
                    <button className="solid-button" onClick={openResult}>
                      {text.open}
                    </button>
                  )}
                  <button className="ghost-button" onClick={exportResult}>
                    {text.export}
                  </button>
                </div>
              </div>
              <ResultSummary response={result} decompositionLabel={text.decompositions} />
              {responseSteps(result).length > 0 && (
                <div className="algorithm-steps">
                  <h4>{text.steps}</h4>
                  {responseSteps(result).map((step, index) => (
                    <article key={`${step.title}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h5>{step.title}</h5>
                        <p>{step.explanation}</p>
                        {Object.keys(step.facts).length > 0 && (
                          <dl>
                            {Object.entries(step.facts).map(([key, value]) => (
                              <div key={key}>
                                <dt>{key}</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {Array.isArray(decompositionList) && (
                <div className="decomposition-list">
                  <h4>
                    {text.decompositions} ({decompositionList.length})
                  </h4>
                  {result.result.truncated === true && (
                    <p className="algorithm-guidance">
                      Only the first {decompositionList.length} decompositions are shown.
                    </p>
                  )}
                  {(decompositionList as Record<string, unknown>[]).slice(0, 40).map((item, index) => (
                    <article key={index}>
                      <code>
                        {Object.entries(item)
                          .filter(([key]) => key !== "pumped")
                          .map(
                            ([key, value]) =>
                              `${key}=${Array.isArray(value) ? value.join(" ") || "epsilon" : value}`,
                          )
                          .join(" | ")}
                      </code>
                      {Array.isArray(item.pumped) && (
                        <div className="pumped-words">
                          {(item.pumped as PumpedWord[]).map((variant) => (
                            <span key={variant.exponent}>
                              <b>i={variant.exponent}</b>
                              {variant.word.join(" ") || "epsilon"}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function ResultSummary({
  response,
  decompositionLabel,
}: {
  response: AlgorithmResponse;
  decompositionLabel: string;
}) {
  const data = response.result;
  if (response.kind === "automaton" && data.result) {
    const machine = data.result as Record<string, unknown>;
    return (
      <div className="algorithm-metrics">
        <span>
          <strong>{(machine.states as string[])?.length ?? 0}</strong> states
        </span>
        <span>
          <strong>{(machine.transitions as unknown[])?.length ?? 0}</strong> transitions
        </span>
      </div>
    );
  }
  if (response.kind === "grammar" && data.result) {
    const grammar = data.result as Record<string, unknown>;
    return (
      <div className="algorithm-metrics">
        <span>
          <strong>{(grammar.variables as string[])?.length ?? 0}</strong> variables
        </span>
        <span>
          <strong>{(grammar.rules as unknown[])?.length ?? 0}</strong> rules
        </span>
      </div>
    );
  }
  if (response.kind === "regex") return <div className="algorithm-expression">{String(data.expression)}</div>;
  if (response.kind === "equivalence")
    return (
      <div className="algorithm-metrics">
        <span>
          <strong>{data.equivalent ? "=" : "not ="}</strong> languages
        </span>
        <span>witness: {Array.isArray(data.witness) ? data.witness.join(" ") || "epsilon" : "none"}</span>
      </div>
    );
  if (response.kind === "ll1")
    return (
      <div className="algorithm-metrics">
        <span>
          <strong>{Object.keys((data.first as object) ?? {}).length}</strong> FIRST sets
        </span>
        <span>
          <strong>{Object.keys((data.follow as object) ?? {}).length}</strong> FOLLOW sets
        </span>
        <span>
          <strong>{(data.conflicts as unknown[])?.length ?? 0}</strong> conflicts
        </span>
      </div>
    );
  if (response.kind === "cyk")
    return (
      <div className="algorithm-metrics">
        <span>
          <strong>{data.accepted ? "accepted" : "rejected"}</strong>
        </span>
        <span>{String(data.reason)}</span>
      </div>
    );
  if (response.kind.includes("pumping"))
    return (
      <div className="algorithm-metrics">
        <span>
          <strong>{(data.decompositions as unknown[])?.length ?? 0}</strong>{" "}
          {decompositionLabel.toLowerCase()}
        </span>
        <span>{String(data.note)}</span>
      </div>
    );
  return null;
}
