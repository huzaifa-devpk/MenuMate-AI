import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_PATH: ":memory:",
      APP_BASE_URL: "http://localhost:5173",
      GEMMA_API_KEY: "",
    },
    testTimeout: 20000,
  },
});
