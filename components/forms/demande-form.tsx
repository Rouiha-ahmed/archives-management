"use client";

import { useActionState, useState } from "react";

import { ActionToast } from "@/components/action-toast";
import { createAccessRequestAction } from "@/modules/demandes/actions";

export function DemandeForm({ documents, defaultDocumentId }: { documents: Array<{ id: string; reference: string; titre: string }>; defaultDocumentId?: string }) {
  const [state, action, pending] = useActionState(createAccessRequestAction, {});
  const [type, setType] = useState("CONSULTATION");
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2"><label className="field-label" htmlFor="request-document">Document spécifique</label><select className="field" defaultValue={defaultDocumentId ?? ""} id="request-document" name="documentId" required><option value="">Sélectionner…</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.reference} — {document.titre}</option>)}</select></div>
      <div><label className="field-label" htmlFor="request-type">Type d&apos;accès</label><select className="field" id="request-type" name="type" onChange={(event) => setType(event.target.value)} value={type}><option value="CONSULTATION">Consultation sur site</option><option value="SORTIE">Sortie physique</option></select></div>
      <div><label className="field-label" htmlFor="request-return">Retour prévu</label><input className="field" disabled={type !== "SORTIE"} id="request-return" min={new Date().toISOString().slice(0, 16)} name="retourPrevu" required={type === "SORTIE"} type="datetime-local" /></div>
      <div className="md:col-span-2"><label className="field-label" htmlFor="request-reason">Motif</label><textarea className="textarea-field" id="request-reason" minLength={10} name="motif" required /></div>
      <div className="md:col-span-2"><button className="button-primary" disabled={pending}>{pending ? "Envoi…" : "Envoyer la demande"}</button></div>
      <ActionToast state={state} />
    </form>
  );
}
