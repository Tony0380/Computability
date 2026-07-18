import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import {
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { catalogue, metaFor, type ModelMeta } from "./catalog";
import { AlgorithmLab } from "./algorithms";
import { stepCanvasZoom, zoomDirectionFromKey } from "./canvasZoom";
import { examples, type Definition, type MachineKind } from "./domain";
import { GuidedDefinitionEditor } from "./guidedEditor";
import { detectedLanguage, I18nProvider, languages, translate, useI18n, type Language } from "./i18n";
import { theoryForLanguage } from "./theoryLocalized";
import {
  definitionFromGraph,
  normalizePetriWeight,
  transitionFieldsFromEdge,
  transitionLabelFromFields,
  graphFromDefinition,
  isMachineKind,
  isWorkspaceGraph,
  persistProject,
  persistWorkspaceTabs,
  projectId,
  readProjects,
  readWorkspaceTabs,
  supportsStateCanvas,
  syncGraphFromDefinition,
  upsertWorkspaceTab,
  type GraphEdge,
  type GraphNode,
  type SavedProject,
  type WorkspaceGraph,
  type WorkspaceTab,
} from "./workspace";

type Screen = "home" | "method" | "studio" | "theory" | "algorithms";
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
    minimize: <path d="M6 12h12" />,
    maximize: <rect x="6.5" y="6.5" width="11" height="11" rx="1" />,
    restore: (
      <>
        <path d="M8 8V6.5h9.5V16H16" />
        <rect x="6.5" y="8.5" width="9" height="9" rx="1" />
      </>
    ),
    edit: (
      <>
        <path d="m4 20 4-1 11-11-3-3L5 16z" />
        <path d="m14 7 3 3" />
      </>
    ),
  };
  return <svg {...common}>{paths[name] ?? paths.more}</svg>;
}

function WindowTitlebar({
  screen,
  modelCode,
  projectName,
}: {
  screen: Screen;
  modelCode: string;
  projectName: string;
}) {
  const { t } = useI18n();
  const desktop = isTauri();
  const [maximized, setMaximized] = useState(false);
  const currentWindow = useMemo(() => (desktop ? getCurrentWindow() : undefined), [desktop]);

  useEffect(() => {
    if (!currentWindow) return;
    let disposed = false;
    let stopListening: (() => void) | undefined;
    void currentWindow
      .isMaximized()
      .then(setMaximized)
      .catch(() => undefined);
    void currentWindow
      .onResized(() => {
        void currentWindow
          .isMaximized()
          .then(setMaximized)
          .catch(() => undefined);
      })
      .then((unlisten) => {
        if (disposed) unlisten();
        else stopListening = unlisten;
      });
    return () => {
      disposed = true;
      stopListening?.();
    };
  }, [currentWindow]);

  const section =
    screen === "home"
      ? t("Catalogo")
      : screen === "algorithms"
        ? t("Algoritmi")
        : screen === "method"
          ? t("Scelta modello")
          : screen === "theory"
            ? `${t("Teoria")} · ${modelCode}`
            : projectName;

  async function toggleMaximize() {
    if (!currentWindow) return;
    await currentWindow.toggleMaximize();
    setMaximized(await currentWindow.isMaximized());
  }

  return (
    <header
      className="window-titlebar"
      data-tauri-drag-region
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        void toggleMaximize();
      }}
    >
      <div className="window-identity" data-tauri-drag-region>
        <span className="window-app-mark" aria-hidden="true" data-tauri-drag-region>
          <i />
          <i />
          <i />
        </span>
        <strong data-tauri-drag-region>Computability</strong>
      </div>
      <div className="window-context" data-tauri-drag-region>
        <span aria-hidden="true" />
        <small data-tauri-drag-region>{section}</small>
      </div>
      <div className="window-controls">
        <button
          type="button"
          aria-label={t("Riduci a icona")}
          title={t("Riduci a icona")}
          onClick={() => void currentWindow?.minimize()}
        >
          <Icon name="minimize" size={16} />
        </button>
        <button
          type="button"
          aria-label={t(maximized ? "Ripristina" : "Ingrandisci")}
          title={t(maximized ? "Ripristina" : "Ingrandisci")}
          onClick={() => void toggleMaximize()}
        >
          <Icon name={maximized ? "restore" : "maximize"} size={15} />
        </button>
        <button
          type="button"
          className="window-close"
          aria-label={t("Chiudi finestra")}
          title={t("Chiudi finestra")}
          onClick={() => void currentWindow?.close()}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </header>
  );
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

function inferMachineKind(value: Definition): MachineKind | undefined {
  const has = (key: string) => key in value;
  if (has("expression")) return "regex";
  if (has("marking")) return "petri";
  if (has("tape_count")) return "multiTuring";
  if (has("productions")) return "regularGrammar";
  if (has("state_outputs")) return "moore";
  if (has("axiom")) {
    const rules = Array.isArray(value.rules) ? value.rules : [];
    const first = rules.find(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
    );
    if (first && "alternatives" in first) return "stochasticLsystem";
    if (first && ("left_context" in first || "right_context" in first)) return "contextualLsystem";
    return "lsystem";
  }
  if (has("variables") && has("rules")) {
    const rules = Array.isArray(value.rules) ? value.rules : [];
    const first = rules.find(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
    );
    return first && Array.isArray(first.left) ? "unrestrictedGrammar" : "cfg";
  }
  if (!has("states") || !has("transitions")) return undefined;
  const transitions = Array.isArray(value.transitions) ? value.transitions : [];
  const first = transitions.find(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
  );
  if (!first) return "dfa";
  if ("read" in first || "write" in first) return "turing";
  if ("pop" in first || "push" in first) return "pda";
  if ("input" in first || "output" in first) return "mealy";
  const seen = new Set<string>();
  const nondeterministic = transitions.some((item) => {
    if (typeof item !== "object" || item === null) return false;
    const transition = item as Record<string, unknown>;
    const key = `${String(transition.from)}\u0000${String(transition.symbol)}`;
    const duplicate = seen.has(key);
    seen.add(key);
    return duplicate || transition.symbol === "ε";
  });
  return nondeterministic ? "nfa" : "dfa";
}

export default function App() {
  const [language, setLanguage] = useState<Language>(detectedLanguage);
  const [screen, setScreen] = useState<Screen>("home");
  const [kind, setKind] = useState<MachineKind>("dfa");
  const [definition, setDefinition] = useState<Definition>(examples.dfa);
  const [graph, setGraph] = useState<WorkspaceGraph>(() => graphFromDefinition("dfa", examples.dfa));
  const [project, setProject] = useState({
    id: projectId(),
    name: translate(language, "Automa deterministico senza titolo"),
  });
  const [projects, setProjects] = useState<SavedProject[]>(readProjects);
  const [openTabs, setOpenTabs] = useState<WorkspaceTab[]>(readWorkspaceTabs);
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
  const [view, setView] = useState<"canvas" | "rules">("canvas");
  const [tool, setTool] = useState<Tool>("select");
  const [selection, setSelection] = useState<Selection>(null);
  const [transitionFrom, setTransitionFrom] = useState<string>();
  const [input, setInput] = useState("0 1 1");
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [sidePanel, setSidePanel] = useState<"properties" | "run">("properties");
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const requestId = useRef(0);
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
    const tabs =
      screen === "studio"
        ? upsertWorkspaceTab(openTabs, {
            ...project,
            kind,
            definition: definitionFromGraph(kind, definition, graph),
            graph,
            input,
            view,
            updatedAt: new Date().toISOString(),
          })
        : openTabs;
    persistWorkspaceTabs(tabs);
  }, [definition, graph, input, kind, openTabs, project, screen, view]);
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
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLSelectElement) &&
        !(event.target instanceof HTMLButtonElement) &&
        !(event.target instanceof HTMLElement && event.target.isContentEditable)
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
    const nextName = translate(language, "{model} senza titolo", {
      model: translate(language, metaFor(kind).name),
    });
    const nextProject = { id: projectId(), name: nextName };
    const nextGraph = graphFromDefinition(kind, nextDefinition);
    const nextView = metaFor(kind).visual ? "canvas" : "rules";
    setDefinition(nextDefinition);
    setGraph(nextGraph);
    setProject(nextProject);
    setOpenTabs((current) =>
      upsertWorkspaceTab(current, {
        ...nextProject,
        kind,
        definition: nextDefinition,
        graph: nextGraph,
        input: "0 1 1",
        view: nextView,
        updatedAt: new Date().toISOString(),
      }),
    );
    setSelection(null);
    setInput("0 1 1");
    setView(nextView);
    setScreen("studio");
    setResult(undefined);
  }
  function loadWorkspace(saved: SavedProject | WorkspaceTab) {
    const currentTabs = screen === "studio" ? tabsWithActiveWorkspace() : openTabs;
    const tab: WorkspaceTab = {
      ...saved,
      input: "input" in saved ? saved.input : "0 1 1",
      view: "view" in saved ? saved.view : metaFor(saved.kind).visual ? "canvas" : "rules",
    };
    setOpenTabs(upsertWorkspaceTab(currentTabs, tab));
    applyWorkspace(tab);
  }
  function openProject(saved: SavedProject) {
    loadWorkspace(openTabs.find((item) => item.id === saved.id) ?? saved);
  }
  function closeWorkspace(id: string) {
    const next = tabsWithActiveWorkspace().filter((item) => item.id !== id);
    setOpenTabs(next);
    if (project.id !== id) return;
    const fallback = next.at(-1);
    if (fallback) applyWorkspace(fallback);
    else setScreen("home");
  }
  function currentDefinition(): Definition {
    return definitionFromGraph(kind, definition, graph);
  }
  function workspaceSnapshot(): WorkspaceTab {
    return {
      ...project,
      kind,
      definition: currentDefinition(),
      graph,
      input,
      view,
      updatedAt: new Date().toISOString(),
    };
  }
  function tabsWithActiveWorkspace(): WorkspaceTab[] {
    return screen === "studio" ? upsertWorkspaceTab(openTabs, workspaceSnapshot()) : openTabs;
  }
  function applyWorkspace(tab: WorkspaceTab) {
    requestId.current += 1;
    setKind(tab.kind);
    setDefinition(tab.definition);
    setGraph(tab.graph);
    setProject({ id: tab.id, name: tab.name });
    setScreen("studio");
    setView(tab.view);
    setInput(tab.input);
    setResult(undefined);
    setError(undefined);
    setSelection(null);
    setTool("select");
    setTransitionFrom(undefined);
    setZoom(1);
  }
  function returnHome() {
    if (screen === "studio") setOpenTabs(tabsWithActiveWorkspace());
    requestId.current += 1;
    setScreen("home");
  }
  function useWorkspaceAsAlgorithmSource(workspace: WorkspaceTab) {
    setKind(workspace.kind);
    setDefinition(workspace.definition);
    setGraph(workspace.graph);
    setProject({ id: workspace.id, name: workspace.name });
    setInput(workspace.input);
    setResult(undefined);
    setError(undefined);
  }
  function openAlgorithmResult(nextKind: MachineKind, nextDefinition: Definition, name: string) {
    requestId.current += 1;
    const nextProject = { id: projectId(), name };
    const nextGraph = graphFromDefinition(nextKind, nextDefinition);
    const nextView = metaFor(nextKind).visual ? "canvas" : "rules";
    setKind(nextKind);
    setDefinition(nextDefinition);
    setGraph(nextGraph);
    setProject(nextProject);
    setView(nextView);
    setSelection(null);
    setTool("select");
    setTransitionFrom(undefined);
    setZoom(1);
    setResult(undefined);
    setError(undefined);
    setOpenTabs((current) =>
      upsertWorkspaceTab(current, {
        ...nextProject,
        kind: nextKind,
        definition: nextDefinition,
        graph: nextGraph,
        input: "",
        view: nextView,
        updatedAt: new Date().toISOString(),
      }),
    );
    setScreen("studio");
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
    setProjects(persistProject(saved));
    setOpenTabs((current) =>
      upsertWorkspaceTab(current, { ...workspaceSnapshot(), definition: nextDefinition }),
    );
    flash(translate(language, "Progetto salvato sul dispositivo"));
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
    flash(translate(language, "File JSON esportato"));
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("invalid JSON shape");
      const candidate = parsed as Record<string, unknown>;
      const nextDefinition = (
        candidate.definition &&
        typeof candidate.definition === "object" &&
        !Array.isArray(candidate.definition)
          ? candidate.definition
          : candidate
      ) as Definition;
      const nextKind = isMachineKind(candidate.kind) ? candidate.kind : inferMachineKind(nextDefinition);
      if (!nextKind) throw new Error("Machine kind could not be inferred from this JSON file.");
      const nextGraph = isWorkspaceGraph(candidate.graph)
        ? syncGraphFromDefinition(nextKind, nextDefinition, candidate.graph)
        : graphFromDefinition(nextKind, nextDefinition);
      const nextProject = {
        id: typeof candidate.id === "string" ? candidate.id : projectId(),
        name: typeof candidate.name === "string" ? candidate.name : file.name.replace(/\.json$/i, ""),
      };
      setKind(nextKind);
      setDefinition(nextDefinition);
      setGraph(nextGraph);
      setProject(nextProject);
      setOpenTabs((current) =>
        upsertWorkspaceTab(current, {
          ...nextProject,
          kind: nextKind,
          definition: nextDefinition,
          graph: nextGraph,
          input: "0 1 1",
          view: metaFor(nextKind).visual ? "canvas" : "rules",
          updatedAt: new Date().toISOString(),
        }),
      );
      setScreen("studio");
      setView(metaFor(nextKind).visual ? "canvas" : "rules");
      setError(undefined);
      setResult(undefined);
      flash(translate(language, "Progetto importato"));
    } catch (reason) {
      const message =
        reason instanceof Error && reason.message.includes("kind")
          ? "Non riesco a riconoscere il tipo di macchina da questo JSON. Apri prima il modello corretto e riprova."
          : "Il file non contiene JSON valido. Controlla il contenuto e riprova.";
      setError(translate(language, message));
    }
    event.target.value = "";
  }
  function updateDefinition(next: Definition) {
    setDefinition(next);
    setGraph((current) => syncGraphFromDefinition(kind, next, current));
    setError(undefined);
  }
  async function run() {
    const activeRequest = ++requestId.current;
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
      if (activeRequest !== requestId.current) return;
      setResult(response);
      setError(undefined);
      setSidePanel("run");
    } catch (cause) {
      if (activeRequest !== requestId.current) return;
      setError(String(cause));
      setResult(undefined);
      setSidePanel("run");
    }
  }
  async function performModelAction(action: ModelAction) {
    const activeRequest = ++requestId.current;
    try {
      const parsed = currentDefinition();
      if (action === "cyk" || action === "ll1") {
        const response = await invoke("simulate", {
          request: { kind: action, definition: parsed },
          input: tokenise(input),
        });
        if (activeRequest !== requestId.current) return;
        setResult(response);
        setError(undefined);
        setSidePanel("run");
        return;
      }
      const converted =
        action === "cfg_to_pda"
          ? await invoke<Definition>("cfg_to_pda", { grammar: parsed })
          : await invoke<Definition>("transform", { request: { kind: action, definition: parsed } });
      if (activeRequest !== requestId.current) return;
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
      setView(metaFor(nextKind).visual ? "canvas" : "rules");
      setSelection(null);
      setResult(undefined);
      setError(undefined);
      flash(
        translate(language, "Modello convertito in {model}", {
          model: translate(language, metaFor(nextKind).name),
        }),
      );
    } catch (cause) {
      if (activeRequest !== requestId.current) return;
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
    const trimmedId = nextId.trim();
    if (
      !selectedNode ||
      !trimmedId ||
      graph.nodes.some((node) => node.id === trimmedId && node.id !== selectedNode.id)
    )
      return;
    const oldId = selectedNode.id;
    const renamedId =
      kind === "petri" && (selectedNode.role === "place" || selectedNode.role === "event")
        ? `${selectedNode.role}:${trimmedId}`
        : trimmedId;
    if (graph.nodes.some((node) => node.id === renamedId && node.id !== oldId)) return;
    setGraph((current) => ({
      nodes: current.nodes.map((node) =>
        node.id === oldId
          ? {
              ...node,
              id: renamedId,
              label: kind === "petri" || node.label === oldId ? trimmedId : node.label,
            }
          : node,
      ),
      edges: current.edges.map((edge) => ({
        ...edge,
        from: edge.from === oldId ? renamedId : edge.from,
        to: edge.to === oldId ? renamedId : edge.to,
      })),
    }));
    setSelection({ type: "node", id: renamedId });
  }
  function updateEdge(patch: Partial<GraphEdge>) {
    if (!selectedEdge) return;
    setGraph((current) => ({
      ...current,
      edges: current.edges.map((edge) => (edge.id === selectedEdge.id ? { ...edge, ...patch } : edge)),
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
      <div className="app-frame">
        <WindowTitlebar screen={screen} modelCode={chosen.code} projectName={project.name} />
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
              workspaces={openTabs}
              filtered={filtered}
              families={families}
              family={family}
              query={query}
              onFamily={setFamily}
              onQuery={setQuery}
              onChoose={chooseModel}
              onOpen={openProject}
              onOpenWorkspace={loadWorkspace}
              onCloseWorkspace={closeWorkspace}
              onImport={() => fileInput.current?.click()}
              onTheme={() => setThemeOpen(true)}
              onTheory={(next) => {
                setKind(next);
                setScreen("theory");
              }}
              onUpdates={() => void checkForUpdates()}
              onAlgorithms={() => setScreen("algorithms")}
            />
          )}
          {screen === "algorithms" && (
            <AlgorithmLab
              kind={kind}
              definition={currentDefinition()}
              workspaces={openTabs}
              onBack={() => setScreen("home")}
              onUseWorkspace={useWorkspaceAsAlgorithmSource}
              onOpenResult={openAlgorithmResult}
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
              definition={currentDefinition()}
              onDefinitionChange={updateDefinition}
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
              tabs={openTabs}
              activeTabId={project.id}
              onSwitchTab={loadWorkspace}
              onCloseTab={closeWorkspace}
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
              onRun={run}
              onAction={performModelAction}
              onSave={saveProject}
              onExport={exportProject}
              onImport={() => fileInput.current?.click()}
              onHome={returnHome}
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
      </div>
    </I18nProvider>
  );
}

type HomeProps = {
  projects: SavedProject[];
  workspaces: WorkspaceTab[];
  filtered: ModelMeta[];
  families: string[];
  family: string;
  query: string;
  onFamily: (value: string) => void;
  onQuery: (value: string) => void;
  onChoose: (kind: MachineKind) => void;
  onOpen: (project: SavedProject) => void;
  onOpenWorkspace: (workspace: WorkspaceTab) => void;
  onCloseWorkspace: (id: string) => void;
  onImport: () => void;
  onTheme: () => void;
  onTheory: (kind: MachineKind) => void;
  onUpdates: () => void;
  onAlgorithms: () => void;
};
function Home({
  projects,
  workspaces,
  filtered,
  families,
  family,
  query,
  onFamily,
  onQuery,
  onChoose,
  onOpen,
  onOpenWorkspace,
  onCloseWorkspace,
  onImport,
  onTheme,
  onTheory,
  onUpdates,
  onAlgorithms,
}: HomeProps) {
  const { language, t } = useI18n();
  return (
    <main className="home-screen">
      <nav className="topbar">
        <Brand />
        <div className="top-actions">
          <LanguageMenu />
          <button className="ghost-button" onClick={onAlgorithms}>
            <Icon name="code" />
            {t("Algoritmi")}
          </button>
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
            {t("Costruisci un'idea.")}
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
      {workspaces.length > 0 && (
        <section className="open-workspaces-section section-wrap">
          <div className="section-title">
            <div>
              <p className="kicker">{t("Restano aperte sul dispositivo")}</p>
              <h2>{t("Aree di lavoro aperte")}</h2>
            </div>
            <span className="workspace-count">{workspaces.length}</span>
          </div>
          <div className="open-workspace-row">
            {workspaces.map((item) => {
              const meta = metaFor(item.kind);
              return (
                <article className={`open-workspace-card accent-${meta.accent}`} key={item.id}>
                  <button className="workspace-open" onClick={() => onOpenWorkspace(item)}>
                    <span className="workspace-model-code">{meta.code}</span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{t(item.view === "canvas" ? "Lavagna" : "Editor di regole")}</small>
                    </span>
                    <Icon name="arrow" />
                  </button>
                  <button
                    className="workspace-dismiss"
                    aria-label={`${t("Chiudi area di lavoro")}: ${item.name}`}
                    onClick={() => onCloseWorkspace(item.id)}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
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
      <section id="catalogue" className="catalogue-section section-wrap">
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
              placeholder={t("Cerca un modello...")}
            />
            <span>⌘ K</span>
          </label>
        </div>
        <div className="family-tabs" role="tablist" aria-label={t("Famiglie di modelli")}>
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
          {t("Come vuoi iniziare? Potrai passare dalla lavagna all'editor di regole in qualsiasi momento.")}
        </p>
        <div className="method-options">
          <button className="method-card primary" onClick={onCreate}>
            <span className="method-icon">
              <Icon name={model.visual ? "canvas" : "edit"} size={29} />
            </span>
            <span>
              <small>{t(model.visual ? "Consigliato" : "Editor guidato")}</small>
              <strong>{t(model.visual ? "Disegna nella lavagna" : "Crea nell'editor")}</strong>
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
  definition: Definition;
  onDefinitionChange: (definition: Definition) => void;
  view: "canvas" | "rules";
  setView: (value: "canvas" | "rules") => void;
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSwitchTab: (tab: WorkspaceTab) => void;
  onCloseTab: (id: string) => void;
  tool: Tool;
  setTool: (value: Tool) => void;
  transitionFrom?: string;
  selection: Selection;
  setSelection: (value: Selection) => void;
  selectedNode?: GraphNode;
  selectedEdge?: GraphEdge;
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
  onUpdateEdge: (patch: Partial<GraphEdge>) => void;
  onRemove: () => void;
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
    definition,
    onDefinitionChange,
    view,
    setView,
    tabs,
    activeTabId,
    onSwitchTab,
    onCloseTab,
    tool,
    setTool,
    transitionFrom,
    selection,
    setSelection,
    selectedNode,
    selectedEdge,
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

  useEffect(() => {
    const handleZoomShortcut = (event: KeyboardEvent) => {
      if (view !== "canvas" || (!event.ctrlKey && !event.metaKey)) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const direction = zoomDirectionFromKey(event);
      if (!direction) return;
      event.preventDefault();
      setZoom((current) => stepCanvasZoom(current, direction));
    };
    window.addEventListener("keydown", handleZoomShortcut);
    return () => window.removeEventListener("keydown", handleZoomShortcut);
  }, [setZoom, view]);

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    setZoom((current) => {
      const next = stepCanvasZoom(current, event.deltaY < 0 ? "in" : "out");
      const ratio = next / current;
      requestAnimationFrame(() => {
        canvas.scrollLeft = (canvas.scrollLeft + pointerX) * ratio - pointerX;
        canvas.scrollTop = (canvas.scrollTop + pointerY) * ratio - pointerY;
      });
      return next;
    });
  }
  return (
    <main className="studio-screen">
      <header className="studio-header">
        <button className="brand-button" onClick={onHome} aria-label={t("Torna alla home")}>
          <Brand />
        </button>
        <span className="header-divider" />
        <span className={`project-chip accent-${model.accent}`}>{model.code}</span>
        <input
          className="project-name"
          aria-label={t("Nome progetto")}
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
      <nav className="workspace-tabs" aria-label={t("Aree di lavoro aperte")}>
        <button className="workspace-home-tab" onClick={onHome} aria-label={t("Torna al catalogo")}>
          <Icon name="home" size={15} />
        </button>
        <div className="workspace-tab-strip">
          {tabs.map((tab) => {
            const tabModel = metaFor(tab.kind);
            return (
              <div
                className={`workspace-tab accent-${tabModel.accent} ${tab.id === activeTabId ? "active" : ""}`}
                key={tab.id}
              >
                <button className="workspace-tab-main" onClick={() => onSwitchTab(tab)}>
                  <span>{tabModel.code}</span>
                  <strong>{tab.id === activeTabId ? project.name : tab.name}</strong>
                </button>
                <button
                  className="workspace-tab-close"
                  aria-label={`${t("Chiudi area di lavoro")}: ${tab.name}`}
                  onClick={() => onCloseTab(tab.id)}
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            );
          })}
        </div>
        <button className="workspace-new-tab" onClick={onHome}>
          <Icon name="plus" size={15} />
          {t("Nuova")}
        </button>
      </nav>
      <div className="studio-body">
        <aside className="tool-rail" aria-label={t("Strumenti del modello")}>
          {model.visual && (
            <>
              <button className={tool === "select" ? "active" : ""} onClick={() => setTool("select")}>
                <span className="cursor-icon">↖</span>
                <small>{t("Seleziona")}</small>
              </button>
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
          {!model.visual && (
            <button className="active" onClick={() => setView("rules")}>
              <Icon name="edit" />
              <small>{t("Regole")}</small>
            </button>
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
                hidden={!model.visual}
                onClick={() => setView("canvas")}
              >
                <Icon name="canvas" />
                {t("Lavagna")}
              </button>
              <button className={view === "rules" ? "active" : ""} onClick={() => setView("rules")}>
                <Icon name="edit" />
                {t("Regole")}
              </button>
            </div>
            <div className="workspace-help">
              {view === "rules" ? (
                t("Le modifiche aggiornano subito il modello")
              ) : transitionFrom ? (
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
            {view === "canvas" && (
              <div className="zoom-controls">
                <button
                  aria-label={t("Riduci zoom")}
                  title={`${t("Riduci zoom")} (Ctrl −)`}
                  onClick={() => setZoom((value) => stepCanvasZoom(value, "out"))}
                >
                  −
                </button>
                <span aria-live="polite">{Math.round(zoom * 100)}%</span>
                <button
                  aria-label={t("Aumenta zoom")}
                  title={`${t("Aumenta zoom")} (Ctrl +)`}
                  onClick={() => setZoom((value) => stepCanvasZoom(value, "in"))}
                >
                  +
                </button>
              </div>
            )}
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
              onWheel={handleCanvasWheel}
              tabIndex={0}
              aria-label={t(
                "Lavagna interattiva. Usa Ctrl più rotellina oppure Ctrl più o meno per lo zoom.",
              )}
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
            <GuidedDefinitionEditor model={model} definition={definition} onChange={onDefinitionChange} />
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
              const lift = Math.max(30, 92 + (edge.bend ?? 0));
              path = `M ${from.x - 24} ${from.y - 34} C ${from.x - 82} ${from.y - lift}, ${from.x + 82} ${from.y - lift}, ${from.x + 24} ${from.y - 34}`;
              lx = from.x;
              ly = from.y - lift;
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
              const curve = edge.bend ?? Math.min(42, Math.max(22, distance * 0.13));
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
            {node.output !== undefined && <small className="node-output">{node.output}</small>}
            {node.tokens !== undefined && node.tokens > 0 && <b className="token-count">{node.tokens}</b>}
          </span>
        </button>
      ))}
    </>
  );
}

function TransitionFields({
  model,
  edge,
  onUpdate,
}: {
  model: ModelMeta;
  edge: GraphEdge;
  onUpdate: (patch: Partial<GraphEdge>) => void;
}) {
  const { t } = useI18n();
  const values = transitionFieldsFromEdge(model.kind, edge);
  const update = (key: string, value: unknown) => {
    const fields = { ...values, [key]: value };
    onUpdate({ fields, label: transitionLabelFromFields(model.kind, fields) });
  };
  const textValue = (key: string, fallback = "") =>
    Array.isArray(values[key]) ? values[key].map(String).join(" ") : String(values[key] ?? fallback);
  const listValue = (key: string) =>
    Array.isArray(values[key]) ? values[key].map(String).join(" ") : String(values[key] ?? "");
  const listChange = (key: string, raw: string) => update(key, raw.trim() ? raw.trim().split(/\s+/) : []);
  const isPda = model.kind === "pda";
  const isMultiTape = model.kind === "multiTuring";
  const fields: [string, string][] =
    model.kind === "mealy"
      ? [
          ["input", "Ingresso"],
          ["output", "Uscita"],
        ]
      : model.kind === "turing"
        ? [
            ["read", "Simbolo letto"],
            ["write", "Simbolo scritto"],
            ["movement", "Movimento"],
          ]
        : model.kind === "multiTuring"
          ? [
              ["read", "Simboli letti"],
              ["write", "Simboli scritti"],
              ["movements", "Movimenti"],
            ]
          : isPda
            ? [
                ["input", "Ingresso"],
                ["pop", "Rimuovi dalla pila"],
                ["push", "Inserisci nella pila"],
              ]
            : [["symbol", "Simbolo"]];
  return (
    <div className="transition-fields">
      <div className="fixed-connection" aria-label={t("Collegamento fisso")}>
        <span>{edge.from}</span>
        <b aria-hidden="true">→</b>
        <span>{edge.to}</span>
      </div>
      <p className="guided-hint">
        {t("Compila solo i valori: gli operatori e la freccia sono inseriti automaticamente.")}
      </p>
      <div className="transition-field-grid">
        {fields.map(([key, label]) => (
          <label className="rule-field" key={key}>
            <span>{t(label)}</span>
            {key === "movement" ? (
              <select value={textValue(key, "Stay")} onChange={(event) => update(key, event.target.value)}>
                <option>Stay</option>
                <option>Left</option>
                <option>Right</option>
              </select>
            ) : (
              <input
                value={
                  isPda && (key === "pop" || key === "push")
                    ? listValue(key)
                    : isMultiTape
                      ? listValue(key)
                      : textValue(key, key === "input" ? "ε" : "")
                }
                placeholder={
                  (isPda && (key === "pop" || key === "push")) || isMultiTape
                    ? t("Simboli separati da spazio")
                    : undefined
                }
                onChange={(event) =>
                  (isPda && (key === "pop" || key === "push")) || isMultiTape
                    ? listChange(key, event.target.value)
                    : update(key, event.target.value)
                }
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function PetriArcField({
  edge,
  onUpdate,
}: {
  edge: GraphEdge;
  onUpdate: (patch: Partial<GraphEdge>) => void;
}) {
  const { t } = useI18n();
  const value = normalizePetriWeight(edge.label);
  return (
    <label className="rule-field petri-weight-field">
      <span>{t("Peso dell'arco")}</span>
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(event) => onUpdate({ label: String(normalizePetriWeight(event.target.value)) })}
      />
      <small>{t("Inserisci un numero intero positivo.")}</small>
    </label>
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
  onUpdateEdge: (patch: Partial<GraphEdge>) => void;
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
                {(model.kind === "turing" || model.kind === "multiTuring") && (
                  <option value="reject">{t("Stato di rifiuto")}</option>
                )}
              </select>
            </label>
          )}
          {model.kind === "moore" && (
            <label>
              {t("Output")}
              <input
                value={node.output ?? ""}
                onChange={(event) => onUpdateNode({ output: event.target.value })}
              />
            </label>
          )}
          {node.tokens !== undefined && (
            <label>
              {t("Token")}
              <input
                type="number"
                min="0"
                value={node.tokens}
                onChange={(event) => {
                  const tokens = Number(event.target.value);
                  onUpdateNode({ tokens: Number.isSafeInteger(tokens) && tokens >= 0 ? tokens : 0 });
                }}
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
          {model.kind === "petri" ? (
            <PetriArcField edge={edge!} onUpdate={onUpdateEdge} />
          ) : (
            <TransitionFields model={model} edge={edge!} onUpdate={onUpdateEdge} />
          )}
          <label className="bend-control">
            <span>{t("Curvatura della freccia")}</span>
            <input
              type="range"
              min="-160"
              max="160"
              step="4"
              value={edge!.bend ?? 0}
              onChange={(event) => onUpdateEdge({ bend: Number(event.target.value) })}
            />
            <small>{edge!.bend === undefined ? t("Automatica") : String(edge!.bend) + " px"}</small>
          </label>
          <button
            type="button"
            className="secondary-button bend-reset"
            onClick={() => onUpdateEdge({ bend: undefined })}
          >
            {t("Ripristina curvatura automatica")}
          </button>
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
  const theory = theoryForLanguage(model.kind, language);
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
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [onClose]);
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <button autoFocus className="dialog-close" onClick={onClose} aria-label={t("Chiudi")}>
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
                ? t("Download aggiornamento...")
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
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [onClose]);
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="theme-dialog" role="dialog" aria-modal="true" aria-labelledby="theme-title">
        <button autoFocus className="dialog-close" onClick={onClose} aria-label={t("Chiudi")}>
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
