import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@qwizzle/engine": resolve(rootDir, "packages/engine/src/index.ts"),
      "@qwizzle/wordlists": resolve(rootDir, "packages/wordlists/src/index.ts"),
    },
  },
});
