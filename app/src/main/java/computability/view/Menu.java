package computability.view;
import java.io.BufferedReader;
import java.io.InputStreamReader;

import computability.controller.DFAController;
public class Menu {

    private String choice;

    private void welcome() {
        System.out.println("Welcome to the Computability and Complexity Theory Tool!");
        System.out.println("Please select an option:");
        System.out.println("1. DFA");
    /*     System.out.println("2. NFA");
        System.out.println("3. PDA");
        System.out.println("4. TM");
        System.out.println("5. Lambda Calculus");
        System.out.println("6. Regular Expressions");
        System.out.println("7. Context Free Grammars");
        System.out.println("8. Context Sensitive Grammars");
        System.out.println("9. Turing Machines");
        System.out.println("10. Computability");
        System.out.println("11. Complexity"); */ //Work in progress
        System.out.println("2. Exit"); 
    }

    private boolean selectOption() {
        boolean exit = false;
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        try {
            choice = reader.readLine();
        } catch (Exception e) {
            System.out.println("An error occurred. Please try again.");
        }
        switch (choice) {
            case "1":
                DFAController dfaMenu = new DFAController();
                dfaMenu.run();
                break;
            case "2":
                System.out.println("Goodbye!");
                exit = true;
                break;
            default:
                System.out.println("Invalid option. Please try again.");
                break;
        }
        return exit;
    }

    public void run() {
        boolean exit = false;
        while (!exit) {
            System.out.print("\033[H\033[2J");
            System.out.flush();
            welcome();
            exit = selectOption();
        }
    }
}
