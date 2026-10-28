"use client";

import { useActionState } from "react";

import { createUserAction } from "@/modules/users/actions";

export function CreateUserForm({ roles }: { roles: Array<{ id: string; code: string; nom: string }> }) {
  const [state, action, pending] = useActionState(createUserAction, {});
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div><label className="mb-1.5 block text-sm font-medium" htmlFor="nom">Nom complet</label><input className="field" id="nom" name="nom" required /></div>
      <div><label className="mb-1.5 block text-sm font-medium" htmlFor="new-email">Adresse e-mail</label><input className="field" id="new-email" name="email" type="email" autoComplete="off" required /></div>
      <div className="md:col-span-2"><label className="mb-1.5 block text-sm font-medium" htmlFor="new-password">Mot de passe temporaire</label><input className="field" id="new-password" name="password" type="password" autoComplete="new-password" required /><p className="mt-1.5 text-xs text-slate-500">12 caractères minimum, avec majuscule, minuscule, chiffre et symbole.</p></div>
      <fieldset className="md:col-span-2"><legend className="mb-2 text-sm font-medium">Rôles initiaux</legend><div className="flex flex-wrap gap-3">{roles.map((role) => <label className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm" key={role.id}><input type="checkbox" name="roleIds" value={role.id} />{role.nom} <span className="text-xs text-slate-400">{role.code}</span></label>)}</div></fieldset>
      {state.message ? <p className={`md:col-span-2 text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p> : null}
      <div className="md:col-span-2"><button className="button-primary inline-flex" disabled={pending} type="submit">{pending ? "Création…" : "Créer l'utilisateur"}</button></div>
    </form>
  );
}
