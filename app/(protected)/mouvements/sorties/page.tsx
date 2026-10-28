import type { Metadata } from "next";

import { HandoverForm } from "@/components/forms/handover-form";
import { requirePermission } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listHandoverCandidates } from "@/modules/mouvements/service";

export const metadata: Metadata = { title: "Remises physiques" };
export const instant = false;

export default async function HandoversPage() {
  const actor = await requirePermission(PERMISSIONS.MOUVEMENTS_HANDOVER);
  const candidates = await listHandoverCandidates(actor.id);
  return <div className="space-y-8"><header><p className="eyebrow">Chaîne de garde</p><h1 className="page-title">Remises physiques</h1><p className="page-description">Seules les demandes de sortie approuvées et encore disponibles peuvent être remises.</p></header><div className="grid gap-5">{candidates.map((request) => <article className="card p-6" key={request.id}><div className="grid gap-6 lg:grid-cols-[1fr_420px]"><div><span className="badge bg-emerald-50 text-emerald-700">APPROUVÉE</span><h2 className="mt-4 text-lg font-semibold">{request.document.reference} — {request.document.titre}</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Bénéficiaire</dt><dd className="font-medium">{request.demandeur.nom}</dd><dd>{request.demandeur.email}</dd></div><div><dt className="text-slate-500">Retour prévu</dt><dd className="font-medium">{formatDateTime(request.retourPrevu)}</dd></div><div><dt className="text-slate-500">Localisation</dt><dd>{request.document.boite.code} · {request.document.boite.emplacement.zone}/{request.document.boite.emplacement.rack}/{request.document.boite.emplacement.niveau}</dd></div><div><dt className="text-slate-500">Validation</dt><dd>{request.validation?.validateur.nom ?? "—"}</dd></div></dl></div><HandoverForm demandeId={request.id} /></div></article>)}{candidates.length === 0 ? <div className="card p-8 text-center text-sm text-slate-500">Aucune remise approuvée en attente.</div> : null}</div></div>;
}
