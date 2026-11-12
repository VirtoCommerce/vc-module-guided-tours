/** Text per language code, e.g. `{ "en-US": "Find an order", "de-DE": "Bestellung finden" }`. */
export type TourText = Record<string, string>;

/**
 * Where a step points: a `data-tour` anchor name, or a raw CSS selector for markup
 * the declaring module does not own (for example the inside of a UI-kit component).
 * `label` names the target for people reading the tour; the engine ignores it.
 */
export type TourTarget = string | { css: string; label?: string } | { anchor: string; label?: string };

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
  title?: TourText;
  text: TourText;
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
  /** The app the tour runs in. The server fills it in for tours shipped by modules. */
  appId?: string;
  title: TourText;
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

/** One tour as the management API returns it (`GET api/guided-tours/tours/{id}`). */
export interface TourInfo {
  tour: TourDefinition;
  source: "module" | "custom";
  moduleId: string | null;
  isEnabled: boolean;
  isConflicting: boolean;
  modifiedDate: string | null;
  modifiedBy: string | null;
}

export interface TourSource {
  loadTours(): Promise<TourDefinition[]>;
  /** Any tour by id, whether on or off; `undefined` when it does not exist or the user may not see it. */
  loadTour(id: string): Promise<TourDefinition | undefined>;
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
  /** The user's interface language, e.g. `en` or `de-DE`. */
  locale: () => string;
}

export type TourOutcome = TourStatus | "interrupted";
