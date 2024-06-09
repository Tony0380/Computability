package computability;
import java.util.Scanner;
import computability.CalculationModels.DFA.DFA;
import computability.CalculationModels.DFA.State;
public class DFAmenu {
    private String input;
    private DFA dfa;
    private Scanner scanner;

    /**
     * Create a new DFA menu for the given DFA.
     * @param dfa The DFA to create the menu for.
     */
    public DFAmenu(DFA dfa) {
        this.dfa = dfa;
        this.scanner = new Scanner(System.in);
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
        System.out.println("6. Exit");
        System.out.print("Enter your choice: ");
        return scanner.nextInt();
    }

    /**
     * Check if a string is accepted by the DFA.
     */
    public void checkString() {
        System.out.print("Enter a string to check: ");
        input = scanner.next();
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
        String name = scanner.next();
        dfa.addState(name);
        System.out.println("Is the state accepting? (y/n)");
        String accepting = scanner.next();
        if (accepting.equals("y")) {
            dfa.setAccepting(name, true);
        }
    }

    /**
     * Add a new transiction to the DFA.
     */
    public void addTransiction() {
        System.out.print("Enter the name of the start state: ");
        String start = scanner.next();
        State get = dfa.getState(start);
        System.out.print("Enter the name of the end state: ");
        String end = scanner.next();
        State endState = dfa.getState(end);
        System.out.print("Enter the symbol of the transiction: ");
        char symbol = scanner.next().charAt(0);
        if (get != null && endState != null) {
            dfa.addTransiction(get, endState, symbol);
        } else {
            System.out.println("Invalid state name.");
        }
    }

    /**
     * Print the DFA.
     */
    public void printDFA() {
        System.out.println(dfa);
    }

    /**
     * Run the DFA menu.
     */
    public void run() {
        int choice;
        do {
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
                    System.out.println("Exiting...");
                    break;
                default:
                    System.out.println("Invalid choice.");
            }
        } while (choice != 6);
    }
}
