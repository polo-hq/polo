import { describe, expect, it } from "vite-plus/test";
import { TextAdapter } from "../../src/sources/text.ts";

describe("TextAdapter.describe()", () => {
  it("describes the single virtual path", () => {
    const adapter = new TextAdapter("hello");
    expect(adapter.describe()).toContain("Inline text source");
    expect(adapter.describe()).toContain("text");
  });
});

describe("TextAdapter.list()", () => {
  it("returns the single readable item", async () => {
    const adapter = new TextAdapter("hello");
    expect(await adapter.list()).toEqual(["text"]);
  });
});

describe("TextAdapter.read()", () => {
  it("reads the inline text", async () => {
    const adapter = new TextAdapter("hello world");
    await expect(adapter.read("text")).resolves.toBe("hello world");
  });

  it("supports empty text", async () => {
    const adapter = new TextAdapter("");
    await expect(adapter.read("text")).resolves.toBe("");
  });

  it("throws on unknown path", async () => {
    const adapter = new TextAdapter("hello");
    await expect(adapter.read("other")).rejects.toThrow(/unknown path/i);
  });
});
