import type { TourCondition, TourStep, TourTarget, TourTrigger } from "../api/types";

export type Translate = (key: string, params?: Record<string, unknown>) => string;

const KEY = "GUIDED_TOURS.DESCRIBE";

export type TargetDescription =
  | { kind: "label"; value: string }
  | { kind: "selector"; value: string }
  | { kind: "anchor"; value: string }
  | { kind: "centred" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value !== "";

/** The target's label if it has one, otherwise its selector or anchor name, otherwise "centred". */
export function describeTarget(value: TourTarget | undefined): TargetDescription {
  const target: unknown = value;
  if (nonEmpty(target)) {
    return { kind: "anchor", value: target };
  }
  if (!isRecord(target)) {
    return { kind: "centred" };
  }
  if (nonEmpty(target.label)) {
    return { kind: "label", value: target.label };
  }
  if (nonEmpty(target.css)) {
    return { kind: "selector", value: target.css };
  }
  if (nonEmpty(target.anchor)) {
    return { kind: "anchor", value: target.anchor };
  }
  return { kind: "centred" };
}

export function formatTarget(target: TourTarget | undefined, t: Translate): string {
  const description = describeTarget(target);
  switch (description.kind) {
    case "label":
      return t(`${KEY}.TARGET.LABEL`, { label: description.value });
    case "selector":
      return description.value;
    case "anchor":
      return t(`${KEY}.TARGET.ANCHOR`, { name: description.value });
    case "centred":
      return t(`${KEY}.TARGET.CENTRED`);
  }
}

export type StepKind = "hint" | "action";

export const stepKind = (step: TourStep): StepKind => (step.action ? "action" : "hint");

export function describeStepHeading(step: TourStep, t: Translate): string {
  const kind = t(stepKind(step) === "action" ? `${KEY}.KIND.ACTION` : `${KEY}.KIND.HINT`);
  const target = describeTarget(step.target);
  const where =
    target.kind === "centred"
      ? t(`${KEY}.TARGET.CENTRED`)
      : t(`${KEY}.TARGET.ON`, { target: formatTarget(step.target, t) });
  return `${kind} · ${where}`;
}

export type ConditionType = "bladeOpened" | "bladeQueryChanged" | "routeChanged" | "elementAppears" | "click";

export const CONDITION_TYPES: readonly ConditionType[] = [
  "bladeOpened",
  "bladeQueryChanged",
  "routeChanged",
  "elementAppears",
  "click",
];

/** The single known key of a condition, or undefined when the condition has another shape. */
export function conditionType(condition: unknown): ConditionType | undefined {
  if (!isRecord(condition)) {
    return undefined;
  }
  const keys = Object.keys(condition).filter((key) => key !== "atLeast");
  if (keys.length !== 1) {
    return undefined;
  }
  return CONDITION_TYPES.find((type) => type === keys[0]);
}

/** What an action step waits for, from the condition's structure only. */
export function describeCondition(
  condition: TourCondition | undefined,
  stepTarget: TourTarget | undefined,
  t: Translate,
): string {
  const type = conditionType(condition);
  const value = condition as Record<string, unknown> | undefined;
  switch (type) {
    case "bladeOpened":
      return t(`${KEY}.WAITS.BLADE_OPENED`, { blade: String(value?.bladeOpened) });
    case "bladeQueryChanged":
      return t(`${KEY}.WAITS.BLADE_QUERY_CHANGED`, { blade: String(value?.bladeQueryChanged) });
    case "routeChanged":
      return t(`${KEY}.WAITS.ROUTE_CHANGED`);
    case "elementAppears": {
      const target = formatTarget(value?.elementAppears as TourTarget, t);
      const atLeast = value?.atLeast;
      return typeof atLeast === "number"
        ? t(`${KEY}.WAITS.ELEMENTS_APPEAR`, { count: atLeast, target })
        : t(`${KEY}.WAITS.ELEMENT_APPEARS`, { target });
    }
    case "click":
      return describeTarget(stepTarget).kind === "centred"
        ? t(`${KEY}.WAITS.CLICK`)
        : t(`${KEY}.WAITS.CLICK_ON`, { target: formatTarget(stepTarget, t) });
    default:
      return t(`${KEY}.WAITS.UNKNOWN`);
  }
}

export function describeTimeout(timeout: number | undefined, t: Translate): string | undefined {
  if (typeof timeout !== "number" || timeout <= 0) {
    return undefined;
  }
  return t(`${KEY}.TIMEOUT`, { seconds: Math.round(timeout / 100) / 10 });
}

export function describeTrigger(value: TourTrigger | undefined, t: Translate): string {
  const trigger: unknown = value;
  if (isRecord(trigger) && nonEmpty(trigger.bladeOpened)) {
    return t(`${KEY}.TRIGGER.BLADE_OPENED`, { blade: trigger.bladeOpened });
  }
  if (isRecord(trigger) && trigger.appReady === true) {
    return t(`${KEY}.TRIGGER.APP_READY`);
  }
  return t(`${KEY}.TRIGGER.UNKNOWN`);
}

export function describeAudience(permissions: readonly string[] | undefined, t: Translate): string {
  const list = (permissions ?? []).filter(nonEmpty);
  if (list.length === 0) {
    return t(`${KEY}.AUDIENCE.ALL`);
  }
  if (list.length === 1) {
    return t(`${KEY}.AUDIENCE.ONE`, { permission: list[0] });
  }
  return t(`${KEY}.AUDIENCE.ANY`, { permissions: list.join(", ") });
}

export function describePublishedAt(publishedAt: string | undefined, t: Translate): string | undefined {
  return nonEmpty(publishedAt) ? t(`${KEY}.PUBLISHED_AT`, { date: publishedAt }) : undefined;
}
