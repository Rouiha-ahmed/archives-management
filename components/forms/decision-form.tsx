"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

import { decideRequestAction } from "@/modules/validations/actions";

export function DecisionForm({ demandeId, decision }: { demandeId: string; decision: "APPROUVEE" | "REFUSEE" }) {
  const [state, action, pending] = useActionState(decideRequestAction, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const rejected = decision === "REFUSEE";
  useEffect(() => { if (state.ok) dialog.current?.close(); }, [state.ok]);
  return <>
    <button className={rejected ? "button-danger gap-2" : "button-primary inline-flex gap-2"} onClick={() => dialog.current?.showModal()} type="button">{rejected ? <X aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4" />}{rejected ? "Refuser" : "Approuver"}</button>
    <dialog aria-labelledby={`decision-title-${demandeId}-${decision}`} className="m-auto w-[min(92vw,32rem)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/50" ref={dialog}>
      <form action={action} className="p-6"><input name="demandeId" type="hidden" value={demandeId} /><input name="decision" type="hidden" value={decision} /><h2 className="text-lg font-semibold" id={`decision-title-${demandeId}-${decision}`}>{rejected ? "Refuser la demande" : "Approuver la demande"}</h2><p className="mt-2 text-sm text-slate-600">Cette décision autorise l&apos;étape suivante mais ne constitue pas une remise physique.</p><div className="mt-5"><label className="field-label" htmlFor={`${decision}-${demandeId}`}>{rejected ? "Motif du refus (obligatoire)" : "Commentaire (facultatif)"}</label><textarea aria-describedby={state.message ? `decision-error-${demandeId}-${decision}` : undefined} className="textarea-field" id={`${decision}-${demandeId}`} maxLength={1000} name="commentaire" required={rejected} /></div>{state.message ? <p className={`mt-3 text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} id={`decision-error-${demandeId}-${decision}`} role={state.ok ? "status" : "alert"}>{state.message}</p> : null}<div className="mt-6 flex justify-end gap-3"><button className="button-secondary" disabled={pending} onClick={() => dialog.current?.close()} type="button">Annuler</button><button className={rejected ? "button-danger" : "button-primary"} disabled={pending}>{pending ? "Enregistrement…" : "Confirmer"}</button></div></form>
    </dialog>
  </>;
}
