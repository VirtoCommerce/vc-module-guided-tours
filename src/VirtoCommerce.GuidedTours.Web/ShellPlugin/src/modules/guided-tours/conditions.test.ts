import { afterEach, describe, expect, it } from "vitest";
import { waitForCondition } from "./conditions";
import { findTarget, waitForTarget } from "./targets";
import { addAnchor, createFakeContext, flush } from "./test-helpers";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("targets", () => {
  it("finds a data-tour anchor or a raw CSS selector", () => {
    const anchor = addAnchor("orders.table");
    anchor.innerHTML = '<nav class="pager"><button>2</button></nav>';

    expect(findTarget("orders.table")).toBe(anchor);
    expect(findTarget({ css: '[data-tour="orders.table"] .pager button' })?.textContent).toBe("2");
  });

  it("waits for a target that renders later", async () => {
    const waiting = waitForTarget("late", 1000, new AbortController().signal);

    const anchor = addAnchor("late");

    await expect(waiting).resolves.toBe(anchor);
  });

  it("gives up with null after the timeout or on abort", async () => {
    await expect(waitForTarget("never", 20, new AbortController().signal)).resolves.toBeNull();

    const controller = new AbortController();
    const waiting = waitForTarget("never", -1, controller.signal);
    controller.abort();
    await expect(waiting).resolves.toBeNull();
  });
});

describe("waitForCondition", () => {
  it("bladeOpened: holds when a new blade with that name opens", async () => {
    const { context, blades } = createFakeContext();
    blades.value = [{ id: "1", name: "OrdersList" }];
    let met: boolean | undefined;
    void waitForCondition({ bladeOpened: "OrderDetails" }, context, undefined, new AbortController().signal).then(
      (value) => (met = value),
    );

    blades.value = [...blades.value, { id: "2", name: "OrdersFilter" }];
    await flush();
    expect(met).toBeUndefined();

    blades.value = [...blades.value, { id: "3", name: "OrderDetails" }];
    await flush();
    expect(met).toBe(true);
  });

  it("bladeOpened: a blade that was already open does not count", async () => {
    const { context, blades } = createFakeContext();
    blades.value = [{ id: "1", name: "OrderDetails" }];
    let met: boolean | undefined;
    void waitForCondition({ bladeOpened: "OrderDetails" }, context, undefined, new AbortController().signal).then(
      (value) => (met = value),
    );

    blades.value = [{ id: "1", name: "OrderDetails" }, { id: "2", name: "Other" }];
    await flush();

    expect(met).toBeUndefined();
  });

  it("bladeQueryChanged: holds when the blade's query changes, e.g. the table page", async () => {
    const { context, blades } = createFakeContext();
    blades.value = [{ id: "1", name: "OrdersList", query: { page: "1" } }];
    const waiting = waitForCondition({ bladeQueryChanged: "OrdersList" }, context, undefined, new AbortController().signal);

    blades.value = [{ id: "1", name: "OrdersList", query: { page: "2" } }];

    await expect(waiting).resolves.toBe(true);
  });

  it("routeChanged: holds when the route changes", async () => {
    const { context, route } = createFakeContext();
    const waiting = waitForCondition({ routeChanged: true }, context, undefined, new AbortController().signal);

    route.value = "/orders";

    await expect(waiting).resolves.toBe(true);
  });

  it("elementAppears: holds when the element renders", async () => {
    const { context } = createFakeContext();
    const waiting = waitForCondition({ elementAppears: "toast" }, context, undefined, new AbortController().signal);

    addAnchor("toast");

    await expect(waiting).resolves.toBe(true);
  });

  it("elementAppears with atLeast: waits until enough elements match, including form state", async () => {
    const { context } = createFakeContext();
    const list = addAnchor("rows");
    list.innerHTML = '<input type="checkbox"><input type="checkbox"><input type="checkbox">';
    const boxes = list.querySelectorAll("input");
    let met: boolean | undefined;
    void waitForCondition(
      { elementAppears: { css: "[data-tour='rows'] input:checked" }, atLeast: 2 },
      context,
      undefined,
      new AbortController().signal,
    ).then((value) => (met = value));

    boxes[0].click();
    await flush();
    expect(met).toBeUndefined();

    boxes[2].click();
    await flush();
    expect(met).toBe(true);
  });

  it("click: holds when the user clicks inside the step target, even after a re-render", async () => {
    const { context } = createFakeContext();
    addAnchor("pager").remove();
    const waiting = waitForCondition({ click: true }, context, "pager", new AbortController().signal);

    const rerendered = addAnchor("pager");
    rerendered.innerHTML = "<button>2</button>";
    document.body.click();
    rerendered.querySelector("button")?.click();

    await expect(waiting).resolves.toBe(true);
  });

  it("resolves false when aborted", async () => {
    const { context } = createFakeContext();
    const controller = new AbortController();
    const waiting = waitForCondition({ routeChanged: true }, context, undefined, controller.signal);

    controller.abort();

    await expect(waiting).resolves.toBe(false);
  });
});
