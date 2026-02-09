import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    globals: true,
    testTimeout: 10000,
    hookTimeout: 15000,
  },
});
