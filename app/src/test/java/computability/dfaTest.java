package computability;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import computability.calculation.models.DFA;
import computability.calculation.models.State;

/**
 * Test class for the DFA class.
 * This class test the regular language {@code (0|1)*011} using a DFA.
 */
public class dfaTest {

    private DFA dfa;

    @BeforeEach
    public void setUp() {
        dfa = new DFA();
        State q0 = new State("q0");
        State q1 = new State("q1");
        State q2 = new State("q2");
        State q3 = new State("q3");

        q3.setAccepting(true);

        dfa.setStartState(q0);
        dfa.addState(q1);
        dfa.addState(q2);
        dfa.addState(q3);

        dfa.addTransiction(q0, q1, '0');
        dfa.addTransiction(q0, q0, '1');

        dfa.addTransiction(q1, q1, '0');
        dfa.addTransiction(q1, q2, '1');

        dfa.addTransiction(q2, q1, '0');
        dfa.addTransiction(q2, q3, '1');

        dfa.addTransiction(q3, q1, '0');
        dfa.addTransiction(q3, q0, '1');

    }

    @Test
    public void testDFA() {
        assert(dfa.accepts("011"));
        assert(dfa.accepts("0011"));
        assert(dfa.accepts("1011"));
        assert(dfa.accepts("000011"));
        assert(dfa.accepts("100011"));

        
        assert(!dfa.accepts("0"));
        assert(!dfa.accepts("1"));
        assert(!dfa.accepts("00"));
        assert(!dfa.accepts("01"));
        assert(!dfa.accepts("10"));
        assert(!dfa.accepts("11"));
        assert(!dfa.accepts("000"));
        assert(!dfa.accepts("001"));
        assert(!dfa.accepts("010"));
        assert(!dfa.accepts("101"));
    }


}