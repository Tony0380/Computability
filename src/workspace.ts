import type { Definition, MachineKind } from "./domain";

export type Point = { x: number; y: number };
export type GraphNode = Point & {
  id: string;
  label: string;
  role: "normal" | "start" | "accept" | "start-accept" | "reject" | "place" | "event";
  tokens?: number;
  /** Semantic Moore output. Labels remain display-only. */
  output?: string;
};
export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  bend?: number;
  /** Stable layout identity, independent from the transition label. */
  layoutId?: string;
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
const allKinds = new Set<MachineKind>([
  "dfa",
  "nfa",
  "mealy",
  "moore",
  "pda",
  "turing",
  "multiTuring",
  "regularGrammar",
  "cfg",
  "unrestrictedGrammar",
  "regex",
  "lsystem",
  "contextualLsystem",
  "stochasticLsystem",
  "petri",
]);
export const isMachineKind = (value: unknown): value is MachineKind =>
  typeof value === "string" && allKinds.has(value as MachineKind);

const asStrings = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const str = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
const semanticFields = (transition: Record<string, unknown>): Record<string, unknown> => {
  const fields = { ...transition };
  delete fields.from;
  delete fields.to;
  return fields;
};

function position(index: number, total: number): Point {
  const columns = Math.max(2, Math.ceil(Math.sqrt(total)));
  return { x: 170 + (index % columns) * 230, y: 155 + Math.floor(index / columns) * 190 };
}

export function transitionFieldsFromEdge(kind: MachineKind, edge: GraphEdge): Record<string, unknown> {
  if (edge.fields && edge.label === transitionLabel(kind, edge.fields)) return { ...edge.fields };
  return transitionFromEdge(kind, { ...edge, fields: undefined });
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
          label: String(normalizePetriWeight(arc.weight)),
        }),
      );
      records(transition.outputs).forEach((arc, arcIndex) =>
        edges.push({
          id: `out:${transitionIndex}:${arcIndex}`,
          from: eventId,
          to: `place:${str(arc.place)}`,
          label: String(normalizePetriWeight(arc.weight)),
        }),
      );
    });
    return { nodes, edges };
  }

  if (!supportsStateCanvas(kind)) return { nodes: [], edges: [] };
  const states = asStrings(definition.states);
  const start = str(definition.start_state);
  const accepts = new Set(asStrings(definition.accepting_states));
  const rejects = new Set(asStrings(definition.rejecting_states));
  const stateOutputs =
    typeof definition.state_outputs === "object" && definition.state_outputs !== null
      ? (definition.state_outputs as Record<string, unknown>)
      : {};
  const nodes = states.map((id, index): GraphNode => ({
    id,
    label: id,
    output: kind === "moore" && stateOutputs[id] !== undefined ? String(stateOutputs[id]) : undefined,
    role:
      id === start && accepts.has(id)
        ? "start-accept"
        : id === start
          ? "start"
          : accepts.has(id)
            ? "accept"
            : rejects.has(id)
              ? "reject"
              : "normal",
    ...position(index, states.length),
  }));
  const edges = records(definition.transitions).map((transition, index): GraphEdge => ({
    id: `edge:${index}`,
    from: str(transition.from),
    to: str(transition.to),
    label: transitionLabel(kind, transition),
    layoutId: `transition:${index}`,
    fields: semanticFields(transition),
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
    edges: preserveEdgeBends(next.edges, current.edges),
  };
}

export function isWorkspaceGraph(value: unknown): value is WorkspaceGraph {
  if (!value || typeof value !== "object") return false;
  const graph = value as Partial<WorkspaceGraph>;
  return (
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.edges) &&
    graph.nodes.every(
      (node) =>
        node &&
        typeof node === "object" &&
        typeof node.id === "string" &&
        typeof node.label === "string" &&
        typeof node.x === "number" &&
        typeof node.y === "number",
    ) &&
    graph.edges.every(
      (edge) =>
        edge &&
        typeof edge === "object" &&
        typeof edge.id === "string" &&
        typeof edge.from === "string" &&
        typeof edge.to === "string" &&
        typeof edge.label === "string",
    )
  );
}

export function isSavedProject(value: unknown): value is SavedProject {
  return migrateSavedProject(value) !== undefined;
}

/** Migrates pre-canvas projects while rejecting malformed or unknown data. */
export function migrateSavedProject(value: unknown): SavedProject | undefined {
  if (!value || typeof value !== "object") return undefined;
  const project = value as Partial<SavedProject>;
  if (
    typeof project.id !== "string" ||
    typeof project.name !== "string" ||
    !isMachineKind(project.kind) ||
    !project.definition ||
    typeof project.definition !== "object" ||
    Array.isArray(project.definition) ||
    typeof project.updatedAt !== "string"
  )
    return undefined;
  const definition = project.definition as Definition;
  const graph = isWorkspaceGraph(project.graph)
    ? syncGraphFromDefinition(project.kind, definition, project.graph)
    : graphFromDefinition(project.kind, definition);
  return {
    id: project.id,
    name: project.name,
    kind: project.kind,
    definition,
    graph,
    updatedAt: project.updatedAt,
  };
}

function edgeMatchKey(edge: GraphEdge): string {
  return `${edge.from}\u0000${edge.to}\u0000${edge.label}`;
}

function preserveEdgeBends(next: GraphEdge[], current: GraphEdge[]): GraphEdge[] {
  const byLayoutId = new Map(current.filter((edge) => edge.layoutId).map((edge) => [edge.layoutId, edge]));
  const matches = new Map<string, GraphEdge[]>();
  current.forEach((edge) => {
    const list = matches.get(edgeMatchKey(edge)) ?? [];
    list.push(edge);
    matches.set(edgeMatchKey(edge), list);
  });
  return next.map((edge) => {
    const candidates = matches.get(edgeMatchKey(edge));
    const match = candidates?.shift();
    if (match) return { ...edge, bend: match.bend, layoutId: match.layoutId ?? edge.layoutId };
    const byId = edge.layoutId ? byLayoutId.get(edge.layoutId) : undefined;
    return byId && byId.from === edge.from && byId.to === edge.to
      ? { ...edge, bend: byId.bend, layoutId: byId.layoutId }
      : edge;
  });
}

const splitPair = (label: string) => label.split("/").map((part) => part.trim());

function transitionFromEdge(kind: MachineKind, edge: GraphEdge): Record<string, unknown> {
  const base = { from: edge.from, to: edge.to };
  if (edge.fields && edge.label === transitionLabel(kind, edge.fields)) return { ...edge.fields, ...base };
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
            weight: normalizePetriWeight(edge.label),
          })),
        outputs: graph.edges
          .filter((edge) => edge.from === event.id)
          .map((edge) => ({
            place: graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to.replace(/^place:/, ""),
            weight: normalizePetriWeight(edge.label),
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
  const rejecting = graph.nodes.filter((node) => node.role === "reject").map((node) => node.id);
  const next: Definition = {
    ...original,
    states,
    start_state: start,
    transitions: graph.edges.map((edge) => transitionFromEdge(kind, edge)),
  };
  if ("accepting_states" in original || !["mealy", "moore"].includes(kind)) next.accepting_states = accepting;
  if ("rejecting_states" in original) next.rejecting_states = rejecting;
  if (kind === "moore")
    next.state_outputs = Object.fromEntries(graph.nodes.map((node) => [node.id, node.output ?? ""]));
  return next;
}

export function normalizePetriWeight(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function projectId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`;
}

export function readProjects(): SavedProject[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem("computability.projects") ?? "[]");
    return Array.isArray(parsed)
      ? parsed.map(migrateSavedProject).filter((item): item is SavedProject => Boolean(item))
      : [];
  } catch {
    return [];
  }
}

export function persistProject(project: SavedProject): SavedProject[] {
  const projects = readProjects().filter((item) => item.id !== project.id);
  // Saved projects are an archive, not a recent-items list: never evict user data.
  const next = [project, ...projects];
  localStorage.setItem("computability.projects", JSON.stringify(next));
  return next;
}

export function readWorkspaceTabs(): WorkspaceTab[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(openWorkspacesKey) ?? "[]");
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item): item is WorkspaceTab =>
              migrateSavedProject(item) !== undefined &&
              typeof (item as Partial<WorkspaceTab>).input === "string" &&
              ((item as Partial<WorkspaceTab>).view === "canvas" ||
                (item as Partial<WorkspaceTab>).view === "rules"),
          )
          .map((item) => ({ ...migrateSavedProject(item)!, input: item.input, view: item.view }))
      : [];
  } catch {
    return [];
  }
}

export function persistWorkspaceTabs(tabs: WorkspaceTab[]): void {
  localStorage.setItem(openWorkspacesKey, JSON.stringify(tabs));
}

export function upsertWorkspaceTab(tabs: WorkspaceTab[], tab: WorkspaceTab): WorkspaceTab[] {
  const exists = tabs.some((item) => item.id === tab.id);
  return exists ? tabs.map((item) => (item.id === tab.id ? tab : item)) : [...tabs, tab];
}
