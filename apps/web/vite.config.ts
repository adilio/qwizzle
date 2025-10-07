import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@qwizzle/providers": path.resolve(__dirname, "src/providers"),
      "@qwizzle/utils": path.resolve(__dirname, "src/utils"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
