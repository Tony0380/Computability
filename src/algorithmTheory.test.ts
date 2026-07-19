import { describe, expect, it } from "vitest";
import { algorithmTheory } from "./algorithmTheory";

const languages = ["it", "en", "fr", "de", "es", "pt"] as const;

describe("algorithm theory catalogue", () => {
  it("documents every executable algorithm in every supported language", () => {
    expect(Object.keys(algorithmTheory)).toHaveLength(14);

    for (const theory of Object.values(algorithmTheory)) {
      expect(theory.procedure).toHaveLength(3);
      for (const language of languages) {
        expect(theory.definition[language].length).toBeGreaterThan(35);
        expect(theory.notation[language].length).toBeGreaterThan(20);
        expect(theory.prerequisites[language].length).toBeGreaterThan(20);
        expect(theory.interpretation[language].length).toBeGreaterThan(25);
        expect(theory.limits[language].length).toBeGreaterThan(25);
        expect(theory.example[language].length).toBeGreaterThan(25);
        for (const step of theory.procedure) expect(step[language].length).toBeGreaterThan(20);
      }
    }
  });
});
