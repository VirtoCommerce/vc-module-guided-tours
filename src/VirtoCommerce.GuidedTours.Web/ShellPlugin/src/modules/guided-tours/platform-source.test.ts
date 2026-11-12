import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlatformSource } from "./platform-source";
import { en } from "./test-helpers";
import type { TourDefinition, TourInfo } from "./types";

const tour: TourDefinition = {
  id: "orders.workspace",
  version: 1,
  appId: "admin-shell",
  title: en("Orders"),
  trigger: { bladeOpened: "OrdersList" },
  steps: [{ text: en("Hello") }],
};

function respond(status: number, body?: unknown) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createPlatformSource().loadTour", () => {
  const source = createPlatformSource("admin-shell", async () => "token");

  it("returns the tour of the TourInfo the API sends, with the bearer token", async () => {
    const info: TourInfo = {
      tour,
      source: "module",
      moduleId: "VirtoCommerce.Orders",
      isEnabled: false,
      isConflicting: false,
      modifiedDate: null,
      modifiedBy: null,
    };
    const fetchMock = respond(200, info);

    await expect(source.loadTour("orders.workspace")).resolves.toEqual(tour);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/guided-tours/tours/orders.workspace");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token");
  });

  it("returns undefined on 404 and 403", async () => {
    respond(404);
    await expect(source.loadTour("missing")).resolves.toBeUndefined();

    respond(403);
    await expect(source.loadTour("forbidden")).resolves.toBeUndefined();
  });

  it("throws on other failures", async () => {
    respond(500);
    await expect(source.loadTour("broken")).rejects.toThrow("HTTP 500");
  });
});
