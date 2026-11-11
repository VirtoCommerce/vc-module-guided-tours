import type { TourDefinition, TourSource, ToursState } from "@guided-tours";

const STATE_KEY = "guided-tours-sandbox:state";

const tourFiles = import.meta.glob<TourDefinition>("../tours/sandbox/*.json", { eager: true, import: "default" });

/**
 * The sandbox runs in vc-shell demo mode, where every API call is stubbed out.
 * Tours come from `tours/sandbox/*.json` (the same layout a module ships) and
 * progress lives in localStorage; clear the key to see the tours again.
 */
export function createSandboxSource(): TourSource {
  return {
    loadTours: async () => Object.values(tourFiles),
    loadState: async () => {
      try {
        return JSON.parse(localStorage.getItem(STATE_KEY) ?? "") as ToursState;
      } catch {
        return { tours: {} };
      }
    },
    saveState: async (state) => {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    },
  };
}
