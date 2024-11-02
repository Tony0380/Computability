package computability.calculation.models;

import java.io.Serializable;

public class State implements Serializable {

    private boolean accepting;
    private String name;

    /**
     * Create a new state with the given name.
     * @param name The name of the state.
     */
    public State(String name) {
        this.name = name;
        this.accepting = false;
    }

    /**
     * Check if the state is accepting.
     * @return True if the state is accepting, false otherwise.
     */
    public boolean isAccepting() {
        return accepting;
    }

    /**
     * Set whether the state is accepting.
     * @param accepting True if the state is accepting, false otherwise.
     */
    public void setAccepting(boolean accepting) {
        this.accepting = accepting;
    }

    /**
     * Get the name of the state.
     * @return The name of the state.
     */
    public String getName() {
        return name;
    }

    /**
     * Check if the state is equal to another state.
     * @param o The state to compare to.
     * @return True if the states are equal, false otherwise.
     */
    @Override
    public boolean equals(Object o) {
        if (o instanceof State) {
            State s = (State) o;
            return this.getName().equals(s.getName());
        }
        return false;
    }
}
