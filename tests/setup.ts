import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

process.env.AUTH_RATE_LIMIT_SECRET ??= "integration-test-rate-limit-secret";
process.env.AUTH_SECRET ??= "integration-test-auth-secret-with-sufficient-length";
