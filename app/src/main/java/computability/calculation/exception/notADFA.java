package computability.calculation.exception;

import computability.calculation.model.DFA;
import computability.controller.Keyboard;

public class notADFA extends Exception {
    public notADFA(String message) {
        super(message);
    }

    /**
     * Fix the given DFA to make it a valid DFA.
     * @param dfa The DFA to fix.
     * @return The fixed DFA.
     */
    public DFA FixDFA(DFA dfa) {
        for(int i = 0; i < dfa.getTransitions().size(); i++) {
            for(int j = i + 1; j < dfa.getTransitions().size(); j++) {
                if(dfa.getTransitions().get(i).getStart().equals(dfa.getTransitions().get(j).getStart())
                && dfa.getTransitions().get(i).getSymbol() == dfa.getTransitions().get(j).getSymbol()) {

                    System.out.println("Transitions from the same state with the same symbol are not allowed.");
                    System.out.println("Please select one of the following options to delete:");
                    System.out.println("Transition 1: " + dfa.getTransitions().get(i));
                    System.out.println("Transition 2: " + dfa.getTransitions().get(j));
                    System.out.print("Choice: ");
                    int choice = Keyboard.readInt();

                    do {
                        switch(choice) {
                            case 1:
                                dfa.getTransitions().remove(i);
                                break;
                            case 2:
                                dfa.getTransitions().remove(j);
                                break;
                            default:
                                System.out.println("Invalid choice. Please try again.");
                        }
                    } while(choice != 1 && choice != 2);
                    
                }
            }
        }
        return dfa;
    }
}
