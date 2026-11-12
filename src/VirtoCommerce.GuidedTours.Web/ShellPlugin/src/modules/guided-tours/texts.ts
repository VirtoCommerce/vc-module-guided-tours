import type { TourText } from "./types";

const languageOf = (tag: string) => tag.split("-")[0];

/**
 * Picks the text for `locale`: the exact tag (any case), then the same language
 * (`de` for `de-DE` and the other way round), then English (`en-US` first), then
 * the first text there is. Empty values never win.
 */
export function resolveText(text: TourText | undefined, locale: string): string {
  const entries = Object.entries(text ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== "")
    .map(([tag, value]) => ({ tag: tag.toLowerCase(), value }));
  if (entries.length === 0) {
    return "";
  }

  const wanted = locale.toLowerCase();
  const language = languageOf(wanted);
  const match =
    entries.find(({ tag }) => tag === wanted) ??
    entries.find(({ tag }) => tag === language) ??
    entries.find(({ tag }) => languageOf(tag) === language) ??
    entries.find(({ tag }) => tag === "en-us") ??
    entries.find(({ tag }) => languageOf(tag) === "en") ??
    entries[0];

  return match.value;
}
