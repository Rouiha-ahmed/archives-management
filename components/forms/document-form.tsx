"use client";

import { useActionState } from "react";

import { ActionToast } from "@/components/action-toast";
import { createDocumentAction, updateDocumentAction } from "@/modules/archives/actions";

type ExistingDocument = {
  id: string;
  reference: string;
  titre: string;
  description: string | null;
  classification: string | null;
  dateDocument: Date | null;
  confidentiel: boolean;
  boiteId: string;
};

export function DocumentForm({ boites, document }: { boites: Array<{ id: string; code: string }>; document?: ExistingDocument }) {
  const [state, action, pending] = useActionState(createDocumentAction, {});
  if (document) {
    return (
      <form action={updateDocumentAction} className="grid gap-4 md:grid-cols-2">
        <input name="id" type="hidden" value={document.id} />
        <div><label className="field-label" htmlFor="document-reference">Référence</label><input className="field" defaultValue={document.reference} id="document-reference" name="reference" required /></div>
        <div><label className="field-label" htmlFor="document-title">Titre</label><input className="field" defaultValue={document.titre} id="document-title" name="titre" required /></div>
        <div><label className="field-label" htmlFor="document-classification">Classification</label><input className="field" defaultValue={document.classification ?? ""} id="document-classification" name="classification" /></div>
        <div><label className="field-label" htmlFor="document-date">Date du document</label><input className="field" defaultValue={document.dateDocument?.toISOString().slice(0, 10)} id="document-date" name="dateDocument" type="date" /></div>
        <div><label className="field-label" htmlFor="document-box">Boîte</label><select className="field" defaultValue={document.boiteId} id="document-box" name="boiteId" required>{boites.map((box) => <option key={box.id} value={box.id}>{box.code}</option>)}</select></div>
        <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 px-3 py-3 text-sm"><input defaultChecked={document.confidentiel} name="confidentiel" type="checkbox" value="true" />Document confidentiel</label>
        <div className="md:col-span-2"><label className="field-label" htmlFor="document-description">Description</label><textarea className="textarea-field" defaultValue={document.description ?? ""} id="document-description" name="description" /></div>
        <div className="md:col-span-2"><button className="button-primary">Enregistrer les modifications</button></div>
      </form>
    );
  }
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div><label className="field-label" htmlFor="document-reference">Référence</label><input className="field" id="document-reference" name="reference" required /></div>
      <div><label className="field-label" htmlFor="document-title">Titre</label><input className="field" id="document-title" name="titre" required /></div>
      <div><label className="field-label" htmlFor="document-classification">Classification</label><input className="field" id="document-classification" name="classification" /></div>
      <div><label className="field-label" htmlFor="document-date">Date du document</label><input className="field" id="document-date" name="dateDocument" type="date" /></div>
      <div><label className="field-label" htmlFor="document-box">Boîte</label><select className="field" id="document-box" name="boiteId" required><option value="">Sélectionner…</option>{boites.map((box) => <option key={box.id} value={box.id}>{box.code}</option>)}</select></div>
      <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 px-3 py-3 text-sm"><input name="confidentiel" type="checkbox" value="true" />Document confidentiel</label>
      <div className="md:col-span-2"><label className="field-label" htmlFor="document-description">Description</label><textarea className="textarea-field" id="document-description" name="description" /></div>
      <div className="md:col-span-2"><button className="button-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le document"}</button></div>
      <ActionToast state={state} />
    </form>
  );
}
