"use client";

import { useActionState } from "react";

import { ActionToast } from "@/components/action-toast";
import { createEmplacementAction } from "@/modules/emplacements/actions";

export function EmplacementForm() {
  const [state, action, pending] = useActionState(createEmplacementAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <div><label className="field-label" htmlFor="zone">Zone</label><input className="field" id="zone" name="zone" required /></div>
      <div><label className="field-label" htmlFor="rack">Rack</label><input className="field" id="rack" name="rack" required /></div>
      <div><label className="field-label" htmlFor="niveau">Niveau</label><input className="field" id="niveau" name="niveau" required /></div>
      <div className="sm:col-span-3"><button className="button-primary" disabled={pending}>{pending ? "Création…" : "Créer l'emplacement"}</button></div>
      <ActionToast state={state} />
    </form>
  );
}
