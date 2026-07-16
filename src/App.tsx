import { invoke, isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import {
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { catalogue, metaFor, type ModelMeta } from "./catalog";
import { examples, type Definition, type MachineKind } from "./domain";
import { detectedLanguage, I18nProvider, languages, useI18n, type Language } from "./i18n";
import { theories } from "./theory";
import { theoryInEnglish } from "./theoryEnglish";
import {
  definitionFromGraph,
  graphFromDefinition,
  persistProject,
  projectId,
  readProjects,
  supportsStateCanvas,
  type GraphEdge,
  type GraphNode,
  type SavedProject,
  type WorkspaceGraph,
} from "./workspace";

type Screen = "home" | "method" | "studio" | "theory";
type ThemeName = "paper" | "midnight" | "clay" | "contrast";
type Tool = "select" | "state" | "transition";
type Selection = { type: "node" | "edge"; id: string } | null;
type ModelAction =
  "minimize_dfa" | "determinize" | "regex_to_nfa" | "regular_grammar_to_nfa" | "cfg_to_pda" | "cyk" | "ll1";

const themes: { id: ThemeName; name: string; swatches: string[] }[] = [
  { id: "paper", name: "Carta tecnica", swatches: ["#f4f5ef", "#4536d6", "#f2c94c"] },
  { id: "midnight", name: "Notte polare", swatches: ["#11151d", "#72a7ff", "#9ee6a8"] },
  { id: "clay", name: "Argilla", swatches: ["#f5eee8", "#b4472f", "#315f55"] },
  { id: "contrast", name: "Alto contrasto", swatches: ["#ffffff", "#111111", "#0068ff"] },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    folder: (
      <>
        <path d="M3 6.5h7l2 2h9v10H3z" />
        <path d="M3 6.5v-2h7l2 2" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M4 15v5h16v-5" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v12m0 0 5-5m-5 5-5-5" />
        <path d="M4 19h16" />
      </>
    ),
    save: (
      <>
        <path d="M5 3h12l2 2v16H5z" />
        <path d="M8 3v6h8V3M8 21v-7h8v7" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7z" />,
    code: (
      <>
        <path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 5l-4 14" />
      </>
    ),
    canvas: (
      <>
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="m9 11 6-4m-6 6 6 4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 5 5" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 3h6l1 4H8zM7 7l1 14h8l1-14" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    back: (
      <>
        <path d="M20 12H5m6-6-6 6 6 6" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-3-4-6-9-6Z" />
        <circle cx="7.5" cy="10" r=".8" fill="currentColor" />
        <circle cx="9.5" cy="6.5" r=".8" fill="currentColor" />
        <circle cx="14" cy="6" r=".8" fill="currentColor" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    edit: (
      <>
        <path d="m4 20 4-1 11-11-3-3L5 16z" />
        <path d="m14 7 3 3" />
      </>
    ),
  };
  return <svg {...common}>{paths[name] ?? paths.more}</svg>;
}

function ModelGlyph({ model }: { model: ModelMeta }) {
  if (model.glyph === "tape")
    return (
      <div className="model-glyph tape-glyph">
        <i />
        <i />
        <i />
        <span>↔</span>
      </div>
    );
  if (model.glyph === "stack")
    return (
      <div className="model-glyph stack-glyph">
        <i />
        <i />
        <i />
      </div>
    );
  if (model.glyph === "grammar")
    return (
      <div className="model-glyph grammar-glyph">
        S <span>→</span> aB
      </div>
    );
  if (model.glyph === "tokens")
    return (
      <div className="model-glyph token-glyph">
        <i />
        <span />
        <i />
      </div>
    );
  return (
    <div className="model-glyph node-glyph">
      <i />
      <span />
      <i />
      {model.glyph === "branch" && <b />}
    </div>
  );
}

const tokenise = (value: string) => (value.trim() ? value.trim().split(/\s+/) : []);
const requestKinds: Record<MachineKind, string> = {
  dfa: "dfa",
  nfa: "nfa",
  mealy: "mealy",
  moore: "moore",
  pda: "pda",
  turing: "turing",
  multiTuring: "multi_turing",
  regularGrammar: "regular_grammar",
  cfg: "cfg",
  unrestrictedGrammar: "unrestricted_grammar",
  regex: "regex",
  lsystem: "lsystem",
  contextualLsystem: "contextual_lsystem",
  stochasticLsystem: "stochastic_lsystem",
  petri: "petri",
};

export default function App() {
  const [language, setLanguage] = useState<Language>(detectedLanguage);
  const [screen, setScreen] = useState<Screen>("home");
  const [kind, setKind] = useState<MachineKind>("dfa");
  const [definition, setDefinition] = useState<Definition>(examples.dfa);
  const [graph, setGraph] = useState<WorkspaceGraph>(() => graphFromDefinition("dfa", examples.dfa));
  const [project, setProject] = useState({ id: projectId(), name: "Automa senza titolo" });
  const [projects, setProjects] = useState<SavedProject[]>(readProjects);
  const [theme, setTheme] = useState<ThemeName>(
    () => (localStorage.getItem("computability.theme") as ThemeName) || "paper",
  );
  const [themeOpen, setThemeOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "current" | "available" | "downloading" | "error"
  >(() => (isTauri() ? "checking" : "idle"));
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("Tutti");
  const [view, setView] = useState<"canvas" | "json">("canvas");
  const [tool, setTool] = useState<Tool>("select");
  const [selection, setSelection] = useState<Selection>(null);
  const [transitionFrom, setTransitionFrom] = useState<string>();
  const [source, setSource] = useState(JSON.stringify(examples.dfa, null, 2));
  const [input, setInput] = useState("0 1 1");
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [sidePanel, setSidePanel] = useState<"properties" | "run">("properties");
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const chosen = metaFor(kind);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("computability.theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("computability.language", language);
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    if (!isTauri()) return;
    void check({ timeout: 20_000 })
      .then((update) => {
        setAvailableUpdate(update);
        setUpdateStatus(update ? "available" : "current");
      })
      .catch(() => setUpdateStatus("error"));
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [screen]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && screen === "studio") {
        event.preventDefault();
        void run();
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selection &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      )
        removeSelection();
      if (event.key === "Escape") {
        setTransitionFrom(undefined);
        setTool("select");
        setSelection(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const families = useMemo(() => ["Tutti", ...new Set(catalogue.map((item) => item.family))], []);
  const filtered = useMemo(
    () =>
      catalogue.filter(
        (item) =>
          (family === "Tutti" || item.family === family) &&
          `${item.name} ${item.code} ${item.description}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [family, query],
  );
  const selectedNode =
    selection?.type === "node" ? graph.nodes.find((node) => node.id === selection.id) : undefined;
  const selectedEdge =
    selection?.type === "edge" ? graph.edges.find((edge) => edge.id === selection.id) : undefined;

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(undefined), 2600);
  }
  async function checkForUpdates() {
    setUpdateOpen(true);
    if (!isTauri()) {
      setUpdateStatus("current");
      return;
    }
    setUpdateStatus("checking");
    try {
      const update = await check({ timeout: 20_000 });
      setAvailableUpdate(update);
      setUpdateStatus(update ? "available" : "current");
    } catch {
      setUpdateStatus("error");
    }
  }
  async function installUpdate() {
    if (!availableUpdate) return;
    setUpdateStatus("downloading");
    setUpdateProgress(0);
    let downloaded = 0;
    let total = 0;
    try {
      await availableUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") downloaded += event.data.chunkLength;
        if (total) setUpdateProgress(Math.min(100, Math.round((downloaded / total) * 100)));
      });
      await relaunch();
    } catch {
      setUpdateStatus("error");
    }
  }
  function chooseModel(next: MachineKind) {
    setKind(next);
    setScreen("method");
    setError(undefined);
  }
  function startFresh() {
    const nextDefinition = structuredClone(examples[kind]);
    const nextName = `${metaFor(kind).shortName} senza titolo`;
    setDefinition(nextDefinition);
    setGraph(graphFromDefinition(kind, nextDefinition));
    setSource(JSON.stringify(nextDefinition, null, 2));
    setProject({ id: projectId(), name: nextName });
    setSelection(null);
    setView(metaFor(kind).visual ? "canvas" : "json");
    setScreen("studio");
    setResult(undefined);
  }
  function openProject(saved: SavedProject) {
    setKind(saved.kind);
    setDefinition(saved.definition);
    setGraph(saved.graph);
    setSource(JSON.stringify(saved.definition, null, 2));
    setProject({ id: saved.id, name: saved.name });
    setScreen("studio");
    setView(metaFor(saved.kind).visual ? "canvas" : "json");
    setResult(undefined);
    setError(undefined);
  }
  function currentDefinition(): Definition {
    return definitionFromGraph(kind, definition, graph);
  }
  function saveProject() {
    const nextDefinition = currentDefinition();
    const saved: SavedProject = {
      ...project,
      kind,
      definition: nextDefinition,
      graph,
      updatedAt: new Date().toISOString(),
    };
    setDefinition(nextDefinition);
    setSource(JSON.stringify(nextDefinition, null, 2));
    setProjects(persistProject(saved));
    flash("Progetto salvato sul dispositivo");
  }
  function exportProject() {
    const payload: SavedProject = {
      ...project,
      kind,
      definition: currentDefinition(),
      graph,
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${
      project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "") || "computability"
    }.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    flash("File JSON esportato");
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<SavedProject> & Definition;
      const nextKind = (
        typeof parsed.kind === "string" && parsed.kind in examples ? parsed.kind : kind
      ) as MachineKind;
      const nextDefinition = (
        parsed.definition && typeof parsed.definition === "object" ? parsed.definition : parsed
      ) as Definition;
      const nextGraph = parsed.graph?.nodes ? parsed.graph : graphFromDefinition(nextKind, nextDefinition);
      setKind(nextKind);
      setDefinition(nextDefinition);
      setGraph(nextGraph);
      setSource(JSON.stringify(nextDefinition, null, 2));
      setProject({ id: parsed.id ?? projectId(), name: parsed.name ?? file.name.replace(/\.json$/i, "") });
      setScreen("studio");
      setView(metaFor(nextKind).visual ? "canvas" : "json");
      setError(undefined);
      setResult(undefined);
      flash("Progetto importato");
    } catch {
      setError("Il file non contiene JSON valido. Controlla il contenuto e riprova.");
    }
    event.target.value = "";
  }
  function applyJson() {
    try {
      const parsed = JSON.parse(source) as Definition;
      setDefinition(parsed);
      setGraph(graphFromDefinition(kind, parsed));
      setError(undefined);
      flash("Definizione aggiornata");
    } catch {
      setError("La definizione JSON non è valida. Correggi gli errori prima di applicarla.");
    }
  }
  async function run() {
    try {
      const parsed = currentDefinition();
      const wrapped =
        kind === "turing" || kind === "multiTuring"
          ? { machine: parsed, max_steps: 10_000 }
          : ["lsystem", "contextualLsystem", "stochasticLsystem"].includes(kind)
            ? { system: parsed, generations: Number(input) || 0 }
            : parsed;
      const response = await invoke("simulate", {
        request: { kind: requestKinds[kind], definition: wrapped },
        input: tokenise(input),
        tapeInputs: kind === "multiTuring" ? input.split("|").map(tokenise) : undefined,
      });
      setResult(response);
      setError(undefined);
      setSidePanel("run");
    } catch (cause) {
      setError(String(cause));
      setResult(undefined);
      setSidePanel("run");
    }
  }
  async function performModelAction(action: ModelAction) {
    try {
      const parsed = currentDefinition();
      if (action === "cyk" || action === "ll1") {
        const response = await invoke("simulate", {
          request: { kind: action, definition: parsed },
          input: tokenise(input),
        });
        setResult(response);
        setError(undefined);
        setSidePanel("run");
        return;
      }
      const converted =
        action === "cfg_to_pda"
          ? await invoke<Definition>("cfg_to_pda", { grammar: parsed })
          : await invoke<Definition>("transform", { request: { kind: action, definition: parsed } });
      const nextKind: MachineKind =
        action === "cfg_to_pda"
          ? "pda"
          : action === "determinize"
            ? "dfa"
            : action === "minimize_dfa"
              ? "dfa"
              : "nfa";
      setKind(nextKind);
      setDefinition(converted);
      setGraph(graphFromDefinition(nextKind, converted));
      setSource(JSON.stringify(converted, null, 2));
      setView(metaFor(nextKind).visual ? "canvas" : "json");
      setSelection(null);
      setResult(undefined);
      setError(undefined);
      flash(`Modello convertito in ${metaFor(nextKind).shortName}`);
    } catch (cause) {
      setError(String(cause));
      setSidePanel("run");
    }
  }
  function canvasPoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    return {
      x: (clientX - (rect?.left ?? 0) + (canvas?.scrollLeft ?? 0)) / zoom,
      y: (clientY - (rect?.top ?? 0) + (canvas?.scrollTop ?? 0)) / zoom,
    };
  }
  function addNodeAt(x: number, y: number) {
    if (kind === "petri") {
      let index = graph.nodes.filter((node) => node.role === "place").length;
      let label = `p${index}`;
      while (graph.nodes.some((node) => node.label === label)) label = `p${++index}`;
      const id = `place:${label}`;
      const node: GraphNode = { id, label, x, y, role: "place", tokens: 0 };
      setGraph((current) => ({ ...current, nodes: [...current.nodes, node] }));
      setSelection({ type: "node", id });
      setTool("select");
      return;
    }
    if (!supportsStateCanvas(kind)) return;
    let index = graph.nodes.length;
    let id = `q${index}`;
    while (graph.nodes.some((node) => node.id === id)) id = `q${++index}`;
    const node: GraphNode = { id, label: id, x, y, role: graph.nodes.length ? "normal" : "start" };
    setGraph((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelection({ type: "node", id });
    setTool("select");
  }
  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    if (
      event.target !== event.currentTarget &&
      !(event.target as HTMLElement).classList.contains("canvas-grid")
    )
      return;
    setSelection(null);
    if (tool === "state") {
      const point = canvasPoint(event.clientX, event.clientY);
      addNodeAt(point.x, point.y);
    }
  }
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const point = canvasPoint(event.clientX, event.clientY);
    addNodeAt(point.x, point.y);
  }
  function pointerDown(event: ReactPointerEvent, node: GraphNode) {
    event.stopPropagation();
    if (tool === "transition") {
      if (!transitionFrom) {
        setTransitionFrom(node.id);
        setSelection({ type: "node", id: node.id });
      } else {
        if (kind === "petri") {
          const source = graph.nodes.find((item) => item.id === transitionFrom);
          if (source?.role !== "place" || node.role !== "place") return;
          let index = graph.nodes.filter((item) => item.role === "event").length;
          let label = `t${index}`;
          while (graph.nodes.some((item) => item.label === label)) label = `t${++index}`;
          const eventId = `event:${label}`;
          const eventNode: GraphNode = {
            id: eventId,
            label,
            role: "event",
            x: (source.x + node.x) / 2,
            y: (source.y + node.y) / 2 - 42,
          };
          const stamp = Date.now();
          const firstEdge: GraphEdge = { id: `edge:${stamp}:in`, from: source.id, to: eventId, label: "1" };
          const secondEdge: GraphEdge = { id: `edge:${stamp}:out`, from: eventId, to: node.id, label: "1" };
          setGraph((current) => ({
            nodes: [...current.nodes, eventNode],
            edges: [...current.edges, firstEdge, secondEdge],
          }));
          setTransitionFrom(undefined);
          setSelection({ type: "node", id: eventId });
          setTool("select");
          return;
        }
        const id = `edge:${Date.now()}`;
        const edge: GraphEdge = {
          id,
          from: transitionFrom,
          to: node.id,
          label:
            kind === "turing"
              ? "□ → □, Stay"
              : kind === "mealy"
                ? "a / x"
                : kind === "pda"
                  ? "ε, ε → ε"
                  : "a",
        };
        setGraph((current) => ({ ...current, edges: [...current.edges, edge] }));
        setTransitionFrom(undefined);
        setSelection({ type: "edge", id });
        setTool("select");
      }
      return;
    }
    const point = canvasPoint(event.clientX, event.clientY);
    dragRef.current = { id: node.id, dx: point.x - node.x, dy: point.y - node.y };
    setSelection({ type: "node", id: node.id });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function pointerMove(event: ReactPointerEvent) {
    if (!dragRef.current) return;
    const point = canvasPoint(event.clientX, event.clientY);
    const { id, dx, dy } = dragRef.current;
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === id ? { ...node, x: Math.max(60, point.x - dx), y: Math.max(60, point.y - dy) } : node,
      ),
    }));
  }
  function updateNode(patch: Partial<GraphNode>) {
    if (!selectedNode) return;
    const becomesStart = patch.role === "start" || patch.role === "start-accept";
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => {
        if (node.id === selectedNode.id) return { ...node, ...patch };
        if (!becomesStart) return node;
        if (node.role === "start") return { ...node, role: "normal" };
        if (node.role === "start-accept") return { ...node, role: "accept" };
        return node;
      }),
    }));
  }
  function renameNode(nextId: string) {
    if (
      !selectedNode ||
      !nextId.trim() ||
      graph.nodes.some((node) => node.id === nextId && node.id !== selectedNode.id)
    )
      return;
    const oldId = selectedNode.id;
    setGraph((current) => ({
      nodes: current.nodes.map((node) =>
        node.id === oldId ? { ...node, id: nextId, label: node.label === oldId ? nextId : node.label } : node,
      ),
      edges: current.edges.map((edge) => ({
        ...edge,
        from: edge.from === oldId ? nextId : edge.from,
        to: edge.to === oldId ? nextId : edge.to,
      })),
    }));
    setSelection({ type: "node", id: nextId });
  }
  function updateEdge(label: string) {
    if (selectedEdge)
      setGraph((current) => ({
        ...current,
        edges: current.edges.map((edge) => (edge.id === selectedEdge.id ? { ...edge, label } : edge)),
      }));
  }
  function removeSelection() {
    if (!selection) return;
    if (selection.type === "node")
      setGraph((current) => ({
        nodes: current.nodes.filter((node) => node.id !== selection.id),
        edges: current.edges.filter((edge) => edge.from !== selection.id && edge.to !== selection.id),
      }));
    else
      setGraph((current) => ({
        ...current,
        edges: current.edges.filter((edge) => edge.id !== selection.id),
      }));
    setSelection(null);
  }

  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <div className="app-shell">
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={importFile}
        />
        {screen === "home" && (
          <Home
            projects={projects}
            filtered={filtered}
            families={families}
            family={family}
            query={query}
            onFamily={setFamily}
            onQuery={setQuery}
            onChoose={chooseModel}
            onOpen={openProject}
            onImport={() => fileInput.current?.click()}
            onTheme={() => setThemeOpen(true)}
            onTheory={(next) => {
              setKind(next);
              setScreen("theory");
            }}
            onUpdates={() => void checkForUpdates()}
          />
        )}
        {screen === "method" && (
          <Method
            model={chosen}
            onBack={() => setScreen("home")}
            onCreate={startFresh}
            onImport={() => fileInput.current?.click()}
            onTheme={() => setThemeOpen(true)}
            onTheory={() => setScreen("theory")}
          />
        )}
        {screen === "studio" && (
          <Studio
            model={chosen}
            project={project}
            setProject={setProject}
            graph={graph}
            view={view}
            setView={setView}
            tool={tool}
            setTool={(next) => {
              setTool(next);
              setTransitionFrom(undefined);
            }}
            transitionFrom={transitionFrom}
            selection={selection}
            setSelection={setSelection}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            source={source}
            setSource={setSource}
            input={input}
            setInput={setInput}
            result={result}
            error={error}
            zoom={zoom}
            setZoom={setZoom}
            sidePanel={sidePanel}
            setSidePanel={setSidePanel}
            canvasRef={canvasRef}
            onCanvasClick={handleCanvasClick}
            onDrop={handleDrop}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onUpdateNode={updateNode}
            onRenameNode={renameNode}
            onUpdateEdge={updateEdge}
            onRemove={removeSelection}
            onApplyJson={applyJson}
            onRun={run}
            onAction={performModelAction}
            onSave={saveProject}
            onExport={exportProject}
            onImport={() => fileInput.current?.click()}
            onHome={() => setScreen("home")}
            onTheme={() => setThemeOpen(true)}
            onTheory={() => setScreen("theory")}
          />
        )}
        {screen === "theory" && (
          <TheoryPage model={chosen} onBack={() => setScreen("home")} onOpen={() => startFresh()} />
        )}
        {themeOpen && <ThemeDialog theme={theme} onTheme={setTheme} onClose={() => setThemeOpen(false)} />}
        {updateOpen && (
          <UpdateDialog
            status={updateStatus}
            update={availableUpdate}
            progress={updateProgress}
            onCheck={() => void checkForUpdates()}
            onInstall={() => void installUpdate()}
            onClose={() => setUpdateOpen(false)}
          />
        )}
        {notice && (
          <div className="toast">
            <span>
              <Icon name="check" size={16} />
            </span>
            {notice}
          </div>
        )}
      </div>
    </I18nProvider>
  );
}

type HomeProps = {
  projects: SavedProject[];
  filtered: ModelMeta[];
  families: string[];
  family: string;
  query: string;
  onFamily: (value: string) => void;
  onQuery: (value: string) => void;
  onChoose: (kind: MachineKind) => void;
  onOpen: (project: SavedProject) => void;
  onImport: () => void;
  onTheme: () => void;
  onTheory: (kind: MachineKind) => void;
  onUpdates: () => void;
};
function Home({
  projects,
  filtered,
  families,
  family,
  query,
  onFamily,
  onQuery,
  onChoose,
  onOpen,
  onImport,
  onTheme,
  onTheory,
  onUpdates,
}: HomeProps) {
  const { language, t } = useI18n();
  return (
    <main className="home-screen">
      <nav className="topbar">
        <Brand />
        <div className="top-actions">
          <LanguageMenu />
          <button className="ghost-button" onClick={onUpdates}>
            <Icon name="download" />
            {t("Aggiornamenti")}
          </button>
          <button className="ghost-button" onClick={onImport}>
            <Icon name="upload" />
            {t("Importa JSON")}
          </button>
          <button className="icon-button" aria-label={t("Scegli tema")} onClick={onTheme}>
            <Icon name="palette" />
          </button>
        </div>
      </nav>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="kicker">{t("Laboratorio di computabilità")}</p>
          <h1>
            {t("Costruisci un’idea.")}
            <br />
            <em>{t("Osservala muoversi.")}</em>
          </h1>
          <p>{t("Scegli un modello, disegnane il comportamento e segui ogni passo della sua esecuzione.")}</p>
        </div>
        <div className="hero-diagram" aria-hidden="true">
          <span className="hero-node start">
            q<sub>0</sub>
          </span>
          <span className="hero-edge first">0</span>
          <span className="hero-node middle">
            q<sub>1</sub>
          </span>
          <span className="hero-edge second">1</span>
          <span className="hero-node accept">
            q<sub>2</sub>
          </span>
          <span className="hero-loop">0, 1</span>
        </div>
      </section>
      {projects.length > 0 && (
        <section className="recent-section section-wrap">
          <div className="section-title">
            <div>
              <p className="kicker">{t("Continua da dove eri rimasto")}</p>
              <h2>{t("Progetti recenti")}</h2>
            </div>
          </div>
          <div className="recent-row">
            {projects.slice(0, 4).map((item) => (
              <button className="recent-card" key={item.id} onClick={() => onOpen(item)}>
                <span className={`recent-code accent-${metaFor(item.kind).accent}`}>
                  {metaFor(item.kind).code}
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {new Intl.DateTimeFormat(language, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(item.updatedAt))}
                  </small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="catalogue-section section-wrap">
        <div className="section-title catalogue-head">
          <div>
            <p className="kicker">{t("Nuovo progetto")}</p>
            <h2>{t("Scegli un modello")}</h2>
          </div>
          <label className="search-box">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder={t("Cerca un modello…")}
            />
            <span>⌘ K</span>
          </label>
        </div>
        <div className="family-tabs" role="tablist" aria-label="Famiglie di modelli">
          {families.map((item) => (
            <button
              role="tab"
              aria-selected={family === item}
              className={family === item ? "active" : ""}
              key={item}
              onClick={() => onFamily(item)}
            >
              {t(item)}
            </button>
          ))}
        </div>
        <div className="model-grid">
          {filtered.map((model) => (
            <div className={`model-card-wrap accent-${model.accent}`} key={model.kind}>
              <button className="model-card" onClick={() => onChoose(model.kind)}>
                <div className="card-top">
                  <span className="model-code">{model.code}</span>
                  <span className="card-arrow">
                    <Icon name="arrow" />
                  </span>
                </div>
                <ModelGlyph model={model} />
                <div className="model-copy">
                  <h3>{t(model.shortName)}</h3>
                  <p>{t(model.description)}</p>
                </div>
                <span className="model-family">{t(model.family)}</span>
              </button>
              <button className="theory-card-action" onClick={() => onTheory(model.kind)}>
                <Icon name="code" size={14} />
                {t("Teoria")}
              </button>
            </div>
          ))}
        </div>
        {!filtered.length && (
          <div className="empty-state">
            <Icon name="search" size={28} />
            <h3>{t("Nessun modello trovato")}</h3>
            <p>{t("Prova un nome, una sigla o una famiglia diversa.")}</p>
          </div>
        )}
      </section>
      <footer className="home-footer">
        <Brand />
        <button
          className="repo-link"
          onClick={() => void openUrl("https://github.com/Tony0380/Computability")}
        >
          <Icon name="code" size={16} />
          {t("Repository GitHub")}
        </button>
      </footer>
    </main>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>Computability</strong>
        <small>Visual machine lab</small>
      </span>
    </div>
  );
}

function LanguageMenu() {
  const { language, setLanguage, t } = useI18n();
  return (
    <label className="language-menu" title={t("Lingua")}>
      <span className="visually-hidden">{t("Lingua")}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
        {languages.map((item) => (
          <option key={item.id} value={item.id}>
            {item.short} · {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Method({
  model,
  onBack,
  onCreate,
  onImport,
  onTheme,
  onTheory,
}: {
  model: ModelMeta;
  onBack: () => void;
  onCreate: () => void;
  onImport: () => void;
  onTheme: () => void;
  onTheory: () => void;
}) {
  const { t } = useI18n();
  return (
    <main className="method-screen">
      <nav className="topbar">
        <Brand />
        <div className="top-actions">
          <LanguageMenu />
          <button className="ghost-button" onClick={onTheory}>
            <Icon name="code" />
            {t("Teoria")}
          </button>
          <button className="icon-button" aria-label={t("Scegli tema")} onClick={onTheme}>
            <Icon name="palette" />
          </button>
        </div>
      </nav>
      <button className="back-button" onClick={onBack}>
        <Icon name="back" />
        {t("Tutti i modelli")}
      </button>
      <section className="method-content">
        <div className={`method-badge accent-${model.accent}`}>
          <ModelGlyph model={model} />
          <span>{model.code}</span>
        </div>
        <p className="kicker">{t("Nuovo progetto")}</p>
        <h1>{t(model.name)}</h1>
        <p className="method-intro">
          {t("Come vuoi iniziare? Potrai passare dalla vista visuale al JSON in qualsiasi momento.")}
        </p>
        <div className="method-options">
          <button className="method-card primary" onClick={onCreate}>
            <span className="method-icon">
              <Icon name={model.visual ? "canvas" : "edit"} size={29} />
            </span>
            <span>
              <small>{t(model.visual ? "Consigliato" : "Editor guidato")}</small>
              <strong>{t(model.visual ? "Disegna nella lavagna" : "Crea nell’editor")}</strong>
              <p>
                {model.visual
                  ? t("Trascina stati, collega transizioni e modifica ogni proprietà senza scrivere codice.")
                  : t("Parti da un esempio leggibile e modifica direttamente la definizione del modello.")}
              </p>
            </span>
            <Icon name="arrow" />
          </button>
          <button className="method-card" onClick={onImport}>
            <span className="method-icon">
              <Icon name="upload" size={29} />
            </span>
            <span>
              <small>{t("Da un file esistente")}</small>
              <strong>{t("Importa JSON")}</strong>
              <p>{t("Apri una definizione o un intero progetto salvato in precedenza.")}</p>
            </span>
            <Icon name="arrow" />
          </button>
        </div>
        <p className="method-note">
          {t("I progetti restano sul tuo dispositivo finché non scegli di esportarli.")}
        </p>
      </section>
    </main>
  );
}

type StudioProps = {
  model: ModelMeta;
  project: { id: string; name: string };
  setProject: React.Dispatch<React.SetStateAction<{ id: string; name: string }>>;
  graph: WorkspaceGraph;
  view: "canvas" | "json";
  setView: (value: "canvas" | "json") => void;
  tool: Tool;
  setTool: (value: Tool) => void;
  transitionFrom?: string;
  selection: Selection;
  setSelection: (value: Selection) => void;
  selectedNode?: GraphNode;
  selectedEdge?: GraphEdge;
  source: string;
  setSource: (value: string) => void;
  input: string;
  setInput: (value: string) => void;
  result?: unknown;
  error?: string;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  sidePanel: "properties" | "run";
  setSidePanel: (value: "properties" | "run") => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onCanvasClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPointerDown: (event: ReactPointerEvent, node: GraphNode) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: () => void;
  onUpdateNode: (patch: Partial<GraphNode>) => void;
  onRenameNode: (id: string) => void;
  onUpdateEdge: (label: string) => void;
  onRemove: () => void;
  onApplyJson: () => void;
  onRun: () => void;
  onAction: (action: ModelAction) => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onHome: () => void;
  onTheme: () => void;
  onTheory: () => void;
};
function Studio(props: StudioProps) {
  const {
    model,
    project,
    setProject,
    graph,
    view,
    setView,
    tool,
    setTool,
    transitionFrom,
    selection,
    setSelection,
    selectedNode,
    selectedEdge,
    source,
    setSource,
    input,
    setInput,
    result,
    error,
    zoom,
    setZoom,
    sidePanel,
    setSidePanel,
    canvasRef,
    onCanvasClick,
    onDrop,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onUpdateNode,
    onRenameNode,
    onUpdateEdge,
    onRemove,
    onApplyJson,
    onRun,
    onAction,
    onSave,
    onExport,
    onImport,
    onHome,
    onTheme,
    onTheory,
  } = props;
  const { t } = useI18n();
  return (
    <main className="studio-screen">
      <header className="studio-header">
        <button className="brand-button" onClick={onHome} aria-label="Torna alla home">
          <Brand />
        </button>
        <span className="header-divider" />
        <span className={`project-chip accent-${model.accent}`}>{model.code}</span>
        <input
          className="project-name"
          aria-label="Nome progetto"
          value={project.name}
          onChange={(event) => setProject((current) => ({ ...current, name: event.target.value }))}
        />
        <span className="saved-indicator">
          <i />
          {t("Sul dispositivo")}
        </span>
        <div className="studio-actions">
          <LanguageMenu />
          <button className="ghost-button" onClick={onTheory}>
            <Icon name="code" />
            {t("Teoria")}
          </button>
          <button className="icon-button" aria-label={t("Scegli tema")} onClick={onTheme}>
            <Icon name="palette" />
          </button>
          <button className="ghost-button" onClick={onImport}>
            <Icon name="folder" />
            {t("Apri")}
          </button>
          <button className="ghost-button" onClick={onExport}>
            <Icon name="download" />
            {t("Esporta")}
          </button>
          <button className="solid-button" onClick={onSave}>
            <Icon name="save" />
            {t("Salva")}
          </button>
        </div>
      </header>
      <div className="studio-body">
        <aside className="tool-rail" aria-label={t("Strumenti del modello")}>
          <button className={tool === "select" ? "active" : ""} onClick={() => setTool("select")}>
            <span className="cursor-icon">↖</span>
            <small>{t("Seleziona")}</small>
          </button>
          {model.visual && (
            <>
              <button
                className={tool === "state" ? "active" : ""}
                onClick={() => setTool("state")}
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", "state")}
              >
                <span className="state-tool" />
                <small>{t(model.kind === "petri" ? "Luogo" : "Stato")}</small>
              </button>
              <button className={tool === "transition" ? "active" : ""} onClick={() => setTool("transition")}>
                <Icon name="arrow" />
                <small>{t(model.kind === "petri" ? "Evento" : "Transizione")}</small>
              </button>
            </>
          )}
          <span className="rail-spacer" />
          <button onClick={onTheme}>
            <Icon name="palette" />
            <small>{t("Tema")}</small>
          </button>
        </aside>
        <section className="work-area">
          <div className="viewbar">
            <div className="segmented">
              <button
                className={view === "canvas" ? "active" : ""}
                disabled={!model.visual}
                onClick={() => setView("canvas")}
              >
                <Icon name="canvas" />
                {t("Lavagna")}
              </button>
              <button className={view === "json" ? "active" : ""} onClick={() => setView("json")}>
                <Icon name="code" />
                JSON
              </button>
            </div>
            <div className="workspace-help">
              {transitionFrom ? (
                <>
                  {t(
                    model.kind === "petri"
                      ? "Ora scegli il luogo di destinazione"
                      : "Ora scegli lo stato di destinazione",
                  )}{" "}
                  <kbd>Esc</kbd> {t("annulla")}
                </>
              ) : tool === "state" ? (
                model.kind === "petri" ? (
                  t("Fai clic nella lavagna per inserire un luogo")
                ) : (
                  t("Fai clic nella lavagna per inserire uno stato")
                )
              ) : model.kind === "petri" ? (
                t("Trascina luoghi ed eventi per organizzare la rete")
              ) : (
                t("Trascina gli stati per organizzare il modello")
              )}
            </div>
            <div className="zoom-controls">
              <button onClick={() => setZoom((value) => Math.max(0.65, value - 0.1))}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))}>+</button>
            </div>
          </div>
          {view === "canvas" ? (
            <div
              ref={canvasRef}
              className={`canvas ${tool !== "select" ? `tool-${tool}` : ""}`}
              onClick={onCanvasClick}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className="canvas-grid" style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
                <Graph
                  graph={graph}
                  selection={selection}
                  transitionFrom={transitionFrom}
                  onSelect={setSelection}
                  onPointerDown={onPointerDown}
                />
              </div>
              {graph.nodes.length === 0 && (
                <div className="canvas-empty">
                  <span className="state-tool large" />
                  <h3>{t("La lavagna è vuota")}</h3>
                  <p>
                    {model.kind === "petri"
                      ? t("Aggiungi un luogo e collegalo a un altro per creare un evento.")
                      : t("Trascina uno stato dalla barra oppure fai clic sullo strumento Stato.")}
                  </p>
                </div>
              )}
              <div className="canvas-legend">
                {model.kind === "petri" ? (
                  <>
                    <span>
                      <i className="legend-normal" />
                      {t("luogo")}
                    </span>
                    <span>
                      <i className="legend-event" />
                      {t("evento")}
                    </span>
                    <span>
                      <i className="legend-token" />
                      {t("token")}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      <i className="legend-start" />
                      {t("iniziale")}
                    </span>
                    <span>
                      <i className="legend-accept" />
                      {t("finale")}
                    </span>
                    <span>
                      <i className="legend-normal" />
                      {t("stato")}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="json-workspace">
              <div className="json-head">
                <div>
                  <p className="kicker">{t("Definizione completa")}</p>
                  <h2>{t("JSON del modello")}</h2>
                </div>
                <button className="solid-button" onClick={onApplyJson}>
                  <Icon name="check" />
                  {t("Applica modifiche")}
                </button>
              </div>
              <textarea
                value={source}
                onChange={(event) => setSource(event.target.value)}
                spellCheck={false}
                aria-label="Definizione JSON"
              />
            </div>
          )}
        </section>
        <aside className="inspector">
          <div className="inspector-tabs">
            <button
              className={sidePanel === "properties" ? "active" : ""}
              onClick={() => setSidePanel("properties")}
            >
              {t("Proprietà")}
            </button>
            <button className={sidePanel === "run" ? "active" : ""} onClick={() => setSidePanel("run")}>
              {t("Esecuzione")}
              {result !== undefined && <i />}
            </button>
          </div>
          {sidePanel === "properties" ? (
            <Properties
              model={model}
              node={selectedNode}
              edge={selectedEdge}
              onUpdateNode={onUpdateNode}
              onRenameNode={onRenameNode}
              onUpdateEdge={onUpdateEdge}
              onRemove={onRemove}
            />
          ) : (
            <Runner
              model={model}
              input={input}
              setInput={setInput}
              result={result}
              error={error}
              onRun={onRun}
              onAction={onAction}
            />
          )}
        </aside>
      </div>
    </main>
  );
}

function Graph({
  graph,
  selection,
  transitionFrom,
  onSelect,
  onPointerDown,
}: {
  graph: WorkspaceGraph;
  selection: Selection;
  transitionFrom?: string;
  onSelect: (value: Selection) => void;
  onPointerDown: (event: ReactPointerEvent, node: GraphNode) => void;
}) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return (
    <>
      {
        <svg className="edge-layer" width="1400" height="900" aria-hidden="true">
          <defs>
            <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
              <path d="M0,0 L12,6 L0,12 z" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <path d="M0,0 L12,6 L0,12 z" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const from = byId.get(edge.from),
              to = byId.get(edge.to);
            if (!from || !to) return null;
            const self = from.id === to.id;
            let path: string;
            let lx: number;
            let ly: number;
            let origin: { x: number; y: number } | undefined;
            if (self) {
              path = `M ${from.x - 24} ${from.y - 34} C ${from.x - 82} ${from.y - 112}, ${from.x + 82} ${from.y - 112}, ${from.x + 24} ${from.y - 34}`;
              lx = from.x;
              ly = from.y - 94;
            } else {
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const distance = Math.max(1, Math.hypot(dx, dy));
              const ux = dx / distance;
              const uy = dy / distance;
              const startRadius = from.role === "event" ? 25 : 39;
              const endRadius = to.role === "event" ? 30 : 45;
              const sx = from.x + ux * startRadius;
              const sy = from.y + uy * startRadius;
              origin = { x: sx, y: sy };
              const ex = to.x - ux * endRadius;
              const ey = to.y - uy * endRadius;
              const curve = Math.min(42, Math.max(22, distance * 0.13));
              const cx = (from.x + to.x) / 2 - uy * curve;
              const cy = (from.y + to.y) / 2 + ux * curve;
              path = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
              lx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
              ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;
            }
            return (
              <g
                className={selection?.type === "edge" && selection.id === edge.id ? "edge selected" : "edge"}
                key={edge.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect({ type: "edge", id: edge.id });
                }}
              >
                <path
                  d={path}
                  markerEnd={
                    selection?.type === "edge" && selection.id === edge.id
                      ? "url(#arrowhead-selected)"
                      : "url(#arrowhead)"
                  }
                />
                {origin && <circle className="edge-origin" cx={origin.x} cy={origin.y} r="3.5" />}
                <rect
                  x={lx - Math.max(23, edge.label.length * 3.6)}
                  y={ly - 13}
                  width={Math.max(46, edge.label.length * 7.2)}
                  height="26"
                  rx="7"
                />
                <text x={lx} y={ly + 4}>
                  {edge.label}
                </text>
              </g>
            );
          })}
        </svg>
      }
      {graph.nodes.map((node) => (
        <button
          type="button"
          className={`graph-node role-${node.role} ${selection?.type === "node" && selection.id === node.id ? "selected" : ""} ${transitionFrom === node.id ? "transition-source" : ""}`}
          style={{ left: node.x, top: node.y }}
          key={node.id}
          onPointerDown={(event) => onPointerDown(event, node)}
        >
          <span className="node-body">
            {node.role === "start" || node.role === "start-accept" ? <i className="start-arrow">→</i> : null}
            {node.label}
            {node.tokens !== undefined && node.tokens > 0 && <b className="token-count">{node.tokens}</b>}
          </span>
        </button>
      ))}
    </>
  );
}

function Properties({
  model,
  node,
  edge,
  onUpdateNode,
  onRenameNode,
  onUpdateEdge,
  onRemove,
}: {
  model: ModelMeta;
  node?: GraphNode;
  edge?: GraphEdge;
  onUpdateNode: (patch: Partial<GraphNode>) => void;
  onRenameNode: (id: string) => void;
  onUpdateEdge: (label: string) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  if (!node && !edge)
    return (
      <div className="inspector-empty">
        <span className="selection-illustration">
          <i />
          <b />
          <i />
        </span>
        <h3>{t("Nessuna selezione")}</h3>
        <p>
          {t(
            model.kind === "petri"
              ? "Seleziona un luogo, un evento o un arco per modificarne le proprietà."
              : "Seleziona uno stato o una transizione per modificarne le proprietà.",
          )}
        </p>
        <div className="tip">
          <strong>{t("Suggerimento")}</strong>
          <span>
            {t("Premi")} <kbd>Esc</kbd> {t("per tornare allo strumento di selezione.")}
          </span>
        </div>
      </div>
    );
  return (
    <div className="property-form">
      <div className="property-title">
        <span className={node ? "state-tool" : "transition-swatch"} />
        <div>
          <p className="kicker">
            {node
              ? node.role === "place"
                ? "Luogo selezionato"
                : node.role === "event"
                  ? "Evento selezionato"
                  : "Stato selezionato"
              : model.kind === "petri"
                ? "Arco selezionato"
                : "Transizione selezionata"}
          </p>
          <h3>{node?.label ?? `${edge?.from} → ${edge?.to}`}</h3>
        </div>
      </div>
      {node ? (
        <>
          <label>
            {t("Identificatore")}
            <input value={node.id} onChange={(event) => onRenameNode(event.target.value)} />
          </label>
          <label>
            {t("Etichetta")}
            <input value={node.label} onChange={(event) => onUpdateNode({ label: event.target.value })} />
          </label>
          {node.role !== "place" && node.role !== "event" && (
            <label>
              {t("Ruolo")}
              <select
                value={node.role}
                onChange={(event) => onUpdateNode({ role: event.target.value as GraphNode["role"] })}
              >
                <option value="normal">{t("Stato normale")}</option>
                <option value="start">{t("Stato iniziale")}</option>
                <option value="accept">{t("Stato finale")}</option>
                <option value="start-accept">{t("Iniziale e finale")}</option>
              </select>
            </label>
          )}
          {node.tokens !== undefined && (
            <label>
              {t("Token")}
              <input
                type="number"
                min="0"
                value={node.tokens}
                onChange={(event) => onUpdateNode({ tokens: Number(event.target.value) })}
              />
            </label>
          )}
        </>
      ) : (
        <>
          <div className="connection">
            <span>{edge?.from}</span>
            <Icon name="arrow" />
            <span>{edge?.to}</span>
          </div>
          <label>
            {t("Etichetta della transizione")}
            <input value={edge?.label ?? ""} onChange={(event) => onUpdateEdge(event.target.value)} />
            <small>
              {model.kind === "mealy"
                ? "Formato: input / output"
                : model.kind === "turing"
                  ? "Formato: letto → scritto, movimento"
                  : model.kind === "pda"
                    ? "Formato: input, pop → push"
                    : "Usa ε per una transizione vuota"}
            </small>
          </label>
        </>
      )}
      <button className="danger-button" onClick={onRemove}>
        <Icon name="trash" />
        Elimina{" "}
        {node
          ? node.role === "place"
            ? "luogo"
            : node.role === "event"
              ? "evento"
              : "stato"
          : model.kind === "petri"
            ? "arco"
            : "transizione"}
      </button>
    </div>
  );
}

function Runner({
  model,
  input,
  setInput,
  result,
  error,
  onRun,
  onAction,
}: {
  model: ModelMeta;
  input: string;
  setInput: (value: string) => void;
  result?: unknown;
  error?: string;
  onRun: () => void;
  onAction: (action: ModelAction) => void;
}) {
  const { t } = useI18n();
  const hint =
    model.kind === "petri"
      ? "Sequenza di transizioni"
      : model.kind === "multiTuring"
        ? "Separa i nastri con |"
        : ["lsystem", "contextualLsystem", "stochasticLsystem"].includes(model.kind)
          ? "Numero di generazioni"
          : "Simboli separati da spazi";
  const actions: { id: ModelAction; label: string }[] =
    model.kind === "dfa"
      ? [{ id: "minimize_dfa", label: "Minimizza DFA" }]
      : model.kind === "nfa"
        ? [{ id: "determinize", label: "Determinizza" }]
        : model.kind === "regex"
          ? [{ id: "regex_to_nfa", label: "Converti in NFA" }]
          : model.kind === "regularGrammar"
            ? [{ id: "regular_grammar_to_nfa", label: "Converti in NFA" }]
            : model.kind === "cfg"
              ? [
                  { id: "cyk", label: "Parser CYK" },
                  { id: "ll1", label: "Parser LL(1)" },
                  { id: "cfg_to_pda", label: "Converti in PDA" },
                ]
              : [];
  return (
    <div className="runner-panel">
      <div className="run-intro">
        <span className={`run-model accent-${model.accent}`}>{model.code}</span>
        <div>
          <p className="kicker">{t("Banco di prova")}</p>
          <h3>{t("Esegui il modello")}</h3>
        </div>
      </div>
      <label>
        {hint}
        <textarea
          rows={3}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="a b b"
        />
      </label>
      <button className="run-button" onClick={onRun}>
        <span>
          <Icon name="play" />
          {t("Avvia simulazione")}
        </span>
        <kbd>⌘ ↵</kbd>
      </button>
      {actions.length > 0 && (
        <div className="model-actions">
          <span>{t("Strumenti del modello")}</span>
          {actions.map((action) => (
            <button key={action.id} onClick={() => onAction(action.id)}>
              <Icon name="arrow" size={15} />
              {action.label}
            </button>
          ))}
        </div>
      )}
      <div className="result-box" aria-live="polite">
        <div className="result-head">
          <span>{t("Risultato")}</span>
          {result !== undefined && !error && (
            <small>
              <i />
              {t("completato")}
            </small>
          )}
        </div>
        {error ? (
          <p className="run-error">{error}</p>
        ) : result !== undefined ? (
          <pre>{JSON.stringify(result, null, 2)}</pre>
        ) : (
          <div className="result-empty">
            <Icon name="play" />
            <p>Il risultato e la traccia di esecuzione appariranno qui.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TheoryPage({ model, onBack, onOpen }: { model: ModelMeta; onBack: () => void; onOpen: () => void }) {
  const { language, t } = useI18n();
  const theory = language === "it" ? theories[model.kind] : theoryInEnglish(model.kind);
  return (
    <main className="theory-screen">
      <nav className="topbar">
        <Brand />
        <div className="top-actions">
          <LanguageMenu />
          <button
            className="ghost-button"
            onClick={() => void openUrl("https://github.com/Tony0380/Computability")}
          >
            <Icon name="code" />
            {t("Repository GitHub")}
          </button>
        </div>
      </nav>
      <div className="theory-wrap">
        <button className="back-button" onClick={onBack}>
          <Icon name="back" />
          {t("Torna al catalogo")}
        </button>
        <header className={`theory-hero accent-${model.accent}`}>
          <div className="theory-model-mark">
            <ModelGlyph model={model} />
            <span>{model.code}</span>
          </div>
          <div>
            <p className="kicker">{t("Teoria")}</p>
            <h1>{t(model.name)}</h1>
            <p>{t(theory.summary)}</p>
          </div>
        </header>
        <section className="theory-grid">
          <article className="theory-card formal-card">
            <p className="kicker">{t("Definizione formale")}</p>
            <div className="formal-tuple">{theory.tuple}</div>
            <div className="component-list">
              {theory.components.map((component) => (
                <div key={`${component.symbol}-${component.label}`}>
                  <code>{component.symbol}</code>
                  <span>{t(component.label)}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="theory-card">
            <p className="kicker">{t("Dinamica")}</p>
            <div className="theory-formula">{theory.dynamics}</div>
          </article>
          <article className="theory-card">
            <p className="kicker">{t("Condizione di accettazione")}</p>
            <div className="theory-formula">{theory.acceptance}</div>
          </article>
          <article className="theory-card power-card">
            <p className="kicker">{t("Potere espressivo")}</p>
            <h2>{t(theory.power)}</h2>
            <ul>
              {theory.notes.map((note) => (
                <li key={note}>{t(note)}</li>
              ))}
            </ul>
          </article>
        </section>
        <div className="theory-actions">
          <button className="solid-button" onClick={onOpen}>
            <Icon name="canvas" />
            {t("Apri nel laboratorio")}
          </button>
          <button className="ghost-button" onClick={onBack}>
            {t("Torna al catalogo")}
          </button>
        </div>
      </div>
    </main>
  );
}

function UpdateDialog({
  status,
  update,
  progress,
  onCheck,
  onInstall,
  onClose,
}: {
  status: "idle" | "checking" | "current" | "available" | "downloading" | "error";
  update: Update | null;
  progress: number;
  onCheck: () => void;
  onInstall: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <button className="dialog-close" onClick={onClose} aria-label="Chiudi">
          <Icon name="close" />
        </button>
        <span className={`update-symbol status-${status}`}>
          <Icon
            name={status === "available" ? "download" : status === "current" ? "check" : "more"}
            size={27}
          />
        </span>
        <p className="kicker">Computability</p>
        <h2 id="update-title">
          {status === "available"
            ? t("Nuova versione disponibile")
            : status === "current"
              ? t("Versione più recente installata")
              : status === "downloading"
                ? t("Download aggiornamento…")
                : t("Aggiornamenti")}
        </h2>
        {update && (
          <div className="version-route">
            <span>v{update.currentVersion}</span>
            <Icon name="arrow" />
            <strong>v{update.version}</strong>
          </div>
        )}
        {status === "checking" && (
          <div className="update-loading">
            <i />
            <span>{t("Controllo aggiornamenti")}</span>
          </div>
        )}
        {status === "downloading" && (
          <div className="progress-track">
            <i style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
        )}
        {status === "error" && (
          <p className="update-error">
            {t("Impossibile controllare gli aggiornamenti. Verifica la connessione e riprova.")}
          </p>
        )}
        {update?.body && <p className="update-notes">{update.body}</p>}
        <div className="update-actions">
          {status === "available" && (
            <button className="solid-button" onClick={onInstall}>
              <Icon name="download" />
              {t("Scarica e aggiorna")}
            </button>
          )}
          {(status === "current" || status === "error" || status === "idle") && (
            <button className="ghost-button" onClick={onCheck}>
              {t("Controlla aggiornamenti")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ThemeDialog({
  theme,
  onTheme,
  onClose,
}: {
  theme: ThemeName;
  onTheme: (theme: ThemeName) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="theme-dialog" role="dialog" aria-modal="true" aria-labelledby="theme-title">
        <button className="dialog-close" onClick={onClose} aria-label={t("Chiudi")}>
          <Icon name="close" />
        </button>
        <p className="kicker">{t("Aspetto")}</p>
        <h2 id="theme-title">{t("Scegli il tuo ambiente")}</h2>
        <p>{t("I colori cambiano, la leggibilità resta la stessa.")}</p>
        <div className="theme-list">
          {themes.map((item) => (
            <button
              className={theme === item.id ? "selected" : ""}
              key={item.id}
              onClick={() => onTheme(item.id)}
            >
              <span className="theme-preview">
                {item.swatches.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <strong>{t(item.name)}</strong>
              {theme === item.id && (
                <span className="theme-check">
                  <Icon name="check" />
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="solid-button dialog-done" onClick={onClose}>
          {t("Applica tema")}
        </button>
      </section>
    </div>
  );
}
