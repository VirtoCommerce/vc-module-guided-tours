import { describe, expect, it } from "vitest";
import { pickLanguage, resolveText, resolveTextEntry, setText, textLanguages } from "./text";

describe("resolveText", () => {
  const text = { "en-US": "Find an order", "de-DE": "Bestellung finden", fr: "Trouver" };

  it("takes the exact language, ignoring case", () => {
    expect(resolveText(text, "de-de")).toBe("Bestellung finden");
  });

  it("falls back to the same language with another region", () => {
    expect(resolveText(text, "de")).toBe("Bestellung finden");
    expect(resolveText(text, "de-AT")).toBe("Bestellung finden");
    expect(resolveText(text, "fr-CA")).toBe("Trouver");
  });

  it("falls back to en-US, then any English, then the first text", () => {
    expect(resolveText(text, "ja-JP")).toBe("Find an order");
    expect(resolveText({ "de-DE": "Hallo", "en-GB": "Hello" }, "ja-JP")).toBe("Hello");
    expect(resolveText({ "de-DE": "Hallo", "fr-FR": "Salut" }, "ja-JP")).toBe("Hallo");
  });

  it("skips empty values so a step never shows empty", () => {
    expect(resolveText({ "de-DE": "", "en-US": "Hello" }, "de-DE")).toBe("Hello");
  });

  it("returns an empty string when there is no text at all", () => {
    expect(resolveText(undefined, "en-US")).toBe("");
    expect(resolveText({}, "en-US")).toBe("");
  });

  it("reports which language it used", () => {
    expect(resolveTextEntry(text, "it-IT")).toEqual({ language: "en-US", value: "Find an order" });
  });
});

describe("pickLanguage", () => {
  it("picks from a language list in the same order as resolveText", () => {
    expect(pickLanguage(["de-DE", "en-US"], "en")).toBe("en-US");
    expect(pickLanguage(["de-DE", "fr-FR"], "en")).toBe("de-DE");
    expect(pickLanguage([], "en")).toBeUndefined();
  });
});

describe("setText", () => {
  it("sets one language without touching the others", () => {
    const text = { "en-US": "Hi" };
    expect(setText(text, "de-DE", "Hallo")).toEqual({ "en-US": "Hi", "de-DE": "Hallo" });
    expect(text).toEqual({ "en-US": "Hi" });
  });

  it("drops a language whose value is cleared", () => {
    expect(setText({ "en-US": "Hi", "de-DE": "Hallo" }, "de-DE", "")).toEqual({ "en-US": "Hi" });
  });
});

describe("textLanguages", () => {
  it("collects every language used in the tour title and steps", () => {
    expect(
      textLanguages({
        title: { "en-US": "T" },
        steps: [{ title: { "de-DE": "S" }, text: { "en-US": "x", fr: "y" } }],
      }).sort(),
    ).toEqual(["de-DE", "en-US", "fr"]);
  });
});
