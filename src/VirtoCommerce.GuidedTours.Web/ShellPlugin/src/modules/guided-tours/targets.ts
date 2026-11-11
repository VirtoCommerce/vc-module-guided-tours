import type { TourTarget } from "./types";

export function selectorOf(target: TourTarget): string {
  return typeof target === "string" ? `[data-tour="${target.replace(/["\\]/g, "\\$&")}"]` : target.css;
}

function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected) {
    return false;
  }

  return typeof element.checkVisibility === "function" ? element.checkVisibility() : true;
}

export function findTarget(target: TourTarget, root: ParentNode = document): HTMLElement | null {
  const candidates = root.querySelectorAll<HTMLElement>(selectorOf(target));
  return Array.from(candidates).find(isVisible) ?? null;
}

/**
 * Resolves with the first visible match, or with `null` once `timeoutMs` passes
 * (a negative timeout waits indefinitely) or the signal aborts.
 */
export function waitForTarget(target: TourTarget, timeoutMs: number, signal: AbortSignal): Promise<HTMLElement | null> {
  const found = findTarget(target);
  if (found || signal.aborted) {
    return Promise.resolve(found);
  }

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (element: HTMLElement | null) => {
      observer.disconnect();
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve(element);
    };
    const onAbort = () => finish(null);

    const observer = new MutationObserver(() => {
      const element = findTarget(target);
      if (element) {
        finish(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    signal.addEventListener("abort", onAbort);
    if (timeoutMs >= 0) {
      timer = setTimeout(() => finish(null), timeoutMs);
    }
  });
}
