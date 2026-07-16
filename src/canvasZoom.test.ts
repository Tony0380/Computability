import { describe, expect, it } from "vitest";
import { MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM, stepCanvasZoom, zoomDirectionFromKey } from "./canvasZoom";

describe("canvas zoom interactions", () => {
  it("steps in both directions and respects the limits", () => {
    expect(stepCanvasZoom(1, "in")).toBe(1.1);
    expect(stepCanvasZoom(1, "out")).toBe(0.9);
    expect(stepCanvasZoom(MAX_CANVAS_ZOOM, "in")).toBe(MAX_CANVAS_ZOOM);
    expect(stepCanvasZoom(MIN_CANVAS_ZOOM, "out")).toBe(MIN_CANVAS_ZOOM);
  });

  it("recognizes keyboard and numpad shortcuts", () => {
    expect(zoomDirectionFromKey({ key: "+", code: "Equal" })).toBe("in");
    expect(zoomDirectionFromKey({ key: "=", code: "Equal" })).toBe("in");
    expect(zoomDirectionFromKey({ key: "-", code: "Minus" })).toBe("out");
    expect(zoomDirectionFromKey({ key: "Add", code: "NumpadAdd" })).toBe("in");
    expect(zoomDirectionFromKey({ key: "a", code: "KeyA" })).toBeUndefined();
  });
});
