export type TourText = Record<string, string>;

export type TourTarget = string | { css: string; label?: string } | { anchor: string; label?: string };

export type TourCondition =
  | { bladeOpened: string }
  | { bladeQueryChanged: string }
  | { routeChanged: true }
  | { elementAppears: TourTarget; atLeast?: number }
  | { click: true };

export type TourPlacement = "top" | "right" | "bottom" | "left";

export interface TourStep {
  target?: TourTarget;
  title?: TourText;
  text: TourText;
  placement?: TourPlacement;
  waitFor?: number;
  action?: {
    until: TourCondition;
    timeout?: number;
  };
}

export type TourTrigger = { appReady: true } | { bladeOpened: string };

export interface Tour {
  id: string;
  version: number;
  appId?: string;
  title: TourText;
  permissions?: string[];
  publishedAt?: string;
  priority?: number;
  trigger: TourTrigger;
  steps: TourStep[];
}

export type TourSource = "module" | "custom";

export interface TourInfo {
  tour: Tour;
  source: TourSource;
  moduleId: string | null;
  isEnabled: boolean;
  isConflicting: boolean;
  modifiedDate: string | null;
  modifiedBy: string | null;
}

export interface Problem {
  path: string;
  message: string;
}

export interface GuidedToursSettings {
  isEnabled: boolean;
}
