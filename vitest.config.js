import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "coverage",
      thresholds: {
        lines: 80,
        branches: 70,
        statements: 80,
        functions: 80
      }
    }
  }
});
