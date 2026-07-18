import { describe, expect, it } from "vitest";
import { examples } from "./domain";
import {
  definitionFromGraph,
  graphFromDefinition,
  normalizePetriWeight,
  syncGraphFromDefinition,
  transitionFieldsFromEdge,
  transitionLabelFromFields,
  upsertWorkspaceTab,
  type WorkspaceTab,
} from "./workspace";

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

    graph.edges[0] = {
      ...graph.edges[0],
      fields: { from: "even", input: "x", output: "a/b", to: "odd" },
      label: transitionLabelFromFields("mealy", { input: "x", output: "a/b" }),
    };
    const restored = definitionFromGraph("mealy", examples.mealy, graph);
    expect((restored.transitions as Record<string, unknown>[])[0]).toEqual({
      from: "even",
      to: "odd",
      input: "x",
      output: "a/b",
    });

    const legacy = graphFromDefinition("mealy", examples.mealy);
    legacy.edges[0] = { ...legacy.edges[0], fields: undefined, label: "x / y" };
    const legacyRestored = definitionFromGraph("mealy", examples.mealy, legacy);
    expect((legacyRestored.transitions as Record<string, unknown>[])[0]).toMatchObject({
      input: "x",
      output: "y",
    });
  });

  it("keeps multi-tape semantic values as arrays", () => {
    const graph = graphFromDefinition("multiTuring", examples.multiTuring);
    const edge = graph.edges[0];
    const fields = { ...transitionFieldsFromEdge("multiTuring", edge), read: ["x", "y"] };
    graph.edges[0] = { ...edge, fields, label: transitionLabelFromFields("multiTuring", fields) };
    const transition = (
      definitionFromGraph("multiTuring", examples.multiTuring, graph).transitions as Record<string, unknown>[]
    )[0];
    expect(transition.read).toEqual(["x", "y"]);
    expect(Array.isArray(transition.movements)).toBe(true);
  });

  it("matches bends one-to-one and never reuses a bend after reordering", () => {
    const graph = graphFromDefinition("dfa", examples.dfa);
    graph.edges[0].bend = 72;
    graph.edges[1].bend = -48;
    const reordered = {
      ...examples.dfa,
      transitions: [...(examples.dfa.transitions as Record<string, unknown>[])].slice(0, 2).reverse(),
    };
    const next = syncGraphFromDefinition("dfa", reordered, graph);
    expect(next.edges[0].bend).toBe(-48);
    expect(next.edges[1].bend).toBe(72);
  });

  it("keeps transition operators out of editable semantic fields", () => {
    const graph = graphFromDefinition("mealy", examples.mealy);
    const edge = graph.edges[0];
    expect(transitionFieldsFromEdge("mealy", edge)).toMatchObject({ input: "1", output: "odd" });
    expect(transitionLabelFromFields("mealy", { input: "x", output: "y" })).toBe("x / y");
    edge.bend = -64;
    expect(edge.bend).toBe(-64);
  });
  it("keeps renamed transition endpoints authoritative over cached fields", () => {
    const graph = graphFromDefinition("dfa", examples.dfa);
    graph.nodes[0] = { ...graph.nodes[0], id: "renamed", label: "renamed" };
    graph.edges = graph.edges.map((edge) => ({
      ...edge,
      from: edge.from === "q0" ? "renamed" : edge.from,
      to: edge.to === "q0" ? "renamed" : edge.to,
    }));
    const restored = definitionFromGraph("dfa", examples.dfa, graph);
    expect(restored.transitions).toContainEqual({ from: "renamed", symbol: "0", to: "q1" });
  });
  it("round-trips Moore output without parsing its display label", () => {
    const definition = { ...examples.moore, state_outputs: { even: "a/b", odd: "" } };
    const graph = graphFromDefinition("moore", definition);
    expect(graph.nodes.find((node) => node.id === "even")?.output).toBe("a/b");
    expect(definitionFromGraph("moore", definition, graph).state_outputs).toEqual({ even: "a/b", odd: "" });
  });
  it("preserves Turing reject states independently from accepting states", () => {
    const definition = { ...examples.turing, rejecting_states: ["reject"] };
    const graph = graphFromDefinition("turing", definition);
    graph.nodes.push({ id: "reject", label: "reject", role: "reject", x: 420, y: 160 });
    expect(definitionFromGraph("turing", definition, graph).rejecting_states).toEqual(["reject"]);
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
    expect(normalizePetriWeight("0")).toBe(1);
    expect(normalizePetriWeight("abc")).toBe(1);
    expect(normalizePetriWeight("3")).toBe(3);
  });
});

describe("workspace tabs", () => {
  const tab = (id: string, name: string): WorkspaceTab => ({
    id,
    name,
    kind: "dfa",
    definition: examples.dfa,
    graph: graphFromDefinition("dfa", examples.dfa),
    input: "0 1",
    view: "canvas",
    updatedAt: "2026-07-16T00:00:00.000Z",
  });

  it("keeps multiple workspaces and updates the active one in place", () => {
    const first = upsertWorkspaceTab([], tab("a", "Automa"));
    const two = upsertWorkspaceTab(first, tab("b", "Grammatica"));
    const updated = upsertWorkspaceTab(two, tab("a", "Automa aggiornato"));
    expect(updated.map((item) => item.id)).toEqual(["a", "b"]);
    expect(updated[0].name).toBe("Automa aggiornato");
  });
  it("never evicts an open workspace when more than twelve are present", () => {
    const tabs = Array.from({ length: 13 }, (_, index) => tab(String(index), `Area ${index}`));
    expect(upsertWorkspaceTab(tabs, tab("13", "Area 13"))).toHaveLength(14);
  });
});
