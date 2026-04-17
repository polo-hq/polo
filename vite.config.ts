import { defineConfig } from "vite-plus";

const hiddenPaths = [".agents/**", ".claude/**", "packages/evals/corpus"];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: hiddenPaths,
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: hiddenPaths,
  },
  test: {
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "**/.agents/**",
      "**/.claude/**",
      "packages/evals/**",
    ],
  },
});
