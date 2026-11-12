import { describe, expect, it } from "vitest";
import { resolveText } from "./texts";

describe("resolveText", () => {
  it("takes the exact language tag, ignoring case", () => {
    const text = { "en-US": "Find", "de-DE": "Finden", "de-AT": "Suchen" };

    expect(resolveText(text, "de-DE")).toBe("Finden");
    expect(resolveText(text, "de-at")).toBe("Suchen");
    expect(resolveText({ "DE-de": "Finden" }, "de-DE")).toBe("Finden");
  });

  it("matches the same language with or without a region", () => {
    expect(resolveText({ "en-US": "Find", "de-DE": "Finden" }, "de")).toBe("Finden");
    expect(resolveText({ "en-US": "Find", de: "Finden" }, "de-DE")).toBe("Finden");
    expect(resolveText({ "en-US": "Find", "de-AT": "Suchen" }, "de-CH")).toBe("Suchen");
  });

  it("prefers the bare language over another region of it", () => {
    expect(resolveText({ "de-AT": "Suchen", de: "Finden" }, "de-DE")).toBe("Finden");
  });

  it("falls back to English, en-US first", () => {
    expect(resolveText({ "fr-FR": "Trouver", "en-GB": "Find (GB)", "en-US": "Find" }, "ja")).toBe("Find");
    expect(resolveText({ "fr-FR": "Trouver", "en-GB": "Find (GB)" }, "ja")).toBe("Find (GB)");
    expect(resolveText({ "fr-FR": "Trouver", en: "Find" }, "ja")).toBe("Find");
  });

  it("falls back to the first text there is", () => {
    expect(resolveText({ "fr-FR": "Trouver", "es-ES": "Buscar" }, "ja")).toBe("Trouver");
  });

  it("never returns an empty text while another one exists", () => {
    expect(resolveText({ "de-DE": "", "en-US": "Find" }, "de-DE")).toBe("Find");
    expect(resolveText({ "de-DE": "  ", "fr-FR": "Trouver" }, "de")).toBe("Trouver");
  });

  it("returns an empty string when there is no text at all", () => {
    expect(resolveText({}, "en")).toBe("");
    expect(resolveText(undefined, "en")).toBe("");
  });
});
