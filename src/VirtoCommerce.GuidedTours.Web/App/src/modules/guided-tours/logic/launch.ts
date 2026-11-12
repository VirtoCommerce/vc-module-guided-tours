import type { Tour } from "../api/types";

/** Where the target app starts the tour at once: `{origin}/apps/{appId}/?tour={id}`. */
export function launchUrl(origin: string, tour: Pick<Tour, "id" | "appId">): string | undefined {
  if (!tour.id || !tour.appId) {
    return undefined;
  }
  const base = origin.replace(/\/+$/, "");
  return `${base}/apps/${encodeURIComponent(tour.appId)}/?tour=${encodeURIComponent(tour.id)}`;
}
