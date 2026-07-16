import { describe, expect, it } from "vitest";
import { examples } from "./domain";
import { definitionFromGraph, graphFromDefinition } from "./workspace";

describe("visual workspace conversion", () => {
  it("preserves DFA states, roles and transitions", () => {
    const graph = graphFromDefinition("dfa", examples.dfa);

    expect(graph.nodes).toHaveLength(4);
    expect(graph.nodes.find((node) => node.id === "q0")?.role).toBe("start");
    expect(graph.nodes.find((node) => node.id === "q3")?.role).toBe("accept");
    expect(graph.edges[0]).toMatchObject({ from: "q0", to: "q1", label: "0" });

    const restored = definitionFromGraph("dfa", examples.dfa, graph);
    expect(restored.states).toEqual(examples.dfa.states);
    expect(restored.start_state).toBe("q0");
    expect(restored.accepting_states).toEqual(["q3"]);
    expect(restored.transitions).toEqual(examples.dfa.transitions);
  });

  it("maps Mealy input and output labels in both directions", () => {
    const graph = graphFromDefinition("mealy", examples.mealy);
    expect(graph.edges[0].label).toBe("1 / odd");

    graph.edges[0].label = "x / y";
    const restored = definitionFromGraph("mealy", examples.mealy, graph);
    expect((restored.transitions as Record<string, unknown>[])[0]).toEqual({
      from: "even",
      to: "odd",
      input: "x",
      output: "y",
    });
  });

  it("renders Petri places, events and weighted arcs", () => {
    const graph = graphFromDefinition("petri", examples.petri);

    expect(graph.nodes.find((node) => node.id === "place:ready")).toMatchObject({ role: "place", tokens: 1 });
    expect(graph.nodes.find((node) => node.id === "event:complete")?.role).toBe("event");
    expect(graph.edges).toEqual([
      { id: "in:0:0", from: "place:ready", to: "event:complete", label: "1" },
      { id: "out:0:0", from: "event:complete", to: "place:done", label: "1" },
    ]);
    expect(definitionFromGraph("petri", examples.petri, graph)).toEqual(examples.petri);
  });
});
