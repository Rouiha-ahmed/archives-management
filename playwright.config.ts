import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

Reflect.set(process.env, "NODE_ENV", "test");
loadEnvConfig(process.cwd());

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // Every scenario owns the same isolated TEST_DATABASE_URL and truncates it.
  // Keep one worker so files cannot reset each other's fixtures concurrently.
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "development",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      AUTH_URL: baseURL,
      AUTH_SECRET: "synthetic-e2e-auth-secret-with-sufficient-length",
      AUTH_RATE_LIMIT_SECRET: "synthetic-e2e-rate-limit-secret",
      SIGNATURE_STORAGE_DIR: "/tmp/archives-management-e2e-signatures",
    },
  },
});
