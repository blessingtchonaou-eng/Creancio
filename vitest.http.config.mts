import path from "node:path";
import { defineConfig } from "vitest/config";

// Tests HTTP : ils interrogent un serveur qui tourne (npm run dev), avec la base de développement remplie par le seed.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/http/**/*.test.ts"],
    setupFiles: ["dotenv/config"],
    globalSetup: ["tests/http/prechauffage.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
