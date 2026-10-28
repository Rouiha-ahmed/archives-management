import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { EmplacementForm } from "@/components/forms/emplacement-form";
import { PageHeader } from "@/components/page-header";
import { PaginationLinks } from "@/components/pagination-links";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { updateEmplacementAction } from "@/modules/emplacements/actions";
import { listEmplacements } from "@/modules/emplacements/service";

export const metadata: Metadata = { title: "Emplacements" };
export const instant = false;

export default async function EmplacementsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const actor = await requirePermission(PERMISSIONS.ARCHIVES_READ);
  const filters = await searchParams;
  const result = await listEmplacements(actor.id, filters);
  const canManage = actor.permissions.includes(PERMISSIONS.EMPLACEMENTS_MANAGE);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Stockage physique" title="Emplacements" description="Structure contrôlée Zone → Rack → Niveau. Les doublons sont bloqués en base." actions={<span className="badge self-center">{result.total.toLocaleString("fr-FR")} emplacement(s)</span>} />
      {canManage ? <details className="card p-6"><summary className="cursor-pointer font-semibold">Créer un emplacement</summary><div className="mt-5"><EmplacementForm /></div></details> : null}
      <form className="card flex max-w-2xl flex-col gap-2 p-5 sm:flex-row" method="get"><div className="flex-1"><label className="field-label" htmlFor="location-search">Zone, rack, niveau ou boîte</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-slate-400" /><input className="field pl-9" defaultValue={filters.q} id="location-search" name="q" placeholder="Rechercher un emplacement" /></div></div><button className="button-primary self-end">Rechercher</button><Link className="button-secondary self-end" href="/emplacements">Effacer</Link></form>
      {result.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {result.items.map((item) => <article className="card p-5" key={item.id}><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-blue-700">{item.zone}</p><h2 className="mt-1 font-semibold">Rack {item.rack} · Niveau {item.niveau}</h2></div><MapPin className="size-5 text-slate-400" /></div><p className="mt-4 text-sm text-slate-500">{item._count.boites} boîte(s)</p><div className="mt-3 flex flex-wrap gap-1">{item.boites.map((box) => <Link className="badge hover:bg-blue-50 hover:text-blue-800" href={`/boites/${box.id}`} key={box.id}>{box.code}</Link>)}</div>{canManage ? <details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-medium text-blue-800">Modifier</summary><form action={updateEmplacementAction} className="mt-3 grid gap-2"><label className="sr-only" htmlFor={`zone-${item.id}`}>Zone</label><input className="field" defaultValue={item.zone} id={`zone-${item.id}`} name="zone" required /><label className="sr-only" htmlFor={`rack-${item.id}`}>Rack</label><input className="field" defaultValue={item.rack} id={`rack-${item.id}`} name="rack" required /><label className="sr-only" htmlFor={`level-${item.id}`}>Niveau</label><input className="field" defaultValue={item.niveau} id={`level-${item.id}`} name="niveau" required /><input name="id" type="hidden" value={item.id} /><button className="button-secondary">Enregistrer</button></form></details> : null}</article>)}
      </div> : <EmptyState title="Aucun emplacement trouvé" description="Modifiez ou réinitialisez la recherche." />}
      <PaginationLinks page={result.page} pageSize={result.pageSize} params={{ q: filters.q }} pathname="/emplacements" total={result.total} />
    </div>
  );
}
