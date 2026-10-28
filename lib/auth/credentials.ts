import "server-only";

import { prisma } from "@/lib/prisma";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/auth/password";
import {
  clearLoginFailures,
  getLoginKey,
  isLoginAllowed,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/auth/schemas";

export async function authenticateCredentials(
  credentials: Partial<Record<"email" | "password", unknown>>,
  headers: Headers,
) {
  const rawEmail = typeof credentials.email === "string" ? credentials.email : "";
  const keyHash = getLoginKey(rawEmail || "<invalid>", headers);

  if (!(await isLoginAllowed(keyHash))) {
    await verifyPassword(DUMMY_PASSWORD_HASH, String(credentials.password ?? ""));
    return null;
  }

  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    await recordLoginFailure(keyHash);
    return null;
  }

  const user = await prisma.utilisateur.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      nom: true,
      email: true,
      actif: true,
      passwordHash: true,
      sessionVersion: true,
    },
  });

  const validPassword = await verifyPassword(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    parsed.data.password,
  );

  if (!user || !user.actif || !user.passwordHash || !validPassword) {
    await recordLoginFailure(keyHash);
    return null;
  }

  await Promise.all([
    clearLoginFailures(keyHash),
    prisma.utilisateur.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    }),
  ]);

  return {
    id: user.id,
    name: user.nom,
    email: user.email,
    sessionVersion: user.sessionVersion,
  };
}
