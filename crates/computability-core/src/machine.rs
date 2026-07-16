use thiserror::Error;

/// Common contract for the executable mathematical models in this crate.
pub trait Machine {
    type Input;
    type Output;

    fn validate(&self) -> Result<(), SimulationError>;
    fn simulate(&self, input: &Self::Input) -> Result<Self::Output, SimulationError>;
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum SimulationError {
    #[error("the start state '{0}' is not declared")]
    UnknownStartState(String),
    #[error("transition references an undeclared state '{0}'")]
    UnknownState(String),
    #[error("a deterministic transition already exists for state '{state}' and symbol '{symbol}'")]
    NonDeterministicTransition { state: String, symbol: String },
    #[error("transition symbols must be declared in the alphabet")]
    UnknownSymbol,
    #[error("maximum number of execution steps ({0}) reached")]
    StepLimit(usize),
    #[error("a Petri-net arc weight must be positive")]
    InvalidArcWeight,
    #[error("invalid regular expression: {0}")]
    InvalidExpression(String),
    #[error("the grammar is not in Chomsky normal form: {0}")]
    NotChomskyNormalForm(String),
    #[error("all tapes must provide the same number of initial heads")]
    InvalidTapeArity,
}
