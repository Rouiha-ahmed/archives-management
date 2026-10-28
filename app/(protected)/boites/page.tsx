import type { Metadata } from "next";
import Link from "next/link";
import { Box, QrCode, Search } from "lucide-react";

import { BoiteForm } from "@/components/forms/boite-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationLinks } from "@/components/pagination-links";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listBoites } from "@/modules/boites/service";
import { listEmplacements } from "@/modules/emplacements/service";

export const metadata: Metadata = { title: "Boîtes d'archives" };
export const instant = false;

export default async function BoitesPage({ searchParams }: { searchParams: Promise<{ q?: string; emplacementId?: string; page?: string }> }) {
  const actor = await requirePermission(PERMISSIONS.ARCHIVES_READ);
  const filters = await searchParams;
  const [result, locations] = await Promise.all([
    listBoites(actor.id, filters),
    listEmplacements(actor.id, { pageSize: "100" }),
  ]);
  const canManage = actor.permissions.includes(PERMISSIONS.BOITES_MANAGE);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Stockage physique" title="Boîtes d'archives" description="Chaque boîte possède une identité stable et une étiquette QR sécurisée." actions={<span className="badge self-center">{result.total.toLocaleString("fr-FR")} boîte(s)</span>} />
      {canManage ? <details className="card p-6"><summary className="cursor-pointer font-semibold">Créer une boîte</summary><div className="mt-5"><BoiteForm emplacements={locations.items} /></div></details> : null}
      <form className="card grid gap-3 p-5 lg:grid-cols-[1fr_260px_auto_auto]" method="get"><div><label className="field-label" htmlFor="box-search">Code ou description</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-slate-400" /><input className="field pl-9" defaultValue={filters.q} id="box-search" name="q" placeholder="Rechercher une boîte" /></div></div><div><label className="field-label" htmlFor="box-location-filter">Emplacement</label><select className="field" defaultValue={filters.emplacementId} id="box-location-filter" name="emplacementId"><option value="">Tous les emplacements</option>{locations.items.map((location) => <option key={location.id} value={location.id}>{location.zone} / {location.rack} / {location.niveau}</option>)}</select></div><button className="button-primary self-end">Filtrer</button><Link className="button-secondary self-end" href="/boites">Effacer</Link></form>
      {result.items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.items.map((box) => <Link className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md" href={`/boites/${box.id}`} key={box.id} prefetch><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-800"><Box className="size-5" /></span><QrCode className="size-5 text-slate-400" /></div><h2 className="mt-5 text-lg font-semibold">{box.code}</h2><p className="mt-1 text-sm text-slate-500">{box.emplacement.zone} · {box.emplacement.rack} · {box.emplacement.niveau}</p><p className="mt-4 text-sm">{box._count.documents} document(s)</p></Link>)}</div> : <EmptyState title="Aucune boîte trouvée" description="Modifiez ou réinitialisez les filtres de recherche." />}
      <PaginationLinks page={result.page} pageSize={result.pageSize} params={{ q: filters.q, emplacementId: filters.emplacementId }} pathname="/boites" total={result.total} />
    </div>
  );
}
