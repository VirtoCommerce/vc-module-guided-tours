import { afterEach, describe, expect, it, vi } from "vitest";
import { launchTour, launchTourId, type Launch } from "./launch";
import { createFakeContext, createFakeRenderer, createMemorySource, en, flush, translate, until } from "./test-helpers";
import type { TourDefinition } from "./types";

let launch: Launch | undefined;

afterEach(() => {
  launch?.stop();
  launch = undefined;
  document.body.innerHTML = "";
});

function tour(id: string, overrides: Partial<TourDefinition> = {}): TourDefinition {
  return { id, version: 1, title: en(id), trigger: { appReady: true }, steps: [{ text: en(id) }], ...overrides };
}

function start(
  tourId: string,
  tours: TourDefinition[],
  openBlade: (name: string) => Promise<void> = vi.fn(async () => undefined),
) {
  const fake = createFakeRenderer();
  const { context, blades } = createFakeContext();
  const { source, saved } = createMemorySource(tours);
  const loadTour = vi.spyOn(source, "loadTour");
  const loadTours = vi.spyOn(source, "loadTours");
  const loadState = vi.spyOn(source, "loadState");
  const errors: unknown[] = [];
  launch = launchTour({
    tourId,
    source,
    context,
    openBlade,
    createRenderer: () => fake.renderer,
    translate,
    settleDelay: 0,
    bladeTimeout: 50,
    onError: (error) => errors.push(error),
  });
  return { fake, blades, saved, openBlade, loadTour, loadTours, loadState, errors, done: launch.done };
}

describe("launchTourId", () => {
  it("reads the id from the page query", () => {
    expect(launchTourId("?tour=orders.workspace")).toBe("orders.workspace");
  });

  it("reads the id from the router query of a hash route", () => {
    expect(launchTourId("", { tour: "orders.workspace" })).toBe("orders.workspace");
    expect(launchTourId("", { tour: ["orders.workspace"] })).toBe("orders.workspace");
  });

  it("is undefined without the parameter or with an empty one", () => {
    expect(launchTourId("?other=1", {})).toBeUndefined();
    expect(launchTourId("?tour=", { tour: " " })).toBeUndefined();
    expect(launchTourId("", { tour: null })).toBeUndefined();
  });
});

describe("launchTour", () => {
  it("fetches the tour by id and runs it at once without saving progress", async () => {
    const { fake, saved, loadTour, loadTours, loadState, done } = start("welcome", [tour("welcome")]);

    await until(() => fake.views.length === 1);
    expect(loadTour).toHaveBeenCalledWith("welcome");
    expect(fake.current.text).toBe("welcome");
    fake.press("next");

    await expect(done).resolves.toBe("completed");
    expect(saved).toHaveLength(0);
    expect(loadTours).not.toHaveBeenCalled();
    expect(loadState).not.toHaveBeenCalled();
  });

  it("runs a tour regardless of its permissions and audience", async () => {
    const restricted = tour("secret", { permissions: ["nobody:has-this"], publishedAt: "2000-01-01" });
    const { fake, done } = start("secret", [restricted]);

    await until(() => fake.views.length === 1);
    fake.press("close");

    await expect(done).resolves.toBe("dismissed");
  });

  it("does nothing when the tour is not found or not allowed", async () => {
    const { fake, openBlade, saved, done } = start("missing", [tour("welcome")]);

    await expect(done).resolves.toBeUndefined();
    await flush();
    expect(fake.views).toHaveLength(0);
    expect(openBlade).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it("opens the trigger blade by name when it is not open, then runs the tour", async () => {
    const openBlade = vi.fn(async (name: string) => {
      blades.value = [{ id: "b1", name }];
    });
    const { fake, blades, done } = start(
      "orders",
      [tour("orders", { trigger: { bladeOpened: "OrdersList" } })],
      openBlade,
    );

    await until(() => fake.views.length === 1);
    expect(openBlade).toHaveBeenCalledWith("OrdersList");
    fake.press("next");

    await expect(done).resolves.toBe("completed");
  });

  it("does not open the trigger blade again when it is already open", async () => {
    const { source } = createMemorySource([tour("orders", { trigger: { bladeOpened: "OrdersList" } })]);
    const fake = createFakeRenderer();
    const { context, blades } = createFakeContext();
    blades.value = [{ id: "b1", name: "OrdersList" }];
    const openBlade = vi.fn(async () => undefined);
    launch = launchTour({
      tourId: "orders",
      source,
      context,
      openBlade,
      createRenderer: () => fake.renderer,
      translate,
      settleDelay: 0,
    });

    await until(() => fake.views.length === 1);
    expect(openBlade).not.toHaveBeenCalled();
    fake.press("close");
    await launch.done;
  });

  it("is interrupted when the trigger blade closes", async () => {
    const openBlade = vi.fn(async (name: string) => {
      blades.value = [{ id: "b1", name }];
    });
    const { fake, blades, saved, done } = start(
      "orders",
      [tour("orders", { trigger: { bladeOpened: "OrdersList" } })],
      openBlade,
    );

    await until(() => fake.views.length === 1);
    blades.value = [];

    await expect(done).resolves.toBe("interrupted");
    expect(saved).toHaveLength(0);
  });

  it("still runs the tour when the trigger blade cannot be opened, and reports why", async () => {
    const failure = new Error("[BladeStack] Blade 'OrdersList' not found in registry");
    const openBlade = vi.fn(async () => {
      throw failure;
    });
    const { fake, errors, done } = start(
      "orders",
      [tour("orders", { trigger: { bladeOpened: "OrdersList" } })],
      openBlade,
    );

    await until(() => fake.views.length === 1);
    expect(errors).toEqual([failure]);
    fake.press("close");
    await expect(done).resolves.toBe("dismissed");
  });

  it("reports a failed fetch and shows nothing", async () => {
    const fake = createFakeRenderer();
    const { context } = createFakeContext();
    const failure = new Error("GET /api/guided-tours/tours/x failed with HTTP 500");
    const errors: unknown[] = [];
    launch = launchTour({
      tourId: "x",
      source: { loadTour: () => Promise.reject(failure) },
      context,
      openBlade: async () => undefined,
      createRenderer: () => fake.renderer,
      translate,
      onError: (error) => errors.push(error),
    });

    await expect(launch.done).resolves.toBeUndefined();
    expect(errors).toEqual([failure]);
    expect(fake.views).toHaveLength(0);
  });
});
