import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { createPolo, registerSources } from "../src/index.ts";
import { CircularSourceDependencyError, MissingSourceDependencyError } from "../src/errors.ts";
import type { AnyResolverSource } from "../src/types.ts";

const polo = createPolo();
const emptyInputSchema = z.object({});

describe("graph", () => {
  test("dependent source waits for parent", async () => {
    const order: string[] = [];
    const parentSchema = z.object({ id: z.string() });
    const childSchema = z.object({ parentId: z.string() });
    const parent = polo.source(emptyInputSchema, {
      output: parentSchema,
      async resolve() {
        order.push("parent");
        return { id: "p1" };
      },
    });
    const child = polo.source(
      emptyInputSchema,
      { parent },
      {
        output: childSchema,
        async resolve({ parent }) {
          order.push("child");
          return { parentId: parent.id };
        },
      },
    );

    const task = polo.define(emptyInputSchema, {
      id: "test_dep",
      sources: {
        parent,
        child,
      },
    });

    const { context } = await polo.resolve(task, {});
    expect(order).toEqual(["parent", "child"]);
    expect(context.child).toEqual({ parentId: "p1" });
  });

  test("dependent source waits for parent when sources are destructured", async () => {
    const parentSchema = z.object({ id: z.string() });
    const childSchema = z.object({ parentId: z.string() });
    const parent = polo.source(emptyInputSchema, {
      output: parentSchema,
      async resolve() {
        return { id: "p1" };
      },
    });
    const child = polo.source(
      emptyInputSchema,
      { parent },
      {
        output: childSchema,
        async resolve({ parent }) {
          return { parentId: parent.id };
        },
      },
    );

    const task = polo.define(emptyInputSchema, {
      id: "test_dep_destructured",
      sources: {
        parent,
        child,
      },
    });

    const { context } = await polo.resolve(task, {});
    expect(context.child).toEqual({ parentId: "p1" });
  });

  test("missing source dependency throws during task definition", () => {
    const accountSourceSet = polo.sourceSet((sources) => {
      const account = sources.value(emptyInputSchema, {
        async resolve() {
          return { id: "p1" };
        },
      });

      return { account };
    });

    const childSourceSet = polo.sourceSet((sources) => {
      const child = sources.value(
        emptyInputSchema,
        { account: accountSourceSet.account },
        {
          async resolve({ account }) {
            return { parentId: account.id };
          },
        },
      );

      return { child };
    });

    const sourceRegistry = registerSources(accountSourceSet, childSourceSet);

    const typecheckOnly = Date.now() < 0;

    if (typecheckOnly) {
      polo.define(emptyInputSchema, {
        id: "typecheck_missing_dep",
        // @ts-expect-error child depends on account
        sources: {
          child: sourceRegistry.child,
        },
      });
    }

    expect(() =>
      polo.define(emptyInputSchema, {
        id: "runtime_missing_dep",
        sources: {
          child: sourceRegistry.child,
        } as never,
      }),
    ).toThrowError(MissingSourceDependencyError);
  });

  test("dependent sources can be selected under aliased task keys", async () => {
    const sharedSourceSet = polo.sourceSet((sources) => {
      const account = sources.value(emptyInputSchema, {
        async resolve() {
          return { id: "p1" };
        },
      });

      const child = sources.value(
        emptyInputSchema,
        { account },
        {
          async resolve({ account }) {
            return { parentId: account.id };
          },
        },
      );

      return { account, child };
    });

    const sourceRegistry = registerSources(sharedSourceSet);
    const task = polo.define(emptyInputSchema, {
      id: "aliased_source_keys",
      sources: {
        customer: sourceRegistry.account,
        child: sourceRegistry.child,
      },
    });

    const { context } = await polo.resolve(task, {});
    expect(context.customer).toEqual({ id: "p1" });
    expect(context.child).toEqual({ parentId: "p1" });
  });

  test("local source reuse after aliased selection does not affect later dependencies", async () => {
    const account = polo.source(emptyInputSchema, {
      async resolve() {
        return { id: "p1" };
      },
    });
    const child = polo.source(
      emptyInputSchema,
      { account },
      {
        async resolve({ account }) {
          return { parentId: account.id };
        },
      },
    );

    const aliasedTask = polo.define(emptyInputSchema, {
      id: "local_alias_first",
      sources: {
        customer: account,
      },
    });
    const dependentTask = polo.define(emptyInputSchema, {
      id: "local_alias_second",
      sources: {
        account,
        child,
      },
    });

    const { context: aliasedContext } = await polo.resolve(aliasedTask, {});
    const { context: dependentContext } = await polo.resolve(dependentTask, {});

    expect(aliasedContext.customer).toEqual({ id: "p1" });
    expect(dependentContext.account).toEqual({ id: "p1" });
    expect(dependentContext.child).toEqual({ parentId: "p1" });
  });

  test("local dependency aliases are not supported", () => {
    const account = polo.source(emptyInputSchema, {
      async resolve() {
        return { id: "p1" };
      },
    });
    const child = polo.source(
      emptyInputSchema,
      { customer: account },
      {
        async resolve({ customer }) {
          return { parentId: customer.id };
        },
      },
    );

    const typecheckOnly = Date.now() < 0;

    if (typecheckOnly) {
      polo.define(emptyInputSchema, {
        id: "typecheck_local_dependency_alias",
        // @ts-expect-error local dependency aliases are not supported
        sources: {
          account,
          child,
        },
      });
    }

    expect(() =>
      polo.define(emptyInputSchema, {
        id: "local_dependency_alias",
        sources: {
          account,
          child,
        } as never,
      }),
    ).toThrowError(/Dependency aliases are not supported yet/);
  });

  test("reusing a source handle across source sets throws", () => {
    const shared = polo.sourceSet((sources) => {
      const account = sources.value(emptyInputSchema, {
        async resolve() {
          return { id: "p1" };
        },
      });

      return { account };
    });

    expect(() =>
      polo.sourceSet(() => ({
        account: shared.account,
      })),
    ).toThrowError(/already owned by another sourceSet/);
  });

  test("circular dependencies throw during task definition", () => {
    const first = polo.source(emptyInputSchema, {
      async resolve() {
        return "first";
      },
    });
    const second = polo.source(emptyInputSchema, {
      async resolve() {
        return "second";
      },
    });

    (first as AnyResolverSource)._dependencySources = { second };
    (second as AnyResolverSource)._dependencySources = { first };

    expect(() =>
      polo.define(emptyInputSchema, {
        id: "test_circular",
        sources: {
          first,
          second,
        },
      }),
    ).toThrowError(CircularSourceDependencyError);
  });

  test("independent sources resolve in parallel", async () => {
    const started: string[] = [];

    const task = polo.define(emptyInputSchema, {
      id: "test_parallel",
      sources: {
        a: polo.source(emptyInputSchema, {
          async resolve() {
            started.push("a");
            await new Promise((r) => setTimeout(r, 10));
            return "a_value";
          },
        }),
        b: polo.source(emptyInputSchema, {
          async resolve() {
            started.push("b");
            await new Promise((r) => setTimeout(r, 10));
            return "b_value";
          },
        }),
      },
    });

    const start = Date.now();
    const { context } = await polo.resolve(task, {});
    const elapsed = Date.now() - start;

    expect(started).toContain("a");
    expect(started).toContain("b");
    expect(context.a).toBe("a_value");
    expect(context.b).toBe("b_value");
    expect(elapsed).toBeLessThan(18);
  });

  test("string literals mentioning sources do not create fake dependencies", async () => {
    const task = polo.define(emptyInputSchema, {
      id: "test_string_literal_false_positive",
      sources: {
        first: polo.source(emptyInputSchema, {
          resolve: async () => "sources.second should stay literal",
        }),
        second: polo.source(emptyInputSchema, {
          resolve: async () => "ready",
        }),
      },
    });

    const { context } = await polo.resolve(task, {});
    expect(context.first).toBe("sources.second should stay literal");
    expect(context.second).toBe("ready");
  });

  test("comments mentioning sources do not create fake dependencies", async () => {
    const task = polo.define(emptyInputSchema, {
      id: "test_comment_false_positive",
      sources: {
        first: polo.source(emptyInputSchema, {
          resolve: async () => {
            // sources.second is intentionally mentioned here as a comment
            return "ok";
          },
        }),
        second: polo.source(emptyInputSchema, {
          resolve: async () => "ready",
        }),
      },
    });

    const { context } = await polo.resolve(task, {});
    expect(context.first).toBe("ok");
    expect(context.second).toBe("ready");
  });
});
