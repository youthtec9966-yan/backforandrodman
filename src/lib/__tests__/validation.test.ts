import { describe, expect, it } from "vitest";
import { validateDocumentFile } from "@/lib/validation";

describe("validateDocumentFile", () => {
  it("accepts supported document files under their limit", () => {
    expect(validateDocumentFile("handbook.pdf", 12 * 1024 * 1024)).toEqual({
      valid: true,
      message: null,
    });
  });

  it("rejects unsupported file types", () => {
    expect(validateDocumentFile("archive.zip", 1000)).toMatchObject({
      valid: false,
    });
  });

  it("rejects markdown over 10 MB", () => {
    expect(validateDocumentFile("large.md", 11 * 1024 * 1024)).toMatchObject({
      valid: false,
    });
  });
});
