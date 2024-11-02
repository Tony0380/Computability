package computability.controller;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

import computability.calculation.exception.notADFA;
import computability.calculation.model.DFA;
import computability.calculation.model.State;
import computability.calculation.model.Transiction;

/**
 * A controller for a DFA.
 */
public class DFAController {
    private String input;
    private DFA dfa;
    private BufferedReader reader;

    /**
     * Wait for the user to press a key to continue.
     */
    private void pressToContinue() {
        System.out.println("Press any key to continue...");
        try {
            System.in.read();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
    }

    public DFAController() {
        reader = new BufferedReader(new InputStreamReader(System.in));
        dfa = new DFA();
    }
    /**
     * Create a new DFA menu for the given DFA.
     * @param dfa The DFA to create the menu for.
     */
    public DFAController(DFA dfa) {
        this.dfa = dfa;
        reader = new BufferedReader(new InputStreamReader(System.in));
    }

    /**
     * Display the menu and get the user's choice.
     * @return The user's choice.
     */
    public int displayMenu() {
        System.out.println("1. Check if a string is accepted by the DFA");
        System.out.println("2. Check the start state of the DFA");
        System.out.println("3. Add a new state to the DFA");
        System.out.println("4. Add a new transiction to the DFA");
        System.out.println("5. Print the DFA");
        System.out.println("6. Save DFA");
        System.out.println("7. Load DFA");
        System.out.println("8. Exit");
        System.out.print("Enter your choice: ");
        int choice = 0;
        try {
            choice = Integer.parseInt(reader.readLine());
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        return choice;
    }

    /**
     * Check if a string is accepted by the DFA.
     */
    public void checkString() {
        System.out.print("Enter a string to check: ");
        try {
            input = reader.readLine();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        if (dfa.accepts(input)) {
            System.out.println("The string is accepted by the DFA.");
        } else {
            System.out.println("The string is not accepted by the DFA.");
        }
    }

    /**
     * Check the start state of the DFA.
     */
    public void checkStartState() {
        System.out.println("The start state of the DFA is: " + dfa.getStartState().getName());
    }

    /**
     * Add a new state to the DFA.
     */
    public void addState() {
        System.out.print("Enter the name of the new state: ");
        String name = "";
        try {
            name = reader.readLine();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        if (dfa.getState(name) != null) {
            System.out.println("State with the same name already exists.");
            return;
        }
        dfa.addState(name);
        System.out.println("Is the state accepting? (y/n)");
        String accepting = "";
        try {
            accepting = reader.readLine();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        if(dfa.getStartState() == null) {
            System.out.println("Is the state the start state? (y/n)");
            String start = "";
            try {
                start = reader.readLine();
            } catch (Exception e) {
                System.out.println("An error occurred. Please try again.");
            }
            if (start.equals("y")) {
                dfa.setStartState(dfa.getState(name));
            }
        }
        if (accepting.equals("y")) {
            dfa.setAccepting(name, true);
        }
        if (accepting.equals("y")) {
            dfa.setAccepting(name, true);
        }
        System.out.println("State added correctly.");
        pressToContinue();
    }

    /**
     * Add a new transiction to the DFA.
     */
    public void addTransiction() {
        System.out.print("Enter the name of the start state: ");
        String start = "";
        try {
            start = reader.readLine();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        State get = dfa.getState(start);
        System.out.print("Enter the name of the end state: ");
        String end = "";
        try {
            end = reader.readLine();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        State endState = dfa.getState(end);
        System.out.print("Enter the symbol of the transiction: ");
        char symbol = ' ';
        try {
            symbol = reader.readLine().charAt(0);
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        if (get != null && endState != null) {
            try {
                dfa.addTransiction(get, endState, symbol);
                for (Transiction transiction : dfa.getTransictions()) {
                    if (transiction.getStart().equals(get) && transiction.getSymbol() == symbol) {
                        throw new notADFA("Transictions from the same state with the same symbol are not allowed.");
                    }
                }
            } catch (notADFA e) {
                System.out.println(e.getMessage());
                dfa = e.FixDFA(dfa);
            }
        } else {
            System.out.println("Invalid state name.");
        }
    }

    /**
     * Print the DFA.
     */
    public void printDFA() {
        System.out.println(dfa);
        pressToContinue();
    }


    /**
     * Save the DFA to a file.
     */
    public void saveDFA() {
        System.out.print("Enter the name of the file to save the DFA: ");
        String filename = "";
        try {
            filename = reader.readLine();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        FileOutputStream outFile;
        try {
            outFile = new FileOutputStream(filename);
            ObjectOutputStream outStream = new ObjectOutputStream(outFile);
            outStream.writeObject(dfa);
            outStream.close();
        } catch (Exception ex) {
            System.out.println(ex.getMessage());
            pressToContinue();
        }
        System.out.println("DFA saved correctly.");
        pressToContinue();
    }

    public void loadDFA() {
        System.out.print("Enter the name of the file to load the DFA: ");
        String filename = "";
        try {
            filename = reader.readLine();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        try {
            FileInputStream inFile = new FileInputStream(filename);
            ObjectInputStream inStream = new ObjectInputStream(inFile);
            dfa = (DFA) inStream.readObject();
            inStream.close();
        } catch (Exception ex) {
            System.out.println(ex.getMessage());
            pressToContinue();
        }
        System.out.println("DFA loaded correctly.");
        pressToContinue();
    }

    /**
     * Run the DFA menu.
     */
    public void run() {
        int choice;

        do {
            System.out.print("\033[H\033[2J");
            System.out.flush();
            choice = displayMenu();
            switch (choice) {
                case 1:
                    checkString();
                    break;
                case 2:
                    checkStartState();
                    break;
                case 3:
                    addState();
                    break;
                case 4:
                    addTransiction();
                    break;
                case 5:
                    printDFA();
                    break;
                case 6:
                    saveDFA();
                    break;
                case 7:
                    loadDFA();
                    break;
                case 8:
                    System.out.println("Exiting...");
                    break;
                default:
                    System.out.println("Invalid choice.");
            }
        } while (choice != 8);
    }
}