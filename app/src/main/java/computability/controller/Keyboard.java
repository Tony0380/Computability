package computability.controller;

import java.io.BufferedReader;
import java.io.InputStreamReader;

public class Keyboard {

    private static BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));


    /**
     * Read a string from the keyboard.
     * @return The string read from the keyboard.
     */
    public static String readString() {
        try {
            return reader.readLine();
        } catch (Exception e) {
            System.err.println("Error reading string: " + e.getMessage());
            return "";
        }
    }

    /**
     * Read an integer from the keyboard.
     * @return The integer read from the keyboard.
     */
    public static int readInt() {
        try {
            return Integer.parseInt(readString());
        } catch (NumberFormatException e) {
            System.err.println("Error parsing integer: " + e.getMessage());
            return 0;
        }
    }


    /**
     *  Read a double from the keyboard.
     * @return The double read from the keyboard.
     */
    public static double readDouble() {
        try {
            return Double.parseDouble(readString());
        } catch (NumberFormatException e) {
            System.err.println("Error parsing double: " + e.getMessage());
            return 0.0;
        }
    }

    /**
     * Read a character from the keyboard.
     * @return The character read from the keyboard.
     */
    public static char readChar() {
        String input = readString();
        if (input.length() > 0) {
            return input.charAt(0);
        } else {
            System.err.println("Error reading char: input is empty");
            return '\0';
        }
    }

    /**
     * Read a boolean from the keyboard.
     * @return The boolean read from the keyboard.
     */
    public static boolean readBoolean() {
        try {
            return Boolean.parseBoolean(readString());
        } catch (Exception e) {
            System.err.println("Error parsing boolean: " + e.getMessage());
            return false;
        }
    }

    /**
     * Wait for the user to press a key to continue.
     */
    public static void pressToContinue() {
        System.out.println("Press any key to continue...");
        Keyboard.readChar();
    }


}
