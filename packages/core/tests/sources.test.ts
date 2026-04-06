import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { RequiredSourceValueError, createBudge } from "../src/index.ts";

describe("sources", () => {
  test("validates source input schemas before calling resolve", async () => {
    const budge = createBudge();

    const source = budge.source.value(
      z.object({
        encounterId: z.string(),
      }),
      {
        async resolve({ input }) {
          return input.encounterId;
        },
      },
    );

    await expect(
      source.resolve({
        encounterId: 42,
      } as unknown as { encounterId: string }),
    ).rejects.toThrow("Source input validation failed");
  });

  test("validates source output schemas", async () => {
    const budge = createBudge();

    const invalidSource = budge.source.value(
      z.object({
        encounterId: z.string(),
      }),
      {
        output: z.object({
          text: z.string(),
        }),
        async resolve() {
          return { text: 42 } as unknown as { text: string };
        },
      },
    );

    const window = budge.window({
      id: "invalid-source",
      maxTokens: Infinity,
      input: z.object({
        encounterId: z.string(),
      }),
      async compose({ input, use }) {
        const value = await use(invalidSource, { encounterId: input.encounterId });

        return {
          prompt: String(value),
        };
      },
    });

    await expect(
      window.resolve({
        input: {
          encounterId: "enc_123",
        },
      }),
    ).rejects.toThrow("Source output validation failed");
  });

  test("applies output schema transforms to resolved source values", async () => {
    const budge = createBudge();

    const transformedSource = budge.source.value(
      z.object({
        encounterId: z.string(),
      }),
      {
        output: z
          .object({
            text: z.string(),
            internal: z.string(),
          })
          .transform(({ text }) => ({ text })),
        async resolve() {
          return {
            text: "hello",
            internal: "secret",
          };
        },
      },
    );

    const window = budge.window({
      id: "transformed-source",
      maxTokens: Infinity,
      input: z.object({
        encounterId: z.string(),
      }),
      async compose({ input, use }) {
        const value = await use(transformedSource, { encounterId: input.encounterId });

        return {
          prompt: JSON.stringify(value),
        };
      },
    });

    const result = await window.resolve({
      input: {
        encounterId: "enc_123",
      },
    });

    expect(result.prompt).toContain('"text":"hello"');
    expect(result.prompt).not.toContain("secret");
  });

  test("treats use() as required and throws when a source resolves empty", async () => {
    const budge = createBudge();

    const emptySource = budge.source.value(
      z.object({
        encounterId: z.string(),
      }),
      {
        async resolve() {
          return undefined as string | undefined;
        },
      },
    );

    const window = budge.window({
      id: "required-source",
      maxTokens: Infinity,
      input: z.object({
        encounterId: z.string(),
      }),
      async compose({ input, use }) {
        const note = await use(emptySource, { encounterId: input.encounterId });

        return {
          prompt: note,
        };
      },
    });

    await expect(
      window.resolve({
        input: {
          encounterId: "enc_123",
        },
      }),
    ).rejects.toBeInstanceOf(RequiredSourceValueError);
  });
});
