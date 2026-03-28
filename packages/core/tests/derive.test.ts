import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { createPolo } from "../src/index.ts";

const polo = createPolo();
const emptyInputSchema = z.object({});

describe("derive", () => {
  test("merges derived values onto context", async () => {
    const task = polo.define(emptyInputSchema, {
      id: "test_derive",
      sources: {
        account: polo.source(emptyInputSchema, {
          resolve: async () => ({ plan: "enterprise" as const }),
        }),
      },
      derive: ({ context }) => ({
        isEnterprise: context.account.plan === "enterprise",
      }),
    });

    const { context } = await polo.resolve(task, {});
    expect(context.isEnterprise).toBe(true);
  });

  test("derived values are available alongside source data", async () => {
    const task = polo.define(emptyInputSchema, {
      id: "test_derive_coexist",
      sources: {
        user: polo.source(emptyInputSchema, {
          resolve: async () => ({ name: "Alice" }),
        }),
      },
      derive: ({ context }) => ({
        greeting: `Hello, ${context.user.name}`,
      }),
    });

    const { context } = await polo.resolve(task, {});
    expect(context.user?.name).toBe("Alice");
    expect(context.greeting).toBe("Hello, Alice");
  });
});
