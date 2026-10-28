"use client";

import { useActionState } from "react";

import { resetUserPasswordAction } from "@/modules/users/actions";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetUserPasswordAction, {});
  return (
    <form action={action} className="mt-3 flex min-w-72 flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="text-xs font-medium" htmlFor={`password-${userId}`}>Nouveau mot de passe</label>
      <input className="field h-9" id={`password-${userId}`} name="password" type="password" autoComplete="new-password" required />
      {state.message ? <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p> : null}
      <button className="button-secondary self-start" disabled={pending} type="submit">{pending ? "Mise à jour…" : "Remplacer"}</button>
    </form>
  );
}
