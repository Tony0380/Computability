package computability;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import computability.calculation.model.NFA;
import computability.calculation.model.State;


/**
 * Test class for the NFA class.
 * This class test the regular language {@code {a,b}* | w ends with abb} using a NFA.
 */
public class nfaTest {

    private NFA nfa;

    @BeforeEach
    public void setUp() {
        nfa = new NFA();
        State q0 = new State("q0");
        State q1 = new State("q1");
        State q2 = new State("q2");
        State q3 = new State("q3");

        q3.setAccepting(true);

        nfa.setStartState(q0);
        nfa.addState(q1);
        nfa.addState(q2);
        nfa.addState(q3);

        nfa.addTransiction(q0, q0, 'a');
        nfa.addTransiction(q0, q0, 'b');
        nfa.addTransiction(q0, q0, 'c');

        nfa.addTransiction(q0, q1, 'a');
        nfa.addTransiction(q1, q2, 'b');
        nfa.addTransiction(q2, q3, 'b');



    }

    @Test
    public void testNFA() {
        assert(nfa.accepts("abb"));
        assert(nfa.accepts("ababb"));
        assert(nfa.accepts("abababb"));
        assert(nfa.accepts("ababababb"));
        assert(nfa.accepts("abababababb"));

        
        assert(!nfa.accepts("a"));
        assert(!nfa.accepts("b"));
        assert(!nfa.accepts("ab"));
        assert(!nfa.accepts("ba"));
        assert(!nfa.accepts("abab"));
        assert(!nfa.accepts("abba"));
    }

}
