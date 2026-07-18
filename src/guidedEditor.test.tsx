import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { metaFor } from "./catalog";
import { examples, type Definition } from "./domain";
import { GuidedDefinitionEditor } from "./guidedEditor";
import { I18nProvider } from "./i18n";

function renderEditor(kind: "regularGrammar" | "multiTuring", onChange = vi.fn()) {
  return {
    onChange,
    ...render(
      <I18nProvider language="en" setLanguage={() => undefined}>
        <GuidedDefinitionEditor model={metaFor(kind)} definition={examples[kind]} onChange={onChange} />
      </I18nProvider>,
    ),
  };
}

describe("guided definition editor", () => {
  it("adds regular-grammar productions with an optional next variable", () => {
    const { onChange } = renderEditor("regularGrammar");
    fireEvent.click(screen.getByRole("button", { name: /add rule/i }));
    const next = onChange.mock.calls.at(-1)?.[0] as Definition;
    const production = (next.productions as Record<string, unknown>[]).at(-1);
    expect(production).toEqual({ left: "", terminal: "", next_variable: null });
  });

  it("normalizes every multi-tape transition when the tape count changes", () => {
    const { onChange } = renderEditor("multiTuring");
    const field = screen.getByLabelText("Number of tapes") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "3" } });
    const next = onChange.mock.calls.at(-1)?.[0] as Definition;
    const transition = (next.transitions as Record<string, unknown>[])[0];
    expect(next.tape_count).toBe(3);
    expect(transition.read).toHaveLength(3);
    expect(transition.write).toHaveLength(3);
    expect(transition.movements).toHaveLength(3);
  });

  it("does not write NaN when a numeric field is cleared", () => {
    const { onChange } = renderEditor("multiTuring");
    const field = screen.getByLabelText("Number of tapes");
    fireEvent.change(field, { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
