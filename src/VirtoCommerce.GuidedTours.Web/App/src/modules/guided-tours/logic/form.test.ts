import { describe, expect, it } from "vitest";
import type { Tour } from "../api/types";
import {
  addStep,
  emptyTour,
  moveStep,
  parseJson,
  removeStep,
  stepFromForm,
  stepToForm,
  tourFromForm,
  tourToForm,
} from "./form";

const fullTour: Tour = {
  id: "orders.workspace",
  version: 3,
  appId: "admin-shell",
  title: { "en-US": "Orders workspace", "de-DE": "Bestellungen" },
  permissions: ["order:read", "order:update"],
  publishedAt: "2026-11-01",
  priority: 5,
  trigger: { bladeOpened: "OrdersList" },
  steps: [
    { title: { "en-US": "New" }, text: { "en-US": "Find an order" } },
    {
      target: { css: "input[type=search]", label: "search field" },
      text: { "en-US": "Type a customer" },
      placement: "bottom",
      waitFor: 2000,
      action: { until: { bladeQueryChanged: "OrdersList" }, timeout: 30000 },
    },
    {
      target: "orders-table",
      text: { "en-US": "Open it" },
      action: { until: { bladeOpened: "OrdersDetails" } },
    },
    {
      target: { anchor: "rows", label: "rows" },
      text: { "en-US": "Select two" },
      action: { until: { elementAppears: { css: "input:checked" }, atLeast: 2 } },
    },
    { target: { anchor: "save" }, text: { "en-US": "Save" }, action: { until: { click: true } } },
    { text: { "en-US": "Go on" }, action: { until: { routeChanged: true } } },
  ],
};

const roundTrip = (tour: unknown) => tourFromForm(tourToForm(tour));

describe("form round trip", () => {
  it("gives back a tour with every field the format knows", () => {
    expect(roundTrip(fullTour)).toEqual(fullTour);
  });

  it("keeps the field order of the format", () => {
    expect(Object.keys(roundTrip(fullTour))).toEqual([
      "id",
      "version",
      "appId",
      "title",
      "permissions",
      "publishedAt",
      "priority",
      "trigger",
      "steps",
    ]);
    expect(Object.keys((roundTrip(fullTour).steps as object[])[1])).toEqual([
      "target",
      "text",
      "placement",
      "waitFor",
      "action",
    ]);
  });

  it("keeps fields the form does not know about, at every level", () => {
    const tour = {
      ...fullTour,
      future: { a: 1 },
      steps: [
        {
          target: { css: ".x", label: "x", extra: true },
          text: { "en-US": "t" },
          note: "n",
          action: { until: { elementAppears: "row", atLeast: 1, slow: true }, timeout: 5, retry: 2 },
        },
      ],
    };
    expect(roundTrip(tour)).toEqual(tour);
  });

  it("keeps values it cannot show in the form as they were", () => {
    const tour = {
      id: 7,
      version: "2",
      title: "TOURS.TITLE",
      trigger: { bladeOpend: "X" },
      steps: [
        { text: "KEY", target: 42, action: { until: { bladeOpend: "Y" } } },
        { text: { "en-US": "ok" }, action: { until: { elementAppears: ".a", atLeast: "2" } } },
        "not a step",
      ],
    };
    expect(roundTrip(tour)).toEqual(tour);
  });

  it("keeps a malformed steps value", () => {
    expect(roundTrip({ id: "a", steps: "none" })).toEqual({ id: "a", title: {}, steps: "none" });
  });

  it("writes the required id, title and steps even when they are empty", () => {
    expect(roundTrip({})).toEqual({ id: "", title: {}, steps: [] });
  });

  it("round-trips an empty tour", () => {
    expect(roundTrip(emptyTour())).toEqual(emptyTour());
  });
});

describe("editing through the form", () => {
  it("changes the edited fields and nothing else", () => {
    const form = tourToForm(fullTour);
    form.title["fr-FR"] = "Commandes";
    form.triggerKind = "appReady";
    form.steps[1].target.label = "";
    form.steps[1].condition.blade = "ReturnsList";

    const tour = tourFromForm(form) as unknown as Tour;

    expect(tour.title).toEqual({ ...fullTour.title, "fr-FR": "Commandes" });
    expect(tour.trigger).toEqual({ appReady: true });
    expect(tour.steps[1]).toEqual({
      target: { css: "input[type=search]" },
      text: { "en-US": "Type a customer" },
      placement: "bottom",
      waitFor: 2000,
      action: { until: { bladeQueryChanged: "ReturnsList" }, timeout: 30000 },
    });
    expect(tour.publishedAt).toBe("2026-11-01");
    expect(tour.priority).toBe(5);
  });

  it("turns an action into a hint and back without losing the condition", () => {
    const form = tourToForm(fullTour);
    form.steps[1].kind = "hint";
    expect((tourFromForm(form).steps as object[])[1]).not.toHaveProperty("action");

    form.steps[1].kind = "action";
    expect(tourFromForm(form)).toEqual(fullTour);
  });

  it("writes a bare anchor as a string and a labelled one as an object", () => {
    const step = stepToForm({ target: "save", text: { "en-US": "x" } });
    expect(stepFromForm(step)).toEqual({ target: "save", text: { "en-US": "x" } });

    step.target.label = "Save button";
    expect(stepFromForm(step)).toEqual({ target: { anchor: "save", label: "Save button" }, text: { "en-US": "x" } });
  });

  it("drops the target when it is set to nothing", () => {
    const step = stepToForm({ target: { css: ".a" }, text: { "en-US": "x" } });
    step.target.kind = "none";
    expect(stepFromForm(step)).toEqual({ text: { "en-US": "x" } });
  });

  it("drops an empty step title and keeps an empty text for the server to report", () => {
    const step = stepToForm({ title: { "en-US": "t" }, text: { "en-US": "x" } });
    step.title = {};
    step.text = {};
    expect(stepFromForm(step)).toEqual({ text: {} });
  });

  it("writes atLeast only for an element condition that has it", () => {
    const step = stepToForm({ text: { "en-US": "x" }, action: { until: { elementAppears: ".a" } } });
    expect(stepFromForm(step)).toEqual({ text: { "en-US": "x" }, action: { until: { elementAppears: ".a" } } });

    step.condition.atLeast = 3;
    expect(stepFromForm(step)).toEqual({
      text: { "en-US": "x" },
      action: { until: { elementAppears: ".a", atLeast: 3 } },
    });
  });

  it("adds, removes and reorders steps", () => {
    const form = tourToForm(fullTour);
    const ids = () => form.steps.map((step) => step.uid);
    const [first, second] = ids();

    moveStep(form, 0, 1);
    expect(ids().slice(0, 2)).toEqual([second, first]);

    moveStep(form, 0, -1);
    expect(ids().slice(0, 2)).toEqual([second, first]);

    removeStep(form, 0);
    expect(ids()[0]).toBe(first);

    addStep(form);
    expect(form.steps).toHaveLength(fullTour.steps.length);
    expect(stepFromForm(form.steps[form.steps.length - 1])).toEqual({ text: {} });
  });
});

describe("parseJson", () => {
  it("parses valid JSON and reports a syntax error", () => {
    expect(parseJson('{"id":"a"}')).toEqual({ ok: true, value: { id: "a" } });
    expect(parseJson("{").ok).toBe(false);
  });
});
