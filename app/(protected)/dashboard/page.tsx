import Link from "next/link";
import { Archive, Box, ClipboardCheck, ClockAlert, PackageCheck, PackageOpen } from "lucide-react";

import { BarChart } from "@/components/bar-chart";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { requireActiveUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { getDashboardMetrics } from "@/modules/dashboard/service";

export const instant = false;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireActiveUser();
  const filters = await searchParams;
  const metrics = await getDashboardMetrics(user.id, filters);
  const cards = [
    { label: "Documents", value: metrics.documents, icon: Archive, href: "/documents" },
    { label: "Boîtes", value: metrics.boxes, icon: Box, href: "/boites" },
    { label: "Disponibles", value: metrics.available, icon: PackageCheck, href: "/documents?statut=DISPONIBLE" },
    { label: "Sorties actives", value: metrics.checkedOut, icon: PackageOpen, href: "/mouvements?state=active" },
    { label: "Demandes en attente", value: metrics.pending, icon: ClipboardCheck, href: "/validations" },
    { label: "Retards", value: metrics.overdue, icon: ClockAlert, href: "/mouvements?state=overdue", danger: true },
  ].filter((item): item is typeof item & { value: number } => item.value !== null);
  return <div className="space-y-8">
    <PageHeader eyebrow="Pilotage opérationnel" title={`Bonjour, ${user.nom}`} description="Indicateurs courants et activité sur la période sélectionnée, limités à votre périmètre d'accès." />
    <form className="card flex flex-wrap items-end gap-3 p-4"><div><label className="field-label" htmlFor="dashboard-from">Du</label><input className="field" defaultValue={filters.from ?? metrics.from.toISOString().slice(0, 10)} id="dashboard-from" name="from" type="date" /></div><div><label className="field-label" htmlFor="dashboard-to">Au</label><input className="field" defaultValue={filters.to ?? metrics.to.toISOString().slice(0, 10)} id="dashboard-to" name="to" type="date" /></div><button className="button-primary">Actualiser les analyses</button><p className="pb-2 text-xs text-slate-500">Les stocks sont instantanés; les graphiques et mouvements récents suivent la période.</p></form>
    <section aria-label="Indicateurs clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((item) => <StatCard {...item} key={item.label} />)}</section>
    <section className="grid gap-4 xl:grid-cols-2">
      {metrics.requestsByStatus.length ? <BarChart data={metrics.requestsByStatus} description="Demandes créées sur la période" title="Demandes par statut" /> : null}
      {metrics.movementsOverTime.length ? <BarChart data={metrics.movementsOverTime} description="Remises physiques, sans confusion avec les demandes" title="Mouvements par mois" /> : null}
      {metrics.overdueAging.some((item) => item.value) ? <BarChart data={metrics.overdueAging} description="Sorties actives classées par ancienneté du retard" title="Retards par tranche" /> : null}
      {metrics.distributionByZone.length ? <BarChart data={metrics.distributionByZone} description="Documents distincts, dans le périmètre autorisé" title="Répartition par zone" /> : null}
    </section>
    {user.permissions.includes(PERMISSIONS.MOUVEMENTS_READ) ? <section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold">Mouvements récents</h2><p className="text-sm text-slate-500">Activité de la période sélectionnée</p></div><Link className="button-secondary" href="/mouvements">Voir l&apos;historique</Link></div>{metrics.recent.length ? <div className="table-shell"><table className="data-table"><caption className="sr-only">Mouvements récents</caption><thead><tr><th scope="col">Document</th><th scope="col">Bénéficiaire</th><th scope="col">Sortie</th><th scope="col">Situation</th></tr></thead><tbody>{metrics.recent.map((item) => <tr key={item.id}><td>{item.document.reference} — {item.document.titre}</td><td>{item.utilisateur.nom}</td><td>{formatDateTime(item.dateSortie)}</td><td>{item.overdueDays ? <StatusBadge label={`Retard ${item.overdueDays} j`} value="INDISPONIBLE" /> : item.dateRetour ? <StatusBadge value="RETOURNEE" /> : <StatusBadge value="EN_COURS" />}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucun mouvement sur cette période" />}</section> : null}
  </div>;
}
