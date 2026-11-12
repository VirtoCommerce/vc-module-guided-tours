import type { TourInfo } from "../api/types";
import { resolveText } from "./text";

export interface TourRow {
  key: string;
  info: TourInfo;
  title: string;
  stepCount: number;
}

/** A conflicting custom tour shares its id with a module tour, so its row key gets a suffix. */
export const rowKey = (info: TourInfo): string =>
  info.source === "custom" && info.isConflicting ? `${info.tour.id}#custom` : info.tour.id;

export function toRows(tours: readonly TourInfo[], language: string | undefined): TourRow[] {
  return tours.map((info) => ({
    key: rowKey(info),
    info,
    title: resolveText(info.tour.title, language),
    stepCount: Array.isArray(info.tour.steps) ? info.tour.steps.length : 0,
  }));
}

export function filterRows(rows: readonly TourRow[], keyword: string | undefined): TourRow[] {
  const words = (keyword ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [...rows];
  }
  return rows.filter((row) => {
    const haystack = [
      row.info.tour.id,
      row.info.tour.appId,
      row.info.moduleId,
      row.info.source === "custom" ? "custom" : "",
      ...Object.values(row.info.tour.title ?? {}),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
