import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { DemandeForm } from "@/components/forms/demande-form";
import { PageHeader } from "@/components/page-header";
import { PaginationLinks } from "@/components/pagination-links";
import { StatusBadge } from "@/components/status-badge";
import { requireActiveUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listDocumentOptions } from "@/modules/archives/service";
import { completeConsultationAction, startConsultationAction } from "@/modules/demandes/actions";
import { listAccessRequests } from "@/modules/demandes/service";

export const metadata: Metadata = { title: "Demandes d'accès" };
export const instant = false;
type Filters = { statut?: string; type?: string; documentId?: string; page?: string };

export default async function DemandesPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const actor = await requireActiveUser();
  const filters = await searchParams;
  const result = await listAccessRequests(actor.id, filters);
  const canCreate = actor.permissions.includes(PERMISSIONS.DEMANDES_CREATE) && actor.permissions.includes(PERMISSIONS.ARCHIVES_READ);
  const documents = canCreate ? await listDocumentOptions(actor.id) : [];
  return <div className="space-y-8">
    <PageHeader eyebrow="Accès contrôlé" title="Demandes d'accès" description="Suivez chaque étape : demande soumise, décision, remise physique éventuelle et retour." />
    {canCreate ? <details className="card p-6" open={Boolean(filters.documentId)}><summary className="cursor-pointer font-semibold text-blue-800">Nouvelle demande</summary><div className="mt-5"><DemandeForm defaultDocumentId={filters.documentId} documents={documents} /></div></details> : null}
    <form className="card grid gap-3 p-4 sm:grid-cols-[240px_240px_auto_auto]" method="get"><div><label className="field-label" htmlFor="request-status">Statut</label><select className="field" defaultValue={filters.statut} id="request-status" name="statut"><option value="">Tous les statuts</option>{["EN_ATTENTE", "APPROUVEE", "REFUSEE", "EN_COURS", "RETOURNEE"].map((value) => <option key={value}>{value}</option>)}</select></div><div><label className="field-label" htmlFor="request-type">Type</label><select className="field" defaultValue={filters.type} id="request-type" name="type"><option value="">Tous les types</option><option value="CONSULTATION">Consultation sur site</option><option value="SORTIE">Sortie physique</option></select></div><button className="button-primary self-end">Filtrer</button><Link className="button-secondary self-end" href="/demandes">Réinitialiser</Link></form>
    {result.items.length ? <div className="grid gap-4">{result.items.map((request) => <article className="card p-5" key={request.id}><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap gap-2"><StatusBadge value={request.type} /><StatusBadge value={request.statut} /></div><h2 className="mt-3 font-semibold"><Link className="hover:text-blue-700 hover:underline" href={`/documents/${request.document.id}`}>{request.document.reference} — {request.document.titre}</Link></h2><p className="mt-1 text-sm text-slate-500">{result.canReadAll ? `${request.demandeur.nom} · ${request.demandeur.email} · ` : ""}{formatDateTime(request.createdAt)}</p><p className="mt-3 text-sm leading-6">{request.motif}</p>{request.validation ? <p className="mt-3 text-sm"><strong>Décision :</strong> <StatusBadge value={request.validation.decision} /></p> : <p className="mt-3 text-sm text-amber-800">En attente d&apos;une décision.</p>}{request.retourPrevu ? <p className="mt-2 text-sm text-slate-600">Retour prévu : {formatDateTime(request.retourPrevu)}</p> : null}</div><div className="flex gap-2">{request.type === "CONSULTATION" && request.statut === "APPROUVEE" && actor.permissions.includes(PERMISSIONS.MOUVEMENTS_HANDOVER) ? <form action={startConsultationAction}><input name="demandeId" type="hidden" value={request.id} /><button className="button-primary">Démarrer sur site</button></form> : null}{request.type === "CONSULTATION" && request.statut === "EN_COURS" && actor.permissions.includes(PERMISSIONS.MOUVEMENTS_RETURN) ? <form action={completeConsultationAction}><input name="demandeId" type="hidden" value={request.id} /><button className="button-primary">Clôturer</button></form> : null}</div></div></article>)}</div> : <EmptyState title="Aucune demande" description="Aucune demande ne correspond aux filtres sélectionnés." />}
    <PaginationLinks page={result.page} pageSize={result.pageSize} params={filters} pathname="/demandes" total={result.total} />
  </div>;
}
