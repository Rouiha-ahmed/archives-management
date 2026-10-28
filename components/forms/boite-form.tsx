"use client";

import { useActionState } from "react";

import { ActionToast } from "@/components/action-toast";
import { createBoiteAction } from "@/modules/boites/actions";

export function BoiteForm({ emplacements }: { emplacements: Array<{ id: string; zone: string; rack: string; niveau: string }> }) {
  const [state, action, pending] = useActionState(createBoiteAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div><label className="field-label" htmlFor="box-code">Code unique</label><input className="field" id="box-code" name="code" required /></div>
      <div><label className="field-label" htmlFor="box-location">Emplacement</label><select className="field" id="box-location" name="emplacementId" required><option value="">Sélectionner…</option>{emplacements.map((item) => <option key={item.id} value={item.id}>{item.zone} / {item.rack} / {item.niveau}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="box-description">Description</label><textarea className="textarea-field" id="box-description" name="description" /></div>
      <div className="sm:col-span-2"><button className="button-primary" disabled={pending}>{pending ? "Création…" : "Créer la boîte"}</button></div>
      <ActionToast state={state} />
    </form>
  );
}
