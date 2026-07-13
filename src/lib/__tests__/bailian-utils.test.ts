import { describe, expect, it } from "vitest";
import { normalizeHeaders } from "@/lib/bailian/utils";

describe("normalizeHeaders", () => {
  it("normalizes SDK object headers", () => {
    expect(normalizeHeaders({ "X-bailian-extra": "abc", "Content-Type": "application/pdf" })).toEqual({
      "X-bailian-extra": "abc",
      "Content-Type": "application/pdf",
    });
  });

  it("normalizes header strings from API examples", () => {
    expect(normalizeHeaders('"X-bailian-extra": "abc",\n "Content-Type": "application/pdf"')).toEqual({
      "X-bailian-extra": "abc",
      "Content-Type": "application/pdf",
    });
  });
});
