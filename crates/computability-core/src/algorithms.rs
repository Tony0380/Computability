use std::collections::{BTreeMap, BTreeSet, HashMap, VecDeque};

use serde::{Deserialize, Serialize};

use crate::{
    ContextFreeGrammar, EPSILON, FiniteAutomaton, FiniteTransition, GrammarRule, Machine, PushdownAutomaton,
    RegularExpression, RegularGrammar, SimulationError,
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AlgorithmStep {
    pub title: String,
    pub explanation: String,
    pub facts: BTreeMap<String, String>,
}

impl AlgorithmStep {
    fn new(title: impl Into<String>, explanation: impl Into<String>) -> Self {
        Self { title: title.into(), explanation: explanation.into(), facts: BTreeMap::new() }
    }

    fn fact(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.facts.insert(key.into(), value.into());
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AutomatonAlgorithmReport {
    pub algorithm: String,
    pub steps: Vec<AlgorithmStep>,
    pub result: FiniteAutomaton,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GrammarAlgorithmReport {
    pub algorithm: String,
    pub steps: Vec<AlgorithmStep>,
    pub result: ContextFreeGrammar,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PushdownAlgorithmReport {
    pub algorithm: String,
    pub steps: Vec<AlgorithmStep>,
    pub result: PushdownAutomaton,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegexAlgorithmReport {
    pub algorithm: String,
    pub steps: Vec<AlgorithmStep>,
    pub expression: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DfaEquivalenceReport {
    pub equivalent: bool,
    pub witness: Option<Vec<String>>,
    pub explored_pairs: usize,
    pub steps: Vec<AlgorithmStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PumpingRequest {
    pub word: Vec<String>,
    pub pumping_length: usize,
    #[serde(default)]
    pub exponents: Vec<usize>,
    #[serde(default = "default_decomposition_limit")]
    pub max_decompositions: usize,
}

fn default_decomposition_limit() -> usize {
    500
}

const MAX_DECOMPOSITIONS: usize = 500;
const MAX_PUMP_EXPONENT: usize = 64;
const MAX_PUMPED_WORD_SYMBOLS: usize = 10_000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PumpedWord {
    pub exponent: usize,
    pub word: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegularPumpingDecomposition {
    pub x: Vec<String>,
    pub y: Vec<String>,
    pub z: Vec<String>,
    pub pumped: Vec<PumpedWord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ContextFreePumpingDecomposition {
    pub u: Vec<String>,
    pub v: Vec<String>,
    pub x: Vec<String>,
    pub y: Vec<String>,
    pub z: Vec<String>,
    pub pumped: Vec<PumpedWord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegularPumpingReport {
    pub word: Vec<String>,
    pub pumping_length: usize,
    pub word_is_long_enough: bool,
    pub truncated: bool,
    pub decompositions: Vec<RegularPumpingDecomposition>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ContextFreePumpingReport {
    pub word: Vec<String>,
    pub pumping_length: usize,
    pub word_is_long_enough: bool,
    pub truncated: bool,
    pub decompositions: Vec<ContextFreePumpingDecomposition>,
    pub note: String,
}

fn exponents(request: &PumpingRequest) -> Vec<usize> {
    let mut values = if request.exponents.is_empty() { vec![0, 2] } else { request.exponents.clone() };
    values.sort_unstable();
    values.dedup();
    values
}

fn validate_pumping_request(request: &PumpingRequest) -> Result<(), SimulationError> {
    if request.pumping_length == 0 {
        return Err(SimulationError::InvalidExpression("the pumping length must be positive".into()));
    }
    if request.word.len() > MAX_PUMPED_WORD_SYMBOLS {
        return Err(SimulationError::InvalidExpression("the witness word exceeds the supported size".into()));
    }
    if request.exponents.iter().any(|exponent| *exponent > MAX_PUMP_EXPONENT) {
        return Err(SimulationError::InvalidExpression("pumping exponents must not exceed 64".into()));
    }
    Ok(())
}

fn repeat(symbols: &[String], count: usize) -> Vec<String> {
    (0..count).flat_map(|_| symbols.iter().cloned()).collect()
}

pub fn analyze_regular_pumping(request: &PumpingRequest) -> Result<RegularPumpingReport, SimulationError> {
    validate_pumping_request(request)?;
    let maximum = request.max_decompositions.clamp(1, MAX_DECOMPOSITIONS);
    let mut decompositions = Vec::new();
    let mut truncated = false;
    if request.word.len() >= request.pumping_length {
        'outer: for x_end in 0..request.pumping_length {
            for y_end in x_end + 1..=request.pumping_length.min(request.word.len()) {
                if decompositions.len() == maximum {
                    truncated = true;
                    break 'outer;
                }
                let x = request.word[..x_end].to_vec();
                let y = request.word[x_end..y_end].to_vec();
                let z = request.word[y_end..].to_vec();
                let pumped = exponents(request)
                    .into_iter()
                    .map(|exponent| {
                        let mut word = x.clone();
                        word.extend(repeat(&y, exponent));
                        word.extend(z.clone());
                        PumpedWord { exponent, word }
                    })
                    .collect();
                decompositions.push(RegularPumpingDecomposition { x, y, z, pumped });
            }
        }
    }
    Ok(RegularPumpingReport {
        word: request.word.clone(),
        pumping_length: request.pumping_length,
        word_is_long_enough: request.word.len() >= request.pumping_length,
        truncated,
        decompositions,
        note: "This enumerates every admissible split x y z with |xy| <= p and |y| > 0. A proof still needs a language-specific membership argument and must respect the quantifier order.".into(),
    })
}

pub fn analyze_context_free_pumping(
    request: &PumpingRequest,
) -> Result<ContextFreePumpingReport, SimulationError> {
    validate_pumping_request(request)?;
    let maximum = request.max_decompositions.clamp(1, MAX_DECOMPOSITIONS);
    let n = request.word.len();
    let mut decompositions = Vec::new();
    let mut truncated = false;
    if n >= request.pumping_length {
        'outer: for u_end in 0..=n {
            for v_end in u_end..=n {
                for x_end in v_end..=n {
                    for y_end in x_end..=n {
                        if y_end - u_end > request.pumping_length || (v_end - u_end) + (y_end - x_end) == 0 {
                            continue;
                        }
                        if decompositions.len() == maximum {
                            truncated = true;
                            break 'outer;
                        }
                        let u = request.word[..u_end].to_vec();
                        let v = request.word[u_end..v_end].to_vec();
                        let x = request.word[v_end..x_end].to_vec();
                        let y = request.word[x_end..y_end].to_vec();
                        let z = request.word[y_end..].to_vec();
                        let pumped = exponents(request)
                            .into_iter()
                            .map(|exponent| {
                                let mut word = u.clone();
                                word.extend(repeat(&v, exponent));
                                word.extend(x.clone());
                                word.extend(repeat(&y, exponent));
                                word.extend(z.clone());
                                PumpedWord { exponent, word }
                            })
                            .collect();
                        decompositions.push(ContextFreePumpingDecomposition { u, v, x, y, z, pumped });
                    }
                }
            }
        }
    }
    Ok(ContextFreePumpingReport {
        word: request.word.clone(),
        pumping_length: request.pumping_length,
        word_is_long_enough: n >= request.pumping_length,
        truncated,
        decompositions,
        note: "This enumerates admissible splits u v x y z with |vxy| <= p and |vy| > 0. The context-free pumping lemma is a necessary condition, not a general decision procedure.".into(),
    })
}

fn set_name(set: &BTreeSet<String>) -> String {
    format!("{{{}}}", set.iter().cloned().collect::<Vec<_>>().join(","))
}

impl FiniteAutomaton {
    fn epsilon_closure(&self, seeds: BTreeSet<String>) -> BTreeSet<String> {
        let mut result = seeds;
        let mut queue: VecDeque<_> = result.iter().cloned().collect();
        while let Some(state) = queue.pop_front() {
            for transition in
                self.transitions.iter().filter(|item| item.from == state && item.symbol == EPSILON)
            {
                if result.insert(transition.to.clone()) {
                    queue.push_back(transition.to.clone());
                }
            }
        }
        result
    }

    pub fn determinize_report(&self) -> Result<AutomatonAlgorithmReport, SimulationError> {
        self.validate(false)?;
        let result = self.determinize()?;
        let start_members = self.epsilon_closure(BTreeSet::from([self.start_state.clone()]));
        let mut steps = vec![
            AlgorithmStep::new(
                "Initial epsilon closure",
                "The first DFA state contains every NFA state reachable from the start without consuming input.",
            )
            .fact("DFA start", set_name(&start_members)),
        ];
        for transition in &result.transitions {
            steps.push(
                AlgorithmStep::new(
                    "Move and close",
                    "Consume one alphabet symbol from the current subset, then take epsilon closure.",
                )
                .fact("source subset", &transition.from)
                .fact("symbol", &transition.symbol)
                .fact("target subset", &transition.to),
            );
        }
        steps.push(
            AlgorithmStep::new(
                "Mark accepting subsets",
                "A DFA subset accepts when it contains at least one accepting NFA state.",
            )
            .fact(
                "accepting subsets",
                result.accepting_states.iter().cloned().collect::<Vec<_>>().join(", "),
            ),
        );
        Ok(AutomatonAlgorithmReport { algorithm: "subset_construction".into(), steps, result })
    }

    pub fn minimize_report(&self) -> Result<AutomatonAlgorithmReport, SimulationError> {
        self.validate(true)?;
        let reachable = self.reachable_states();
        let result = self.minimize_dfa()?;
        let steps = vec![
            AlgorithmStep::new(
                "Remove unreachable states",
                "Only states reachable from the start can affect the recognized language.",
            )
            .fact("reachable states", reachable.iter().cloned().collect::<Vec<_>>().join(", ")),
            AlgorithmStep::new(
                "Refine partitions",
                "Start with accepting and non-accepting states, then split groups whose transitions lead to different groups.",
            )
            .fact("input states", reachable.len().to_string())
            .fact("stable partitions", result.states.len().to_string()),
            AlgorithmStep::new(
                "Build quotient automaton",
                "Each stable partition becomes one state and inherits the transitions of a representative.",
            )
            .fact("result states", result.states.iter().cloned().collect::<Vec<_>>().join(", ")),
        ];
        Ok(AutomatonAlgorithmReport { algorithm: "dfa_minimization".into(), steps, result })
    }

    fn reachable_states(&self) -> BTreeSet<String> {
        let mut reached = BTreeSet::from([self.start_state.clone()]);
        let mut queue = VecDeque::from([self.start_state.clone()]);
        while let Some(state) = queue.pop_front() {
            for target in self.transitions.iter().filter(|item| item.from == state).map(|item| &item.to) {
                if reached.insert(target.clone()) {
                    queue.push_back(target.clone());
                }
            }
        }
        reached
    }

    pub fn remove_unreachable_report(&self) -> Result<AutomatonAlgorithmReport, SimulationError> {
        self.validate(false)?;
        let reached = self.reachable_states();
        let removed: Vec<_> = self.states.difference(&reached).cloned().collect();
        let result = FiniteAutomaton {
            states: reached.clone(),
            alphabet: self.alphabet.clone(),
            start_state: self.start_state.clone(),
            accepting_states: self.accepting_states.intersection(&reached).cloned().collect(),
            transitions: self
                .transitions
                .iter()
                .filter(|item| reached.contains(&item.from) && reached.contains(&item.to))
                .cloned()
                .collect(),
        };
        let steps = vec![
            AlgorithmStep::new("Graph search", "Traverse outgoing transitions from the start state.")
                .fact("reachable", reached.iter().cloned().collect::<Vec<_>>().join(", ")),
            AlgorithmStep::new("Prune", "Delete states and transitions that cannot be reached by any input.")
                .fact("removed", if removed.is_empty() { "none".into() } else { removed.join(", ") }),
        ];
        Ok(AutomatonAlgorithmReport { algorithm: "remove_unreachable".into(), steps, result })
    }

    pub fn eliminate_epsilon_report(&self) -> Result<AutomatonAlgorithmReport, SimulationError> {
        self.validate(false)?;
        let closures: BTreeMap<_, _> = self
            .states
            .iter()
            .map(|state| (state.clone(), self.epsilon_closure(BTreeSet::from([state.clone()]))))
            .collect();
        let mut transitions = BTreeSet::new();
        for state in &self.states {
            for symbol in &self.alphabet {
                let moved: BTreeSet<_> = self
                    .transitions
                    .iter()
                    .filter(|item| closures[state].contains(&item.from) && item.symbol == *symbol)
                    .map(|item| item.to.clone())
                    .collect();
                let targets: BTreeSet<_> =
                    moved.into_iter().flat_map(|target| closures[&target].iter().cloned()).collect();
                for target in targets {
                    transitions.insert((state.clone(), symbol.clone(), target));
                }
            }
        }
        let accepting_states = self
            .states
            .iter()
            .filter(|state| closures[*state].iter().any(|item| self.accepting_states.contains(item)))
            .cloned()
            .collect();
        let result = FiniteAutomaton {
            states: self.states.clone(),
            alphabet: self.alphabet.clone(),
            start_state: self.start_state.clone(),
            accepting_states,
            transitions: transitions
                .into_iter()
                .map(|(from, symbol, to)| FiniteTransition { from, symbol, to })
                .collect(),
        };
        let mut steps = Vec::new();
        for (state, closure) in closures {
            steps.push(
                AlgorithmStep::new(
                    "Compute epsilon closure",
                    "Record the states reachable without consuming an input symbol.",
                )
                .fact("state", state)
                .fact("closure", closure.into_iter().collect::<Vec<_>>().join(", ")),
            );
        }
        steps.push(
            AlgorithmStep::new(
                "Lift labelled transitions",
                "For every state and symbol, move from its closure and close each destination again.",
            )
            .fact("epsilon transitions after conversion", "0"),
        );
        Ok(AutomatonAlgorithmReport { algorithm: "epsilon_elimination".into(), steps, result })
    }

    pub fn equivalent_to(&self, other: &FiniteAutomaton) -> Result<DfaEquivalenceReport, SimulationError> {
        self.validate(true)?;
        other.validate(true)?;
        let alphabet: BTreeSet<_> = self.alphabet.union(&other.alphabet).cloned().collect();
        let left: HashMap<_, _> = self
            .transitions
            .iter()
            .map(|item| ((item.from.clone(), item.symbol.clone()), item.to.clone()))
            .collect();
        let right: HashMap<_, _> = other
            .transitions
            .iter()
            .map(|item| ((item.from.clone(), item.symbol.clone()), item.to.clone()))
            .collect();
        type Pair = (Option<String>, Option<String>);
        let start: Pair = (Some(self.start_state.clone()), Some(other.start_state.clone()));
        let mut queue = VecDeque::from([(start.clone(), Vec::<String>::new())]);
        let mut seen = BTreeSet::new();
        while let Some((pair, word)) = queue.pop_front() {
            if !seen.insert(pair.clone()) {
                continue;
            }
            let left_accepts = pair.0.as_ref().is_some_and(|state| self.accepting_states.contains(state));
            let right_accepts = pair.1.as_ref().is_some_and(|state| other.accepting_states.contains(state));
            if left_accepts != right_accepts {
                return Ok(DfaEquivalenceReport {
                    equivalent: false,
                    witness: Some(word.clone()),
                    explored_pairs: seen.len(),
                    steps: vec![
                        AlgorithmStep::new(
                            "Product search",
                            "Breadth-first search found a pair in which exactly one automaton accepts.",
                        )
                        .fact("counterexample", if word.is_empty() { EPSILON.into() } else { word.join(" ") })
                        .fact("left state", pair.0.unwrap_or_else(|| "dead".into()))
                        .fact("right state", pair.1.unwrap_or_else(|| "dead".into())),
                    ],
                });
            }
            for symbol in &alphabet {
                let next_left =
                    pair.0.as_ref().and_then(|state| left.get(&(state.clone(), symbol.clone())).cloned());
                let next_right =
                    pair.1.as_ref().and_then(|state| right.get(&(state.clone(), symbol.clone())).cloned());
                let mut next_word = word.clone();
                next_word.push(symbol.clone());
                queue.push_back(((next_left, next_right), next_word));
            }
        }
        Ok(DfaEquivalenceReport {
            equivalent: true,
            witness: None,
            explored_pairs: seen.len(),
            steps: vec![
                AlgorithmStep::new(
                    "Product search complete",
                    "Every reachable state pair agrees on acceptance, including implicit dead states.",
                )
                .fact("explored pairs", seen.len().to_string()),
            ],
        })
    }

    pub fn to_regex_report(&self) -> Result<RegexAlgorithmReport, SimulationError> {
        self.validate(false)?;
        fn union(left: Option<String>, right: Option<String>) -> Option<String> {
            match (left, right) {
                (None, value) | (value, None) => value,
                (Some(left), Some(right)) if left == right => Some(left),
                (Some(left), Some(right)) => Some(format!("({left}|{right})")),
            }
        }
        fn concat(parts: &[Option<String>]) -> Option<String> {
            let mut output = String::new();
            for part in parts {
                let value = part.as_ref()?;
                if value != EPSILON {
                    output.push_str(value);
                }
            }
            Some(if output.is_empty() { EPSILON.into() } else { output })
        }
        fn star(value: Option<String>) -> Option<String> {
            match value {
                None => Some(EPSILON.into()),
                Some(value) if value == EPSILON => Some(value),
                Some(value) => Some(format!("({value})*")),
            }
        }
        fn literal(symbol: &str) -> Result<String, SimulationError> {
            let mut chars = symbol.chars();
            let Some(character) = chars.next() else {
                return Err(SimulationError::InvalidExpression(
                    "empty alphabet symbols are not supported".into(),
                ));
            };
            if chars.next().is_some() {
                return Err(SimulationError::InvalidExpression(
                    "state elimination currently requires one character per alphabet symbol".into(),
                ));
            }
            Ok(if matches!(character, '|' | '*' | '(' | ')' | '\\') {
                format!("\\{character}")
            } else {
                character.to_string()
            })
        }

        let new_start = "__gnfa_start".to_owned();
        let new_accept = "__gnfa_accept".to_owned();
        let mut remaining: Vec<_> = std::iter::once(new_start.clone())
            .chain(self.states.iter().cloned())
            .chain(std::iter::once(new_accept.clone()))
            .collect();
        let mut edges: BTreeMap<(String, String), Option<String>> = BTreeMap::new();
        let mut add = |from: String, to: String, expression: String| {
            let key = (from, to);
            let current = edges.remove(&key).flatten();
            edges.insert(key, union(current, Some(expression)));
        };
        add(new_start.clone(), self.start_state.clone(), EPSILON.into());
        for accepting in &self.accepting_states {
            add(accepting.clone(), new_accept.clone(), EPSILON.into());
        }
        for transition in &self.transitions {
            let expression =
                if transition.symbol == EPSILON { EPSILON.into() } else { literal(&transition.symbol)? };
            add(transition.from.clone(), transition.to.clone(), expression);
        }

        let mut steps = vec![AlgorithmStep::new(
            "Create a GNFA",
            "Add one fresh start state and one fresh accepting state, then merge parallel labels with union.",
        )];
        for eliminated in self.states.iter().cloned().collect::<Vec<_>>() {
            let active: Vec<_> = remaining.iter().filter(|state| **state != eliminated).cloned().collect();
            for source in &active {
                for target in &active {
                    let direct = edges.get(&(source.clone(), target.clone())).cloned().flatten();
                    let through = concat(&[
                        edges.get(&(source.clone(), eliminated.clone())).cloned().flatten(),
                        star(edges.get(&(eliminated.clone(), eliminated.clone())).cloned().flatten()),
                        edges.get(&(eliminated.clone(), target.clone())).cloned().flatten(),
                    ]);
                    let combined = union(direct, through);
                    edges.insert((source.clone(), target.clone()), combined);
                }
            }
            edges.retain(|(from, to), _| from != &eliminated && to != &eliminated);
            remaining.retain(|state| state != &eliminated);
            steps.push(
                AlgorithmStep::new(
                    "Eliminate state",
                    "Replace every path through the state with a direct regular-expression label.",
                )
                .fact("state", eliminated)
                .fact("states remaining", remaining.len().to_string()),
            );
        }
        let expression = edges.remove(&(new_start, new_accept)).flatten().ok_or_else(|| {
            SimulationError::InvalidExpression("the automaton accepts the empty language".into())
        })?;
        steps.push(
            AlgorithmStep::new(
                "Read final label",
                "The only remaining start-to-accept label denotes the language.",
            )
            .fact("regular expression", &expression),
        );
        Ok(RegexAlgorithmReport { algorithm: "state_elimination".into(), steps, expression })
    }
}

impl RegularExpression {
    pub fn thompson_report(&self) -> Result<AutomatonAlgorithmReport, SimulationError> {
        let result = self.to_nfa()?;
        let mut steps = vec![
            AlgorithmStep::new(
                "Parse expression",
                "Apply precedence for union, concatenation, Kleene star, and parentheses.",
            )
            .fact("expression", &self.expression),
            AlgorithmStep::new(
                "Build Thompson fragments",
                "Each literal and operator contributes a fragment joined by epsilon transitions.",
            )
            .fact("states", result.states.len().to_string())
            .fact("transitions", result.transitions.len().to_string()),
        ];
        steps.extend(result.transitions.iter().map(|transition| {
            AlgorithmStep::new("Fragment edge", "One edge in the constructed epsilon-NFA.")
                .fact("from", &transition.from)
                .fact("label", &transition.symbol)
                .fact("to", &transition.to)
        }));
        Ok(AutomatonAlgorithmReport { algorithm: "thompson".into(), steps, result })
    }
}

impl RegularGrammar {
    pub fn to_nfa_report(&self) -> Result<AutomatonAlgorithmReport, SimulationError> {
        let result = self.to_nfa()?;
        let steps = self
            .productions
            .iter()
            .map(|production| {
                AlgorithmStep::new(
                    "Translate production",
                    "A right-linear production becomes one labelled transition; terminal productions target the fresh accepting state.",
                )
                .fact("left", &production.left)
                .fact("terminal", production.terminal.as_deref().unwrap_or(EPSILON))
                .fact("next", production.next_variable.as_deref().unwrap_or("__accept"))
            })
            .collect();
        Ok(AutomatonAlgorithmReport { algorithm: "regular_grammar_to_nfa".into(), steps, result })
    }
}

impl ContextFreeGrammar {
    pub fn to_pda_report(&self) -> Result<PushdownAlgorithmReport, SimulationError> {
        let result = self.to_pda()?;
        let steps = vec![
            AlgorithmStep::new(
                "Initialize stack",
                "Push the grammar start variable above a fresh bottom marker.",
            )
            .fact("start variable", &self.start_variable),
            AlgorithmStep::new(
                "Expand variables",
                "Each production becomes an epsilon transition that replaces its left variable on the stack.",
            )
            .fact("productions", self.rules.len().to_string()),
            AlgorithmStep::new(
                "Match terminals",
                "A terminal is consumed exactly when the same terminal is on top of the stack.",
            )
            .fact("terminals", self.terminals.iter().cloned().collect::<Vec<_>>().join(", ")),
        ];
        Ok(PushdownAlgorithmReport { algorithm: "cfg_to_pda".into(), steps, result })
    }

    pub fn chomsky_report(&self) -> Result<GrammarAlgorithmReport, SimulationError> {
        self.validate()?;
        let mut variables = self.variables.clone();
        let mut fresh_index = 0usize;
        let mut fresh = |prefix: &str, variables: &mut BTreeSet<String>| loop {
            let candidate = format!("__{prefix}_{fresh_index}");
            fresh_index += 1;
            if variables.insert(candidate.clone()) {
                break candidate;
            }
        };

        let original_nullable = {
            let mut nullable = BTreeSet::new();
            loop {
                let previous = nullable.clone();
                for rule in &self.rules {
                    if rule.right.is_empty()
                        || rule
                            .right
                            .iter()
                            .all(|symbol| self.variables.contains(symbol) && nullable.contains(symbol))
                    {
                        nullable.insert(rule.left.clone());
                    }
                }
                if nullable == previous {
                    break nullable;
                }
            }
        };
        let original_start_nullable = original_nullable.contains(&self.start_variable);
        let start = fresh("START", &mut variables);
        let mut rules = self.rules.clone();
        rules.push(GrammarRule { left: start.clone(), right: vec![self.start_variable.clone()] });
        let mut steps = vec![
            AlgorithmStep::new(
                "Add a fresh start variable",
                "A new start protects the language while epsilon and unit productions are removed.",
            )
            .fact("new start", &start),
        ];

        let mut nullable = BTreeSet::new();
        loop {
            let previous = nullable.clone();
            for rule in &rules {
                if rule.right.is_empty()
                    || rule.right.iter().all(|symbol| variables.contains(symbol) && nullable.contains(symbol))
                {
                    nullable.insert(rule.left.clone());
                }
            }
            if nullable == previous {
                break;
            }
        }
        let mut without_epsilon = BTreeSet::new();
        for rule in &rules {
            if rule.right.is_empty() {
                continue;
            }
            let positions: Vec<_> = rule
                .right
                .iter()
                .enumerate()
                .filter(|(_, symbol)| nullable.contains(*symbol))
                .map(|(index, _)| index)
                .collect();
            if positions.len() > 16 {
                return Err(SimulationError::InvalidExpression(
                    "too many nullable symbols in one production for an explicit CNF trace".into(),
                ));
            }
            for mask in 0usize..(1usize << positions.len()) {
                let omitted: BTreeSet<_> = positions
                    .iter()
                    .enumerate()
                    .filter(|(bit, _)| mask & (1 << bit) != 0)
                    .map(|(_, position)| *position)
                    .collect();
                let right: Vec<_> = rule
                    .right
                    .iter()
                    .enumerate()
                    .filter(|(index, _)| !omitted.contains(index))
                    .map(|(_, symbol)| symbol.clone())
                    .collect();
                if !right.is_empty() {
                    without_epsilon.insert((rule.left.clone(), right));
                }
            }
        }
        if original_start_nullable {
            without_epsilon.insert((start.clone(), Vec::new()));
        }
        rules = without_epsilon.into_iter().map(|(left, right)| GrammarRule { left, right }).collect();
        steps.push(
            AlgorithmStep::new(
                "Eliminate epsilon productions",
                "Compute nullable variables and add every non-empty omission permitted by them.",
            )
            .fact("nullable variables", nullable.into_iter().collect::<Vec<_>>().join(", "))
            .fact("rules", rules.len().to_string()),
        );

        let mut unit_closure: BTreeMap<String, BTreeSet<String>> =
            variables.iter().map(|variable| (variable.clone(), BTreeSet::from([variable.clone()]))).collect();
        loop {
            let previous = unit_closure.clone();
            for rule in &rules {
                if rule.right.len() == 1 && variables.contains(&rule.right[0]) {
                    let targets = previous[&rule.right[0]].clone();
                    unit_closure.get_mut(&rule.left).expect("declared variable").extend(targets);
                }
            }
            if unit_closure == previous {
                break;
            }
        }
        let non_unit: Vec<_> = rules
            .iter()
            .filter(|rule| !(rule.right.len() == 1 && variables.contains(&rule.right[0])))
            .cloned()
            .collect();
        let mut expanded = BTreeSet::new();
        for variable in &variables {
            for source in &unit_closure[variable] {
                for rule in non_unit.iter().filter(|rule| &rule.left == source) {
                    expanded.insert((variable.clone(), rule.right.clone()));
                }
            }
        }
        rules = expanded.into_iter().map(|(left, right)| GrammarRule { left, right }).collect();
        steps.push(
            AlgorithmStep::new(
                "Eliminate unit productions",
                "Replace variable-to-variable chains with the non-unit productions they reach.",
            )
            .fact("rules", rules.len().to_string()),
        );

        let mut terminal_variables = BTreeMap::new();
        let mut converted = Vec::new();
        for mut rule in rules {
            if rule.right.len() >= 2 {
                for symbol in &mut rule.right {
                    if self.terminals.contains(symbol) {
                        let variable = terminal_variables
                            .entry(symbol.clone())
                            .or_insert_with(|| fresh("TERM", &mut variables))
                            .clone();
                        *symbol = variable;
                    }
                }
            }
            converted.push(rule);
        }
        for (terminal, variable) in &terminal_variables {
            converted.push(GrammarRule { left: variable.clone(), right: vec![terminal.clone()] });
        }
        steps.push(
            AlgorithmStep::new(
                "Isolate terminals",
                "Terminals in long right sides are replaced by fresh variables with terminal productions.",
            )
            .fact("terminal variables", terminal_variables.len().to_string()),
        );

        let mut binary = Vec::new();
        for rule in converted {
            if rule.right.len() <= 2 {
                binary.push(rule);
                continue;
            }
            let mut left = rule.left;
            for index in 0..rule.right.len() - 2 {
                let next = fresh("BIN", &mut variables);
                binary.push(GrammarRule { left, right: vec![rule.right[index].clone(), next.clone()] });
                left = next;
            }
            binary.push(GrammarRule { left, right: rule.right[rule.right.len() - 2..].to_vec() });
        }

        let mut productive = BTreeSet::new();
        loop {
            let previous = productive.clone();
            for rule in &binary {
                if rule
                    .right
                    .iter()
                    .all(|symbol| self.terminals.contains(symbol) || productive.contains(symbol))
                {
                    productive.insert(rule.left.clone());
                }
            }
            if productive == previous {
                break;
            }
        }
        let mut reachable = BTreeSet::from([start.clone()]);
        loop {
            let previous = reachable.clone();
            for rule in binary.iter().filter(|rule| previous.contains(&rule.left)) {
                reachable.extend(rule.right.iter().filter(|symbol| variables.contains(*symbol)).cloned());
            }
            if reachable == previous {
                break;
            }
        }
        variables =
            variables.intersection(&productive).filter(|item| reachable.contains(*item)).cloned().collect();
        variables.insert(start.clone());
        binary.retain(|rule| {
            variables.contains(&rule.left)
                && rule
                    .right
                    .iter()
                    .all(|symbol| self.terminals.contains(symbol) || variables.contains(symbol))
        });
        binary.sort_by(|left, right| (&left.left, &left.right).cmp(&(&right.left, &right.right)));
        binary.dedup();
        steps.push(
            AlgorithmStep::new(
                "Binarize and remove useless variables",
                "Split long right sides into binary productions, then keep only productive and reachable variables.",
            )
            .fact("variables", variables.len().to_string())
            .fact("rules", binary.len().to_string()),
        );
        let result = ContextFreeGrammar {
            variables,
            terminals: self.terminals.clone(),
            start_variable: start,
            rules: binary,
            max_derivations: self.max_derivations,
        };
        Ok(GrammarAlgorithmReport { algorithm: "chomsky_normal_form".into(), steps, result })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn nfa_with_epsilon() -> FiniteAutomaton {
        FiniteAutomaton {
            states: BTreeSet::from(["q0".into(), "q1".into(), "q2".into(), "dead".into()]),
            alphabet: BTreeSet::from(["a".into()]),
            start_state: "q0".into(),
            accepting_states: BTreeSet::from(["q2".into()]),
            transitions: vec![
                FiniteTransition { from: "q0".into(), symbol: EPSILON.into(), to: "q1".into() },
                FiniteTransition { from: "q1".into(), symbol: "a".into(), to: "q2".into() },
            ],
        }
    }

    #[test]
    fn epsilon_elimination_preserves_sample_language() {
        let nfa = nfa_with_epsilon();
        let report = nfa.eliminate_epsilon_report().unwrap();
        assert!(report.result.transitions.iter().all(|item| item.symbol != EPSILON));
        for word in [vec![], vec!["a".into()], vec!["a".into(), "a".into()]] {
            assert_eq!(nfa.run_nfa(&word).unwrap().accepted, report.result.run_nfa(&word).unwrap().accepted);
        }
    }

    #[test]
    fn unreachable_states_are_removed() {
        let report = nfa_with_epsilon().remove_unreachable_report().unwrap();
        assert!(!report.result.states.contains("dead"));
        assert_eq!(report.result.states.len(), 3);
    }

    #[test]
    fn equivalence_returns_a_shortest_counterexample() {
        let left = FiniteAutomaton {
            states: BTreeSet::from(["even".into(), "odd".into()]),
            alphabet: BTreeSet::from(["a".into()]),
            start_state: "even".into(),
            accepting_states: BTreeSet::from(["even".into()]),
            transitions: vec![
                FiniteTransition { from: "even".into(), symbol: "a".into(), to: "odd".into() },
                FiniteTransition { from: "odd".into(), symbol: "a".into(), to: "even".into() },
            ],
        };
        let mut right = left.clone();
        right.accepting_states = BTreeSet::from(["odd".into()]);
        let report = left.equivalent_to(&right).unwrap();
        assert!(!report.equivalent);
        assert_eq!(report.witness, Some(vec![]));
    }

    #[test]
    fn regular_pumping_enumerates_every_admissible_prefix_split() {
        let report = analyze_regular_pumping(&PumpingRequest {
            word: vec!["a".into(), "a".into(), "b".into()],
            pumping_length: 2,
            exponents: vec![0, 2],
            max_decompositions: 100,
        })
        .unwrap();
        assert_eq!(report.decompositions.len(), 3);
        assert!(report.decompositions.iter().all(|item| !item.y.is_empty()));
    }

    #[test]
    fn context_free_pumping_respects_both_constraints() {
        let request = PumpingRequest {
            word: vec!["a".into(), "a".into(), "b".into(), "b".into()],
            pumping_length: 2,
            exponents: vec![0, 2],
            max_decompositions: 1000,
        };
        let report = analyze_context_free_pumping(&request).unwrap();
        assert!(!report.decompositions.is_empty());
        assert!(report.decompositions.iter().all(|item| {
            item.v.len() + item.x.len() + item.y.len() <= request.pumping_length
                && item.v.len() + item.y.len() > 0
        }));
    }

    #[test]
    fn pumping_rejects_unbounded_request_parameters() {
        let request = PumpingRequest {
            word: vec!["a".into()],
            pumping_length: 1,
            exponents: vec![65],
            max_decompositions: usize::MAX,
        };
        assert!(analyze_regular_pumping(&request).is_err());
    }

    #[test]
    fn cnf_conversion_produces_only_cnf_rules() {
        let grammar = ContextFreeGrammar {
            variables: BTreeSet::from(["S".into(), "A".into(), "B".into()]),
            terminals: BTreeSet::from(["a".into(), "b".into()]),
            start_variable: "S".into(),
            rules: vec![
                GrammarRule { left: "S".into(), right: vec!["A".into(), "B".into(), "A".into()] },
                GrammarRule { left: "A".into(), right: vec!["a".into()] },
                GrammarRule { left: "B".into(), right: vec!["b".into()] },
            ],
            max_derivations: 1000,
        };
        let report = grammar.chomsky_report().unwrap();
        assert!(report.result.rules.iter().all(|rule| match rule.right.as_slice() {
            [] => rule.left == report.result.start_variable,
            [terminal] => report.result.terminals.contains(terminal),
            [left, right] =>
                report.result.variables.contains(left) && report.result.variables.contains(right),
            _ => false,
        }));
    }
}
