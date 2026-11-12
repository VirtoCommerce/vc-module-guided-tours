import { describe, expect, it } from "vitest";
import { ApiError, createGuidedToursApi, ProblemsError, type FetchLike } from "./client";
import type { Tour, TourInfo } from "./types";

interface Call {
  url: string;
  method: string;
  body?: unknown;
}

function fakeFetch(respond: (call: Call) => Response) {
  const calls: Call[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    return respond(call);
  };
  return { fetchFn, calls };
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const tour: Tour = {
  id: "orders.workspace",
  version: 1,
  appId: "admin-shell",
  title: { "en-US": "Orders" },
  trigger: { appReady: true },
  steps: [{ text: { "en-US": "Hi" } }],
};

const info: TourInfo = {
  tour,
  source: "custom",
  moduleId: null,
  isEnabled: false,
  isConflicting: false,
  modifiedDate: null,
  modifiedBy: null,
};

describe("createGuidedToursApi", () => {
  it("lists tours, optionally for one app", async () => {
    const { fetchFn, calls } = fakeFetch(() => jsonResponse([info]));
    const api = createGuidedToursApi(fetchFn);

    expect(await api.listTours()).toEqual([info]);
    await api.listTours("admin shell");

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      "GET /api/guided-tours/tours",
      "GET /api/guided-tours/tours?appId=admin%20shell",
    ]);
  });

  it("returns null for a tour that does not exist", async () => {
    const { fetchFn, calls } = fakeFetch(() => new Response("", { status: 404 }));
    const api = createGuidedToursApi(fetchFn);

    expect(await api.getTour("a/b")).toBeNull();
    expect(calls[0].url).toBe("/api/guided-tours/tours/a%2Fb");
  });

  it("sends the tour as JSON on create and update", async () => {
    const { fetchFn, calls } = fakeFetch(() => jsonResponse(info, 201));
    const api = createGuidedToursApi(fetchFn);

    await api.createTour(tour);
    await api.updateTour("old.id", tour);

    expect(calls).toEqual([
      { url: "/api/guided-tours/tours", method: "POST", body: tour },
      { url: "/api/guided-tours/tours/old.id", method: "PUT", body: tour },
    ]);
  });

  it("turns a 400 with problems into a ProblemsError", async () => {
    const problems = [{ path: "steps[1].action.until", message: 'unknown condition "bladeOpend"' }];
    const { fetchFn } = fakeFetch(() => jsonResponse({ problems }, 400));
    const api = createGuidedToursApi(fetchFn);

    const error = await api.createTour({}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProblemsError);
    expect((error as ProblemsError).problems).toEqual(problems);
  });

  it("turns other failures into an ApiError with the status", async () => {
    const { fetchFn } = fakeFetch(() => new Response("Forbidden", { status: 403 }));
    const api = createGuidedToursApi(fetchFn);

    const error = await api.listTours().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(ProblemsError);
    expect((error as ApiError).status).toBe(403);
  });

  it("deletes, copies and switches a tour", async () => {
    const { fetchFn, calls } = fakeFetch((call) =>
      call.method === "POST" ? jsonResponse(info, 201) : new Response(null, { status: 204 }),
    );
    const api = createGuidedToursApi(fetchFn);

    await api.deleteTour("t1");
    expect(await api.copyTour("t1")).toEqual(info);
    await api.setTourEnabled("t1", true);

    expect(calls).toEqual([
      { url: "/api/guided-tours/tours/t1", method: "DELETE", body: undefined },
      { url: "/api/guided-tours/tours/t1/copy", method: "POST", body: undefined },
      { url: "/api/guided-tours/tours/t1/enabled", method: "PUT", body: { isEnabled: true } },
    ]);
  });

  it("reads and writes the global switch", async () => {
    const { fetchFn, calls } = fakeFetch((call) =>
      call.method === "GET" ? jsonResponse({ isEnabled: true }) : new Response(null, { status: 204 }),
    );
    const api = createGuidedToursApi(fetchFn);

    expect(await api.getSettings()).toEqual({ isEnabled: true });
    await api.setSettings({ isEnabled: false });

    expect(calls[1]).toEqual({ url: "/api/guided-tours/settings", method: "PUT", body: { isEnabled: false } });
  });

  it("returns the problems of a validation", async () => {
    const problems = [{ path: "", message: "id is required" }];
    const { fetchFn, calls } = fakeFetch(() => jsonResponse({ problems }));
    const api = createGuidedToursApi(fetchFn);

    expect(await api.validateTour({})).toEqual(problems);
    expect(calls[0]).toMatchObject({ url: "/api/guided-tours/tours/validate", method: "POST" });
  });
});
