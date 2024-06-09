package computability.CalculationModels.DFA;
import java.util.List;

public class DFA {
    private List<State> States;
    private List<Transiction> Transictions;
    private State startState;

    /**
     * Create a new DFA with the given states and transictions.
     * @param states The states of the DFA.
     * @param transictions The transictions of the DFA.
     */
    public DFA(List<State> states, List<Transiction> transictions) {
        this.States = states;
        this.Transictions = transictions;
    }

    /**
     * Get the states of the DFA.
     * @return The states of the DFA.
     */
    public List<State> getStates() {
        return States;
    }

    /**
     * Get the transictions of the DFA.
     * @return The transictions of the DFA.
     */
    public List<Transiction> getTransictions() {
        return Transictions;
    }

    /**
     * Get the start state of the DFA.
     * @return The start state of the DFA.
     */

    public State getStartState() {
        return startState;
    }

    /**
     * Set the start state of the DFA.
     * @param startState The start state of the DFA.
     */

    public void setStartState(State startState) {
        this.startState = startState;
    }

    /**
     * Check if the given string is accepted by the DFA.
     * @param input The string to check.
     * @return True if the string is accepted, false otherwise.
     */
    public boolean accepts(String input) {
        State currentState = startState;
        for (char symbol : input.toCharArray()) {
            currentState = getNextState(currentState, symbol);
        }
        return currentState.isAccepting();
    }

    /**
     * Get the next state for the given state and symbol.
     * @param state The current state.
     * @param symbol The symbol to transition on.
     * @return The next state for the given state and symbol.
     */
    private State getNextState(State state, char symbol) {
        for (Transiction transiction : Transictions) {
            if (transiction.getStart() == state && transiction.getSymbol() == symbol) {
                return transiction.getEnd();
            }
        }
        return null;
    }

    /**
     * Get the string representation of the DFA.
     * @return The string representation of the DFA.
     */
    @Override
    public String toString() {
        StringBuilder builder = new StringBuilder();
        builder.append("Q = {");
        for (State state : States) {
            builder.append(state.getName()).append(", ");
        }
        builder.delete(builder.length() - 2, builder.length());
        builder.append("}\nΣ = {");
        for (Transiction transiction : Transictions) {
            builder.append(transiction.getSymbol()).append(", ");
        }
        builder.delete(builder.length() - 2, builder.length());
        builder.append("}\nδ = {");
        for (Transiction transiction : Transictions) {
            builder.append(transiction.getName()).append(", ");
        }
        builder.delete(builder.length() - 2, builder.length());
        builder.append("}\nq0 = ").append(startState.getName()).append("\nF = {");
        for (State state : States) {
            if (state.isAccepting()) {
                builder.append(state.getName()).append(", ");
            }
        }
        builder.delete(builder.length() - 2, builder.length());
        builder.append("}");
        return builder.toString();
    }
}
