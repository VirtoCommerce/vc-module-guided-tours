import { describe, expect, it } from "vitest";
import { isTourDue, normalizeState, recordTour } from "./state";
import { en } from "./test-helpers";
import type { TourDefinition } from "./types";

const tour: TourDefinition = {
  id: "orders.basics",
  version: 2,
  title: en("Orders"),
  trigger: { appReady: true },
  steps: [{ text: en("x") }],
};

describe("normalizeState", () => {
  it("reads the state from a JSON string", () => {
    const raw = JSON.stringify({ tours: { a: { version: 1, status: "completed", at: "2026-11-11T00:00:00.000Z" } } });

    expect(normalizeState(raw).tours.a.status).toBe("completed");
  });

  it("returns an empty state for missing or malformed values", () => {
    expect(normalizeState(undefined)).toEqual({ tours: {} });
    expect(normalizeState("{not json")).toEqual({ tours: {} });
    expect(normalizeState({ tours: 5 })).toEqual({ tours: {} });
  });

  it("drops entries that are not valid progress records", () => {
    const state = normalizeState({
      tours: {
        good: { version: 1, status: "dismissed", at: "2026-11-11T00:00:00.000Z" },
        badStatus: { version: 1, status: "started", at: "2026-11-11T00:00:00.000Z" },
        badVersion: { version: "1", status: "completed", at: "2026-11-11T00:00:00.000Z" },
      },
    });

    expect(Object.keys(state.tours)).toEqual(["good"]);
  });
});

describe("isTourDue", () => {
  it("is due when the user has never seen the tour", () => {
    expect(isTourDue(tour, { tours: {} })).toBe(true);
  });

  it("is not due once this version was completed or dismissed", () => {
    expect(isTourDue(tour, { tours: { [tour.id]: { version: 2, status: "completed", at: "" } } })).toBe(false);
    expect(isTourDue(tour, { tours: { [tour.id]: { version: 2, status: "dismissed", at: "" } } })).toBe(false);
  });

  it("is due again after the tour version is raised", () => {
    expect(isTourDue(tour, { tours: { [tour.id]: { version: 1, status: "completed", at: "" } } })).toBe(true);
  });
});

describe("recordTour", () => {
  it("stores the version, outcome and time without touching other tours", () => {
    const before = { tours: { other: { version: 1, status: "completed" as const, at: "earlier" } } };

    const after = recordTour(before, tour, "dismissed", new Date("2026-11-11T10:00:00.000Z"));

    expect(after.tours).toEqual({
      other: before.tours.other,
      [tour.id]: { version: 2, status: "dismissed", at: "2026-11-11T10:00:00.000Z" },
    });
    expect(before.tours).not.toHaveProperty(tour.id);
  });
});
