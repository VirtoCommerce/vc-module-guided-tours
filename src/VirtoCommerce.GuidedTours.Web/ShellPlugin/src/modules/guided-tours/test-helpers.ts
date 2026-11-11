import { ref } from "vue";
import type { StepButton, StepView, TourRenderer } from "./runner";
import type { BladeSnapshot, TourContext, TourDefinition, TourSource, ToursState } from "./types";

export function createFakeRenderer() {
  const views: StepView[] = [];
  let resolveCurrent: ((button: StepButton) => void) | undefined;
  let hidden = 0;

  const renderer: TourRenderer = {
    show(view) {
      views.push(view);
      return new Promise((resolve) => {
        resolveCurrent = resolve;
      });
    },
    hide() {
      hidden++;
      resolveCurrent = undefined;
    },
  };

  return {
    renderer,
    views,
    get current() {
      return views[views.length - 1];
    },
    get hiddenCount() {
      return hidden;
    },
    press(button: StepButton) {
      const resolve = resolveCurrent;
      resolveCurrent = undefined;
      resolve?.(button);
    },
  };
}

export function createFakeContext() {
  const blades = ref<BladeSnapshot[]>([]);
  const route = ref("/");
  const context: TourContext = {
    blades: () => blades.value,
    route: () => route.value,
  };
  return { context, blades, route };
}

export function createMemorySource(tours: TourDefinition[], state: ToursState = { tours: {} }) {
  const saved: ToursState[] = [];
  const source: TourSource = {
    loadTours: async () => tours,
    loadState: async () => state,
    saveState: async (value) => {
      saved.push(value);
    },
  };
  return { source, saved };
}

export function addAnchor(name: string): HTMLElement {
  const element = document.createElement("div");
  element.dataset.tour = name;
  document.body.append(element);
  return element;
}

export const translate = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}${JSON.stringify(params)}` : key;

/** Lets pending promise callbacks, watchers and MutationObserver records run. */
export async function flush(times = 5) {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Polls until `check` passes, so tests wait on outcomes instead of fixed sleeps. */
export async function until(check: () => boolean, timeoutMs = 1000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Condition not met in time");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
