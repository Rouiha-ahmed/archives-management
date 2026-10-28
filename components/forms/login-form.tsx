"use client";

import { useActionState } from "react";

import { loginAction } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">Adresse e-mail</label>
        <input autoComplete="email" className="field" id="email" name="email" type="email" required aria-describedby={state.fields?.email ? "email-error" : undefined} />
        {state.fields?.email ? <p id="email-error" className="text-sm text-destructive">Adresse e-mail invalide.</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">Mot de passe</label>
        <input autoComplete="current-password" className="field" id="password" name="password" type="password" required aria-describedby={state.fields?.password ? "password-error" : undefined} />
        {state.fields?.password ? <p id="password-error" className="text-sm text-destructive">Mot de passe requis.</p> : null}
      </div>
      {state.message ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{state.message}</p> : null}
      <button className="button-primary w-full" disabled={pending} type="submit">{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
