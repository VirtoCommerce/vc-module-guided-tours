import { waitForCondition } from "./conditions";
import { findTarget, waitForTarget } from "./targets";
import type { TourContext, TourDefinition, TourOutcome, TourPlacement } from "./types";

export type StepButton = "next" | "previous" | "close";

export interface StepView {
  element: HTMLElement | null;
  title?: string;
  text: string;
  placement?: TourPlacement;
  buttons: StepButton[];
  nextLabel: string;
  previousLabel: string;
  progress: string;
  /** The user may click the highlighted element. */
  interactive: boolean;
}

export interface TourRenderer {
  /** Shows a step and resolves with the button the user pressed. Showing another step or hiding never resolves it. */
  show(view: StepView): Promise<StepButton>;
  hide(): void;
}

export interface RunnerOptions {
  context: TourContext;
  renderer: TourRenderer;
  translate: (key: string, params?: Record<string, unknown>) => string;
  signal: AbortSignal;
  defaultWaitFor?: number;
  defaultActionTimeout?: number;
  /** Pause after an action step completes, in ms. */
  actionSettle?: number;
}

const DEFAULT_WAIT_FOR = 5000;
const DEFAULT_ACTION_TIMEOUT = 60000;
const DEFAULT_ACTION_SETTLE = 600;

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  });
}

const never = new Promise<never>(() => undefined);

function whenAborted(signal: AbortSignal): Promise<"aborted"> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve("aborted");
    }
    signal.addEventListener("abort", () => resolve("aborted"), { once: true });
  });
}

/**
 * Plays one tour. Info steps wait for Next/Back; action steps wait until the user does
 * what the step asks. Steps whose target never renders are skipped.
 */
export async function runTour(tour: TourDefinition, options: RunnerOptions): Promise<TourOutcome> {
  const { context, renderer, translate: t, signal } = options;
  const aborted = whenAborted(signal);
  const shownIndexes: number[] = [];
  let index = 0;

  try {
    while (index < tour.steps.length) {
      const step = tour.steps[index];

      let element: HTMLElement | null = null;
      if (step.target) {
        element = findTarget(step.target);
        if (!element) {
          // The previous hint must not stay on screen while the next target renders.
          renderer.hide();
          element = await waitForTarget(step.target, step.waitFor ?? options.defaultWaitFor ?? DEFAULT_WAIT_FOR, signal);
        }
        if (signal.aborted) {
          return "interrupted";
        }
        if (!element) {
          index++;
          continue;
        }
      }

      const isLast = index === tour.steps.length - 1;
      const previousIndex = shownIndexes[shownIndexes.length - 1];
      const canGoBack = previousIndex !== undefined && !tour.steps[previousIndex].action && !step.action;
      const view: StepView = {
        element,
        title: step.title ? t(step.title) : undefined,
        text: t(step.text),
        placement: step.placement,
        buttons: step.action ? ["close"] : [...(canGoBack ? (["previous"] as const) : []), "next", "close"],
        nextLabel: t(isLast ? "GUIDED_TOURS.DONE" : "GUIDED_TOURS.NEXT"),
        previousLabel: t("GUIDED_TOURS.BACK"),
        progress: t("GUIDED_TOURS.PROGRESS", { current: index + 1, total: tour.steps.length }),
        interactive: Boolean(step.action),
      };

      let result: StepButton | "done" | "timeout" | "aborted";
      if (step.action) {
        const conditionMet = waitForCondition(step.action.until, context, step.target, signal).then((met) =>
          met ? ("done" as const) : never,
        );
        const timeout = step.action.timeout ?? options.defaultActionTimeout ?? DEFAULT_ACTION_TIMEOUT;
        const timedOut = delay(timeout, signal).then(() => "timeout" as const);

        result = await Promise.race([renderer.show(view), conditionMet, timedOut, aborted]);
        if (result === "timeout") {
          result = await Promise.race([
            renderer.show({ ...view, buttons: ["next", "close"], nextLabel: t("GUIDED_TOURS.SKIP_STEP") }),
            conditionMet,
            aborted,
          ]);
        }
      } else {
        result = await Promise.race([renderer.show(view), aborted]);
      }

      if (result === "aborted") {
        return "interrupted";
      }
      if (result === "close") {
        return "dismissed";
      }
      if (result === "previous" && previousIndex !== undefined) {
        shownIndexes.pop();
        index = previousIndex;
        continue;
      }

      if (result === "done") {
        // Let the UI react to what the user just did (results, a new blade) before the next hint.
        renderer.hide();
        await delay(options.actionSettle ?? DEFAULT_ACTION_SETTLE, signal);
        if (signal.aborted) {
          return "interrupted";
        }
      }

      shownIndexes.push(index);
      index++;
    }

    return "completed";
  } finally {
    renderer.hide();
  }
}
