import { describe, expect, it } from "vitest";
import { launchUrl } from "./launch";

describe("launchUrl", () => {
  it("opens the tour's app with the tour id in the query", () => {
    expect(launchUrl("https://admin.example.com", { id: "orders.workspace", appId: "admin-shell" })).toBe(
      "https://admin.example.com/apps/admin-shell/?tour=orders.workspace",
    );
  });

  it("ignores a trailing slash on the origin and encodes the id", () => {
    expect(launchUrl("https://a.test/", { id: "a b&c", appId: "admin-shell" })).toBe(
      "https://a.test/apps/admin-shell/?tour=a%20b%26c",
    );
  });

  it("has no URL without an id or an app", () => {
    expect(launchUrl("https://a.test", { id: "", appId: "admin-shell" })).toBeUndefined();
    expect(launchUrl("https://a.test", { id: "x" })).toBeUndefined();
  });
});
