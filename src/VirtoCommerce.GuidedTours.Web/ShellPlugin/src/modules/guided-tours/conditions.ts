import { watch } from "vue";
import { findTarget, selectorOf, waitForTarget } from "./targets";
import type { TourCondition, TourContext, TourTarget } from "./types";

function untilChanged<T>(source: () => T, isDone: (value: T) => boolean, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (done: boolean) => {
      stop();
      signal.removeEventListener("abort", onAbort);
      resolve(done);
    };
    const onAbort = () => finish(false);

    const stop = watch(source, (value) => {
      if (isDone(value)) {
        finish(true);
      }
    });
    signal.addEventListener("abort", onAbort);
  });
}

function untilClicked(target: TourTarget, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const selector = selectorOf(target);

    const finish = (done: boolean) => {
      document.removeEventListener("click", onClick, true);
      signal.removeEventListener("abort", onAbort);
      resolve(done);
    };
    const onAbort = () => finish(false);
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(selector)) {
        finish(true);
      }
    };

    document.addEventListener("click", onClick, true);
    signal.addEventListener("abort", onAbort);
  });
}

/**
 * Waits until at least `count` elements match. Form state such as `:checked` changes
 * without touching the DOM, so user input events trigger a re-check as well as mutations.
 */
function untilCount(target: TourTarget, count: number, signal: AbortSignal): Promise<boolean> {
  const selector = selectorOf(target);
  const reached = () => document.querySelectorAll(selector).length >= count;
  if (reached()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const events = ["change", "input", "click"] as const;
    const finish = (done: boolean) => {
      observer.disconnect();
      events.forEach((name) => document.removeEventListener(name, onEvent, true));
      signal.removeEventListener("abort", onAbort);
      resolve(done);
    };
    const check = () => {
      if (reached()) {
        finish(true);
      }
    };
    const onEvent = () => setTimeout(check);
    const onAbort = () => finish(false);

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    events.forEach((name) => document.addEventListener(name, onEvent, true));
    signal.addEventListener("abort", onAbort);
  });
}

/**
 * Resolves `true` once the user has done what the condition asks, measured from the
 * moment this is called, or `false` if the signal aborts first.
 */
export function waitForCondition(
  condition: TourCondition,
  context: TourContext,
  stepTarget: TourTarget | undefined,
  signal: AbortSignal,
): Promise<boolean> {
  if (signal.aborted) {
    return Promise.resolve(false);
  }

  if ("bladeOpened" in condition) {
    const name = condition.bladeOpened;
    const known = new Set(context.blades().map((blade) => blade.id));
    return untilChanged(
      () => context.blades().filter((blade) => blade.name === name).map((blade) => blade.id),
      (ids) => ids.some((id) => !known.has(id)),
      signal,
    );
  }

  if ("bladeQueryChanged" in condition) {
    const name = condition.bladeQueryChanged;
    const queryOf = () => JSON.stringify(context.blades().find((blade) => blade.name === name)?.query ?? {});
    const initial = queryOf();
    return untilChanged(queryOf, (query) => query !== initial, signal);
  }

  if ("routeChanged" in condition) {
    const initial = context.route();
    return untilChanged(context.route, (route) => route !== initial, signal);
  }

  if ("elementAppears" in condition) {
    const target = condition.elementAppears;
    if (condition.atLeast !== undefined) {
      return untilCount(target, condition.atLeast, signal);
    }
    if (findTarget(target)) {
      return Promise.resolve(true);
    }
    return waitForTarget(target, -1, signal).then((element) => element !== null);
  }

  if (!stepTarget) {
    return Promise.resolve(false);
  }

  return untilClicked(stepTarget, signal);
}
