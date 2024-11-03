package computability.calculation.model;

import java.util.ArrayList;
import java.util.List;

public class NFA extends DFA {

    protected static final char EPSILON = '$';

    public static final char getEpsilon() {
        return EPSILON;
    }

    @Override
    /**
     * Check if the given string is accepted by the NFA.
     * @param input The string to check.
     */
    public boolean accepts(String input) {
        if (startState == null || Transitions.isEmpty() || States.isEmpty()) {
            if (startState == null) {
                System.out.println("Start state is not set");
            }
            return false;
        }
        State currentState = startState;
        return accept(input, currentState);
    }


    /**
     * Check if the given string is accepted by the NFA.
     * @param input The string to check.
     * @param state The current state of the NFA.
     * @return True if the string is accepted, false otherwise.
     */
    public boolean accept(String input, State state) {
        if (input.isEmpty()) {
            return state.isAccepting();
        }
        List<State> nextStates = getNexStates(state, input.charAt(0));
        for (State nextState : nextStates) {
            if (accept(input.substring(1), nextState)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the next states of the given state and symbol.
     * @param state The state to get the next states for.
     * @param symbol The symbol to get the next states for.
     * @return The next states of the given state and symbol.
     */
    public List<State> getNexStates(State state, char symbol) {
        List<State> nextStates = new ArrayList<>();
        for (Transition t : Transitions) {
            if (t.getStart().equals(state) && (t.getSymbol() == symbol || t.getSymbol() == EPSILON)) {
                nextStates.add(t.getEnd());
            }
        }
        return nextStates;
    }

}
