import type { TourDefinition, TourStatus, ToursState } from "./types";

export function emptyState(): ToursState {
  return { tours: {} };
}

/**
 * Accepts whatever the settings API returns (an object, a JSON string, nothing)
 * and keeps only well-formed progress entries.
 */
export function normalizeState(raw: unknown): ToursState {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return emptyState();
    }
  }

  const tours = (value as { tours?: unknown } | null)?.tours;
  if (!tours || typeof tours !== "object") {
    return emptyState();
  }

  const state = emptyState();
  for (const [id, progress] of Object.entries(tours as Record<string, unknown>)) {
    const entry = progress as { version?: unknown; status?: unknown; at?: unknown } | null;
    if (
      typeof entry?.version === "number" &&
      (entry.status === "completed" || entry.status === "dismissed") &&
      typeof entry.at === "string"
    ) {
      state.tours[id] = { version: entry.version, status: entry.status, at: entry.at };
    }
  }

  return state;
}

/** A tour is due unless the user already finished or closed this version of it. */
export function isTourDue(tour: TourDefinition, state: ToursState): boolean {
  const progress = state.tours[tour.id];
  return !progress || progress.version < tour.version;
}

export function recordTour(state: ToursState, tour: TourDefinition, status: TourStatus, now: Date): ToursState {
  return {
    ...state,
    tours: {
      ...state.tours,
      [tour.id]: { version: tour.version, status, at: now.toISOString() },
    },
  };
}
