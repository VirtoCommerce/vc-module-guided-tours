import type { TourText } from "../api/types";
import { conditionType, type ConditionType } from "./describe";

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is TourText =>
  isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");

const without = (source: Json, keys: readonly string[]): Json =>
  Object.fromEntries(Object.entries(source).filter(([key]) => !keys.includes(key)));

/** The keys in `order` first, then whatever else `rest` carries. A defined `known` value wins over `rest`. */
function ordered(order: readonly string[], known: Json, rest: Json): Json {
  const result: Json = {};
  const pick = (key: string) => (known[key] !== undefined ? known[key] : rest[key]);
  for (const key of [...order, ...Object.keys(known), ...Object.keys(rest)]) {
    const value = pick(key);
    if (!(key in result) && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export type TargetKind = "none" | "anchor" | "css" | "other";

export interface TargetForm {
  kind: TargetKind;
  value: string;
  label: string;
  /** An anchor written as `{ "anchor": … }` rather than a bare string. */
  asObject: boolean;
  rest: Json;
  raw?: unknown;
}

export type ConditionKind = ConditionType | "other";

export interface ConditionForm {
  kind: ConditionKind;
  blade: string;
  element: TargetForm;
  atLeast: number | undefined;
  rest: Json;
  raw?: unknown;
}

export type StepKindForm = "hint" | "action";

export interface StepForm {
  uid: number;
  kind: StepKindForm;
  target: TargetForm;
  title: TourText;
  text: TourText;
  condition: ConditionForm;
  timeout: number | undefined;
  actionRest: Json;
  rest: Json;
}

export type TriggerKind = "none" | "appReady" | "bladeOpened" | "other";

export interface TourForm {
  id: string;
  version: number | undefined;
  appId: string;
  title: TourText;
  permissions: string[];
  triggerKind: TriggerKind;
  triggerBlade: string;
  triggerRest: Json;
  triggerRaw?: unknown;
  steps: StepForm[];
  rest: Json;
}

let nextUid = 1;

export function emptyTarget(): TargetForm {
  return { kind: "none", value: "", label: "", asObject: false, rest: {} };
}

export function targetToForm(target: unknown): TargetForm {
  if (target === undefined) {
    return emptyTarget();
  }
  if (typeof target === "string") {
    return { ...emptyTarget(), kind: "anchor", value: target };
  }
  if (isRecord(target)) {
    const label = typeof target.label === "string" ? target.label : undefined;
    const labelRest = label === undefined && "label" in target ? { label: target.label } : {};
    if (typeof target.css === "string" && !("anchor" in target)) {
      return {
        kind: "css",
        value: target.css,
        label: label ?? "",
        asObject: true,
        rest: { ...without(target, ["css", "label"]), ...labelRest },
      };
    }
    if (typeof target.anchor === "string" && !("css" in target)) {
      return {
        kind: "anchor",
        value: target.anchor,
        label: label ?? "",
        asObject: true,
        rest: { ...without(target, ["anchor", "label"]), ...labelRest },
      };
    }
  }
  return { ...emptyTarget(), kind: "other", raw: target };
}

export function targetFromForm(form: TargetForm): unknown {
  switch (form.kind) {
    case "none":
      return undefined;
    case "other":
      return form.raw;
    case "css":
      return ordered(["css", "label"], { css: form.value, label: form.label || undefined }, form.rest);
    case "anchor":
      if (!form.label && !form.asObject && Object.keys(form.rest).length === 0) {
        return form.value;
      }
      return ordered(["anchor", "label"], { anchor: form.value, label: form.label || undefined }, form.rest);
  }
}

export function emptyCondition(): ConditionForm {
  return { kind: "bladeOpened", blade: "", element: emptyTarget(), atLeast: undefined, rest: {} };
}

export function conditionToForm(condition: unknown): ConditionForm {
  const type = conditionType(condition);
  const value = condition as Json;
  const form = emptyCondition();
  switch (type) {
    case "bladeOpened":
    case "bladeQueryChanged":
      if (typeof value[type] === "string") {
        return { ...form, kind: type, blade: value[type] as string, rest: without(value, [type]) };
      }
      break;
    case "routeChanged":
    case "click":
      if (value[type] === true) {
        return { ...form, kind: type, rest: without(value, [type]) };
      }
      break;
    case "elementAppears": {
      const atLeast = typeof value.atLeast === "number" ? value.atLeast : undefined;
      const restKeys = atLeast === undefined ? ["elementAppears"] : ["elementAppears", "atLeast"];
      return {
        ...form,
        kind: "elementAppears",
        element: targetToForm(value.elementAppears),
        atLeast,
        rest: without(value, restKeys),
      };
    }
  }
  return { ...form, kind: "other", raw: condition };
}

export function conditionFromForm(form: ConditionForm): unknown {
  switch (form.kind) {
    case "other":
      return form.raw;
    case "bladeOpened":
    case "bladeQueryChanged":
      return ordered([form.kind], { [form.kind]: form.blade }, form.rest);
    case "routeChanged":
    case "click":
      return ordered([form.kind], { [form.kind]: true }, form.rest);
    case "elementAppears":
      return ordered(
        ["elementAppears", "atLeast"],
        { elementAppears: targetFromForm(form.element) ?? "", atLeast: form.atLeast },
        form.rest,
      );
  }
}

export function emptyStep(): StepForm {
  return {
    uid: nextUid++,
    kind: "hint",
    target: emptyTarget(),
    title: {},
    text: {},
    condition: emptyCondition(),
    timeout: undefined,
    actionRest: {},
    rest: {},
  };
}

export function stepToForm(step: unknown): StepForm {
  const form = emptyStep();
  if (!isRecord(step)) {
    return { ...form, rest: { __invalid: step } };
  }
  const handled = ["target", "title", "text", "action"];
  const rest = without(step, handled);
  if ("title" in step && !isText(step.title)) {
    rest.title = step.title;
  }
  if ("text" in step && !isText(step.text)) {
    rest.text = step.text;
  }
  if ("target" in step) {
    form.target = targetToForm(step.target);
  }
  if (isText(step.title)) {
    form.title = { ...step.title };
  }
  if (isText(step.text)) {
    form.text = { ...step.text };
  }
  if (isRecord(step.action)) {
    form.kind = "action";
    form.condition = conditionToForm(step.action.until);
    form.timeout = typeof step.action.timeout === "number" ? step.action.timeout : undefined;
    form.actionRest = without(step.action, form.timeout === undefined ? ["until"] : ["until", "timeout"]);
  } else if ("action" in step) {
    rest.action = step.action;
  }
  return { ...form, rest };
}

export function stepFromForm(form: StepForm): unknown {
  if ("__invalid" in form.rest) {
    return form.rest.__invalid;
  }
  const known: Json = {
    target: targetFromForm(form.target),
    title: Object.keys(form.title).length > 0 ? form.title : undefined,
    action:
      form.kind === "action"
        ? ordered(
            ["until", "timeout"],
            { until: conditionFromForm(form.condition), timeout: form.timeout },
            form.actionRest,
          )
        : undefined,
  };
  if (isText(form.text) && (Object.keys(form.text).length > 0 || !("text" in form.rest))) {
    known.text = form.text;
  }
  const rest = { ...form.rest };
  if (known.title !== undefined) {
    delete rest.title;
  }
  if (form.kind === "hint") {
    delete rest.action;
  }
  return ordered(["target", "title", "text", "placement", "waitFor", "action"], known, rest);
}

export function tourToForm(tour: unknown): TourForm {
  const source = isRecord(tour) ? tour : {};
  const handled = ["id", "version", "appId", "title", "permissions", "trigger", "steps"];
  const rest = without(source, handled);
  for (const key of handled) {
    if (key in source) {
      rest[key] = source[key];
    }
  }

  const form: TourForm = {
    id: "",
    version: undefined,
    appId: "",
    title: {},
    permissions: [],
    triggerKind: "none",
    triggerBlade: "",
    triggerRest: {},
    steps: [],
    rest,
  };

  if (typeof source.id === "string") {
    form.id = source.id;
    delete rest.id;
  }
  if (typeof source.version === "number") {
    form.version = source.version;
    delete rest.version;
  }
  if (typeof source.appId === "string") {
    form.appId = source.appId;
    delete rest.appId;
  }
  if (isText(source.title)) {
    form.title = { ...source.title };
    delete rest.title;
  }
  if (Array.isArray(source.permissions) && source.permissions.every((p) => typeof p === "string")) {
    form.permissions = [...source.permissions];
    delete rest.permissions;
  }
  const trigger = source.trigger;
  if (isRecord(trigger) && Object.keys(trigger).length === 1 && trigger.appReady === true) {
    form.triggerKind = "appReady";
    delete rest.trigger;
  } else if (isRecord(trigger) && Object.keys(trigger).length === 1 && typeof trigger.bladeOpened === "string") {
    form.triggerKind = "bladeOpened";
    form.triggerBlade = trigger.bladeOpened;
    delete rest.trigger;
  } else if ("trigger" in source) {
    form.triggerKind = "other";
    form.triggerRaw = trigger;
    delete rest.trigger;
  }
  if (Array.isArray(source.steps)) {
    form.steps = source.steps.map(stepToForm);
    delete rest.steps;
  }
  return form;
}

export function tourFromForm(form: TourForm): Json {
  const triggers: Record<TriggerKind, unknown> = {
    none: undefined,
    appReady: { appReady: true },
    bladeOpened: { bladeOpened: form.triggerBlade },
    other: form.triggerRaw,
  };
  const required = <T>(value: T, isEmpty: boolean, key: string) => (isEmpty && key in form.rest ? undefined : value);

  const known: Json = {
    id: required(form.id, form.id === "", "id"),
    version: form.version,
    appId: form.appId || undefined,
    title: required(form.title, Object.keys(form.title).length === 0, "title"),
    permissions: form.permissions.length > 0 ? form.permissions : undefined,
    trigger: triggers[form.triggerKind],
    steps: required(form.steps.map(stepFromForm), form.steps.length === 0, "steps"),
  };
  return ordered(
    ["id", "version", "appId", "title", "permissions", "publishedAt", "priority", "trigger", "steps"],
    known,
    form.rest,
  );
}

export function addStep(form: TourForm): void {
  form.steps.push(emptyStep());
}

export function removeStep(form: TourForm, index: number): void {
  form.steps.splice(index, 1);
}

export function moveStep(form: TourForm, index: number, delta: -1 | 1): void {
  const to = index + delta;
  if (index < 0 || index >= form.steps.length || to < 0 || to >= form.steps.length) {
    return;
  }
  const [step] = form.steps.splice(index, 1);
  form.steps.splice(to, 0, step);
}

export function emptyTour(appId = "admin-shell"): Json {
  return {
    id: "",
    version: 1,
    appId,
    title: {},
    trigger: { appReady: true },
    steps: [{ text: {} }],
  };
}

export type ParsedJson = { ok: true; value: unknown } | { ok: false; error: string };

export function parseJson(text: string): ParsedJson {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export const toJson = (value: unknown): string => JSON.stringify(value, null, 2);
