import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { StepButton, StepView, TourRenderer } from "./runner";

/**
 * driver.js leaves its classes on an element highlighted before when the next step
 * highlights one of its descendants, so `driver-no-interaction` on the old parent
 * would block clicks on the new target (e.g. a table's pager after the table).
 */
function releasePreviousElements(next: HTMLElement | null) {
  document.querySelectorAll(".driver-active-element").forEach((element) => {
    if (element !== next) {
      element.classList.remove("driver-active-element", "driver-no-interaction");
    }
  });
}

const HIGHLIGHT_ANIMATION_MS = 450;

/** Renders steps with driver.js: one overlay, one highlighted element, one popover at a time. */
export function createDriverRenderer(): TourRenderer {
  let instance: Driver | undefined;
  let pending: ((button: StepButton) => void) | undefined;
  let allowed: StepButton[] = [];
  // The popover is placed once; follow the target when it resizes (rows filtered, data loaded).
  // driver.js ignores refresh() until its highlight animation ends, so wait that out.
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => instance?.refresh(), HIGHLIGHT_ANIMATION_MS);
  });

  // Arrow keys and Escape reach these hooks too, so a press counts only if the step shows that button.
  const press = (button: StepButton) => {
    if (!allowed.includes(button)) {
      return;
    }
    const resolve = pending;
    pending = undefined;
    resolve?.(button);
  };

  function ensureDriver(): Driver {
    instance ??= driver({
      animate: true,
      smoothScroll: true,
      allowClose: true,
      allowKeyboardControl: true,
      overlayClickBehavior: () => undefined,
      stagePadding: 6,
      stageRadius: 6,
      onNextClick: () => press("next"),
      onPrevClick: () => press("previous"),
      onCloseClick: () => press("close"),
      onDestroyStarted: () => press("close"),
    });
    return instance;
  }

  return {
    show(view: StepView) {
      allowed = view.buttons;
      releasePreviousElements(view.element);
      resizeObserver.disconnect();
      if (view.element) {
        resizeObserver.observe(view.element);
      }

      return new Promise<StepButton>((resolve) => {
        pending = resolve;
        ensureDriver().highlight({
          element: view.element ?? undefined,
          disableActiveInteraction: !view.interactive,
          popover: {
            title: view.title,
            description: view.text,
            side: view.placement,
            align: "start",
            showButtons: view.buttons,
            showProgress: true,
            progressText: view.progress,
            nextBtnText: view.nextLabel,
            doneBtnText: view.nextLabel,
            prevBtnText: view.previousLabel,
            popoverClass: view.interactive ? "guided-tour guided-tour--action" : "guided-tour",
          },
        });
      });
    },

    hide() {
      pending = undefined;
      allowed = [];
      resizeObserver.disconnect();
      clearTimeout(refreshTimer);
      const current = instance;
      instance = undefined;
      current?.destroy();
    },
  };
}
