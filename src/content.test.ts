import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { catalogue } from "./catalog";
import { examples, supportsGuidedDefinition } from "./domain";
import { hasTranslation, translate, type Language } from "./i18n";
import { guidedEditorTranslationSources } from "./guidedEditor";
import { theories } from "./theory";
import { theoryForLanguage } from "./theoryLocalized";

const translatedLanguages: Language[] = ["en", "fr", "de", "es", "pt"];

describe("localized model catalogue", () => {
  it("defines every literal interface translation in every language", () => {
    const files = ["App.tsx", "guidedEditor.tsx"];
    const sources = new Set<string>();
    for (const file of files) {
      const content = readFileSync(resolve(process.cwd(), "src", file), "utf8");
      for (const match of content.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/gs))
        sources.add(JSON.parse(`"${match[1]}"`));
    }
    const missing: string[] = [];
    for (const language of translatedLanguages)
      for (const source of sources)
        if (!hasTranslation(language, source)) missing.push(`${language}: ${source}`);
    expect(missing).toEqual([]);
  });

  it("defines every dynamic guided-editor translation in every language", () => {
    const missing: string[] = [];
    for (const language of translatedLanguages) {
      for (const source of guidedEditorTranslationSources) {
        if (!hasTranslation(language, source)) missing.push(`${language}: ${source}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("offers a guided editor for every model definition", () => {
    for (const model of catalogue) expect(supportsGuidedDefinition(examples[model.kind])).toBe(true);
  });
  it("translates every model title and description", () => {
    for (const language of translatedLanguages) {
      for (const model of catalogue) {
        expect(translate(language, model.name)).not.toBe(model.name);
        expect(translate(language, model.description)).not.toBe(model.description);
      }
    }
  });

  it("translates the release update action in every language", () => {
    for (const language of translatedLanguages) {
      expect(translate(language, "Nuova versione disponibile")).not.toBe("Nuova versione disponibile");
      expect(translate(language, "Scarica e aggiorna")).not.toBe("Scarica e aggiorna");
    }
  });

  it("translates every custom window control", () => {
    const controls = [
      "Catalogo",
      "Scelta modello",
      "Riduci a icona",
      "Ingrandisci",
      "Ripristina",
      "Chiudi finestra",
    ];
    for (const language of translatedLanguages) {
      for (const control of controls) expect(translate(language, control)).not.toBe(control);
    }
  });

  it("translates workspace tabs and the guided editor", () => {
    const labels = [
      "Aree di lavoro aperte",
      "Editor di regole",
      "Chiudi area di lavoro",
      "Editor guidato",
      "Nuovo simbolo",
      "Aggiungi simbolo",
      "Rimuovi simbolo",
      "Riduci zoom",
      "Aumenta zoom",
      "Variabili",
      "Terminali",
    ];
    for (const language of translatedLanguages) {
      for (const label of labels) expect(translate(language, label)).not.toBe(label);
    }
  });
});

describe("theory catalogue", () => {
  it("contains a complete formal page for every machine", () => {
    for (const model of catalogue) {
      const theory = theories[model.kind];
      expect(theory.tuple).toBeTruthy();
      expect(theory.summary.length).toBeGreaterThan(30);
      expect(theory.components.length).toBeGreaterThanOrEqual(3);
      expect(theory.dynamics).toBeTruthy();
      expect(theory.acceptance).toBeTruthy();
      expect(theory.power).toBeTruthy();
      expect(theory.notes.length).toBeGreaterThanOrEqual(2);
      for (const language of translatedLanguages) {
        const localized = theoryForLanguage(model.kind, language);
        expect(localized.summary).not.toBe(theory.summary);
        expect(localized.components).toHaveLength(theory.components.length);
        expect(localized.dynamics).toBeTruthy();
        expect(localized.acceptance).toBeTruthy();
        expect(localized.power).toBeTruthy();
        expect(localized.notes).toHaveLength(2);
        for (const component of theory.components) {
          expect(hasTranslation(language, component.label)).toBe(true);
        }
      }
    }
  });
});
