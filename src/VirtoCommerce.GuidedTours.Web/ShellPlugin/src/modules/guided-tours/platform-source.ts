import { normalizeState } from "./state";
import type { TourDefinition, TourInfo, TourSource, ToursState } from "./types";

const MODULE_ID = "VirtoCommerce.GuidedTours";
const STATE_SETTING = "GuidedTours.State";

/** Tours from the module's API, progress in the current user's profile settings. */
export function createPlatformSource(appId: string, getAccessToken: () => Promise<string | null>): TourSource {
  async function send(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await getAccessToken();
    const headers = new Headers(init.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(url, { ...init, headers });
  }

  function ensureOk(response: Response, url: string, init: RequestInit = {}): Response {
    if (!response.ok) {
      throw new Error(`${init.method ?? "GET"} ${url} failed with HTTP ${response.status}`);
    }
    return response;
  }

  async function request(url: string, init: RequestInit = {}): Promise<Response> {
    return ensureOk(await send(url, init), url, init);
  }

  return {
    async loadTours(): Promise<TourDefinition[]> {
      const response = await request(`/api/guided-tours/apps/${encodeURIComponent(appId)}/tours`);
      const tours: unknown = await response.json();
      return Array.isArray(tours) ? (tours as TourDefinition[]) : [];
    },

    async loadTour(id: string): Promise<TourDefinition | undefined> {
      const url = `/api/guided-tours/tours/${encodeURIComponent(id)}`;
      const response = await send(url);
      if (response.status === 403 || response.status === 404) {
        return undefined;
      }
      const info = (await ensureOk(response, url).json()) as TourInfo | null;
      return info?.tour ?? undefined;
    },

    async loadState(): Promise<ToursState> {
      const response = await request(`/api/platform/settings/v2/me/values?moduleId=${encodeURIComponent(MODULE_ID)}`);
      const values = (await response.json()) as Record<string, unknown> | null;
      return normalizeState(values?.[STATE_SETTING]);
    },

    async saveState(state: ToursState): Promise<void> {
      await request("/api/platform/settings/v2/me/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [STATE_SETTING]: JSON.stringify(state) }),
      });
    },
  };
}
