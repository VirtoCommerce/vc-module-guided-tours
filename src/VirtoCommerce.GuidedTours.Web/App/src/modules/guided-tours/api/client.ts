import type { GuidedToursSettings, Problem, TourInfo } from "./types";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ProblemsError extends ApiError {
  constructor(readonly problems: Problem[]) {
    super(400, problems.map((problem) => `${problem.path}: ${problem.message}`).join("\n"));
    this.name = "ProblemsError";
  }
}

export interface GuidedToursApi {
  listTours(appId?: string): Promise<TourInfo[]>;
  getTour(id: string): Promise<TourInfo | null>;
  createTour(tour: unknown): Promise<TourInfo>;
  updateTour(id: string, tour: unknown): Promise<TourInfo>;
  deleteTour(id: string): Promise<void>;
  copyTour(id: string): Promise<TourInfo>;
  setTourEnabled(id: string, isEnabled: boolean): Promise<void>;
  validateTour(tour: unknown): Promise<Problem[]>;
  getSettings(): Promise<GuidedToursSettings>;
  setSettings(settings: GuidedToursSettings): Promise<void>;
}

const defaultFetch: FetchLike = (input, init) => globalThis.fetch(input, init);

function isProblemList(value: unknown): value is { problems: Problem[] } {
  return typeof value === "object" && value !== null && Array.isArray((value as { problems?: unknown }).problems);
}

export function createGuidedToursApi(fetchFn: FetchLike = defaultFetch, baseUrl = "/api/guided-tours"): GuidedToursApi {
  const tourUrl = (id: string) => `${baseUrl}/tours/${encodeURIComponent(id)}`;

  async function send(method: string, url: string, body?: unknown): Promise<Response> {
    const init: RequestInit = { method, headers: { Accept: "application/json" } };
    if (body !== undefined) {
      init.headers = { ...init.headers, "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    const response = await fetchFn(url, init);
    if (response.ok) {
      return response;
    }

    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = undefined;
    }
    if (response.status === 400 && isProblemList(payload)) {
      throw new ProblemsError(payload.problems);
    }
    throw new ApiError(response.status, text || `${method} ${url} failed with ${response.status}`);
  }

  async function json<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await send(method, url, body);
    return (await response.json()) as T;
  }

  return {
    listTours: (appId) => json("GET", `${baseUrl}/tours${appId ? `?appId=${encodeURIComponent(appId)}` : ""}`),

    async getTour(id) {
      try {
        return await json<TourInfo>("GET", tourUrl(id));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },

    createTour: (tour) => json("POST", `${baseUrl}/tours`, tour),

    updateTour: (id, tour) => json("PUT", tourUrl(id), tour),

    async deleteTour(id) {
      await send("DELETE", tourUrl(id));
    },

    copyTour: (id) => json("POST", `${tourUrl(id)}/copy`),

    async setTourEnabled(id, isEnabled) {
      await send("PUT", `${tourUrl(id)}/enabled`, { isEnabled });
    },

    async validateTour(tour) {
      const result = await json<{ problems: Problem[] }>("POST", `${baseUrl}/tours/validate`, tour);
      return result.problems;
    },

    getSettings: () => json("GET", `${baseUrl}/settings`),

    async setSettings(settings) {
      await send("PUT", `${baseUrl}/settings`, settings);
    },
  };
}
