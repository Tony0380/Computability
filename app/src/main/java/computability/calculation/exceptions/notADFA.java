package computability.calculation.exceptions;

import java.io.BufferedReader;
import java.io.InputStreamReader;

import computability.calculation.models.DFA;

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
        for(int i = 0; i < dfa.getTransictions().size(); i++) {
            for(int j = i + 1; j < dfa.getTransictions().size(); j++) {
                if(dfa.getTransictions().get(i).getStart().equals(dfa.getTransictions().get(j).getStart())
                && dfa.getTransictions().get(i).getSymbol() == dfa.getTransictions().get(j).getSymbol()) {

                    System.out.println("Transictions from the same state with the same symbol are not allowed.");
                    System.out.println("Please select one of the following options to delete:");
                    System.out.println("Transiction 1: " + dfa.getTransictions().get(i));
                    System.out.println("Transiction 2: " + dfa.getTransictions().get(j));
                    System.out.print("Choice: ");
                    Integer choice = 1;
                    try {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
                        choice = Integer.parseInt(reader.readLine());
                    } catch (Exception e) {
                        System.out.println("An error occurred. Please try again.");
                    }

                    do {
                        if(choice == 1) {
                            dfa.getTransictions().remove(i);
                        } else if(choice == 2) {
                            dfa.getTransictions().remove(j);
                        } else {
                            System.out.println("Invalid choice. Please try again.");
                        }
                    } while(choice != 1 && choice != 2);
                    
                }
            }
        }
        return dfa;
    }
}
