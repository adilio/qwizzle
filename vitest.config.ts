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
      "@/engine": resolve(rootDir, "apps/web/src/engine/index.ts"),
      "@/wordlists": resolve(rootDir, "apps/web/src/wordlists/index.ts"),
    },
  },
});
