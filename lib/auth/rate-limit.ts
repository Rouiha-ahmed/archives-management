import "server-only";

import { createHmac } from "node:crypto";

import { withSerializableRetry } from "@/lib/db/transaction";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function rateLimitSecret() {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret) {
    throw new Error("AUTH_RATE_LIMIT_SECRET is not configured.");
  }
  return secret;
}

export function getLoginKey(email: string, headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", rateLimitSecret())
    .update(`${email.trim().toLowerCase()}|${ip}`)
    .digest("hex");
}

export async function isLoginAllowed(keyHash: string, now = new Date()) {
  const attempt = await prisma.loginAttempt.findUnique({ where: { keyHash } });
  return !attempt?.blockedUntil || attempt.blockedUntil <= now;
}

export async function recordLoginFailure(keyHash: string, now = new Date()) {
  await withSerializableRetry(async (tx) => {
    const current = await tx.loginAttempt.findUnique({ where: { keyHash } });
    const windowExpired =
      !current || now.getTime() - current.windowStartedAt.getTime() >= WINDOW_MS;
    const failedCount = windowExpired ? 1 : current.failedCount + 1;

    await tx.loginAttempt.upsert({
      where: { keyHash },
      create: {
        keyHash,
        failedCount,
        windowStartedAt: now,
        blockedUntil:
          failedCount >= MAX_FAILURES
            ? new Date(now.getTime() + BLOCK_MS)
            : null,
        lastAttemptAt: now,
      },
      update: {
        failedCount,
        windowStartedAt: windowExpired ? now : (current?.windowStartedAt ?? now),
        blockedUntil:
          failedCount >= MAX_FAILURES
            ? new Date(now.getTime() + BLOCK_MS)
            : (current?.blockedUntil ?? null),
        lastAttemptAt: now,
      },
    });
  });
}

export async function clearLoginFailures(keyHash: string) {
  await prisma.loginAttempt.deleteMany({ where: { keyHash } });
}
