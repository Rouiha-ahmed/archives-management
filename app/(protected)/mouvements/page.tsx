import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationLinks } from "@/components/pagination-links";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listMovements } from "@/modules/mouvements/service";

export const metadata: Metadata = { title: "Suivi des mouvements" };
export const instant = false;

type Filters = { state?: string; q?: string; from?: string; to?: string; page?: string };

export default async function MovementsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const actor = await requirePermission(PERMISSIONS.MOUVEMENTS_READ);
  const filters = await searchParams;
  const result = await listMovements(actor.id, filters);
  const canReadSignatures = actor.permissions.includes(PERMISSIONS.SIGNATURES_READ);
  const canRegisterReturn = actor.permissions.includes(PERMISSIONS.MOUVEMENTS_RETURN);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Traçabilité"
        title="Mouvements"
        description="Historique des sorties, échéances, retards et retours confirmés."
        actions={canRegisterReturn ? <Link className="button-primary" href="/mouvements/retours">Enregistrer un retour</Link> : undefined}
      />

      <form className="card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5" method="get">
        <div>
          <label className="field-label" htmlFor="movement-search">Document ou bénéficiaire</label>
          <input className="field" defaultValue={filters.q} id="movement-search" name="q" placeholder="Référence ou nom" />
        </div>
        <div>
          <label className="field-label" htmlFor="movement-state">Situation</label>
          <select className="field" defaultValue={filters.state} id="movement-state" name="state">
            <option value="">Toutes</option>
            <option value="active">En cours</option>
            <option value="overdue">En retard</option>
            <option value="returned">Retournées</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="movement-from">Sortie depuis</label>
          <input className="field" defaultValue={filters.from} id="movement-from" name="from" type="date" />
        </div>
        <div>
          <label className="field-label" htmlFor="movement-to">Sortie jusqu’au</label>
          <input className="field" defaultValue={filters.to} id="movement-to" name="to" type="date" />
        </div>
        <div className="flex items-end gap-2">
          <button className="button-primary flex-1">Filtrer</button>
          <Link className="button-secondary" href="/mouvements">Effacer</Link>
        </div>
      </form>

      {result.items.length ? (
        <div className="table-shell">
          <table className="data-table">
            <caption className="sr-only">Historique des mouvements filtrés</caption>
            <thead><tr><th scope="col">Document</th><th scope="col">Bénéficiaire</th><th scope="col">Sortie / échéance</th><th scope="col">Situation</th><th scope="col">Retour</th><th scope="col">Accusé</th></tr></thead>
            <tbody>
              {result.items.map((movement) => (
                <tr key={movement.id}>
                  <td><Link className="font-semibold text-blue-700 hover:underline" href={`/documents/${movement.document.id}`}>{movement.document.reference}</Link><span className="mt-1 block text-xs text-slate-500">{movement.document.titre}</span></td>
                  <td>{movement.utilisateur.nom}<span className="mt-1 block text-xs text-slate-500">{movement.utilisateur.email}</span></td>
                  <td>{formatDateTime(movement.dateSortie)}<span className="mt-1 block text-xs text-slate-500">Prévu : {formatDateTime(movement.retourPrevu)}</span></td>
                  <td>{movement.overdueDays ? <StatusBadge value="EN_RETARD" label={`Retard ${movement.overdueDays} j`} /> : movement.dateRetour ? <StatusBadge value="RETOURNEE" /> : <StatusBadge value="EN_COURS" />}</td>
                  <td>{formatDateTime(movement.dateRetour)}{movement.etatRetour ? <span className="mt-1 block text-xs text-slate-500">État : {movement.etatRetour}</span> : null}</td>
                  <td>{canReadSignatures && movement.signature ? <Link className="font-medium text-blue-700 hover:underline" href={`/api/signatures/${movement.signature.id}`} target="_blank">Voir l’accusé<span className="sr-only"> de {movement.document.reference}</span></Link> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Aucun mouvement" description="Aucun mouvement ne correspond aux critères sélectionnés." />}

      <PaginationLinks page={result.page} pageSize={result.pageSize} params={filters} pathname="/mouvements" total={result.total} />
    </div>
  );
}
