import type { ModelMeta } from "./catalog";
import type { Definition, MachineKind } from "./domain";
import { useI18n } from "./i18n";

type RecordValue = Record<string, unknown>;

const fieldLabels: Record<string, string> = {
  states: "Stati",
  alphabet: "Alfabeto",
  start_state: "Stato iniziale",
  accepting_states: "Stati finali",
  rejecting_states: "Stati di rifiuto",
  transitions: "Funzione di transizione",
  from: "Da",
  to: "A",
  symbol: "Simbolo",
  input: "Ingresso",
  output: "Uscita",
  state_outputs: "Uscite degli stati",
  pop: "Rimuovi dalla pila",
  push: "Inserisci nella pila",
  accept_by_empty_stack: "Accetta a pila vuota",
  max_configurations: "Configurazioni massime",
  read: "Leggi",
  write: "Scrivi",
  movement: "Movimento",
  movements: "Movimenti",
  tape_count: "Numero di nastri",
  variables: "Variabili",
  terminals: "Terminali",
  start_variable: "Variabile iniziale",
  productions: "Produzioni",
  terminal: "Terminale",
  next_variable: "Variabile successiva",
  max_derivations: "Derivazioni massime",
  rules: "Regole",
  left: "Lato sinistro",
  right: "Lato destro",
  expression: "Espressione",
  axiom: "Assioma",
  predecessor: "Predecessore",
  successor: "Successore",
  left_context: "Contesto sinistro",
  right_context: "Contesto destro",
  seed: "Seme casuale",
  alternatives: "Alternative pesate",
  weight: "Peso",
  symbols: "Simboli",
  marking: "Marcatura iniziale",
  id: "Identificatore",
  inputs: "Archi in ingresso",
  outputs: "Archi in uscita",
  place: "Luogo",
};

const descriptions: Record<MachineKind, string> = {
  dfa: "Definisci stati, alfabeto e una transizione per ogni coppia stato-simbolo.",
  nfa: "Aggiungi percorsi alternativi e usa ε per le transizioni spontanee.",
  mealy: "Ogni riga associa ingresso, uscita e stato successivo.",
  moore: "Assegna un’uscita a ogni stato e definisci le transizioni.",
  pda: "Descrivi cosa leggere e quali simboli rimuovere o inserire nella pila.",
  turing: "Compila lettura, scrittura e movimento della testina per ogni regola.",
  multiTuring: "Usa una sequenza di valori per ogni nastro, nello stesso ordine.",
  regularGrammar: "Scrivi produzioni lineari destre con variabile successiva facoltativa.",
  cfg: "Ogni produzione riscrive una variabile in una sequenza di simboli.",
  unrestrictedGrammar: "Entrambi i lati possono contenere sequenze arbitrarie di simboli.",
  regex: "Modifica direttamente l’espressione con un campo dedicato e leggibile.",
  lsystem: "Parti dall’assioma e aggiungi regole di riscrittura parallela.",
  contextualLsystem: "Specifica il simbolo e i contesti che ne abilitano la riscrittura.",
  stochasticLsystem: "Raggruppa alternative pesate sotto lo stesso predecessore.",
  petri: "Imposta i token iniziali e gli archi pesati di ciascun evento.",
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isPrimitiveRecord = (value: RecordValue) =>
  Object.values(value).every((item) => ["string", "number", "boolean"].includes(typeof item));
const tokens = (value: unknown[]) => value.map(String).join(" ");
const untoken = (value: string) => (value.trim() ? value.trim().split(/\s+/) : []);
const labelFor = (key: string) => fieldLabels[key] ?? key.replaceAll("_", " ");

function blankLike(value: unknown): unknown {
  if (typeof value === "string") return "";
  if (typeof value === "number") return 1;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return [];
  if (isRecord(value))
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, blankLike(item)]));
  return "";
}

function templateFor(kind: MachineKind, name: string): RecordValue {
  if (name === "transitions") {
    if (kind === "mealy") return { from: "", input: "", output: "", to: "" };
    if (kind === "pda") return { from: "", input: "ε", pop: [], push: [], to: "" };
    if (kind === "turing") return { from: "", read: "□", write: "□", movement: "Stay", to: "" };
    if (kind === "multiTuring") return { from: "", read: [], write: [], movements: [], to: "" };
    return { from: "", symbol: "", to: "" };
  }
  if (name === "productions") return { left: "", terminal: "", next_variable: "" };
  if (name === "rules") {
    if (kind === "lsystem") return { predecessor: "", successor: [] };
    if (kind === "contextualLsystem")
      return { left_context: [], symbol: "", right_context: [], successor: [] };
    if (kind === "stochasticLsystem") return { predecessor: "", alternatives: [] };
    return { left: kind === "cfg" ? "" : [], right: [] };
  }
  if (name === "alternatives") return { weight: 1, symbols: [] };
  if (name === "inputs" || name === "outputs") return { place: "", weight: 1 };
  return { name: "", value: "" };
}

function rowFormula(kind: MachineKind, key: string, row: RecordValue): string {
  const text = (name: string, fallback = "·") => String(row[name] ?? fallback);
  const list = (name: string) =>
    Array.isArray(row[name]) ? tokens(row[name] as unknown[]) || "ε" : text(name);
  if (key === "transitions") {
    if (kind === "mealy") return `${text("from")} — ${text("input")} / ${text("output")} → ${text("to")}`;
    if (kind === "pda")
      return `${text("from")} — ${text("input", "ε")}, ${list("pop")} → ${list("push")} — ${text("to")}`;
    if (kind === "turing")
      return `${text("from")} — ${text("read", "□")} / ${text("write", "□")}, ${text("movement", "Stay")} → ${text("to")}`;
    if (kind === "multiTuring")
      return `${text("from")} — [${list("read")}] / [${list("write")}] → ${text("to")}`;
    return `${text("from")} — ${text("symbol", "ε")} → ${text("to")}`;
  }
  if (key === "productions")
    return `${text("left")} → ${text("terminal", "ε")}${row.next_variable ? ` ${text("next_variable")}` : ""}`;
  if (key === "rules") {
    if ("predecessor" in row) return `${text("predecessor")} → ${list("successor")}`;
    if ("symbol" in row)
      return `${list("left_context")} < ${text("symbol")} > ${list("right_context")} → ${list("successor")}`;
    return `${list("left")} → ${list("right")}`;
  }
  if (key === "alternatives") return `${text("weight", "1")} × ${list("symbols")}`;
  if (key === "inputs" || key === "outputs") return `${text("place")} × ${text("weight", "1")}`;
  return "";
}

function PrimitiveField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | number | boolean | null;
  onChange: (value: unknown) => void;
}) {
  const { t } = useI18n();
  if (typeof value === "boolean")
    return (
      <label className="rule-toggle">
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
        <span>{t(labelFor(name))}</span>
      </label>
    );
  return (
    <label className="rule-field">
      <span>{t(labelFor(name))}</span>
      <input
        type={typeof value === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={(event) =>
          onChange(typeof value === "number" ? Number(event.target.value) : event.target.value)
        }
        placeholder={name === "next_variable" ? "∅" : undefined}
      />
    </label>
  );
}

function DictionaryEditor({
  name,
  value,
  onChange,
}: {
  name: string;
  value: RecordValue;
  onChange: (value: RecordValue) => void;
}) {
  const { t } = useI18n();
  const entries = Object.entries(value);
  function update(index: number, key: string, nextValue: unknown) {
    onChange(
      Object.fromEntries(
        entries.map(([oldKey, oldValue], item) => (item === index ? [key, nextValue] : [oldKey, oldValue])),
      ),
    );
  }
  return (
    <div className="dictionary-editor">
      {entries.map(([key, item], index) => (
        <div className="dictionary-row" key={`${key}-${index}`}>
          <input
            aria-label={t("Nome")}
            value={key}
            onChange={(event) => update(index, event.target.value, item)}
          />
          <span>→</span>
          <input
            aria-label={t("Valore")}
            type={typeof item === "number" ? "number" : "text"}
            value={String(item)}
            onChange={(event) =>
              update(index, key, typeof item === "number" ? Number(event.target.value) : event.target.value)
            }
          />
          <button
            className="rule-remove"
            aria-label={t("Rimuovi riga")}
            onClick={() => onChange(Object.fromEntries(entries.filter((_, item) => item !== index)))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="rule-add compact"
        onClick={() =>
          onChange({
            ...value,
            [`item${entries.length + 1}`]:
              name === "state_outputs" || typeof entries[0]?.[1] === "string" ? "" : 0,
          })
        }
      >
        + {t("Aggiungi voce")}
      </button>
    </div>
  );
}

function ObjectFields({
  kind,
  value,
  onChange,
}: {
  kind: MachineKind;
  value: RecordValue;
  onChange: (value: RecordValue) => void;
}) {
  return (
    <div className="rule-fields">
      {Object.entries(value).map(([key, item]) => (
        <ValueEditor
          kind={kind}
          name={key}
          value={item}
          key={key}
          nested
          onChange={(next) => onChange({ ...value, [key]: next })}
        />
      ))}
    </div>
  );
}

function ObjectList({
  kind,
  name,
  value,
  onChange,
}: {
  kind: MachineKind;
  name: string;
  value: RecordValue[];
  onChange: (value: RecordValue[]) => void;
}) {
  const { t } = useI18n();
  const sample = value[0] ?? templateFor(kind, name);
  return (
    <div className="rule-list">
      {value.map((row, index) => (
        <article className="rule-row" key={index}>
          <div className="rule-row-head">
            <code>{rowFormula(kind, name, row) || `${t("Regola")} ${index + 1}`}</code>
            <button
              className="rule-remove"
              aria-label={t("Rimuovi regola")}
              onClick={() => onChange(value.filter((_, item) => item !== index))}
            >
              ×
            </button>
          </div>
          <ObjectFields
            kind={kind}
            value={row}
            onChange={(next) => onChange(value.map((item, itemIndex) => (itemIndex === index ? next : item)))}
          />
        </article>
      ))}
      <button className="rule-add" onClick={() => onChange([...value, blankLike(sample) as RecordValue])}>
        + {t("Aggiungi regola")}
      </button>
    </div>
  );
}

function ValueEditor({
  kind,
  name,
  value,
  onChange,
  nested = false,
}: {
  kind: MachineKind;
  name: string;
  value: unknown;
  onChange: (value: unknown) => void;
  nested?: boolean;
}) {
  const { t } = useI18n();
  if (Array.isArray(value)) {
    const structuredLists = new Set([
      "transitions",
      "productions",
      "rules",
      "alternatives",
      "inputs",
      "outputs",
    ]);
    if (!structuredLists.has(name) && value.every((item) => !isRecord(item)))
      return (
        <label className="rule-field token-field">
          <span>{t(labelFor(name))}</span>
          <input
            value={tokens(value)}
            onChange={(event) => onChange(untoken(event.target.value))}
            placeholder="a b c"
          />
          <small>{t("Separa i simboli con uno spazio")}</small>
        </label>
      );
    const rows = value.filter(isRecord);
    return (
      <section className={`nested-rule-set ${nested ? "nested" : ""}`}>
        <div className="nested-rule-title">
          <strong>{t(labelFor(name))}</strong>
          <small>{rows.length}</small>
        </div>
        <ObjectList kind={kind} name={name} value={rows} onChange={onChange} />
      </section>
    );
  }
  if (isRecord(value)) {
    if (isPrimitiveRecord(value)) return <DictionaryEditor name={name} value={value} onChange={onChange} />;
    return <ObjectFields kind={kind} value={value} onChange={onChange} />;
  }
  return <PrimitiveField name={name} value={value as string | number | boolean | null} onChange={onChange} />;
}

export function GuidedDefinitionEditor({
  model,
  definition,
  onChange,
}: {
  model: ModelMeta;
  definition: Definition;
  onChange: (definition: Definition) => void;
}) {
  const { t } = useI18n();
  return (
    <div className={`guided-editor accent-${model.accent}`}>
      <header className="guided-editor-head">
        <div>
          <p className="kicker">{t("Editor guidato")}</p>
          <h2>{t(model.shortName)}</h2>
          <p>{t(descriptions[model.kind])}</p>
        </div>
        <span className="live-definition-status">
          <i /> {t("Modifiche applicate in tempo reale")}
        </span>
      </header>
      <div className="definition-fields">
        {Object.entries(definition).map(([key, value]) => (
          <section className={`definition-card field-${key}`} key={key}>
            <div className="definition-card-title">
              <strong>{t(labelFor(key))}</strong>
              {Array.isArray(value) && <small>{value.length}</small>}
            </div>
            <ValueEditor
              kind={model.kind}
              name={key}
              value={value}
              onChange={(next) => onChange({ ...definition, [key]: next })}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
