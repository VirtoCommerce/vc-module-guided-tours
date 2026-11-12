import { watch } from "vue";
import { runTriggeredTour, type TourRenderer } from "./runner";
import type { TourContext, TourDefinition, TourOutcome, TourSource } from "./types";

export const LAUNCH_PARAMETER = "tour";

/** The tour id in `?tour=`, read from the page URL first, then from the router query (hash routes). */
export function launchTourId(search: string, routeQuery: Record<string, unknown> = {}): string | undefined {
  const fromRoute = routeQuery[LAUNCH_PARAMETER];
  const candidates = [
    new URLSearchParams(search).get(LAUNCH_PARAMETER),
    ...(Array.isArray(fromRoute) ? fromRoute : [fromRoute]),
  ];
  return candidates.find((value): value is string => typeof value === "string" && value.trim() !== "")?.trim();
}

export interface LaunchOptions {
  tourId: string;
  source: Pick<TourSource, "loadTour">;
  context: TourContext;
  /** Opens a registered blade by its name. */
  openBlade: (name: string) => Promise<void>;
  createRenderer: () => TourRenderer;
  translate: (key: string, params?: Record<string, unknown>) => string;
  /** How long to wait for the opened trigger blade to show up in the stack, in ms. */
  bladeTimeout?: number;
  /** Lets the UI settle before the first step is measured. */
  settleDelay?: number;
  onError?: (error: unknown) => void;
}

export interface Launch {
  /** Resolves with the outcome, or `undefined` when there was no tour to run. */
  done: Promise<TourOutcome | undefined>;
  stop(): void;
}

const DEFAULT_BLADE_TIMEOUT = 5000;
const DEFAULT_SETTLE_DELAY = 400;

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

function untilBladeOpen(context: TourContext, name: string, timeoutMs: number, signal: AbortSignal): Promise<void> {
  const isOpen = () => context.blades().some((blade) => blade.name === name);
  if (isOpen() || signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      stop();
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const stop = watch(isOpen, (open) => {
      if (open) {
        finish();
      }
    });
    signal.addEventListener("abort", finish);
  });
}

/**
 * Runs one tour on request (`?tour={id}`): whether it is on or off, already seen or not,
 * and whatever its permissions and audience. Records no progress.
 */
export function launchTour(options: LaunchOptions): Launch {
  const { context } = options;
  const controller = new AbortController();
  const { signal } = controller;

  async function openTrigger(tour: TourDefinition) {
    if (!("bladeOpened" in tour.trigger)) {
      return;
    }
    const name = tour.trigger.bladeOpened;
    if (context.blades().some((blade) => blade.name === name)) {
      return;
    }
    try {
      await options.openBlade(name);
    } catch (error) {
      options.onError?.(error);
      return;
    }
    await untilBladeOpen(context, name, options.bladeTimeout ?? DEFAULT_BLADE_TIMEOUT, signal);
  }

  const done = (async () => {
    try {
      const tour = await options.source.loadTour(options.tourId);
      if (!tour || signal.aborted) {
        return undefined;
      }

      await openTrigger(tour);
      await delay(options.settleDelay ?? DEFAULT_SETTLE_DELAY, signal);
      if (signal.aborted) {
        return undefined;
      }

      return await runTriggeredTour(tour, {
        context,
        renderer: options.createRenderer(),
        translate: options.translate,
        signal,
      });
    } catch (error) {
      options.onError?.(error);
      return undefined;
    }
  })();

  return {
    done,
    stop: () => controller.abort(),
  };
}
