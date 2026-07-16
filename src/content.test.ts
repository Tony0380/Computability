import { describe, expect, it } from "vitest";
import { catalogue } from "./catalog";
import { translate, type Language } from "./i18n";
import { theories } from "./theory";
import { theoryInEnglish } from "./theoryEnglish";

const translatedLanguages: Language[] = ["en", "fr", "de", "es", "pt"];

describe("localized model catalogue", () => {
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
