import { afterEach, describe, expect, it } from "vitest";
import { runTour } from "./runner";
import { addAnchor, createFakeContext, createFakeRenderer, en, flush, translate, until } from "./test-helpers";
import type { TourDefinition, TourStep } from "./types";

afterEach(() => {
  document.body.innerHTML = "";
});

function tourOf(...steps: TourStep[]): TourDefinition {
  return { id: "t", version: 1, title: en("Tour"), trigger: { appReady: true }, steps };
}

function start(tour: TourDefinition, options: { defaultActionTimeout?: number; locale?: string } = {}) {
  const { locale: initialLocale = "en", ...runnerOptions } = options;
  const fake = createFakeRenderer();
  const { context, blades, locale } = createFakeContext();
  locale.value = initialLocale;
  const controller = new AbortController();
  const outcome = runTour(tour, {
    context,
    renderer: fake.renderer,
    translate,
    signal: controller.signal,
    defaultWaitFor: 30,
    actionSettle: 0,
    ...runnerOptions,
  });
  return { fake, blades, locale, controller, outcome };
}

describe("runTour", () => {
  it("walks info steps with Next and completes", async () => {
    addAnchor("a");
    const { fake, outcome } = start(tourOf({ target: "a", text: en("STEP_1") }, { text: en("STEP_2") }));

    await until(() => fake.views.length === 1);
    expect(fake.current).toMatchObject({ text: "STEP_1", buttons: ["next", "close"], interactive: false });
    fake.press("next");

    await until(() => fake.views.length === 2);
    expect(fake.current).toMatchObject({
      element: null,
      text: "STEP_2",
      buttons: ["previous", "next", "close"],
      nextLabel: "GUIDED_TOURS.DONE",
    });
    fake.press("next");

    await expect(outcome).resolves.toBe("completed");
    expect(fake.hiddenCount).toBe(1);
  });

  it("goes back to the previous info step", async () => {
    const { fake, outcome } = start(tourOf({ text: en("STEP_1") }, { text: en("STEP_2") }));

    await until(() => fake.views.length === 1);
    fake.press("next");
    await until(() => fake.views.length === 2);
    fake.press("previous");

    await until(() => fake.views.length === 3);
    expect(fake.current.text).toBe("STEP_1");
    expect(fake.current.buttons).toEqual(["next", "close"]);
    fake.press("close");
    await expect(outcome).resolves.toBe("dismissed");
  });

  it("is dismissed when the user closes it", async () => {
    const { fake, outcome } = start(tourOf({ text: en("STEP_1") }, { text: en("STEP_2") }));

    await until(() => fake.views.length === 1);
    fake.press("close");

    await expect(outcome).resolves.toBe("dismissed");
  });

  it("skips a step whose target never renders", async () => {
    const { fake, outcome } = start(tourOf({ target: "missing", text: en("STEP_1") }, { text: en("STEP_2") }));

    await until(() => fake.views.length === 1);
    expect(fake.current.text).toBe("STEP_2");
    fake.press("next");

    await expect(outcome).resolves.toBe("completed");
  });

  it("hint → user action → hint: an action step has no Next and ends when the user does the action", async () => {
    addAnchor("orders.table");
    const { fake, blades, outcome } = start(
      tourOf(
        { text: en("INTRO") },
        { target: "orders.table", text: en("OPEN_ORDER"), action: { until: { bladeOpened: "OrderDetails" } } },
        { text: en("STATUS") },
      ),
    );

    await until(() => fake.views.length === 1);
    fake.press("next");

    await until(() => fake.views.length === 2);
    expect(fake.current).toMatchObject({ text: "OPEN_ORDER", buttons: ["close"], interactive: true });

    blades.value = [{ id: "b1", name: "OrderDetails" }];

    await until(() => fake.views.length === 3);
    expect(fake.current.text).toBe("STATUS");
    expect(fake.current.buttons).toEqual(["next", "close"]);
    fake.press("next");

    await expect(outcome).resolves.toBe("completed");
  });

  it("offers to skip an action step the user does not do in time", async () => {
    addAnchor("pager");
    const { fake, outcome } = start(
      tourOf(
        { target: "pager", text: en("GO_PAGE_2"), action: { until: { click: true }, timeout: 20 } },
        { text: en("AFTER") },
      ),
    );

    await until(() => fake.views.length === 2);
    expect(fake.current).toMatchObject({ buttons: ["next", "close"], nextLabel: "GUIDED_TOURS.SKIP_STEP" });
    fake.press("next");

    await until(() => fake.views.length === 3);
    expect(fake.current.text).toBe("AFTER");
    fake.press("next");
    await expect(outcome).resolves.toBe("completed");
  });

  it("still accepts the action after the skip offer appears", async () => {
    const pager = addAnchor("pager");
    const { fake, outcome } = start(
      tourOf({ target: "pager", text: en("GO_PAGE_2"), action: { until: { click: true }, timeout: 20 } }),
    );

    await until(() => fake.views.length === 2);
    pager.click();

    await expect(outcome).resolves.toBe("completed");
  });

  it("is interrupted when aborted mid-step", async () => {
    const { fake, controller, outcome } = start(tourOf({ text: en("STEP_1") }));

    await until(() => fake.views.length === 1);
    controller.abort();

    await expect(outcome).resolves.toBe("interrupted");
    expect(fake.hiddenCount).toBe(1);
  });

  it("shows texts in the interface language", async () => {
    const { fake, outcome } = start(
      tourOf({ title: { "en-US": "Find", "de-DE": "Finden" }, text: { "en-US": "Type here", de: "Hier tippen" } }),
      { locale: "de-DE" },
    );

    await until(() => fake.views.length === 1);
    expect(fake.current).toMatchObject({ title: "Finden", text: "Hier tippen" });
    fake.press("close");
    await outcome;
  });

  it("shows the step again when the language changes, and the new view answers", async () => {
    const { fake, locale, outcome } = start(tourOf({ text: { "en-US": "Next one", "de-DE": "Weiter" } }));

    await until(() => fake.views.length === 1);
    expect(fake.current.text).toBe("Next one");

    locale.value = "de";
    await until(() => fake.views.length === 2);
    expect(fake.current.text).toBe("Weiter");

    fake.press("next");
    await expect(outcome).resolves.toBe("completed");
  });

  it("stops following the language once the step is over", async () => {
    const { fake, locale, outcome } = start(tourOf({ text: { "en-US": "One", "de-DE": "Eins" } }));

    await until(() => fake.views.length === 1);
    fake.press("next");
    await expect(outcome).resolves.toBe("completed");

    locale.value = "de";
    await flush();
    expect(fake.views).toHaveLength(1);
  });

  it("points at a data-tour anchor given as an object with a label", async () => {
    const anchor = addAnchor("orders.table");
    const { fake, outcome } = start(
      tourOf({ target: { anchor: "orders.table", label: "orders table" }, text: en("TABLE") }),
    );

    await until(() => fake.views.length === 1);
    expect(fake.current.element).toBe(anchor);
    fake.press("close");
    await outcome;
  });

  it("translates texts and shows progress", async () => {
    const { fake, outcome } = start(tourOf({ title: en("TITLE"), text: en("TEXT") }, { text: en("TEXT_2") }));

    await until(() => fake.views.length === 1);
    expect(fake.current).toMatchObject({
      title: "TITLE",
      text: "TEXT",
      progress: 'GUIDED_TOURS.PROGRESS{"current":1,"total":2}',
    });
    fake.press("close");
    await outcome;
  });
});
