import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";
import en from "../locales/en.json";
import type { TourCondition, TourStep } from "../api/types";
import {
  conditionType,
  describeAudience,
  describeCondition,
  describePublishedAt,
  describeStepHeading,
  describeTarget,
  describeTimeout,
  describeTrigger,
  formatTarget,
  type Translate,
} from "./describe";

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } });
const t: Translate = (key, params) => i18n.global.t(key, params ?? {});

const step = (overrides: Partial<TourStep>): TourStep => ({ text: { "en-US": "x" }, ...overrides });

describe("describeTarget", () => {
  it("uses the label first", () => {
    expect(describeTarget({ css: ".search input", label: "search field" })).toEqual({
      kind: "label",
      value: "search field",
    });
    expect(describeTarget({ anchor: "orders-search", label: "search field" })).toEqual({
      kind: "label",
      value: "search field",
    });
  });

  it("falls back to the selector or the data-tour name", () => {
    expect(formatTarget({ css: ".vc-data-table__rows-container" }, t)).toBe(".vc-data-table__rows-container");
    expect(formatTarget("orders-search", t)).toBe('[data-tour="orders-search"]');
    expect(formatTarget({ anchor: "orders-search" }, t)).toBe('[data-tour="orders-search"]');
  });

  it("calls a step without a target centred", () => {
    expect(formatTarget(undefined, t)).toBe("centred");
    expect(formatTarget({ css: "" }, t)).toBe("centred");
  });

  it("quotes a label", () => {
    expect(formatTarget({ css: "input", label: "search field" }, t)).toBe("“search field”");
  });
});

describe("describeStepHeading", () => {
  it("names the kind and what the step points at", () => {
    expect(describeStepHeading(step({}), t)).toBe("Hint · centred");
    expect(
      describeStepHeading(
        step({ target: { css: "input", label: "search field" }, action: { until: { routeChanged: true } } }),
        t,
      ),
    ).toBe("Action · on “search field”");
    expect(describeStepHeading(step({ target: { css: ".vc-widget-container-desktop" } }), t)).toBe(
      "Hint · on .vc-widget-container-desktop",
    );
  });
});

describe("describeCondition", () => {
  const waits = (condition: TourCondition, target?: TourStep["target"]) => describeCondition(condition, target, t);

  it("phrases each condition from its structure, without guessing what the user does", () => {
    expect(waits({ bladeOpened: "OrdersDetails" })).toBe("Waits until blade OrdersDetails opens");
    expect(waits({ bladeQueryChanged: "OrdersList" })).toBe(
      "Waits until the list parameters of OrdersList change (search, sort, page)",
    );
    expect(waits({ routeChanged: true })).toBe("Waits until the route changes");
    expect(waits({ elementAppears: { css: ".toast" } })).toBe("Waits until .toast appears");
    expect(waits({ elementAppears: { css: "input:checked", label: "checked rows" }, atLeast: 2 })).toBe(
      "Waits until at least 2 of “checked rows” appear",
    );
    expect(waits({ click: true })).toBe("Waits for a click on the target");
    expect(waits({ click: true }, { anchor: "save", label: "Save button" })).toBe("Waits for a click on “Save button”");
  });

  it("says so when the condition has a shape it does not know", () => {
    expect(describeCondition({ bladeOpend: "X" } as unknown as TourCondition, undefined, t)).toBe(
      "Waits for a condition this view cannot describe",
    );
    expect(describeCondition(undefined, undefined, t)).toBe("Waits for a condition this view cannot describe");
  });
});

describe("conditionType", () => {
  it("finds the single known key", () => {
    expect(conditionType({ elementAppears: ".a", atLeast: 2 })).toBe("elementAppears");
    expect(conditionType({ click: true, routeChanged: true })).toBeUndefined();
    expect(conditionType({ bladeOpend: "X" })).toBeUndefined();
    expect(conditionType("click")).toBeUndefined();
  });
});

describe("tour header facts", () => {
  it("describes the trigger", () => {
    expect(describeTrigger({ bladeOpened: "OrdersList" }, t)).toBe("blade OrdersList opens");
    expect(describeTrigger({ appReady: true }, t)).toBe("app starts");
  });

  it("describes who sees the tour", () => {
    expect(describeAudience(undefined, t)).toBe("all users");
    expect(describeAudience(["order:read"], t)).toBe("users with order:read");
    expect(describeAudience(["order:read", "order:update"], t)).toBe("users with any of order:read, order:update");
  });

  it("describes the publishedAt rule", () => {
    expect(describePublishedAt("2026-11-01", t)).toBe("users created after 2026-11-01");
    expect(describePublishedAt(undefined, t)).toBeUndefined();
  });

  it("describes the skip offer of a step with a timeout", () => {
    expect(describeTimeout(30000, t)).toBe("offers to skip after 30 s");
    expect(describeTimeout(1500, t)).toBe("offers to skip after 1.5 s");
    expect(describeTimeout(undefined, t)).toBeUndefined();
  });
});
