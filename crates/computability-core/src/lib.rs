//! The pure simulation layer for Computability.
//!
//! The crate deliberately has no UI or file-system dependency, making each
//! model usable from a desktop app, a web service, or a command-line tool.

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet, VecDeque};

use serde::{Deserialize, Serialize};
mod machine;

pub use machine::{Machine, SimulationError};

pub const EPSILON: &str = "ε";
pub const BLANK: &str = "□";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FiniteTransition {
    pub from: String,
    pub symbol: String,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FiniteAutomaton {
    pub states: BTreeSet<String>,
    pub alphabet: BTreeSet<String>,
    pub start_state: String,
    pub accepting_states: BTreeSet<String>,
    pub transitions: Vec<FiniteTransition>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AutomatonRun {
    pub accepted: bool,
    pub visited_states: Vec<Vec<String>>,
    pub reason: String,
}

impl FiniteAutomaton {
    fn validate(&self, deterministic: bool) -> Result<(), SimulationError> {
        if !self.states.contains(&self.start_state) {
            return Err(SimulationError::UnknownStartState(self.start_state.clone()));
        }
        let mut seen = HashSet::new();
        for transition in &self.transitions {
            for state in [&transition.from, &transition.to] {
                if !self.states.contains(state) {
                    return Err(SimulationError::UnknownState(state.clone()));
                }
            }
            if transition.symbol != EPSILON && !self.alphabet.contains(&transition.symbol) {
                return Err(SimulationError::UnknownSymbol);
            }
            if deterministic && !seen.insert((&transition.from, &transition.symbol)) {
                return Err(SimulationError::NonDeterministicTransition {
                    state: transition.from.clone(),
                    symbol: transition.symbol.clone(),
                });
            }
        }
        Ok(())
    }

    pub fn run_dfa(&self, input: &[String]) -> Result<AutomatonRun, SimulationError> {
        self.validate(true)?;
        let map: HashMap<_, _> =
            self.transitions.iter().map(|t| ((t.from.as_str(), t.symbol.as_str()), t.to.as_str())).collect();
        let mut current = self.start_state.as_str();
        let mut visited = vec![vec![current.to_owned()]];
        for symbol in input {
            match map.get(&(current, symbol.as_str())) {
                Some(next) => current = next,
                None => {
                    return Ok(AutomatonRun {
                        accepted: false,
                        visited_states: visited,
                        reason: format!("No transition for '{symbol}' from '{current}'."),
                    });
                }
            }
            visited.push(vec![current.to_owned()]);
        }
        Ok(AutomatonRun {
            accepted: self.accepting_states.contains(current),
            visited_states: visited,
            reason: if self.accepting_states.contains(current) {
                "Ended in an accepting state.".into()
            } else {
                "Ended in a non-accepting state.".into()
            },
        })
    }

    pub fn run_nfa(&self, input: &[String]) -> Result<AutomatonRun, SimulationError> {
        self.validate(false)?;
        let closure = |seeds: BTreeSet<String>| {
            let mut result = seeds;
            let mut queue: VecDeque<_> = result.iter().cloned().collect();
            while let Some(state) = queue.pop_front() {
                for t in self.transitions.iter().filter(|t| t.from == state && t.symbol == EPSILON) {
                    if result.insert(t.to.clone()) {
                        queue.push_back(t.to.clone());
                    }
                }
            }
            result
        };
        let mut active = closure(BTreeSet::from([self.start_state.clone()]));
        let mut visited = vec![active.iter().cloned().collect()];
        for symbol in input {
            let next = self
                .transitions
                .iter()
                .filter(|t| active.contains(&t.from) && t.symbol == *symbol)
                .map(|t| t.to.clone())
                .collect();
            active = closure(next);
            visited.push(active.iter().cloned().collect());
        }
        let accepted = active.iter().any(|state| self.accepting_states.contains(state));
        Ok(AutomatonRun {
            accepted,
            visited_states: visited,
            reason: if accepted {
                "At least one active state accepts.".into()
            } else {
                "No active state accepts.".into()
            },
        })
    }

    /// Subset construction with epsilon closure. Compound-state names are
    /// descriptive only; their membership is preserved in the resulting DFA.
    pub fn determinize(&self) -> Result<FiniteAutomaton, SimulationError> {
        self.validate(false)?;
        let closure = |seeds: BTreeSet<String>| {
            let mut result = seeds;
            let mut queue: VecDeque<_> = result.iter().cloned().collect();
            while let Some(state) = queue.pop_front() {
                for transition in self.transitions.iter().filter(|t| t.from == state && t.symbol == EPSILON) {
                    if result.insert(transition.to.clone()) {
                        queue.push_back(transition.to.clone());
                    }
                }
            }
            result
        };
        let name =
            |set: &BTreeSet<String>| format!("{{{}}}", set.iter().cloned().collect::<Vec<_>>().join(","));
        let start = closure(BTreeSet::from([self.start_state.clone()]));
        let start_name = name(&start);
        let mut queue = VecDeque::from([start.clone()]);
        let mut seen = BTreeSet::from([start]);
        let mut transitions = Vec::new();
        while let Some(states) = queue.pop_front() {
            for symbol in &self.alphabet {
                let moved = self
                    .transitions
                    .iter()
                    .filter(|transition| states.contains(&transition.from) && transition.symbol == *symbol)
                    .map(|transition| transition.to.clone())
                    .collect();
                let target = closure(moved);
                if target.is_empty() {
                    continue;
                }
                if seen.insert(target.clone()) {
                    queue.push_back(target.clone());
                }
                transitions.push(FiniteTransition {
                    from: name(&states),
                    symbol: symbol.clone(),
                    to: name(&target),
                });
            }
        }
        let accepting_states = seen
            .iter()
            .filter(|set| set.iter().any(|state| self.accepting_states.contains(state)))
            .map(name)
            .collect();
        Ok(FiniteAutomaton {
            states: seen.iter().map(name).collect(),
            alphabet: self.alphabet.clone(),
            start_state: start_name,
            accepting_states,
            transitions,
        })
    }

    /// Partition-refinement minimisation for a possibly partial DFA.
    /// Unreachable states are omitted; absent transitions are not converted to
    /// an implicit trap state.
    pub fn minimize_dfa(&self) -> Result<FiniteAutomaton, SimulationError> {
        self.validate(true)?;
        let table: HashMap<_, _> = self
            .transitions
            .iter()
            .map(|transition| {
                ((transition.from.as_str(), transition.symbol.as_str()), transition.to.as_str())
            })
            .collect();
        let mut reachable = BTreeSet::from([self.start_state.clone()]);
        let mut queue = VecDeque::from([self.start_state.clone()]);
        while let Some(state) = queue.pop_front() {
            for symbol in &self.alphabet {
                if let Some(target) = table.get(&(state.as_str(), symbol.as_str())) {
                    if reachable.insert((*target).to_owned()) {
                        queue.push_back((*target).to_owned());
                    }
                }
            }
        }
        let accepting: BTreeSet<_> =
            reachable.iter().filter(|state| self.accepting_states.contains(*state)).cloned().collect();
        let rejecting: BTreeSet<_> = reachable.difference(&accepting).cloned().collect();
        let mut partitions: Vec<BTreeSet<String>> =
            [accepting, rejecting].into_iter().filter(|set| !set.is_empty()).collect();
        loop {
            let group_for = |state: &str| partitions.iter().position(|group| group.contains(state));
            let mut next_partitions = Vec::new();
            for group in &partitions {
                let mut buckets: BTreeMap<Vec<Option<usize>>, BTreeSet<String>> = BTreeMap::new();
                for state in group {
                    let signature = self
                        .alphabet
                        .iter()
                        .map(|symbol| {
                            table.get(&(state.as_str(), symbol.as_str())).and_then(|target| group_for(target))
                        })
                        .collect();
                    buckets.entry(signature).or_default().insert(state.clone());
                }
                next_partitions.extend(buckets.into_values());
            }
            if next_partitions == partitions {
                break;
            }
            partitions = next_partitions;
        }
        let state_for = |state: &str| -> String {
            let index = partitions
                .iter()
                .position(|group| group.contains(state))
                .expect("reachable states are partitioned");
            format!("M{index}")
        };
        let mut transitions = Vec::new();
        for (index, group) in partitions.iter().enumerate() {
            let representative = group.first().expect("partitions are non-empty");
            for symbol in &self.alphabet {
                if let Some(target) = table.get(&(representative.as_str(), symbol.as_str())) {
                    transitions.push(FiniteTransition {
                        from: format!("M{index}"),
                        symbol: symbol.clone(),
                        to: state_for(target),
                    });
                }
            }
        }
        Ok(FiniteAutomaton {
            states: (0..partitions.len()).map(|index| format!("M{index}")).collect(),
            alphabet: self.alphabet.clone(),
            start_state: state_for(&self.start_state),
            accepting_states: partitions
                .iter()
                .enumerate()
                .filter(|(_, group)| group.iter().any(|state| self.accepting_states.contains(state)))
                .map(|(index, _)| format!("M{index}"))
                .collect(),
            transitions,
        })
    }
}

impl Machine for FiniteAutomaton {
    type Input = Vec<String>;
    type Output = AutomatonRun;

    fn validate(&self) -> Result<(), SimulationError> {
        self.validate(false)
    }

    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.run_nfa(input)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Move {
    Left,
    Right,
    Stay,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TuringTransition {
    pub from: String,
    pub read: String,
    pub write: String,
    pub movement: Move,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TuringMachine {
    pub states: BTreeSet<String>,
    pub start_state: String,
    pub accepting_states: BTreeSet<String>,
    pub rejecting_states: BTreeSet<String>,
    pub transitions: Vec<TuringTransition>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TuringRun {
    pub accepted: bool,
    pub halted: bool,
    pub steps: usize,
    pub tape: Vec<String>,
    pub head: isize,
    pub state: String,
    pub reason: String,
}

impl TuringMachine {
    pub fn run(&self, input: &[String], max_steps: usize) -> Result<TuringRun, SimulationError> {
        if !self.states.contains(&self.start_state) {
            return Err(SimulationError::UnknownStartState(self.start_state.clone()));
        }
        let mut transitions = HashMap::new();
        for t in &self.transitions {
            for s in [&t.from, &t.to] {
                if !self.states.contains(s) {
                    return Err(SimulationError::UnknownState(s.clone()));
                }
            }
            if transitions.insert((t.from.as_str(), t.read.as_str()), t).is_some() {
                return Err(SimulationError::NonDeterministicTransition {
                    state: t.from.clone(),
                    symbol: t.read.clone(),
                });
            }
        }
        let mut tape: BTreeMap<isize, String> =
            input.iter().enumerate().map(|(i, s)| (i as isize, s.clone())).collect();
        let mut head = 0isize;
        let mut state = self.start_state.clone();
        for step in 0..=max_steps {
            if self.accepting_states.contains(&state) || self.rejecting_states.contains(&state) {
                let accepted = self.accepting_states.contains(&state);
                return Ok(Self::result(
                    accepted,
                    true,
                    step,
                    &tape,
                    head,
                    state,
                    if accepted { "Entered an accepting state." } else { "Entered a rejecting state." },
                ));
            }
            if step == max_steps {
                return Err(SimulationError::StepLimit(max_steps));
            }
            let read = tape.get(&head).cloned().unwrap_or_else(|| BLANK.into());
            let Some(t) = transitions.get(&(state.as_str(), read.as_str())).cloned() else {
                return Ok(Self::result(false, true, step, &tape, head, state, "No transition applies."));
            };
            tape.insert(head, t.write.clone());
            state = t.to.clone();
            match t.movement {
                Move::Left => head -= 1,
                Move::Right => head += 1,
                Move::Stay => {}
            }
        }
        unreachable!()
    }
    fn result(
        accepted: bool,
        halted: bool,
        steps: usize,
        tape: &BTreeMap<isize, String>,
        head: isize,
        state: String,
        reason: &str,
    ) -> TuringRun {
        let from = tape.keys().next().copied().unwrap_or(0).min(head);
        let to = tape.keys().next_back().copied().unwrap_or(0).max(head);
        TuringRun {
            accepted,
            halted,
            steps,
            tape: (from..=to).map(|i| tape.get(&i).cloned().unwrap_or_else(|| BLANK.into())).collect(),
            head: head - from,
            state,
            reason: reason.into(),
        }
    }

    /// Explore a nondeterministic one-tape machine breadth-first. This mirrors
    /// JFLAP's configuration semantics while retaining `run` for a strict DFA-
    /// like transition function. A bound is mandatory because a machine may
    /// have infinitely many reachable configurations.
    pub fn run_nondeterministic(
        &self,
        input: &[String],
        max_configurations: usize,
        max_steps: usize,
    ) -> Result<TuringRun, SimulationError> {
        if !self.states.contains(&self.start_state) {
            return Err(SimulationError::UnknownStartState(self.start_state.clone()));
        }
        for transition in &self.transitions {
            for state in [&transition.from, &transition.to] {
                if !self.states.contains(state) {
                    return Err(SimulationError::UnknownState(state.clone()));
                }
            }
        }
        #[derive(Clone)]
        struct Configuration {
            tape: BTreeMap<isize, String>,
            head: isize,
            state: String,
            steps: usize,
        }
        let tape = input.iter().enumerate().map(|(index, symbol)| (index as isize, symbol.clone())).collect();
        let mut queue =
            VecDeque::from([Configuration { tape, head: 0, state: self.start_state.clone(), steps: 0 }]);
        let mut visited: HashSet<String> = HashSet::new();
        let mut explored = 0;
        while let Some(configuration) = queue.pop_front() {
            let key = format!("{:?}@{}:{}", configuration.tape, configuration.head, configuration.state);
            if !visited.insert(key) {
                continue;
            }
            explored += 1;
            if explored > max_configurations.max(1) {
                return Err(SimulationError::StepLimit(max_configurations.max(1)));
            }
            if self.accepting_states.contains(&configuration.state) {
                return Ok(Self::result(
                    true,
                    true,
                    configuration.steps,
                    &configuration.tape,
                    configuration.head,
                    configuration.state,
                    "An accepting configuration was reached.",
                ));
            }
            if self.rejecting_states.contains(&configuration.state) || configuration.steps >= max_steps {
                continue;
            }
            let read = configuration.tape.get(&configuration.head).cloned().unwrap_or_else(|| BLANK.into());
            for transition in self
                .transitions
                .iter()
                .filter(|transition| transition.from == configuration.state && transition.read == read)
            {
                let mut tape = configuration.tape.clone();
                tape.insert(configuration.head, transition.write.clone());
                let head = match transition.movement {
                    Move::Left => configuration.head - 1,
                    Move::Right => configuration.head + 1,
                    Move::Stay => configuration.head,
                };
                queue.push_back(Configuration {
                    tape,
                    head,
                    state: transition.to.clone(),
                    steps: configuration.steps + 1,
                });
            }
        }
        Ok(TuringRun {
            accepted: false,
            halted: true,
            steps: max_steps,
            tape: input.to_vec(),
            head: 0,
            state: self.start_state.clone(),
            reason: "No accepting configuration was found within the configured bounds.".into(),
        })
    }
}

impl Machine for TuringMachine {
    type Input = Vec<String>;
    type Output = TuringRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if !self.states.contains(&self.start_state) {
            return Err(SimulationError::UnknownStartState(self.start_state.clone()));
        }
        let mut seen = HashSet::new();
        for transition in &self.transitions {
            for state in [&transition.from, &transition.to] {
                if !self.states.contains(state) {
                    return Err(SimulationError::UnknownState(state.clone()));
                }
            }
            if !seen.insert((&transition.from, &transition.read)) {
                return Err(SimulationError::NonDeterministicTransition {
                    state: transition.from.clone(),
                    symbol: transition.read.clone(),
                });
            }
        }
        Ok(())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.run(input, 10_000)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PetriArc {
    pub place: String,
    pub weight: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PetriTransition {
    pub id: String,
    pub inputs: Vec<PetriArc>,
    pub outputs: Vec<PetriArc>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PetriNet {
    pub marking: BTreeMap<String, u32>,
    pub transitions: Vec<PetriTransition>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PetriRun {
    pub fired: Vec<String>,
    pub marking: BTreeMap<String, u32>,
    pub enabled: Vec<String>,
}

impl PetriNet {
    pub fn fire_sequence(&self, sequence: &[String]) -> Result<PetriRun, SimulationError> {
        let mut marking = self.marking.clone();
        let mut fired = Vec::new();
        for id in sequence {
            let t = self
                .transitions
                .iter()
                .find(|t| &t.id == id)
                .ok_or_else(|| SimulationError::UnknownState(id.clone()))?;
            Self::validate_transition(t)?;
            if !Self::enabled(t, &marking) {
                break;
            }
            for arc in &t.inputs {
                *marking.entry(arc.place.clone()).or_default() -= arc.weight;
            }
            for arc in &t.outputs {
                *marking.entry(arc.place.clone()).or_default() += arc.weight;
            }
            fired.push(id.clone());
        }
        let enabled =
            self.transitions.iter().filter(|t| Self::enabled(t, &marking)).map(|t| t.id.clone()).collect();
        Ok(PetriRun { fired, marking, enabled })
    }
    fn validate_transition(t: &PetriTransition) -> Result<(), SimulationError> {
        if t.inputs.iter().chain(&t.outputs).any(|a| a.weight == 0) {
            Err(SimulationError::InvalidArcWeight)
        } else {
            Ok(())
        }
    }
    fn enabled(t: &PetriTransition, marking: &BTreeMap<String, u32>) -> bool {
        t.inputs.iter().all(|a| marking.get(&a.place).copied().unwrap_or(0) >= a.weight)
    }
}

impl Machine for PetriNet {
    type Input = Vec<String>;
    type Output = PetriRun;
    fn validate(&self) -> Result<(), SimulationError> {
        for transition in &self.transitions {
            Self::validate_transition(transition)?;
        }
        Ok(())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.fire_sequence(input)
    }
}

/// A single JFLAP-style pushdown-automaton transition. `input` equal to `ε`
/// consumes no input; `pop` and `push` are ordered with the stack top first.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PushdownTransition {
    pub from: String,
    pub input: String,
    pub pop: Vec<String>,
    pub push: Vec<String>,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PushdownAutomaton {
    pub states: BTreeSet<String>,
    pub start_state: String,
    pub accepting_states: BTreeSet<String>,
    pub transitions: Vec<PushdownTransition>,
    pub accept_by_empty_stack: bool,
    pub max_configurations: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PushdownRun {
    pub accepted: bool,
    pub explored_configurations: usize,
    pub reason: String,
}

impl PushdownAutomaton {
    pub fn run(&self, input: &[String]) -> Result<PushdownRun, SimulationError> {
        self.validate()?;
        #[derive(Clone, Hash, PartialEq, Eq)]
        struct Configuration {
            state: String,
            position: usize,
            stack: Vec<String>,
        }
        let maximum = self.max_configurations.max(1);
        let mut queue = VecDeque::from([Configuration {
            state: self.start_state.clone(),
            position: 0,
            stack: Vec::new(),
        }]);
        let mut visited = HashSet::new();
        let mut explored = 0;
        while let Some(configuration) = queue.pop_front() {
            if !visited.insert(configuration.clone()) {
                continue;
            }
            explored += 1;
            if explored > maximum {
                return Err(SimulationError::StepLimit(maximum));
            }
            let accepted = configuration.position == input.len()
                && ((self.accept_by_empty_stack && configuration.stack.is_empty())
                    || (!self.accept_by_empty_stack && self.accepting_states.contains(&configuration.state)));
            if accepted {
                return Ok(PushdownRun {
                    accepted: true,
                    explored_configurations: explored,
                    reason: "An accepting configuration was reached.".into(),
                });
            }
            for transition in self.transitions.iter().filter(|t| t.from == configuration.state) {
                let consumes = transition.input != EPSILON;
                if consumes && input.get(configuration.position) != Some(&transition.input) {
                    continue;
                }
                if configuration.stack.len() < transition.pop.len()
                    || !configuration.stack.iter().rev().zip(&transition.pop).all(|(a, b)| a == b)
                {
                    continue;
                }
                let mut stack = configuration.stack.clone();
                for _ in &transition.pop {
                    stack.pop();
                }
                for symbol in transition.push.iter().rev() {
                    stack.push(symbol.clone());
                }
                queue.push_back(Configuration {
                    state: transition.to.clone(),
                    position: configuration.position + usize::from(consumes),
                    stack,
                });
            }
        }
        Ok(PushdownRun {
            accepted: false,
            explored_configurations: explored,
            reason: "No accepting configuration exists for this input.".into(),
        })
    }
}

impl Machine for PushdownAutomaton {
    type Input = Vec<String>;
    type Output = PushdownRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if !self.states.contains(&self.start_state) {
            return Err(SimulationError::UnknownStartState(self.start_state.clone()));
        }
        for transition in &self.transitions {
            for state in [&transition.from, &transition.to] {
                if !self.states.contains(state) {
                    return Err(SimulationError::UnknownState(state.clone()));
                }
            }
        }
        Ok(())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.run(input)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GrammarRule {
    pub left: String,
    pub right: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ContextFreeGrammar {
    pub variables: BTreeSet<String>,
    pub terminals: BTreeSet<String>,
    pub start_variable: String,
    pub rules: Vec<GrammarRule>,
    pub max_derivations: usize,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GrammarRun {
    pub accepted: bool,
    pub derivations_explored: usize,
    pub derivation: Option<Vec<Vec<String>>>,
    pub reason: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CykRun {
    pub accepted: bool,
    pub table: Vec<Vec<Vec<String>>>,
    pub reason: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Ll1Entry {
    pub variable: String,
    pub lookahead: String,
    pub production: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Ll1Conflict {
    pub variable: String,
    pub lookahead: String,
    pub alternatives: Vec<Vec<String>>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Ll1Analysis {
    pub entries: Vec<Ll1Entry>,
    pub conflicts: Vec<Ll1Conflict>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Ll1Run {
    pub accepted: bool,
    pub steps: usize,
    pub stack_trace: Vec<Vec<String>>,
    pub reason: String,
}

impl ContextFreeGrammar {
    /// Bounded leftmost derivation. The bound makes arbitrary CFG exploration
    /// total, including grammars with epsilon or cyclic productions.
    pub fn recognizes(&self, word: &[String]) -> Result<GrammarRun, SimulationError> {
        self.validate()?;
        let maximum = self.max_derivations.max(1);
        let mut queue =
            VecDeque::from([(vec![self.start_variable.clone()], vec![vec![self.start_variable.clone()]])]);
        let mut seen = HashSet::new();
        let mut explored = 0;
        while let Some((form, history)) = queue.pop_front() {
            if !seen.insert(form.clone()) {
                continue;
            }
            explored += 1;
            if explored > maximum {
                return Err(SimulationError::StepLimit(maximum));
            }
            if form.iter().all(|symbol| self.terminals.contains(symbol)) {
                if form == word {
                    return Ok(GrammarRun {
                        accepted: true,
                        derivations_explored: explored,
                        derivation: Some(history),
                        reason: "A terminal derivation equals the input word.".into(),
                    });
                }
                continue;
            }
            let Some(position) = form.iter().position(|symbol| self.variables.contains(symbol)) else {
                continue;
            };
            for rule in self.rules.iter().filter(|rule| rule.left == form[position]) {
                let mut next = form[..position].to_vec();
                next.extend(rule.right.clone());
                next.extend_from_slice(&form[position + 1..]);
                // A terminal prefix/suffix incompatible with the word can never recover.
                let terminal_count = next.iter().filter(|s| self.terminals.contains(*s)).count();
                if terminal_count > word.len() {
                    continue;
                }
                let mut next_history = history.clone();
                next_history.push(next.clone());
                queue.push_back((next, next_history));
            }
        }
        Ok(GrammarRun {
            accepted: false,
            derivations_explored: explored,
            derivation: None,
            reason: "No matching terminal derivation was found within the configured bound.".into(),
        })
    }

    /// Cocke-Kasami-Younger parsing for a grammar in Chomsky normal form.
    /// The triangular table is retained so the UI can show the derivation
    /// evidence, rather than collapsing parsing to a boolean.
    pub fn cyk(&self, word: &[String]) -> Result<CykRun, SimulationError> {
        self.validate()?;
        for rule in &self.rules {
            let permitted = match rule.right.as_slice() {
                [] => rule.left == self.start_variable,
                [terminal] => self.terminals.contains(terminal),
                [left, right] => self.variables.contains(left) && self.variables.contains(right),
                _ => false,
            };
            if !permitted {
                return Err(SimulationError::NotChomskyNormalForm(format!(
                    "{} -> {}",
                    rule.left,
                    rule.right.join(" ")
                )));
            }
        }
        if word.is_empty() {
            let accepted =
                self.rules.iter().any(|rule| rule.left == self.start_variable && rule.right.is_empty());
            return Ok(CykRun {
                accepted,
                table: Vec::new(),
                reason: if accepted {
                    "The start variable derives epsilon.".into()
                } else {
                    "No epsilon production for the start variable.".into()
                },
            });
        }
        let length = word.len();
        let mut cells = vec![vec![BTreeSet::new(); length]; length];
        for (index, symbol) in word.iter().enumerate() {
            for rule in self.rules.iter().filter(|rule| rule.right.len() == 1 && rule.right[0] == *symbol) {
                cells[index][0].insert(rule.left.clone());
            }
        }
        for span in 2..=length {
            for start in 0..=length - span {
                for split in 1..span {
                    let left = cells[start][split - 1].clone();
                    let right = cells[start + split][span - split - 1].clone();
                    for rule in self.rules.iter().filter(|rule| rule.right.len() == 2) {
                        if left.contains(&rule.right[0]) && right.contains(&rule.right[1]) {
                            cells[start][span - 1].insert(rule.left.clone());
                        }
                    }
                }
            }
        }
        let accepted = cells[0][length - 1].contains(&self.start_variable);
        let table = cells
            .into_iter()
            .map(|row| row.into_iter().map(|set| set.into_iter().collect()).collect())
            .collect();
        Ok(CykRun {
            accepted,
            table,
            reason: if accepted {
                "The start variable occurs in the final CYK cell.".into()
            } else {
                "The start variable does not occur in the final CYK cell.".into()
            },
        })
    }

    /// Builds an LL(1) table from FIRST/FOLLOW sets. Conflicts are returned as
    /// data because they are useful teaching evidence, not an internal error.
    pub fn ll1_analysis(&self) -> Result<Ll1Analysis, SimulationError> {
        self.validate()?;
        let mut first: BTreeMap<String, BTreeSet<String>> =
            self.variables.iter().map(|variable| (variable.clone(), BTreeSet::new())).collect();
        loop {
            let previous = first.clone();
            for rule in &self.rules {
                let set = Self::first_of_sequence(&rule.right, &first, &self.variables);
                first.get_mut(&rule.left).expect("validated variable").extend(set);
            }
            if first == previous {
                break;
            }
        }
        let mut follow: BTreeMap<String, BTreeSet<String>> =
            self.variables.iter().map(|variable| (variable.clone(), BTreeSet::new())).collect();
        follow.get_mut(&self.start_variable).expect("validated start").insert("$".into());
        loop {
            let previous = follow.clone();
            for rule in &self.rules {
                for index in 0..rule.right.len() {
                    let symbol = &rule.right[index];
                    if !self.variables.contains(symbol) {
                        continue;
                    }
                    let suffix_first =
                        Self::first_of_sequence(&rule.right[index + 1..], &first, &self.variables);
                    let target = follow.get_mut(symbol).expect("declared variable");
                    target.extend(suffix_first.iter().filter(|item| item.as_str() != EPSILON).cloned());
                    if suffix_first.contains(EPSILON) {
                        target.extend(previous.get(&rule.left).expect("declared variable").clone());
                    }
                }
            }
            if follow == previous {
                break;
            }
        }
        let mut table: BTreeMap<(String, String), Vec<Vec<String>>> = BTreeMap::new();
        for rule in &self.rules {
            let rule_first = Self::first_of_sequence(&rule.right, &first, &self.variables);
            let mut lookaheads: BTreeSet<_> =
                rule_first.iter().filter(|item| item.as_str() != EPSILON).cloned().collect();
            if rule_first.contains(EPSILON) {
                lookaheads.extend(follow.get(&rule.left).expect("declared variable").clone());
            }
            for lookahead in lookaheads {
                table.entry((rule.left.clone(), lookahead)).or_default().push(rule.right.clone());
            }
        }
        let entries = table
            .iter()
            .filter(|(_, productions)| productions.len() == 1)
            .map(|((variable, lookahead), productions)| Ll1Entry {
                variable: variable.clone(),
                lookahead: lookahead.clone(),
                production: productions[0].clone(),
            })
            .collect();
        let conflicts = table
            .into_iter()
            .filter(|(_, alternatives)| alternatives.len() > 1)
            .map(|((variable, lookahead), alternatives)| Ll1Conflict { variable, lookahead, alternatives })
            .collect();
        Ok(Ll1Analysis { entries, conflicts })
    }

    pub fn parse_ll1(&self, word: &[String]) -> Result<Ll1Run, SimulationError> {
        let analysis = self.ll1_analysis()?;
        if !analysis.conflicts.is_empty() {
            return Ok(Ll1Run {
                accepted: false,
                steps: 0,
                stack_trace: Vec::new(),
                reason: "Grammar has LL(1) table conflicts.".into(),
            });
        }
        let table: BTreeMap<_, _> = analysis
            .entries
            .into_iter()
            .map(|entry| ((entry.variable, entry.lookahead), entry.production))
            .collect();
        let mut input = word.to_vec();
        input.push("$".into());
        let mut position = 0;
        let mut stack = vec!["$".to_owned(), self.start_variable.clone()];
        let mut trace = vec![stack.clone()];
        while let Some(top) = stack.pop() {
            let lookahead = input.get(position).cloned().unwrap_or_else(|| "$".into());
            if top == "$" {
                return Ok(Ll1Run {
                    accepted: lookahead == "$",
                    steps: trace.len() - 1,
                    stack_trace: trace,
                    reason: if lookahead == "$" {
                        "Input consumed with end marker.".into()
                    } else {
                        "Stack reached end marker before input was consumed.".into()
                    },
                });
            }
            if self.terminals.contains(&top) {
                if top != lookahead {
                    return Ok(Ll1Run {
                        accepted: false,
                        steps: trace.len() - 1,
                        stack_trace: trace,
                        reason: format!("Expected '{top}', found '{lookahead}'."),
                    });
                }
                position += 1;
            } else if self.variables.contains(&top) {
                let Some(production) = table.get(&(top.clone(), lookahead.clone())) else {
                    return Ok(Ll1Run {
                        accepted: false,
                        steps: trace.len() - 1,
                        stack_trace: trace,
                        reason: format!("No table entry for ({top}, {lookahead})."),
                    });
                };
                stack.extend(production.iter().rev().cloned());
            } else {
                return Err(SimulationError::UnknownSymbol);
            }
            trace.push(stack.clone());
        }
        Ok(Ll1Run {
            accepted: false,
            steps: trace.len() - 1,
            stack_trace: trace,
            reason: "Parser stack became empty unexpectedly.".into(),
        })
    }

    fn first_of_sequence(
        sequence: &[String],
        first: &BTreeMap<String, BTreeSet<String>>,
        variables: &BTreeSet<String>,
    ) -> BTreeSet<String> {
        if sequence.is_empty() {
            return BTreeSet::from([EPSILON.into()]);
        }
        let mut output = BTreeSet::new();
        for symbol in sequence {
            if !variables.contains(symbol) {
                output.insert(symbol.clone());
                return output;
            }
            let set = first.get(symbol).expect("declared variable");
            output.extend(set.iter().filter(|item| item.as_str() != EPSILON).cloned());
            if !set.contains(EPSILON) {
                return output;
            }
        }
        output.insert(EPSILON.into());
        output
    }

    /// Classical CFG-to-PDA construction. The generated PDA performs a
    /// leftmost expansion on its stack and consumes a terminal only when it is
    /// on top; it accepts after removing its explicit bottom marker.
    pub fn to_pda(&self) -> Result<PushdownAutomaton, SimulationError> {
        self.validate()?;
        let start = "__cfg_start".to_owned();
        let loop_state = "__cfg_loop".to_owned();
        let accept = "__cfg_accept".to_owned();
        let bottom = "__cfg_bottom".to_owned();
        let mut transitions = vec![PushdownTransition {
            from: start.clone(),
            input: EPSILON.into(),
            pop: vec![],
            push: vec![self.start_variable.clone(), bottom.clone()],
            to: loop_state.clone(),
        }];
        for rule in &self.rules {
            transitions.push(PushdownTransition {
                from: loop_state.clone(),
                input: EPSILON.into(),
                pop: vec![rule.left.clone()],
                push: rule.right.clone(),
                to: loop_state.clone(),
            });
        }
        for terminal in &self.terminals {
            transitions.push(PushdownTransition {
                from: loop_state.clone(),
                input: terminal.clone(),
                pop: vec![terminal.clone()],
                push: vec![],
                to: loop_state.clone(),
            });
        }
        transitions.push(PushdownTransition {
            from: loop_state.clone(),
            input: EPSILON.into(),
            pop: vec![bottom],
            push: vec![],
            to: accept.clone(),
        });
        Ok(PushdownAutomaton {
            states: BTreeSet::from([start.clone(), loop_state, accept.clone()]),
            start_state: start,
            accepting_states: BTreeSet::from([accept]),
            transitions,
            accept_by_empty_stack: false,
            max_configurations: self.max_derivations.max(1),
        })
    }
}

impl Machine for ContextFreeGrammar {
    type Input = Vec<String>;
    type Output = GrammarRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if !self.variables.contains(&self.start_variable) {
            return Err(SimulationError::UnknownStartState(self.start_variable.clone()));
        }
        for rule in &self.rules {
            if !self.variables.contains(&rule.left) {
                return Err(SimulationError::UnknownState(rule.left.clone()));
            }
            for symbol in &rule.right {
                if !self.variables.contains(symbol) && !self.terminals.contains(symbol) {
                    return Err(SimulationError::UnknownSymbol);
                }
            }
        }
        Ok(())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.recognizes(input)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LSystemRule {
    pub predecessor: String,
    pub successor: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LSystem {
    pub axiom: Vec<String>,
    pub rules: Vec<LSystemRule>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LSystemRun {
    pub generations: Vec<Vec<String>>,
}

impl LSystem {
    pub fn generate(&self, generations: usize) -> LSystemRun {
        let replacements: HashMap<_, _> =
            self.rules.iter().map(|rule| (rule.predecessor.as_str(), &rule.successor)).collect();
        let mut current = self.axiom.clone();
        let mut output = vec![current.clone()];
        for _ in 0..generations {
            let mut next = Vec::new();
            for symbol in &current {
                match replacements.get(symbol.as_str()) {
                    Some(successor) => next.extend((*successor).iter().cloned()),
                    None => next.push(symbol.clone()),
                }
            }
            current = next;
            output.push(current.clone());
        }
        LSystemRun { generations: output }
    }
}

impl Machine for LSystem {
    type Input = usize;
    type Output = LSystemRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if self.rules.iter().any(|rule| rule.predecessor.is_empty()) {
            return Err(SimulationError::InvalidExpression("an L-system predecessor cannot be empty".into()));
        }
        Ok(())
    }
    fn simulate(&self, generations: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.validate()?;
        Ok(self.generate(*generations))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ContextualLSystemRule {
    pub left_context: Vec<String>,
    pub symbol: String,
    pub right_context: Vec<String>,
    pub successor: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ContextualLSystem {
    pub axiom: Vec<String>,
    pub rules: Vec<ContextualLSystemRule>,
}

impl ContextualLSystem {
    pub fn generate(&self, generations: usize) -> LSystemRun {
        let mut current = self.axiom.clone();
        let mut output = vec![current.clone()];
        for _ in 0..generations {
            let mut next = Vec::new();
            for index in 0..current.len() {
                let rule = self.rules.iter().find(|rule| {
                    rule.symbol == current[index]
                        && current[..index].ends_with(&rule.left_context)
                        && current[index + 1..].starts_with(&rule.right_context)
                });
                match rule {
                    Some(rule) => next.extend(rule.successor.clone()),
                    None => next.push(current[index].clone()),
                }
            }
            current = next;
            output.push(current.clone());
        }
        LSystemRun { generations: output }
    }
}

impl Machine for ContextualLSystem {
    type Input = usize;
    type Output = LSystemRun;
    fn validate(&self) -> Result<(), SimulationError> {
        let mut patterns = HashSet::new();
        for rule in &self.rules {
            if rule.symbol.is_empty() {
                return Err(SimulationError::InvalidExpression(
                    "a contextual L-system symbol cannot be empty".into(),
                ));
            }
            if !patterns.insert((&rule.left_context, &rule.symbol, &rule.right_context)) {
                return Err(SimulationError::InvalidExpression("ambiguous contextual L-system rules".into()));
            }
        }
        Ok(())
    }
    fn simulate(&self, generations: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.validate()?;
        Ok(self.generate(*generations))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WeightedSuccessor {
    pub weight: u32,
    pub symbols: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StochasticLSystemRule {
    pub predecessor: String,
    pub alternatives: Vec<WeightedSuccessor>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StochasticLSystem {
    pub axiom: Vec<String>,
    pub rules: Vec<StochasticLSystemRule>,
    pub seed: u64,
}

impl StochasticLSystem {
    pub fn generate(&self, generations: usize) -> LSystemRun {
        let mut seed = self.seed;
        let mut current = self.axiom.clone();
        let mut output = vec![current.clone()];
        for _ in 0..generations {
            let mut next = Vec::new();
            for symbol in &current {
                match self.rules.iter().find(|rule| rule.predecessor == *symbol) {
                    None => next.push(symbol.clone()),
                    Some(rule) => {
                        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
                        let total: u64 =
                            rule.alternatives.iter().map(|alternative| alternative.weight as u64).sum();
                        let mut selection = seed % total;
                        let mut chosen = &rule.alternatives[0];
                        for alternative in &rule.alternatives {
                            if selection < alternative.weight as u64 {
                                chosen = alternative;
                                break;
                            }
                            selection -= alternative.weight as u64;
                        }
                        next.extend(chosen.symbols.clone());
                    }
                }
            }
            current = next;
            output.push(current.clone());
        }
        LSystemRun { generations: output }
    }
}

impl Machine for StochasticLSystem {
    type Input = usize;
    type Output = LSystemRun;
    fn validate(&self) -> Result<(), SimulationError> {
        let mut symbols = HashSet::new();
        for rule in &self.rules {
            if rule.predecessor.is_empty()
                || rule.alternatives.is_empty()
                || rule.alternatives.iter().any(|alternative| alternative.weight == 0)
            {
                return Err(SimulationError::InvalidExpression(
                    "stochastic L-system rules need a symbol and positive weighted alternatives".into(),
                ));
            }
            if !symbols.insert(&rule.predecessor) {
                return Err(SimulationError::InvalidExpression(
                    "duplicate stochastic L-system predecessor".into(),
                ));
            }
        }
        Ok(())
    }
    fn simulate(&self, generations: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.validate()?;
        Ok(self.generate(*generations))
    }
}

/// A deterministic finite-state transducer whose output labels live on transitions.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MealyTransition {
    pub from: String,
    pub input: String,
    pub output: String,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MealyMachine {
    pub states: BTreeSet<String>,
    pub start_state: String,
    pub transitions: Vec<MealyTransition>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TransducerRun {
    pub completed: bool,
    pub output: Vec<String>,
    pub visited_states: Vec<String>,
    pub reason: String,
}

impl MealyMachine {
    pub fn transduce(&self, input: &[String]) -> Result<TransducerRun, SimulationError> {
        self.validate()?;
        let table: HashMap<_, _> = self
            .transitions
            .iter()
            .map(|transition| ((transition.from.as_str(), transition.input.as_str()), transition))
            .collect();
        let mut state = self.start_state.as_str();
        let mut output = Vec::new();
        let mut visited_states = vec![state.to_owned()];
        for symbol in input {
            let Some(transition) = table.get(&(state, symbol.as_str())) else {
                return Ok(TransducerRun {
                    completed: false,
                    output,
                    visited_states,
                    reason: format!("No transition for '{symbol}' from '{state}'."),
                });
            };
            output.push(transition.output.clone());
            state = &transition.to;
            visited_states.push(state.to_owned());
        }
        Ok(TransducerRun {
            completed: true,
            output,
            visited_states,
            reason: "All input symbols were transduced.".into(),
        })
    }
}

impl Machine for MealyMachine {
    type Input = Vec<String>;
    type Output = TransducerRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if !self.states.contains(&self.start_state) {
            return Err(SimulationError::UnknownStartState(self.start_state.clone()));
        }
        let mut pairs = HashSet::new();
        for transition in &self.transitions {
            for state in [&transition.from, &transition.to] {
                if !self.states.contains(state) {
                    return Err(SimulationError::UnknownState(state.clone()));
                }
            }
            if !pairs.insert((&transition.from, &transition.input)) {
                return Err(SimulationError::NonDeterministicTransition {
                    state: transition.from.clone(),
                    symbol: transition.input.clone(),
                });
            }
        }
        Ok(())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.transduce(input)
    }
}

/// A deterministic finite-state transducer whose output labels live on states.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MooreMachine {
    pub states: BTreeSet<String>,
    pub start_state: String,
    pub state_outputs: BTreeMap<String, String>,
    pub transitions: Vec<FiniteTransition>,
}

impl MooreMachine {
    pub fn transduce(&self, input: &[String]) -> Result<TransducerRun, SimulationError> {
        self.validate()?;
        let table: HashMap<_, _> =
            self.transitions.iter().map(|t| ((t.from.as_str(), t.symbol.as_str()), t.to.as_str())).collect();
        let mut state = self.start_state.as_str();
        let mut output = vec![self.state_outputs[state].clone()];
        let mut visited_states = vec![state.to_owned()];
        for symbol in input {
            let Some(next) = table.get(&(state, symbol.as_str())) else {
                return Ok(TransducerRun {
                    completed: false,
                    output,
                    visited_states,
                    reason: format!("No transition for '{symbol}' from '{state}'."),
                });
            };
            state = next;
            output.push(self.state_outputs[state].clone());
            visited_states.push(state.to_owned());
        }
        Ok(TransducerRun {
            completed: true,
            output,
            visited_states,
            reason: "All input symbols were transduced.".into(),
        })
    }
}

impl Machine for MooreMachine {
    type Input = Vec<String>;
    type Output = TransducerRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if !self.states.contains(&self.start_state) {
            return Err(SimulationError::UnknownStartState(self.start_state.clone()));
        }
        if self.states.iter().any(|state| !self.state_outputs.contains_key(state)) {
            return Err(SimulationError::UnknownSymbol);
        }
        let automaton = FiniteAutomaton {
            states: self.states.clone(),
            alphabet: self.transitions.iter().map(|t| t.symbol.clone()).collect(),
            start_state: self.start_state.clone(),
            accepting_states: BTreeSet::new(),
            transitions: self.transitions.clone(),
        };
        automaton.validate(true)
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.transduce(input)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MultiTapeTransition {
    pub from: String,
    pub read: Vec<String>,
    pub write: Vec<String>,
    pub movements: Vec<Move>,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MultiTapeTuringMachine {
    pub states: BTreeSet<String>,
    pub start_state: String,
    pub accepting_states: BTreeSet<String>,
    pub rejecting_states: BTreeSet<String>,
    pub tape_count: usize,
    pub transitions: Vec<MultiTapeTransition>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MultiTapeRun {
    pub accepted: bool,
    pub halted: bool,
    pub steps: usize,
    pub tapes: Vec<Vec<String>>,
    pub heads: Vec<isize>,
    pub state: String,
    pub reason: String,
}

impl MultiTapeTuringMachine {
    pub fn run(&self, inputs: &[Vec<String>], max_steps: usize) -> Result<MultiTapeRun, SimulationError> {
        self.validate()?;
        if inputs.len() != self.tape_count {
            return Err(SimulationError::InvalidTapeArity);
        }
        let mut table = HashMap::new();
        for transition in &self.transitions {
            if transition.read.len() != self.tape_count
                || transition.write.len() != self.tape_count
                || transition.movements.len() != self.tape_count
            {
                return Err(SimulationError::InvalidTapeArity);
            }
            if table.insert((transition.from.as_str(), transition.read.clone()), transition).is_some() {
                return Err(SimulationError::NonDeterministicTransition {
                    state: transition.from.clone(),
                    symbol: transition.read.join("|"),
                });
            }
        }
        let mut tapes: Vec<BTreeMap<isize, String>> = inputs
            .iter()
            .map(|input| {
                input.iter().enumerate().map(|(index, symbol)| (index as isize, symbol.clone())).collect()
            })
            .collect();
        let mut heads = vec![0isize; self.tape_count];
        let mut state = self.start_state.clone();
        for step in 0..=max_steps {
            if self.accepting_states.contains(&state) || self.rejecting_states.contains(&state) {
                let accepted = self.accepting_states.contains(&state);
                return Ok(Self::result(
                    accepted,
                    true,
                    step,
                    &tapes,
                    &heads,
                    state,
                    if accepted { "Entered an accepting state." } else { "Entered a rejecting state." },
                ));
            }
            if step == max_steps {
                return Err(SimulationError::StepLimit(max_steps));
            }
            let read: Vec<_> = tapes
                .iter()
                .zip(&heads)
                .map(|(tape, head)| tape.get(head).cloned().unwrap_or_else(|| BLANK.into()))
                .collect();
            let Some(transition) = table.get(&(state.as_str(), read)) else {
                return Ok(Self::result(false, true, step, &tapes, &heads, state, "No transition applies."));
            };
            for index in 0..self.tape_count {
                tapes[index].insert(heads[index], transition.write[index].clone());
                match transition.movements[index] {
                    Move::Left => heads[index] -= 1,
                    Move::Right => heads[index] += 1,
                    Move::Stay => {}
                }
            }
            state = transition.to.clone();
        }
        unreachable!()
    }
    fn result(
        accepted: bool,
        halted: bool,
        steps: usize,
        tapes: &[BTreeMap<isize, String>],
        heads: &[isize],
        state: String,
        reason: &str,
    ) -> MultiTapeRun {
        let mut offset_heads = Vec::with_capacity(tapes.len());
        let rendered = tapes
            .iter()
            .zip(heads)
            .map(|(tape, head)| {
                let from = tape.keys().next().copied().unwrap_or(0).min(*head);
                let to = tape.keys().next_back().copied().unwrap_or(0).max(*head);
                offset_heads.push(*head - from);
                (from..=to).map(|index| tape.get(&index).cloned().unwrap_or_else(|| BLANK.into())).collect()
            })
            .collect();
        MultiTapeRun {
            accepted,
            halted,
            steps,
            tapes: rendered,
            heads: offset_heads,
            state,
            reason: reason.into(),
        }
    }
}

impl Machine for MultiTapeTuringMachine {
    type Input = Vec<Vec<String>>;
    type Output = MultiTapeRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if self.tape_count == 0 {
            return Err(SimulationError::InvalidTapeArity);
        }
        if !self.states.contains(&self.start_state) {
            return Err(SimulationError::UnknownStartState(self.start_state.clone()));
        }
        for transition in &self.transitions {
            for state in [&transition.from, &transition.to] {
                if !self.states.contains(state) {
                    return Err(SimulationError::UnknownState(state.clone()));
                }
            }
        }
        Ok(())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.run(input, 10_000)
    }
}

/// A right-linear grammar. Every production is either A → aB, A → a, A → B,
/// or A → ε, and can therefore be translated exactly to an epsilon-NFA.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegularProduction {
    pub left: String,
    pub terminal: Option<String>,
    pub next_variable: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegularGrammar {
    pub variables: BTreeSet<String>,
    pub terminals: BTreeSet<String>,
    pub start_variable: String,
    pub productions: Vec<RegularProduction>,
}

impl RegularGrammar {
    pub fn to_nfa(&self) -> Result<FiniteAutomaton, SimulationError> {
        self.validate()?;
        let accept = "__accept".to_owned();
        let mut states = self.variables.clone();
        states.insert(accept.clone());
        let mut transitions = Vec::new();
        for production in &self.productions {
            let target = production.next_variable.clone().unwrap_or_else(|| accept.clone());
            transitions.push(FiniteTransition {
                from: production.left.clone(),
                symbol: production.terminal.clone().unwrap_or_else(|| EPSILON.into()),
                to: target,
            });
        }
        Ok(FiniteAutomaton {
            states,
            alphabet: self.terminals.clone(),
            start_state: self.start_variable.clone(),
            accepting_states: BTreeSet::from([accept]),
            transitions,
        })
    }
}

impl Machine for RegularGrammar {
    type Input = Vec<String>;
    type Output = AutomatonRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if !self.variables.contains(&self.start_variable) {
            return Err(SimulationError::UnknownStartState(self.start_variable.clone()));
        }
        for production in &self.productions {
            if !self.variables.contains(&production.left) {
                return Err(SimulationError::UnknownState(production.left.clone()));
            }
            if production.terminal.as_ref().is_some_and(|terminal| !self.terminals.contains(terminal)) {
                return Err(SimulationError::UnknownSymbol);
            }
            if production.next_variable.as_ref().is_some_and(|variable| !self.variables.contains(variable)) {
                return Err(SimulationError::UnknownState(production.next_variable.clone().unwrap()));
            }
        }
        Ok(())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.to_nfa()?.run_nfa(input)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UnrestrictedRule {
    pub left: Vec<String>,
    pub right: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UnrestrictedGrammar {
    pub variables: BTreeSet<String>,
    pub terminals: BTreeSet<String>,
    pub start_variable: String,
    pub rules: Vec<UnrestrictedRule>,
    pub max_derivations: usize,
}

impl UnrestrictedGrammar {
    pub fn recognizes(&self, word: &[String]) -> Result<GrammarRun, SimulationError> {
        self.validate()?;
        let maximum = self.max_derivations.max(1);
        let mut explored = 0;
        let initial = vec![self.start_variable.clone()];
        let mut queue = VecDeque::from([(initial.clone(), vec![initial])]);
        let mut seen = HashSet::new();
        while let Some((form, history)) = queue.pop_front() {
            if !seen.insert(form.clone()) {
                continue;
            }
            explored += 1;
            if explored > maximum {
                return Err(SimulationError::StepLimit(maximum));
            }
            if form == word {
                return Ok(GrammarRun {
                    accepted: true,
                    derivations_explored: explored,
                    derivation: Some(history),
                    reason: "A derivation equals the input word.".into(),
                });
            }
            for rule in &self.rules {
                if rule.left.is_empty() {
                    continue;
                }
                for position in 0..=form.len().saturating_sub(rule.left.len()) {
                    if form[position..position + rule.left.len()] != rule.left {
                        continue;
                    }
                    let mut next = form[..position].to_vec();
                    next.extend(rule.right.clone());
                    next.extend_from_slice(&form[position + rule.left.len()..]);
                    let terminal_count =
                        next.iter().filter(|symbol| self.terminals.contains(*symbol)).count();
                    if terminal_count > word.len() {
                        continue;
                    }
                    let mut next_history = history.clone();
                    next_history.push(next.clone());
                    queue.push_back((next, next_history));
                }
            }
        }
        Ok(GrammarRun {
            accepted: false,
            derivations_explored: explored,
            derivation: None,
            reason: "No matching derivation was found within the configured bound.".into(),
        })
    }
}

impl Machine for UnrestrictedGrammar {
    type Input = Vec<String>;
    type Output = GrammarRun;
    fn validate(&self) -> Result<(), SimulationError> {
        if !self.variables.contains(&self.start_variable) {
            return Err(SimulationError::UnknownStartState(self.start_variable.clone()));
        }
        for rule in &self.rules {
            if rule.left.is_empty() {
                return Err(SimulationError::InvalidExpression(
                    "an unrestricted grammar production needs a non-empty left side".into(),
                ));
            }
            for symbol in rule.left.iter().chain(&rule.right) {
                if !self.variables.contains(symbol) && !self.terminals.contains(symbol) {
                    return Err(SimulationError::UnknownSymbol);
                }
            }
        }
        Ok(())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.recognizes(input)
    }
}

/// A compact regular-expression syntax: literals, ε, `|`, implicit
/// concatenation, Kleene `*`, parentheses, and backslash escaping.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegularExpression {
    pub expression: String,
}

impl RegularExpression {
    pub fn to_nfa(&self) -> Result<FiniteAutomaton, SimulationError> {
        #[derive(Clone)]
        enum Token {
            Literal(String),
            Epsilon,
            Union,
            Concat,
            Star,
            Left,
            Right,
        }
        fn precedence(token: &Token) -> usize {
            match token {
                Token::Union => 1,
                Token::Concat => 2,
                _ => 0,
            }
        }
        let mut raw = Vec::new();
        let mut escaped = false;
        for character in self.expression.chars() {
            if escaped {
                raw.push(Token::Literal(character.to_string()));
                escaped = false;
                continue;
            }
            raw.push(match character {
                '\\' => {
                    escaped = true;
                    continue;
                }
                'ε' => Token::Epsilon,
                '|' => Token::Union,
                '*' => Token::Star,
                '(' => Token::Left,
                ')' => Token::Right,
                c if c.is_whitespace() => continue,
                c => Token::Literal(c.to_string()),
            });
        }
        if escaped {
            return Err(SimulationError::InvalidExpression("dangling escape character".into()));
        }
        let is_left =
            |token: &Token| matches!(token, Token::Literal(_) | Token::Epsilon | Token::Right | Token::Star);
        let is_right = |token: &Token| matches!(token, Token::Literal(_) | Token::Epsilon | Token::Left);
        let mut tokens = Vec::new();
        for token in raw {
            if tokens.last().is_some_and(|previous| is_left(previous) && is_right(&token)) {
                tokens.push(Token::Concat);
            }
            tokens.push(token);
        }
        let mut output = Vec::new();
        let mut operators = Vec::new();
        for token in tokens {
            match token {
                Token::Literal(_) | Token::Epsilon => output.push(token),
                Token::Star => output.push(Token::Star),
                Token::Left => operators.push(Token::Left),
                Token::Right => {
                    let mut found = false;
                    while let Some(operator) = operators.pop() {
                        if matches!(operator, Token::Left) {
                            found = true;
                            break;
                        }
                        output.push(operator);
                    }
                    if !found {
                        return Err(SimulationError::InvalidExpression(
                            "unmatched closing parenthesis".into(),
                        ));
                    }
                }
                Token::Union | Token::Concat => {
                    while operators.last().is_some_and(|top| {
                        !matches!(top, Token::Left) && precedence(top) >= precedence(&token)
                    }) {
                        output.push(operators.pop().unwrap());
                    }
                    operators.push(token);
                }
            }
        }
        while let Some(operator) = operators.pop() {
            if matches!(operator, Token::Left) {
                return Err(SimulationError::InvalidExpression("unmatched opening parenthesis".into()));
            }
            output.push(operator);
        }
        struct Fragment {
            start: usize,
            end: usize,
        }
        let mut next_state = 0usize;
        let mut stack: Vec<Fragment> = Vec::new();
        let mut transitions = Vec::new();
        let mut alphabet = BTreeSet::new();
        let mut state = || {
            let value = next_state;
            next_state += 1;
            value
        };
        for token in output {
            match token {
                Token::Literal(symbol) => {
                    let start = state();
                    let end = state();
                    alphabet.insert(symbol.clone());
                    transitions.push(FiniteTransition {
                        from: format!("q{start}"),
                        symbol,
                        to: format!("q{end}"),
                    });
                    stack.push(Fragment { start, end });
                }
                Token::Epsilon => {
                    let start = state();
                    let end = state();
                    transitions.push(FiniteTransition {
                        from: format!("q{start}"),
                        symbol: EPSILON.into(),
                        to: format!("q{end}"),
                    });
                    stack.push(Fragment { start, end });
                }
                Token::Concat => {
                    let right = stack.pop().ok_or_else(|| {
                        SimulationError::InvalidExpression(
                            "missing right expression for concatenation".into(),
                        )
                    })?;
                    let left = stack.pop().ok_or_else(|| {
                        SimulationError::InvalidExpression("missing left expression for concatenation".into())
                    })?;
                    transitions.push(FiniteTransition {
                        from: format!("q{}", left.end),
                        symbol: EPSILON.into(),
                        to: format!("q{}", right.start),
                    });
                    stack.push(Fragment { start: left.start, end: right.end });
                }
                Token::Union => {
                    let right = stack.pop().ok_or_else(|| {
                        SimulationError::InvalidExpression("missing right expression for union".into())
                    })?;
                    let left = stack.pop().ok_or_else(|| {
                        SimulationError::InvalidExpression("missing left expression for union".into())
                    })?;
                    let start = state();
                    let end = state();
                    for target in [left.start, right.start] {
                        transitions.push(FiniteTransition {
                            from: format!("q{start}"),
                            symbol: EPSILON.into(),
                            to: format!("q{target}"),
                        });
                    }
                    for source in [left.end, right.end] {
                        transitions.push(FiniteTransition {
                            from: format!("q{source}"),
                            symbol: EPSILON.into(),
                            to: format!("q{end}"),
                        });
                    }
                    stack.push(Fragment { start, end });
                }
                Token::Star => {
                    let fragment = stack.pop().ok_or_else(|| {
                        SimulationError::InvalidExpression("missing expression for star".into())
                    })?;
                    let start = state();
                    let end = state();
                    for (source, target) in [
                        (start, fragment.start),
                        (start, end),
                        (fragment.end, fragment.start),
                        (fragment.end, end),
                    ] {
                        transitions.push(FiniteTransition {
                            from: format!("q{source}"),
                            symbol: EPSILON.into(),
                            to: format!("q{target}"),
                        });
                    }
                    stack.push(Fragment { start, end });
                }
                Token::Left | Token::Right => unreachable!(),
            }
        }
        let fragment =
            stack.pop().ok_or_else(|| SimulationError::InvalidExpression("expression is empty".into()))?;
        if !stack.is_empty() {
            return Err(SimulationError::InvalidExpression("missing operator between expressions".into()));
        }
        Ok(FiniteAutomaton {
            states: (0..next_state).map(|index| format!("q{index}")).collect(),
            alphabet,
            start_state: format!("q{}", fragment.start),
            accepting_states: BTreeSet::from([format!("q{}", fragment.end)]),
            transitions,
        })
    }
}

impl Machine for RegularExpression {
    type Input = Vec<String>;
    type Output = AutomatonRun;
    fn validate(&self) -> Result<(), SimulationError> {
        self.to_nfa().map(|_| ())
    }
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError> {
        self.to_nfa()?.run_nfa(input)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn automaton() -> FiniteAutomaton {
        FiniteAutomaton {
            states: BTreeSet::from(["q0".into(), "q1".into()]),
            alphabet: BTreeSet::from(["a".into(), "b".into()]),
            start_state: "q0".into(),
            accepting_states: BTreeSet::from(["q1".into()]),
            transitions: vec![FiniteTransition { from: "q0".into(), symbol: "a".into(), to: "q1".into() }],
        }
    }
    #[test]
    fn dfa_accepts_single_a() {
        assert!(automaton().run_dfa(&["a".into()]).unwrap().accepted);
    }
    #[test]
    fn nfa_follows_epsilon() {
        let mut a = automaton();
        a.transitions[0].symbol = EPSILON.into();
        assert!(a.run_nfa(&[]).unwrap().accepted);
    }
    #[test]
    fn determinization_preserves_language() {
        let mut a = automaton();
        a.transitions.push(FiniteTransition { from: "q0".into(), symbol: "a".into(), to: "q0".into() });
        let dfa = a.determinize().unwrap();
        assert!(dfa.run_dfa(&["a".into(), "a".into()]).unwrap().accepted);
    }
    #[test]
    fn minimization_merges_equivalent_states() {
        let machine = FiniteAutomaton {
            states: BTreeSet::from(["start".into(), "left".into(), "right".into()]),
            alphabet: BTreeSet::from(["a".into(), "b".into()]),
            start_state: "start".into(),
            accepting_states: BTreeSet::from(["left".into(), "right".into()]),
            transitions: vec![
                FiniteTransition { from: "start".into(), symbol: "a".into(), to: "left".into() },
                FiniteTransition { from: "start".into(), symbol: "b".into(), to: "right".into() },
                FiniteTransition { from: "left".into(), symbol: "a".into(), to: "left".into() },
                FiniteTransition { from: "left".into(), symbol: "b".into(), to: "left".into() },
                FiniteTransition { from: "right".into(), symbol: "a".into(), to: "right".into() },
                FiniteTransition { from: "right".into(), symbol: "b".into(), to: "right".into() },
            ],
        };
        assert_eq!(machine.minimize_dfa().unwrap().states.len(), 2);
    }
    #[test]
    fn petri_consumes_and_produces_tokens() {
        let net = PetriNet {
            marking: BTreeMap::from([("p0".into(), 1), ("p1".into(), 0)]),
            transitions: vec![PetriTransition {
                id: "move".into(),
                inputs: vec![PetriArc { place: "p0".into(), weight: 1 }],
                outputs: vec![PetriArc { place: "p1".into(), weight: 1 }],
            }],
        };
        assert_eq!(net.fire_sequence(&["move".into()]).unwrap().marking["p1"], 1);
    }
    #[test]
    fn pda_accepts_balanced_word() {
        let machine = PushdownAutomaton {
            states: BTreeSet::from(["push".into(), "pop".into(), "accept".into()]),
            start_state: "push".into(),
            accepting_states: BTreeSet::from(["accept".into()]),
            accept_by_empty_stack: false,
            max_configurations: 100,
            transitions: vec![
                PushdownTransition {
                    from: "push".into(),
                    input: "a".into(),
                    pop: vec![],
                    push: vec!["A".into()],
                    to: "push".into(),
                },
                PushdownTransition {
                    from: "push".into(),
                    input: "b".into(),
                    pop: vec!["A".into()],
                    push: vec![],
                    to: "pop".into(),
                },
                PushdownTransition {
                    from: "pop".into(),
                    input: "b".into(),
                    pop: vec!["A".into()],
                    push: vec![],
                    to: "pop".into(),
                },
                PushdownTransition {
                    from: "pop".into(),
                    input: EPSILON.into(),
                    pop: vec![],
                    push: vec![],
                    to: "accept".into(),
                },
            ],
        };
        assert!(machine.run(&["a".into(), "a".into(), "b".into(), "b".into()]).unwrap().accepted);
    }
    #[test]
    fn regular_expression_compiles_to_an_nfa() {
        let expression = RegularExpression { expression: "a(b|c)*".into() };
        assert!(expression.simulate(&vec!["a".into(), "b".into(), "c".into()]).unwrap().accepted);
        assert!(!expression.simulate(&vec!["b".into()]).unwrap().accepted);
    }
    #[test]
    fn mealy_machine_emits_transition_outputs() {
        let machine = MealyMachine {
            states: BTreeSet::from(["q0".into(), "q1".into()]),
            start_state: "q0".into(),
            transitions: vec![MealyTransition {
                from: "q0".into(),
                input: "a".into(),
                output: "x".into(),
                to: "q1".into(),
            }],
        };
        assert_eq!(machine.transduce(&["a".into()]).unwrap().output, vec!["x".to_owned()]);
    }
    #[test]
    fn multitape_machine_copies_input() {
        let machine = MultiTapeTuringMachine {
            states: BTreeSet::from(["copy".into(), "accept".into()]),
            start_state: "copy".into(),
            accepting_states: BTreeSet::from(["accept".into()]),
            rejecting_states: BTreeSet::new(),
            tape_count: 2,
            transitions: vec![
                MultiTapeTransition {
                    from: "copy".into(),
                    read: vec!["1".into(), BLANK.into()],
                    write: vec!["1".into(), "1".into()],
                    movements: vec![Move::Right, Move::Right],
                    to: "copy".into(),
                },
                MultiTapeTransition {
                    from: "copy".into(),
                    read: vec![BLANK.into(), BLANK.into()],
                    write: vec![BLANK.into(), BLANK.into()],
                    movements: vec![Move::Stay, Move::Stay],
                    to: "accept".into(),
                },
            ],
        };
        let result = machine.run(&[vec!["1".into(), "1".into()], vec![]], 20).unwrap();
        assert!(result.accepted);
        assert_eq!(result.tapes[1], vec!["1".to_owned(), "1".to_owned(), BLANK.to_owned()]);
    }
    #[test]
    fn nondeterministic_turing_machine_accepts_a_live_branch() {
        let machine = TuringMachine {
            states: BTreeSet::from(["q0".into(), "reject".into(), "accept".into()]),
            start_state: "q0".into(),
            accepting_states: BTreeSet::from(["accept".into()]),
            rejecting_states: BTreeSet::from(["reject".into()]),
            transitions: vec![
                TuringTransition {
                    from: "q0".into(),
                    read: BLANK.into(),
                    write: BLANK.into(),
                    movement: Move::Stay,
                    to: "reject".into(),
                },
                TuringTransition {
                    from: "q0".into(),
                    read: BLANK.into(),
                    write: BLANK.into(),
                    movement: Move::Stay,
                    to: "accept".into(),
                },
            ],
        };
        assert!(machine.run_nondeterministic(&[], 20, 20).unwrap().accepted);
    }
    #[test]
    fn cyk_accepts_a_cnf_word() {
        let grammar = ContextFreeGrammar {
            variables: BTreeSet::from(["S".into(), "A".into(), "B".into()]),
            terminals: BTreeSet::from(["a".into(), "b".into()]),
            start_variable: "S".into(),
            max_derivations: 100,
            rules: vec![
                GrammarRule { left: "S".into(), right: vec!["A".into(), "B".into()] },
                GrammarRule { left: "A".into(), right: vec!["a".into()] },
                GrammarRule { left: "B".into(), right: vec!["b".into()] },
            ],
        };
        assert!(grammar.cyk(&["a".into(), "b".into()]).unwrap().accepted);
    }
    #[test]
    fn cfg_to_pda_preserves_a_simple_word() {
        let grammar = ContextFreeGrammar {
            variables: BTreeSet::from(["S".into(), "A".into(), "B".into()]),
            terminals: BTreeSet::from(["a".into(), "b".into()]),
            start_variable: "S".into(),
            max_derivations: 100,
            rules: vec![
                GrammarRule { left: "S".into(), right: vec!["A".into(), "B".into()] },
                GrammarRule { left: "A".into(), right: vec!["a".into()] },
                GrammarRule { left: "B".into(), right: vec!["b".into()] },
            ],
        };
        assert!(grammar.to_pda().unwrap().run(&["a".into(), "b".into()]).unwrap().accepted);
    }
    #[test]
    fn contextual_lsystem_applies_only_matching_neighbours() {
        let system = ContextualLSystem {
            axiom: vec!["A".into(), "B".into(), "A".into()],
            rules: vec![ContextualLSystemRule {
                left_context: vec!["A".into()],
                symbol: "B".into(),
                right_context: vec!["A".into()],
                successor: vec!["C".into()],
            }],
        };
        assert_eq!(
            system.simulate(&1).unwrap().generations[1],
            vec!["A".to_owned(), "C".to_owned(), "A".to_owned()]
        );
    }
    #[test]
    fn stochastic_lsystem_is_reproducible() {
        let system = StochasticLSystem {
            axiom: vec!["F".into(), "F".into()],
            seed: 12,
            rules: vec![StochasticLSystemRule {
                predecessor: "F".into(),
                alternatives: vec![
                    WeightedSuccessor { weight: 1, symbols: vec!["A".into()] },
                    WeightedSuccessor { weight: 1, symbols: vec!["B".into()] },
                ],
            }],
        };
        assert_eq!(system.simulate(&3).unwrap(), system.simulate(&3).unwrap());
    }
    #[test]
    fn ll1_parser_accepts_a_predictive_grammar() {
        let grammar = ContextFreeGrammar {
            variables: BTreeSet::from(["S".into(), "A".into()]),
            terminals: BTreeSet::from(["a".into(), "b".into()]),
            start_variable: "S".into(),
            max_derivations: 100,
            rules: vec![
                GrammarRule { left: "S".into(), right: vec!["a".into(), "A".into()] },
                GrammarRule { left: "A".into(), right: vec!["b".into()] },
            ],
        };
        assert!(grammar.ll1_analysis().unwrap().conflicts.is_empty());
        assert!(grammar.parse_ll1(&["a".into(), "b".into()]).unwrap().accepted);
    }
}
