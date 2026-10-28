export type SessionIdentity = {
  user?: { id?: string; sessionVersion?: number };
} | null;

export type ActiveUserRecord = {
  id: string;
  actif: boolean;
  sessionVersion: number;
};

export function isActiveSession(
  session: SessionIdentity,
  user: ActiveUserRecord | null,
) {
  return Boolean(
    session?.user?.id &&
      user?.actif &&
      user.id === session.user.id &&
      user.sessionVersion === session.user.sessionVersion,
  );
}
