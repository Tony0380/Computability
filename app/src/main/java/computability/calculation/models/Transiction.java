package computability.calculation.models;

public class Transiction{

    private State start;
    private State end;
    private char symbol;

    /**
     * Create a new transiction between the given states with the given symbol.
     * @param start The start state of the transiction.
     * @param end The end state of the transiction.
     * @param symbol The symbol of the transiction.
     * @return The transiction that was added.
     */
    public Transiction(State start, State end, char symbol) {
        this.start = start;
        this.end = end;
        this.symbol = symbol;
    }

    /**
     * Get the start state of the transiction.
     * @return The start state of the transiction.
     */
    public State getStart() {
        return start;
    }

    /**
     * Get the end state of the transiction.
     * @return The end state of the transiction.
     */
    public State getEnd() {
        return end;
    }

    /**
     * Get the symbol of the transiction.
     * @return The symbol of the transiction.
     */
    public char getSymbol() {
        return symbol;
    }

    /**
     * Set the symbol of the transiction.
     * @param symbol The symbol of the transiction.
     */
    public void setSymbol(char symbol) {
        this.symbol = symbol;
    }

    /**
     * Set the start state of the transiction.
     * @param start The start state of the transiction.
     */
    public void setStart(State start) {
        this.start = start;
    }

    /**
     * Set the end state of the transiction.
     * @param end The end state of the transiction.
     */
    public void setEnd(State end) {
        this.end = end;
    }

    /**
     * Get the name of the transiction.
     * @return The name of the transiction.
     */
    public String getName() {
        return start.getName() + " × " + symbol + " -> " + end.getName();
    }

    /**
     * Get the string representation of the transiction.
     * @return The string representation of the transiction.
     */
    @Override
    public String toString() {
        return "D : " + getName();
    }

    /**
     * Check if the transiction is valid.
     * @return True if the transiction is valid, false otherwise.
     */
    public boolean isValid() {
        return start != null && end != null && symbol != '\0';
    }
}
