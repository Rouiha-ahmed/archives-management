import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { DecisionForm } from "@/components/forms/decision-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listValidationQueue } from "@/modules/validations/service";

export const metadata: Metadata = { title: "Validations" };
export const instant = false;

export default async function ValidationsPage() {
  const actor = await requirePermission(PERMISSIONS.DEMANDES_READ_ALL);
  const { pending, history } = await listValidationQueue(actor.id);
  const canApprove = actor.permissions.includes(PERMISSIONS.DEMANDES_APPROVE);
  const canReject = actor.permissions.includes(PERMISSIONS.DEMANDES_REJECT);
  return <div className="space-y-10">
    <PageHeader eyebrow="Autorisation" title="Validations" description="Décidez de l'accès au document. Une approbation ne déclenche jamais automatiquement une sortie physique." actions={<span className="badge self-center">{pending.length} en attente</span>} />
    <section><h2 className="mb-4 text-lg font-semibold">À traiter</h2>{pending.length ? <div className="grid gap-4">{pending.map((request) => <article className="card p-6" key={request.id}><div className="grid gap-6 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap gap-2"><StatusBadge value="EN_ATTENTE" /><StatusBadge value={request.type} /><StatusBadge value={request.document.statut} /></div><h3 className="mt-4 text-lg font-semibold">{request.document.reference} — {request.document.titre}</h3><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Demandeur</dt><dd className="font-medium">{request.demandeur.nom}</dd><dd className="text-xs text-slate-500">{request.demandeur.email}</dd></div><div><dt className="text-slate-500">Retour prévu</dt><dd className="font-medium">{formatDateTime(request.retourPrevu)}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Motif</dt><dd className="mt-1 leading-6">{request.motif}</dd></div></dl></div><div className="flex items-start gap-3">{canApprove ? <DecisionForm demandeId={request.id} decision="APPROUVEE" /> : null}{canReject ? <DecisionForm demandeId={request.id} decision="REFUSEE" /> : null}</div></div></article>)}</div> : <EmptyState title="Aucune demande en attente" />}</section>
    <section><h2 className="mb-4 text-lg font-semibold">Historique des décisions</h2>{history.length ? <div className="table-shell"><table className="data-table"><caption className="sr-only">Historique des validations</caption><thead><tr><th scope="col">Date</th><th scope="col">Document</th><th scope="col">Demandeur</th><th scope="col">Décision</th><th scope="col">Validateur</th><th scope="col">Commentaire</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td className="whitespace-nowrap">{formatDateTime(item.decidedAt)}</td><td>{item.demande.document.reference}</td><td>{item.demande.demandeur.nom}</td><td><StatusBadge value={item.decision} /></td><td>{item.validateur.nom}</td><td>{item.commentaire ?? "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucune décision enregistrée" />}</section>
  </div>;
}
