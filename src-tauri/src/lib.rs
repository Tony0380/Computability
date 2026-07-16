use computability_core::{
    AutomatonAlgorithmReport, ContextFreeGrammar, ContextFreePumpingReport, ContextualLSystem, CykRun,
    DfaEquivalenceReport, FiniteAutomaton, GrammarAlgorithmReport, LSystem, Ll1Analysis, Machine,
    MealyMachine, MooreMachine, MultiTapeTuringMachine, PetriNet, PumpingRequest, PushdownAlgorithmReport,
    PushdownAutomaton, RegexAlgorithmReport, RegularExpression, RegularGrammar, RegularPumpingReport,
    StochasticLSystem, TuringMachine, UnrestrictedGrammar, analyze_context_free_pumping,
    analyze_regular_pumping,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", content = "definition", rename_all = "snake_case")]
enum SimulationRequest {
    Dfa(FiniteAutomaton),
    Nfa(FiniteAutomaton),
    Mealy(MealyMachine),
    Moore(MooreMachine),
    Pda(PushdownAutomaton),
    Turing { machine: TuringMachine, max_steps: usize },
    MultiTuring { machine: MultiTapeTuringMachine, max_steps: usize },
    RegularGrammar(RegularGrammar),
    Cfg(ContextFreeGrammar),
    Cyk(ContextFreeGrammar),
    Ll1(ContextFreeGrammar),
    UnrestrictedGrammar(UnrestrictedGrammar),
    Regex(RegularExpression),
    Lsystem { system: LSystem, generations: usize },
    ContextualLsystem { system: ContextualLSystem, generations: usize },
    StochasticLsystem { system: StochasticLSystem, generations: usize },
    Petri(PetriNet),
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", content = "result", rename_all = "snake_case")]
enum SimulationResponse {
    Automaton(computability_core::AutomatonRun),
    Transducer(computability_core::TransducerRun),
    Pushdown(computability_core::PushdownRun),
    Turing(computability_core::TuringRun),
    MultiTuring(computability_core::MultiTapeRun),
    Grammar(computability_core::GrammarRun),
    Cyk(computability_core::CykRun),
    Ll1(computability_core::Ll1Run),
    Lsystem(computability_core::LSystemRun),
    Petri(computability_core::PetriRun),
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", content = "definition", rename_all = "snake_case")]
enum TransformationRequest {
    Determinize(FiniteAutomaton),
    MinimizeDfa(FiniteAutomaton),
    RegexToNfa(RegularExpression),
    RegularGrammarToNfa(RegularGrammar),
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", content = "input", rename_all = "snake_case")]
enum AlgorithmRequest {
    Thompson(RegularExpression),
    SubsetConstruction(FiniteAutomaton),
    DfaMinimization(FiniteAutomaton),
    StateElimination(FiniteAutomaton),
    EpsilonElimination(FiniteAutomaton),
    RemoveUnreachable(FiniteAutomaton),
    DfaEquivalence { left: FiniteAutomaton, right: FiniteAutomaton },
    RegularGrammarToNfa(RegularGrammar),
    CfgToPda(ContextFreeGrammar),
    ChomskyNormalForm(ContextFreeGrammar),
    Ll1Analysis(ContextFreeGrammar),
    Cyk { grammar: ContextFreeGrammar, word: Vec<String> },
    RegularPumping(PumpingRequest),
    ContextFreePumping(PumpingRequest),
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", content = "result", rename_all = "snake_case")]
enum AlgorithmResponse {
    Automaton(AutomatonAlgorithmReport),
    Regex(RegexAlgorithmReport),
    Grammar(GrammarAlgorithmReport),
    Pushdown(PushdownAlgorithmReport),
    Equivalence(DfaEquivalenceReport),
    Ll1(Ll1Analysis),
    Cyk(CykRun),
    RegularPumping(RegularPumpingReport),
    ContextFreePumping(ContextFreePumpingReport),
}

#[tauri::command]
fn simulate(
    request: SimulationRequest,
    input: Vec<String>,
    tape_inputs: Option<Vec<Vec<String>>>,
) -> Result<SimulationResponse, String> {
    match request {
        SimulationRequest::Dfa(machine) => machine.run_dfa(&input).map(SimulationResponse::Automaton),
        SimulationRequest::Nfa(machine) => machine.run_nfa(&input).map(SimulationResponse::Automaton),
        SimulationRequest::Mealy(machine) => machine.transduce(&input).map(SimulationResponse::Transducer),
        SimulationRequest::Moore(machine) => machine.transduce(&input).map(SimulationResponse::Transducer),
        SimulationRequest::Pda(machine) => machine.run(&input).map(SimulationResponse::Pushdown),
        SimulationRequest::Turing { machine, max_steps } => {
            machine.run_nondeterministic(&input, max_steps, max_steps).map(SimulationResponse::Turing)
        }
        SimulationRequest::MultiTuring { machine, max_steps } => machine
            .run(&tape_inputs.unwrap_or_else(|| vec![input]), max_steps)
            .map(SimulationResponse::MultiTuring),
        SimulationRequest::RegularGrammar(grammar) => {
            grammar.simulate(&input).map(SimulationResponse::Automaton)
        }
        SimulationRequest::Cfg(grammar) => grammar.recognizes(&input).map(SimulationResponse::Grammar),
        SimulationRequest::Cyk(grammar) => grammar.cyk(&input).map(SimulationResponse::Cyk),
        SimulationRequest::Ll1(grammar) => grammar.parse_ll1(&input).map(SimulationResponse::Ll1),
        SimulationRequest::UnrestrictedGrammar(grammar) => {
            grammar.recognizes(&input).map(SimulationResponse::Grammar)
        }
        SimulationRequest::Regex(expression) => {
            expression.simulate(&input).map(SimulationResponse::Automaton)
        }
        SimulationRequest::Lsystem { system, generations } => {
            system.simulate(&generations).map(SimulationResponse::Lsystem)
        }
        SimulationRequest::ContextualLsystem { system, generations } => {
            system.simulate(&generations).map(SimulationResponse::Lsystem)
        }
        SimulationRequest::StochasticLsystem { system, generations } => {
            system.simulate(&generations).map(SimulationResponse::Lsystem)
        }
        SimulationRequest::Petri(net) => net.fire_sequence(&input).map(SimulationResponse::Petri),
    }
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn transform(request: TransformationRequest) -> Result<FiniteAutomaton, String> {
    match request {
        TransformationRequest::Determinize(machine) => machine.determinize(),
        TransformationRequest::MinimizeDfa(machine) => machine.minimize_dfa(),
        TransformationRequest::RegexToNfa(expression) => expression.to_nfa(),
        TransformationRequest::RegularGrammarToNfa(grammar) => grammar.to_nfa(),
    }
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn cfg_to_pda(grammar: ContextFreeGrammar) -> Result<PushdownAutomaton, String> {
    grammar.to_pda().map_err(|error| error.to_string())
}

#[tauri::command]
fn run_algorithm(request: AlgorithmRequest) -> Result<AlgorithmResponse, String> {
    match request {
        AlgorithmRequest::Thompson(expression) => {
            expression.thompson_report().map(AlgorithmResponse::Automaton)
        }
        AlgorithmRequest::SubsetConstruction(machine) => {
            machine.determinize_report().map(AlgorithmResponse::Automaton)
        }
        AlgorithmRequest::DfaMinimization(machine) => {
            machine.minimize_report().map(AlgorithmResponse::Automaton)
        }
        AlgorithmRequest::StateElimination(machine) => {
            machine.to_regex_report().map(AlgorithmResponse::Regex)
        }
        AlgorithmRequest::EpsilonElimination(machine) => {
            machine.eliminate_epsilon_report().map(AlgorithmResponse::Automaton)
        }
        AlgorithmRequest::RemoveUnreachable(machine) => {
            machine.remove_unreachable_report().map(AlgorithmResponse::Automaton)
        }
        AlgorithmRequest::DfaEquivalence { left, right } => {
            left.equivalent_to(&right).map(AlgorithmResponse::Equivalence)
        }
        AlgorithmRequest::RegularGrammarToNfa(grammar) => {
            grammar.to_nfa_report().map(AlgorithmResponse::Automaton)
        }
        AlgorithmRequest::CfgToPda(grammar) => grammar.to_pda_report().map(AlgorithmResponse::Pushdown),
        AlgorithmRequest::ChomskyNormalForm(grammar) => {
            grammar.chomsky_report().map(AlgorithmResponse::Grammar)
        }
        AlgorithmRequest::Ll1Analysis(grammar) => grammar.ll1_analysis().map(AlgorithmResponse::Ll1),
        AlgorithmRequest::Cyk { grammar, word } => grammar.cyk(&word).map(AlgorithmResponse::Cyk),
        AlgorithmRequest::RegularPumping(request) => {
            analyze_regular_pumping(&request).map(AlgorithmResponse::RegularPumping)
        }
        AlgorithmRequest::ContextFreePumping(request) => {
            analyze_context_free_pumping(&request).map(AlgorithmResponse::ContextFreePumping)
        }
    }
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn model_catalogue() -> Vec<ModelDescriptor> {
    vec![
        ModelDescriptor::ready("DFA", "Deterministic finite automaton", "Finite automata"),
        ModelDescriptor::ready(
            "NFA",
            "Nondeterministic finite automaton with epsilon transitions",
            "Finite automata",
        ),
        ModelDescriptor::ready("MEALY", "Mealy transducer", "Finite-state transducers"),
        ModelDescriptor::ready("MOORE", "Moore transducer", "Finite-state transducers"),
        ModelDescriptor::ready("PDA", "Nondeterministic pushdown automaton", "Pushdown automata"),
        ModelDescriptor::ready("TM", "Single-tape nondeterministic Turing machine", "Turing machines"),
        ModelDescriptor::ready("MTM", "Multi-tape deterministic Turing machine", "Turing machines"),
        ModelDescriptor::ready("REGULAR-GRAMMAR", "Right-linear regular grammar", "Grammars"),
        ModelDescriptor::ready("CFG", "Context-free grammar", "Grammars"),
        ModelDescriptor::ready("UNRESTRICTED-GRAMMAR", "Unrestricted grammar", "Grammars"),
        ModelDescriptor::ready("REGEX", "Regular expression", "Regular languages"),
        ModelDescriptor::ready("L-SYSTEM", "L-system", "Formal systems"),
        ModelDescriptor::ready("CONTEXTUAL-L-SYSTEM", "Contextual L-system", "Formal systems"),
        ModelDescriptor::ready("STOCHASTIC-L-SYSTEM", "Stochastic L-system", "Formal systems"),
        ModelDescriptor::ready("PN", "Place/transition Petri net", "Petri nets"),
    ]
}

#[derive(Debug, Serialize)]
struct ModelDescriptor {
    id: &'static str,
    name: &'static str,
    family: &'static str,
    available: bool,
}
impl ModelDescriptor {
    fn ready(id: &'static str, name: &'static str, family: &'static str) -> Self {
        Self { id, name, family, available: true }
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            simulate,
            transform,
            cfg_to_pda,
            run_algorithm,
            model_catalogue
        ])
        .run(tauri::generate_context!())
        .expect("failed to start Computability");
}
