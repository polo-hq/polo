import { describe, expect, test, vi } from "vite-plus/test";
import { z } from "zod";
import { createBudge } from "../src/index.ts";

describe("trace", () => {
  test("emits trace to the result and onTrace callback", async () => {
    const onTrace = vi.fn();
    const budge = createBudge({ onTrace });

    const encounterSource = budge.source.value(
      z.object({
        encounterId: z.string(),
      }),
      {
        async resolve({ input }) {
          return {
            id: input.encounterId,
            status: "ready" as const,
          };
        },
      },
    );

    const window = budge.window({
      id: "trace-window",
      maxTokens: Infinity,
      input: z.object({
        encounterId: z.string(),
      }),
      async compose({ input, use }) {
        const encounter = await use(encounterSource, { encounterId: input.encounterId });

        return {
          system: `Status: ${encounter.status}`,
          prompt: `Encounter:\n${encounter}`,
        };
      },
    });

    const result = await window.resolve({
      input: {
        encounterId: "enc_123",
      },
    });

    expect(onTrace).toHaveBeenCalledTimes(1);
    expect(onTrace).toHaveBeenCalledWith(result.trace);
    expect(result.trace.version).toBe(1);
    expect(result.trace.sources[0]?.sourceId).toBeTruthy();
    expect(result.trace.prompt.systemTokens).toBeGreaterThan(0);
  });
});
