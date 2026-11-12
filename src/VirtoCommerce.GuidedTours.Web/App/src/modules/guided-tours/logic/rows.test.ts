import { describe, expect, it } from "vitest";
import type { TourInfo } from "../api/types";
import { filterRows, rowKey, toRows } from "./rows";

const info = (
  id: string,
  overrides: Partial<TourInfo> = {},
  title: Record<string, string> = { "en-US": `Tour ${id}` },
): TourInfo => ({
  tour: {
    id,
    version: 1,
    appId: "admin-shell",
    title,
    trigger: { appReady: true },
    steps: [{ text: { "en-US": "x" } }],
  },
  source: "module",
  moduleId: "VirtoCommerce.Orders",
  isEnabled: true,
  isConflicting: false,
  modifiedDate: null,
  modifiedBy: null,
  ...overrides,
});

describe("toRows", () => {
  it("shows the title in the picked language and counts the steps", () => {
    const [row] = toRows([info("a", {}, { "en-US": "Orders", "de-DE": "Bestellungen" })], "de-DE");
    expect(row).toMatchObject({ key: "a", title: "Bestellungen", stepCount: 1 });
  });

  it("gives a conflicting custom tour its own key", () => {
    const module = info("a");
    const custom = info("a", { source: "custom", moduleId: null, isConflicting: true });
    expect([rowKey(module), rowKey(custom)]).toEqual(["a", "a#custom"]);
  });
});

describe("filterRows", () => {
  const rows = toRows(
    [
      info("orders.workspace", {}, { "en-US": "Orders workspace", "de-DE": "Bestellungen" }),
      info("demo.returns", { source: "custom", moduleId: null }, { "en-US": "Returns demo" }),
    ],
    "en-US",
  );
  const ids = (keyword: string) => filterRows(rows, keyword).map((row) => row.info.tour.id);

  it("matches the id, a title in any language, the module and the word custom", () => {
    expect(ids("")).toEqual(["orders.workspace", "demo.returns"]);
    expect(ids("bestell")).toEqual(["orders.workspace"]);
    expect(ids("virtocommerce.orders")).toEqual(["orders.workspace"]);
    expect(ids("custom")).toEqual(["demo.returns"]);
    expect(ids("demo RETURNS")).toEqual(["demo.returns"]);
    expect(ids("nothing")).toEqual([]);
  });
});
