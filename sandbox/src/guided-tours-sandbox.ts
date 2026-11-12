import type { TourDefinition, TourSource, ToursState } from "@guided-tours";

const APP_ID = "sandbox";
const STATE_KEY = "guided-tours-sandbox:state";

const tourFiles = import.meta.glob<TourDefinition>("../tours/sandbox/*.json", { eager: true, import: "default" });
const tours = Object.values(tourFiles).map((tour) => ({ ...tour, appId: APP_ID }));

/**
 * The sandbox runs in vc-shell demo mode, where every API call is stubbed out.
 * Tours come from `tours/sandbox/*.json` (the same layout a module ships, with
 * `appId` filled in from the folder as the server does) and progress lives in
 * localStorage; clear the key to see the tours again. `loadTour` stands in for
 * `GET api/guided-tours/tours/{id}`, so `?tour={id}` works here too.
 */
export function createSandboxSource(): TourSource {
  return {
    loadTours: async () => tours,
    loadTour: async (id) => tours.find((tour) => tour.id === id),
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
