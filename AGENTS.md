<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->

## SDK Principles

- **Every primitive that could live on the window lives on the window.** Budget, sources, history, compaction policy — all defined at window construction, not scattered across the call site.
- **Budge ends where the model call begins.** No prompt composition, no model wrapping, no output scoring. The moment you cross that line you're competing with everyone.
- **Sources are the unit of abstraction.** Not tokens, not messages, not chunks. Every input to the context window is a typed source with a budget, a trace, and an attribution signal.
- **Tracing is not optional.** Every assembly decision is recorded. If it can't be traced it doesn't belong in the framework.
- **The developer owns the prompt.** Budge hands back `context` and `traces`. What the developer does with context is their business.
- **TypeScript-first, no YAML, no DSL.** Configuration is code. If it can't be expressed as a typed TypeScript primitive it's too magic.
- **Budget is a hard constraint, not a suggestion.** Sources compete for budget. Budge enforces the ceiling. The model never sees more than what fits.
- **Compaction is an assembly policy, not a memory system.** Budge doesn't own persistence. It owns the decision of what history to include and how to compress it.
- **Filters run before compaction.** Tool calls, reasoning traces, and other noise are stripped before budget math happens.
- **Framework agnostic by default.** If it only works with Mastra or LangGraph it's the wrong abstraction. Budge works wherever a model call happens.
- **Semantic selection over manual curation.** For tools, MCP servers, and retrieved chunks — relevance to the current input drives inclusion, not static configuration.
- **The integration burden must be lower than the insight value.** If wiring up Budge costs more than what you learn from the traces, the abstraction is wrong.
- **Optimizations are recommendations, not defaults.** The SDK assembles and traces. The cloud tells you what to change and why. Never silently optimize in a way that obscures what went into the context.
- **Configuration is runtime, not deploy-time.** Tune from the dashboard against real trace data, never from static code.
- **Token estimation is best-effort by default, never blocking.** If estimation fails for any reason — missing content, unsupported type, thrown error — the trace records `estimatedTokens: null` and resolution continues. A broken tokenizer must never break context assembly.
