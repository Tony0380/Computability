package computability.calculation.models;

import java.util.ArrayList;
import java.util.List;

public class DFA {
    final private List<State> States;
    final private List<Transiction> Transictions;
    private State startState;

    /**
     * Create a new DFA with no states or transictions.
     */
    public DFA() {
        this.States = new ArrayList<>();
        this.Transictions = new ArrayList<>();
        startState = null;
    }
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
        if (startState == null || Transictions.isEmpty() || States.isEmpty()) {
            if (startState == null) {
                System.out.println("Start state is not set");
            }
            return false;
        }
        State currentState = startState;
        for (char symbol : input.toCharArray()) {
            currentState = getNextState(currentState, symbol);
            if (currentState == null) {
                return false;
            }
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
        if (!States.isEmpty()) {
            builder.delete(builder.length() - 2, builder.length());
        }
        builder.append("}\nE = {");
        List<Character> symbols = new ArrayList<>();
        for (Transiction transiction : Transictions) {
            char symbol = transiction.getSymbol();
            if (!symbols.contains(symbol)) {
                symbols.add(symbol);
            }
        }
        for (char symbol : symbols) {
            builder.append(symbol).append(", ");
        }
        if (!Transictions.isEmpty()) {
            builder.delete(builder.length() - 2, builder.length());
        }
        builder.append("}\nD = {");
        for (Transiction transiction : Transictions) {
            builder.append(transiction.getName()).append(", ");
        }
        if (!Transictions.isEmpty()) {
            builder.delete(builder.length() - 2, builder.length());
        }
        builder.append("}\nq0 = ");
        if (startState != null) {
            builder.append(startState.getName());
        }
        builder.append("\nF = {");
        for (State state : States) {
            if (state.isAccepting()) {
                builder.append(state.getName()).append(", ");
            }
        }
        if (!States.isEmpty()) {
            builder.delete(builder.length() - 2, builder.length());
        }
        builder.append("}");
        return builder.toString();
    }

    /**
     * Add a new state to the DFA.
     * @param name The name of the new state.
     */
    public void addState(String name) {
        States.add(new State(name));
    }

    /**
     * Add a new state to the DFA.
     * @param state The new state.
     */
    public void addState(State state) {
        States.add(state);
    }

    /**
     * Add a new transiction to the DFA.
     * @param start The start state of the transiction.
     * @param end The end state of the transiction.
     * @param symbol The symbol of the transiction.
     */
    public void addTransiction(State start, State end, char symbol) {
        Transictions.add(new Transiction(start, end, symbol));
    }

    /**
     * Set whether the given state is accepting.
     * @param name The name of the state.
     * @param accepting True if the state is accepting, false otherwise.
     */
    public void setAccepting(String name, boolean accepting) {
        for (State state : States) {
            if (state.getName().equals(name)) {
                state.setAccepting(accepting);
                return;
            }
        }
    }

    /**
     * Get the state with the given name.
     * @param name The name of the state.
     * @return The state with the given name.
     */
    public State getState(String name) {
        for (State state : States) {
            if (state.getName().equals(name)) {
                return state;
            }
        }
        return null;
    }
}
