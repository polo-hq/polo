import { describe, expect, test } from "vite-plus/test";
import { serialize } from "../src/pack.ts";

describe("serialize", () => {
  test("strings pass through unchanged", () => {
    expect(serialize("hello world")).toBe("hello world");
  });

  test("strings with label are prefixed", () => {
    expect(serialize("hello", "msg")).toBe("msg:\nhello");
  });

  test("null returns empty string", () => {
    expect(serialize(null)).toBe("");
  });

  test("undefined returns empty string", () => {
    expect(serialize(undefined)).toBe("");
  });

  test("objects are TOON-encoded", () => {
    const result = serialize({ name: "Alice", plan: "enterprise" });
    expect(result).not.toBe('{"name":"Alice","plan":"enterprise"}');
    expect(result.length).toBeLessThan(
      JSON.stringify({ name: "Alice", plan: "enterprise" }).length,
    );
  });

  test("objects with label add section header", () => {
    const result = serialize({ id: "1" }, "account");
    expect(result.startsWith("account:\n")).toBe(true);
  });

  test("arrays of uniform objects encode compactly", () => {
    const rows = [
      { id: "t1", subject: "Auth issue", score: 0.9 },
      { id: "t2", subject: "Billing", score: 0.8 },
    ];
    const toon = serialize(rows);
    const json = JSON.stringify(rows);
    expect(toon.length).toBeLessThan(json.length);
  });

  test("arrays with label add section header", () => {
    const result = serialize([{ id: "1" }], "tickets");
    expect(result.startsWith("tickets:\n")).toBe(true);
  });

  test("numbers and booleans are encoded", () => {
    expect(serialize(42)).not.toBe("");
    expect(serialize(true)).not.toBe("");
  });
});
