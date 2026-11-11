import { afterEach, describe, expect, it } from "vitest";
import { startScheduler, type Scheduler } from "./scheduler";
import { createFakeContext, createFakeRenderer, createMemorySource, flush, translate, until } from "./test-helpers";
import type { TourDefinition, ToursState } from "./types";

let scheduler: Scheduler | undefined;

afterEach(() => {
  scheduler?.stop();
  scheduler = undefined;
  document.body.innerHTML = "";
});

function tour(id: string, overrides: Partial<TourDefinition> = {}): TourDefinition {
  return { id, version: 1, trigger: { appReady: true }, steps: [{ text: id }], ...overrides };
}

function start(tours: TourDefinition[], options: { state?: ToursState; permissions?: string[] } = {}) {
  const fake = createFakeRenderer();
  const { context, blades } = createFakeContext();
  const { source, saved } = createMemorySource(tours, options.state);
  scheduler = startScheduler({
    source,
    context,
    translate,
    hasAccess: (required) => required.length === 0 || required.some((p) => options.permissions?.includes(p)),
    createRenderer: () => fake.renderer,
    settleDelay: 0,
    isBusy: () => false,
    now: () => new Date("2026-11-11T10:00:00.000Z"),
  });
  return { fake, blades, saved };
}

describe("startScheduler", () => {
  it("starts an appReady tour and saves it as completed", async () => {
    const { fake, saved } = start([tour("welcome")]);

    await until(() => fake.views.length === 1);
    fake.press("next");

    await until(() => saved.length === 1);
    expect(saved[0].tours.welcome).toEqual({ version: 1, status: "completed", at: "2026-11-11T10:00:00.000Z" });
  });

  it("saves a closed tour as dismissed", async () => {
    const { fake, saved } = start([tour("welcome")]);

    await until(() => fake.views.length === 1);
    fake.press("close");

    await until(() => saved.length === 1);
    expect(saved[0].tours.welcome.status).toBe("dismissed");
  });

  it("does not start a tour the user already saw in this version", async () => {
    const { fake } = start([tour("welcome")], {
      state: { tours: { welcome: { version: 1, status: "dismissed", at: "" } } },
    });

    await scheduler?.ready;
    await flush();

    expect(fake.views).toHaveLength(0);
  });

  it("skips tours the user has no permission for", async () => {
    const { fake } = start([tour("secret", { permissions: ["order:update"] }), tour("open")], {
      permissions: ["order:read"],
    });

    await until(() => fake.views.length === 1);
    expect(fake.current.text).toBe("open");
  });

  it("waits for the trigger blade, then plays tours one at a time by priority", async () => {
    const { fake, blades, saved } = start([
      tour("low", { trigger: { bladeOpened: "OrdersList" }, priority: 1 }),
      tour("high", { trigger: { bladeOpened: "OrdersList" }, priority: 5 }),
    ]);

    await scheduler?.ready;
    await flush();
    expect(fake.views).toHaveLength(0);

    blades.value = [{ id: "b1", name: "OrdersList" }];

    await until(() => fake.views.length === 1);
    expect(fake.current.text).toBe("high");
    fake.press("next");

    await until(() => fake.views.length === 2);
    expect(fake.current.text).toBe("low");
    fake.press("next");

    await until(() => saved.length === 2);
    expect(Object.keys(saved[1].tours)).toEqual(["high", "low"]);
  });

  it("interrupts without saving when the trigger blade closes, and replays on the next open", async () => {
    const { fake, blades, saved } = start([tour("orders", { trigger: { bladeOpened: "OrdersList" } })]);
    await scheduler?.ready;

    blades.value = [{ id: "b1", name: "OrdersList" }];
    await until(() => fake.views.length === 1);

    blades.value = [];
    await flush();
    expect(fake.hiddenCount).toBe(1);
    expect(saved).toHaveLength(0);

    blades.value = [{ id: "b2", name: "OrdersList" }];
    await until(() => fake.views.length === 2);
    expect(fake.current.text).toBe("orders");
  });
});
