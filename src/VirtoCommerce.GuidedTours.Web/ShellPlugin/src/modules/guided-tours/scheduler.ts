import { watch } from "vue";
import { runTour, type TourRenderer } from "./runner";
import { isTourDue, recordTour } from "./state";
import type { TourContext, TourDefinition, TourSource, ToursState } from "./types";

export interface SchedulerOptions {
  source: TourSource;
  context: TourContext;
  hasAccess: (permissions: string[]) => boolean;
  createRenderer: () => TourRenderer;
  translate: (key: string, params?: Record<string, unknown>) => string;
  /** Lets the UI settle after a trigger before the first step is measured. */
  settleDelay?: number;
  /** True while something else owns the screen, e.g. a modal dialog. */
  isBusy?: () => boolean;
  now?: () => Date;
  onError?: (error: unknown) => void;
}

export interface Scheduler {
  /** Resolves once tours and progress are loaded and triggers are armed. */
  ready: Promise<void>;
  stop(): void;
}

const DEFAULT_SETTLE_DELAY = 400;

function defaultIsBusy(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]:not(.driver-popover)') !== null;
}

/**
 * Starts due tours when their trigger holds, one at a time. A tour the user finished or
 * closed is saved and never starts again; an interrupted one starts again on its next trigger.
 */
export function startScheduler(options: SchedulerOptions): Scheduler {
  const { source, context } = options;
  const isBusy = options.isBusy ?? defaultIsBusy;
  const now = options.now ?? (() => new Date());

  let stopped = false;
  let state: ToursState = { tours: {} };
  let pending: TourDefinition[] = [];
  let running: AbortController | undefined;
  let starting = false;
  let stopWatch: (() => void) | undefined;

  function triggerBlade(tour: TourDefinition) {
    if (!("bladeOpened" in tour.trigger)) {
      return undefined;
    }
    const name = tour.trigger.bladeOpened;
    return context.blades().find((blade) => blade.name === name);
  }

  function nextTour(): TourDefinition | undefined {
    return pending.find((tour) => "appReady" in tour.trigger || triggerBlade(tour) !== undefined);
  }

  async function play(tour: TourDefinition) {
    const controller = new AbortController();
    running = controller;

    const bladeId = triggerBlade(tour)?.id;
    const stopBladeWatch = bladeId
      ? watch(
          () => context.blades().some((blade) => blade.id === bladeId),
          (open) => {
            if (!open) {
              controller.abort();
            }
          },
        )
      : undefined;

    try {
      const outcome = await runTour(tour, {
        context,
        renderer: options.createRenderer(),
        translate: options.translate,
        signal: controller.signal,
      });

      if (outcome !== "interrupted") {
        pending = pending.filter((candidate) => candidate !== tour);
        state = recordTour(state, tour, outcome, now());
        await source.saveState(state);
      }
    } finally {
      stopBladeWatch?.();
      running = undefined;
    }
  }

  async function evaluate() {
    if (stopped || running || starting) {
      return;
    }

    const tour = nextTour();
    if (!tour) {
      return;
    }

    starting = true;
    await new Promise((resolve) => setTimeout(resolve, options.settleDelay ?? DEFAULT_SETTLE_DELAY));
    starting = false;

    if (stopped || isBusy() || nextTour() !== tour) {
      return;
    }

    try {
      await play(tour);
    } catch (error) {
      options.onError?.(error);
    }

    void evaluate();
  }

  const ready = (async () => {
    try {
      const [tours, loadedState] = await Promise.all([source.loadTours(), source.loadState()]);
      if (stopped) {
        return;
      }

      state = loadedState;
      pending = tours
        .filter((tour) => isTourDue(tour, state) && options.hasAccess(tour.permissions ?? []))
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      stopWatch = watch(
        () => context.blades().map((blade) => blade.id).join("|"),
        () => void evaluate(),
      );
      void evaluate();
    } catch (error) {
      options.onError?.(error);
    }
  })();

  return {
    ready,
    stop() {
      stopped = true;
      stopWatch?.();
      running?.abort();
    },
  };
}
