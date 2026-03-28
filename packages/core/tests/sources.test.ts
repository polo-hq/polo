import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { createPolo } from "../src/index.ts";

const polo = createPolo();
const emptyInputSchema = z.object({});

describe("source inputs", () => {
  test("passes through a call-time input value", async () => {
    const task = polo.define(
      z.object({
        transcript: z.string(),
      }),
      {
        id: "test_input",
        sources: {
          transcript: polo.source.fromInput("transcript"),
        },
      },
    );

    const { context } = await polo.resolve(task, { transcript: "hello world" });
    expect(context.transcript).toBe("hello world");
  });

  test("respects tags option", () => {
    const src = polo.source.fromInput("transcript", { tags: ["phi"] });
    expect(src._tags).toEqual(["phi"]);
  });

  test("defaults tags to empty array", () => {
    const src = polo.source.fromInput("transcript");
    expect(src._tags).toEqual([]);
  });
});

describe("sources", () => {
  test("resolves async value", async () => {
    const task = polo.define(emptyInputSchema, {
      id: "test_source",
      sources: {
        account: polo.source(emptyInputSchema, {
          async resolve() {
            return {
              plan: "enterprise" as const,
              tier: "priority" as const,
            };
          },
        }),
      },
    });

    const { context } = await polo.resolve(task, {});
    expect(context.account).toEqual({ plan: "enterprise", tier: "priority" });
  });
});
