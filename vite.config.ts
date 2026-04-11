import { defineConfig } from "vite-plus";

const hiddenAgentPaths = [".agents/**", ".claude/**"];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: hiddenAgentPaths,
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: hiddenAgentPaths,
  },
  test: {
    exclude: ["**/node_modules/**", "**/.git/**", "**/.agents/**", "**/.claude/**"],
  },
});
