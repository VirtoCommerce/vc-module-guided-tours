/**
 * Where a step points: a `data-tour` anchor name, or a raw CSS selector for markup
 * the declaring module does not own (for example the inside of a UI-kit component).
 */
export type TourTarget = string | { css: string };

/** What the user must do before an action step completes. */
export type TourCondition =
  | { bladeOpened: string }
  | { bladeQueryChanged: string }
  | { routeChanged: true }
  /** With `atLeast`, waits until that many elements match, visible or not (e.g. `input:checked`). */
  | { elementAppears: TourTarget; atLeast?: number }
  | { click: true };

export type TourPlacement = "top" | "right" | "bottom" | "left";

export interface TourStep {
  target?: TourTarget;
  title?: string;
  text: string;
  placement?: TourPlacement;
  /** How long to wait for the target to render, in ms. The step is skipped if it never does. */
  waitFor?: number;
  /** Turns the step into "do it yourself": no Next button, the step ends when `until` holds. */
  action?: {
    until: TourCondition;
    /** After this many ms the user is offered to skip the step. */
    timeout?: number;
  };
}

export type TourTrigger = { appReady: true } | { bladeOpened: string };

export interface TourDefinition {
  id: string;
  version: number;
  moduleId?: string;
  /** ISO date the feature shipped. The server drops the tour for users created after it. */
  publishedAt?: string;
  permissions?: string[];
  priority?: number;
  trigger: TourTrigger;
  steps: TourStep[];
}

export type TourStatus = "completed" | "dismissed";

export interface TourProgress {
  version: number;
  status: TourStatus;
  at: string;
}

export interface ToursState {
  tours: Record<string, TourProgress>;
}

export interface TourSource {
  loadTours(): Promise<TourDefinition[]>;
  loadState(): Promise<ToursState>;
  saveState(state: ToursState): Promise<void>;
}

export interface BladeSnapshot {
  id: string;
  name: string;
  query?: Record<string, string>;
}

/** The parts of the host app a running tour reacts to. Getters must be reactive. */
export interface TourContext {
  blades: () => readonly BladeSnapshot[];
  route: () => string;
}

export type TourOutcome = TourStatus | "interrupted";
