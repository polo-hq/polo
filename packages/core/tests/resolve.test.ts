import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { SourceResolutionError, createBudge } from "../src/index.ts";

describe("resolve", () => {
  test("includes the window id when resolve input fails schema validation", async () => {
    const budge = createBudge();

    const window = budge.window({
      id: "validated-window",
      maxTokens: Infinity,
      input: z.object({
        encounterId: z.string(),
      }),
      async compose() {
        return {
          prompt: "ok",
        };
      },
    });

    await expect(
      window.resolve({
        input: {
          encounterId: 42,
        } as unknown as { encounterId: string },
      }),
    ).rejects.toThrow('Input validation failed for context window "validated-window"');
  });

  test("rejects non-string compose results at resolution time", async () => {
    const budge = createBudge();

    const window = budge.window({
      id: "invalid-compose-window",
      maxTokens: Infinity,
      input: z.object({
        encounterId: z.string(),
      }),
      async compose() {
        return {
          prompt: 123 as unknown as string,
        };
      },
    });

    await expect(
      window.resolve({
        input: {
          encounterId: "enc_123",
        },
      }),
    ).rejects.toThrow("compose() must return a string or undefined for prompt.");
  });

  test("rejects non-string system results at resolution time", async () => {
    const budge = createBudge();

    const window = budge.window({
      id: "invalid-system-window",
      maxTokens: Infinity,
      input: z.object({
        encounterId: z.string(),
      }),
      async compose() {
        return {
          system: 123 as unknown as string,
        };
      },
    });

    await expect(
      window.resolve({
        input: {
          encounterId: "enc_123",
        },
      }),
    ).rejects.toThrow("compose() must return a string or undefined for system.");
  });

  test("wraps source failures with source context and a trace", async () => {
    const budge = createBudge();

    const failingSource = budge.source.value(
      z.object({
        encounterId: z.string(),
      }),
      {
        async resolve() {
          throw new Error("db offline");
        },
      },
    );

    const window = budge.window({
      id: "source-error-window",
      maxTokens: Infinity,
      input: z.object({
        encounterId: z.string(),
      }),
      async compose({ input, use }) {
        await use(failingSource, { encounterId: input.encounterId });

        return {
          prompt: "unreachable",
        };
      },
    });

    try {
      await window.resolve({
        input: {
          encounterId: "enc_123",
        },
      });
      throw new Error("Expected window.resolve() to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SourceResolutionError);

      const sourceError = error as SourceResolutionError;
      expect(sourceError.message).toContain("db offline");
      expect(sourceError.sourceId).toBeTruthy();
      expect(sourceError.cause).toBeInstanceOf(Error);
      expect((sourceError.cause as Error).message).toBe("db offline");
      expect(sourceError.trace?.windowId).toBe("source-error-window");
      expect(sourceError.trace?.prompt.totalTokens).toBe(0);
      expect(sourceError.trace?.sources).toHaveLength(0);
    }
  });
});
