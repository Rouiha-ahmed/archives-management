import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { notFound } from "next/navigation";

import { DocumentForm } from "@/components/forms/document-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/dal";
import { formatDate, formatDateTime } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { getDocument } from "@/modules/archives/service";
import { listBoites } from "@/modules/boites/service";

export const metadata: Metadata = { title: "Détail du document" };
export const instant = false;

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission(PERMISSIONS.ARCHIVES_READ);
  const { id } = await params;
  const data = await loadDocument(actor.id, id);
  if (!data) notFound();
  const { document, boxes } = data;
  const available = document.statut === "DISPONIBLE";
  const canRequest = available && actor.permissions.includes(PERMISSIONS.DEMANDES_CREATE);
  const canReadSignatures = actor.permissions.includes(PERMISSIONS.SIGNATURES_READ);
  return <div className="space-y-8">
    <PageHeader eyebrow={`Document ${document.reference}`} title={document.titre} description={document.description ?? "Aucune description renseignée."} actions={<>{canRequest ? <Link className="button-primary inline-flex" href={`/demandes?documentId=${document.id}`}>Demander un accès</Link> : null}<StatusBadge value={document.statut} /></>} />
    <section className={`flex items-start gap-3 rounded-xl border p-4 ${available ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`} role="status">{available ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> : <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}<div><p className="font-semibold">{available ? "Document disponible" : "Document non disponible pour une nouvelle remise"}</p><p className="mt-1 text-sm">{available ? "Une demande nominative peut être soumise; son approbation restera distincte de la remise physique." : "Consultez l'historique ci-dessous pour connaître sa situation."}</p></div></section>
    <section className="card p-6"><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Classification" value={document.classification ?? "—"} /><Info label="Date du document" value={formatDate(document.dateDocument)} /><Info label="Boîte" value={document.boite.code} href={`/boites/${document.boite.id}`} /><Info label="Emplacement" value={`${document.boite.emplacement.zone} / ${document.boite.emplacement.rack} / ${document.boite.emplacement.niveau}`} /><Info label="Création" value={formatDateTime(document.createdAt)} /><Info label="Dernière modification" value={formatDateTime(document.updatedAt)} /><Info label="Confidentialité" value={document.confidentiel ? "Confidentiel" : "Standard"} /></dl></section>
    {actor.permissions.includes(PERMISSIONS.ARCHIVES_UPDATE) ? <details className="card p-6"><summary className="cursor-pointer font-semibold text-blue-800">Modifier les métadonnées</summary><div className="mt-5"><DocumentForm boites={boxes.items} document={document} /></div></details> : null}
    <section><h2 className="mb-4 text-lg font-semibold">Demandes d&apos;accès autorisées</h2>{document.demandes.length ? <div className="table-shell"><table className="data-table"><caption className="sr-only">Demandes liées au document</caption><thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Statut</th><th scope="col">Décision</th><th scope="col">Motif</th></tr></thead><tbody>{document.demandes.map((request) => <tr key={request.id}><td>{formatDateTime(request.createdAt)}</td><td><StatusBadge value={request.type} /></td><td><StatusBadge value={request.statut} /></td><td>{request.validation?.decision ? <StatusBadge value={request.validation.decision} /> : "—"}</td><td>{request.motif}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucune demande visible" />}</section>
    <section><h2 className="mb-4 text-lg font-semibold">Historique des mouvements</h2>{document.mouvements.length ? <div className="table-shell"><table className="data-table"><caption className="sr-only">Mouvements physiques du document</caption><thead><tr><th scope="col">Sortie</th><th scope="col">Bénéficiaire</th><th scope="col">Opérateur</th><th scope="col">Retour</th><th scope="col">État</th><th scope="col">Accusé</th></tr></thead><tbody>{document.mouvements.map((movement) => <tr key={movement.id}><td>{formatDateTime(movement.dateSortie)}</td><td>{movement.utilisateur.nom}</td><td>{movement.operateurSortie?.nom ?? "—"}</td><td>{formatDateTime(movement.dateRetour)}</td><td>{movement.etatRetour ? <StatusBadge value={movement.etatRetour} /> : <StatusBadge value="EN_COURS" />}</td><td>{canReadSignatures && movement.signature ? <Link className="text-blue-700 hover:underline" href={`/api/signatures/${movement.signature.id}`} target="_blank">Voir la preuve</Link> : "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucun mouvement physique" />}</section>
  </div>;
}

async function loadDocument(actorId: string, id: string) { try { const [document, boxes] = await Promise.all([getDocument(actorId, id), listBoites(actorId, { pageSize: "100" })]); return { document, boxes }; } catch { return null; } }
function Info({ label, value, href }: { label: string; value: string; href?: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-900">{href ? <Link className="text-blue-700 hover:underline" href={href}>{value}</Link> : value}</dd></div>; }
