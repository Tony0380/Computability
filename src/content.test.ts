import { describe, expect, it } from "vitest";
import { catalogue } from "./catalog";
import { examples, supportsGuidedDefinition } from "./domain";
import { translate, type Language } from "./i18n";
import { theories } from "./theory";
import { theoryInEnglish } from "./theoryEnglish";

const translatedLanguages: Language[] = ["en", "fr", "de", "es", "pt"];

describe("localized model catalogue", () => {
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
    const labels = ["Aree di lavoro aperte", "Editor di regole", "Chiudi area di lavoro", "Editor guidato"];
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
      const englishTheory = theoryInEnglish(model.kind);
      expect(englishTheory.summary).not.toBe(theory.summary);
      expect(englishTheory.components).toHaveLength(theory.components.length);
      expect(englishTheory.notes.length).toBeGreaterThanOrEqual(2);
    }
  });
});
