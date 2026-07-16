export const MIN_CANVAS_ZOOM = 0.65;
export const MAX_CANVAS_ZOOM = 1.5;
export const CANVAS_ZOOM_STEP = 0.1;

export function stepCanvasZoom(current: number, direction: "in" | "out") {
  const delta = direction === "in" ? CANVAS_ZOOM_STEP : -CANVAS_ZOOM_STEP;
  const rounded = Math.round((current + delta) * 100) / 100;
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, rounded));
}

export function zoomDirectionFromKey(event: Pick<KeyboardEvent, "key" | "code">) {
  if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") return "in" as const;
  if (event.key === "-" || event.key === "_" || event.code === "NumpadSubtract") return "out" as const;
  return undefined;
}
