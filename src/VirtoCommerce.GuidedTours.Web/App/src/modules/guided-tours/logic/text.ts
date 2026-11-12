import type { Tour, TourText } from "../api/types";

const primary = (tag: string) => tag.split("-")[0].toLowerCase();

/** The language code from `codes` a user with `locale` sees: exact, same language, English, first. */
export function pickLanguage(codes: readonly string[], locale: string | undefined): string | undefined {
  if (codes.length === 0) {
    return undefined;
  }
  const wanted = (locale ?? "").toLowerCase();
  if (wanted) {
    const exact = codes.find((code) => code.toLowerCase() === wanted);
    if (exact) {
      return exact;
    }
    const sameLanguage = codes.find((code) => primary(code) === primary(wanted));
    if (sameLanguage) {
      return sameLanguage;
    }
  }
  return (
    codes.find((code) => code.toLowerCase() === "en-us") ?? codes.find((code) => primary(code) === "en") ?? codes[0]
  );
}

export interface ResolvedText {
  language: string;
  value: string;
}

export function resolveTextEntry(text: TourText | undefined, locale: string | undefined): ResolvedText | undefined {
  if (!text || typeof text !== "object") {
    return undefined;
  }
  const codes = Object.keys(text).filter((code) => typeof text[code] === "string" && text[code] !== "");
  const language = pickLanguage(codes, locale);
  return language === undefined ? undefined : { language, value: text[language] };
}

export function resolveText(text: TourText | undefined, locale: string | undefined): string {
  return resolveTextEntry(text, locale)?.value ?? "";
}

/** A copy of `text` with `value` for `language`; an empty value removes the language. */
export function setText(text: TourText | undefined, language: string, value: string | undefined): TourText {
  const next: TourText = { ...(text ?? {}) };
  if (value) {
    next[language] = value;
  } else {
    delete next[language];
  }
  return next;
}

export function textLanguages(tour: Partial<Tour> | undefined): string[] {
  const codes = new Set<string>();
  const add = (text: unknown) => {
    if (text && typeof text === "object" && !Array.isArray(text)) {
      Object.keys(text).forEach((code) => codes.add(code));
    }
  };
  add(tour?.title);
  if (Array.isArray(tour?.steps)) {
    for (const step of tour.steps) {
      add(step?.title);
      add(step?.text);
    }
  }
  return [...codes];
}
