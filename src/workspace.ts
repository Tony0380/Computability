import type { Definition, MachineKind } from "./domain";

export type Point = { x: number; y: number };
export type GraphNode = Point & {
  id: string;
  label: string;
  role: "normal" | "start" | "accept" | "start-accept" | "place" | "event";
  tokens?: number;
};
export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  bend?: number;
  fields?: Record<string, unknown>;
};
export type WorkspaceGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type SavedProject = {
  id: string;
  name: string;
  kind: MachineKind;
  definition: Definition;
  graph: WorkspaceGraph;
  updatedAt: string;
};

export type WorkspaceTab = SavedProject & {
  input: string;
  view: "canvas" | "rules";
};

const openWorkspacesKey = "computability.open-workspaces";

const stateKinds = new Set<MachineKind>(["dfa", "nfa", "mealy", "moore", "pda", "turing", "multiTuring"]);
export const supportsStateCanvas = (kind: MachineKind) => stateKinds.has(kind);

const asStrings = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const str = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];

function position(index: number, total: number): Point {
  const columns = Math.max(2, Math.ceil(Math.sqrt(total)));
  return { x: 170 + (index % columns) * 230, y: 155 + Math.floor(index / columns) * 190 };
}

export function transitionFieldsFromEdge(kind: MachineKind, edge: GraphEdge): Record<string, unknown> {
  if (edge.fields) return { ...edge.fields };
  return transitionFromEdge(kind, edge);
}

export function transitionLabelFromFields(kind: MachineKind, fields: Record<string, unknown>): string {
  return transitionLabel(kind, fields);
}

function transitionLabel(kind: MachineKind, transition: Record<string, unknown>): string {
  if (kind === "mealy") return `${str(transition.input, "ε")} / ${str(transition.output, "ε")}`;
  if (kind === "pda")
    return `${str(transition.input, "ε")}, ${asStrings(transition.pop).join(" ") || "ε"} → ${asStrings(transition.push).join(" ") || "ε"}`;
  if (kind === "turing")
    return `${str(transition.read, "□")} → ${str(transition.write, "□")}, ${str(transition.movement, "Stay")}`;
  if (kind === "multiTuring")
    return `${asStrings(transition.read).join(" · ")} → ${asStrings(transition.write).join(" · ")}, ${asStrings(transition.movements).join(" · ")}`;
  return str(transition.symbol, "ε");
}

export function graphFromDefinition(kind: MachineKind, definition: Definition): WorkspaceGraph {
  if (kind === "petri") {
    const marking =
      typeof definition.marking === "object" && definition.marking !== null
        ? (definition.marking as Record<string, unknown>)
        : {};
    const transitions = records(definition.transitions);
    const places = Object.keys(marking);
    const nodes: GraphNode[] = [
      ...places.map((label, index) => ({
        id: `place:${label}`,
        label,
        role: "place" as const,
        tokens: Number(marking[label]) || 0,
        ...position(index, places.length + transitions.length),
      })),
      ...transitions.map((transition, index) => ({
        id: `event:${str(transition.id, `t${index}`)}`,
        label: str(transition.id, `t${index}`),
        role: "event" as const,
        ...position(index + places.length, places.length + transitions.length),
      })),
    ];
    const edges: GraphEdge[] = [];
    transitions.forEach((transition, transitionIndex) => {
      const eventId = `event:${str(transition.id, `t${transitionIndex}`)}`;
      records(transition.inputs).forEach((arc, arcIndex) =>
        edges.push({
          id: `in:${transitionIndex}:${arcIndex}`,
          from: `place:${str(arc.place)}`,
          to: eventId,
          label: String(arc.weight ?? 1),
        }),
      );
      records(transition.outputs).forEach((arc, arcIndex) =>
        edges.push({
          id: `out:${transitionIndex}:${arcIndex}`,
          from: eventId,
          to: `place:${str(arc.place)}`,
          label: String(arc.weight ?? 1),
        }),
      );
    });
    return { nodes, edges };
  }

  if (!supportsStateCanvas(kind)) return { nodes: [], edges: [] };
  const states = asStrings(definition.states);
  const start = str(definition.start_state);
  const accepts = new Set(asStrings(definition.accepting_states));
  const stateOutputs =
    typeof definition.state_outputs === "object" && definition.state_outputs !== null
      ? (definition.state_outputs as Record<string, unknown>)
      : {};
  const nodes = states.map((id, index): GraphNode => ({
    id,
    label: kind === "moore" && stateOutputs[id] !== undefined ? `${id} / ${String(stateOutputs[id])}` : id,
    role:
      id === start && accepts.has(id)
        ? "start-accept"
        : id === start
          ? "start"
          : accepts.has(id)
            ? "accept"
            : "normal",
    ...position(index, states.length),
  }));
  const edges = records(definition.transitions).map((transition, index): GraphEdge => ({
    id: `edge:${index}`,
    from: str(transition.from),
    to: str(transition.to),
    label: transitionLabel(kind, transition),
  }));
  return { nodes, edges };
}

export function syncGraphFromDefinition(
  kind: MachineKind,
  definition: Definition,
  current: WorkspaceGraph,
): WorkspaceGraph {
  const next = graphFromDefinition(kind, definition);
  const positions = new Map(current.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
  return {
    nodes: next.nodes.map((node) => ({ ...node, ...(positions.get(node.id) ?? {}) })),
    edges: next.edges.map((edge, index) => ({
      ...edge,
      bend:
        current.edges.find(
          (item) => item.from === edge.from && item.to === edge.to && item.label === edge.label,
        )?.bend ?? current.edges[index]?.bend,
    })),
  };
}

const splitPair = (label: string) => label.split("/").map((part) => part.trim());

function transitionFromEdge(kind: MachineKind, edge: GraphEdge): Record<string, unknown> {
  const base = { from: edge.from, to: edge.to };
  if (kind === "mealy") {
    const [input = "ε", output = "ε"] = splitPair(edge.label);
    return { ...base, input, output };
  }
  if (kind === "pda") {
    const [input = "ε", operation = "ε → ε"] = edge.label.split(",").map((part) => part.trim());
    const [pop = "ε", push = "ε"] = operation.split("→").map((part) => part.trim());
    return {
      ...base,
      input,
      pop: pop === "ε" ? [] : pop.split(/\s+/),
      push: push === "ε" ? [] : push.split(/\s+/),
    };
  }
  if (kind === "turing") {
    const [read = "□", rest = "□, Stay"] = edge.label.split("→").map((part) => part.trim());
    const [write = "□", movement = "Stay"] = rest.split(",").map((part) => part.trim());
    return { ...base, read, write, movement };
  }
  if (kind === "multiTuring") {
    const [read = "□", rest = "□, Stay"] = edge.label.split("→").map((part) => part.trim());
    const [write = "□", movements = "Stay"] = rest.split(",").map((part) => part.trim());
    return {
      ...base,
      read: read.split("·").map((part) => part.trim()),
      write: write.split("·").map((part) => part.trim()),
      movements: movements.split("·").map((part) => part.trim()),
    };
  }
  return { ...base, symbol: edge.label.trim() || "ε" };
}

export function definitionFromGraph(
  kind: MachineKind,
  original: Definition,
  graph: WorkspaceGraph,
): Definition {
  if (kind === "petri") {
    const places = graph.nodes.filter((node) => node.role === "place");
    const events = graph.nodes.filter((node) => node.role === "event");
    return {
      ...original,
      marking: Object.fromEntries(places.map((node) => [node.label, node.tokens ?? 0])),
      transitions: events.map((event) => ({
        id: event.label,
        inputs: graph.edges
          .filter((edge) => edge.to === event.id)
          .map((edge) => ({
            place:
              graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from.replace(/^place:/, ""),
            weight: Number(edge.label) || 1,
          })),
        outputs: graph.edges
          .filter((edge) => edge.from === event.id)
          .map((edge) => ({
            place: graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to.replace(/^place:/, ""),
            weight: Number(edge.label) || 1,
          })),
      })),
    };
  }
  if (!supportsStateCanvas(kind)) return original;
  const states = graph.nodes.map((node) => node.id);
  const start =
    graph.nodes.find((node) => node.role === "start" || node.role === "start-accept")?.id ??
    states[0] ??
    "q0";
  const accepting = graph.nodes
    .filter((node) => node.role === "accept" || node.role === "start-accept")
    .map((node) => node.id);
  const next: Definition = {
    ...original,
    states,
    start_state: start,
    transitions: graph.edges.map((edge) => transitionFromEdge(kind, edge)),
  };
  if ("accepting_states" in original || !["mealy", "moore"].includes(kind)) next.accepting_states = accepting;
  if (kind === "moore")
    next.state_outputs = Object.fromEntries(
      graph.nodes.map((node) => {
        const [name, output = ""] = splitPair(node.label);
        return [node.id, output || name];
      }),
    );
  return next;
}

export function projectId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`;
}

export function readProjects(): SavedProject[] {
  try {
    return JSON.parse(localStorage.getItem("computability.projects") ?? "[]") as SavedProject[];
  } catch {
    return [];
  }
}

export function persistProject(project: SavedProject): SavedProject[] {
  const projects = readProjects().filter((item) => item.id !== project.id);
  const next = [project, ...projects].slice(0, 12);
  localStorage.setItem("computability.projects", JSON.stringify(next));
  return next;
}

export function readWorkspaceTabs(): WorkspaceTab[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(openWorkspacesKey) ?? "[]") as WorkspaceTab[];
    return parsed.filter((item) => item.id && item.kind && item.definition && item.graph).slice(0, 12);
  } catch {
    return [];
  }
}

export function persistWorkspaceTabs(tabs: WorkspaceTab[]): void {
  localStorage.setItem(openWorkspacesKey, JSON.stringify(tabs.slice(0, 12)));
}

export function upsertWorkspaceTab(tabs: WorkspaceTab[], tab: WorkspaceTab): WorkspaceTab[] {
  const exists = tabs.some((item) => item.id === tab.id);
  return (exists ? tabs.map((item) => (item.id === tab.id ? tab : item)) : [...tabs, tab]).slice(-12);
}
