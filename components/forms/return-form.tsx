"use client";

import { useActionState, useState } from "react";

import { ActionToast } from "@/components/action-toast";
import { confirmReturnAction } from "@/modules/mouvements/actions";

export function ReturnForm({
  mouvementId,
  reference,
  boites,
}: {
  mouvementId: string;
  reference: string;
  boites: Array<{ id: string; code: string }>;
}) {
  const [state, action, pending] = useActionState(confirmReturnAction, {});
  const [condition, setCondition] = useState("BON");
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { if (!window.confirm("Confirmer définitivement ce retour physique ?")) event.preventDefault(); }}>
      <input name="mouvementId" type="hidden" value={mouvementId} />
      <div><label className="field-label" htmlFor={`reference-${mouvementId}`}>Confirmer la référence</label><input autoComplete="off" className="field" id={`reference-${mouvementId}`} name="documentReference" placeholder={reference} required /></div>
      <div><label className="field-label" htmlFor={`condition-${mouvementId}`}>État physique</label><select className="field" id={`condition-${mouvementId}`} name="etatRetour" onChange={(event) => setCondition(event.target.value)} value={condition}><option value="BON">Bon état</option><option value="ENDOMMAGE">Endommagé</option><option value="PERDU">Perdu / non présenté</option><option value="NON_REINTEGRE">Non réintégré</option></select></div>
      <div><label className="field-label" htmlFor={`box-${mouvementId}`}>Boîte de rangement</label><select className="field" id={`box-${mouvementId}`} name="boiteId" required={condition === "BON"}><option value="">{condition === "BON" ? "Sélectionner…" : "Non réintégré"}</option>{boites.map((box) => <option key={box.id} value={box.id}>{box.code}</option>)}</select></div>
      <div><label className="field-label" htmlFor={`notes-${mouvementId}`}>Observations</label><textarea className="textarea-field" id={`notes-${mouvementId}`} name="observations" required={condition !== "BON"} /></div>
      <div className="sm:col-span-2"><button className="button-primary" disabled={pending}>{pending ? "Confirmation…" : "Confirmer le retour"}</button></div>
      <ActionToast state={state} />
    </form>
  );
}
