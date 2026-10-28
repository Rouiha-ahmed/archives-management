import type { Metadata } from "next";
import Link from "next/link";
import { RotateCcw, Search } from "lucide-react";

import { DocumentForm } from "@/components/forms/document-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationLinks } from "@/components/pagination-links";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/dal";
import { formatDate } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listDocuments } from "@/modules/archives/service";
import { listBoites } from "@/modules/boites/service";
import { listEmplacements } from "@/modules/emplacements/service";

export const metadata: Metadata = { title: "Recherche documentaire" };
export const instant = false;

type Filters = { q?: string; reference?: string; titre?: string; description?: string; statut?: string; emplacementId?: string; boiteId?: string; classification?: string; zone?: string; rack?: string; niveau?: string; createdFrom?: string; createdTo?: string; sort?: string; order?: string; page?: string };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const actor = await requirePermission(PERMISSIONS.ARCHIVES_READ);
  const filters = await searchParams;
  const [result, boxes, locations] = await Promise.all([
    listDocuments(actor.id, filters),
    listBoites(actor.id, { pageSize: "100" }),
    listEmplacements(actor.id, { pageSize: "100" }),
  ]);
  return <div className="space-y-7">
    <PageHeader eyebrow="Recherche documentaire" title="Documents" description="Combinez les critères pour retrouver rapidement un document dans votre périmètre autorisé." actions={<span className="badge self-center">{result.total.toLocaleString("fr-FR")} résultat(s)</span>} />
    {actor.permissions.includes(PERMISSIONS.ARCHIVES_CREATE) ? <details className="card p-5"><summary className="cursor-pointer font-semibold text-blue-800">Enregistrer un document</summary><div className="mt-5"><DocumentForm boites={boxes.items} /></div></details> : null}
    <form className="card space-y-5 p-5" method="get" role="search"><div className="flex items-center gap-2"><Search aria-hidden="true" className="size-5 text-blue-700" /><h2 className="font-semibold">Recherche avancée</h2></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Recherche globale" name="q" value={filters.q} placeholder="Référence, titre, description, boîte" />
      <Field label="Référence" name="reference" value={filters.reference} />
      <Field label="Titre" name="titre" value={filters.titre} />
      <Field label="Description" name="description" value={filters.description} />
      <Select label="Statut" name="statut" value={filters.statut} options={[['', 'Tous les statuts'], ['DISPONIBLE', 'Disponible'], ['SORTI', 'Sorti'], ['INDISPONIBLE', 'Indisponible']]} />
      <Select label="Boîte" name="boiteId" value={filters.boiteId} options={[["", "Toutes les boîtes"], ...boxes.items.map((box) => [box.id, box.code])]} />
      <Field label="Zone" list="zones" name="zone" value={filters.zone} /><datalist id="zones">{unique(locations.items.map((item) => item.zone)).map((value) => <option key={value} value={value} />)}</datalist>
      <Field label="Rack" list="racks" name="rack" value={filters.rack} /><datalist id="racks">{unique(locations.items.map((item) => item.rack)).map((value) => <option key={value} value={value} />)}</datalist>
      <Field label="Niveau" list="levels" name="niveau" value={filters.niveau} /><datalist id="levels">{unique(locations.items.map((item) => item.niveau)).map((value) => <option key={value} value={value} />)}</datalist>
      <Field label="Créé à partir du" name="createdFrom" type="date" value={filters.createdFrom} />
      <Field label="Créé jusqu'au" name="createdTo" type="date" value={filters.createdTo} />
      <Select label="Trier par" name="sort" value={filters.sort} options={[["reference", "Référence"], ["titre", "Titre"], ["statut", "Statut"], ["boite", "Boîte"], ["createdAt", "Date de création"], ["updatedAt", "Dernière modification"]]} />
      <Select label="Ordre" name="order" value={filters.order} options={[["asc", "Croissant"], ["desc", "Décroissant"]]} />
    </div><div className="flex flex-wrap gap-3"><button className="button-primary inline-flex gap-2"><Search aria-hidden="true" className="size-4" />Rechercher</button><Link className="button-secondary gap-2" href="/documents"><RotateCcw aria-hidden="true" className="size-4" />Réinitialiser</Link></div></form>
    {result.items.length ? <div className="table-shell"><table className="data-table"><caption className="sr-only">Documents correspondant aux filtres</caption><thead><tr><th scope="col">Référence</th><th scope="col">Titre</th><th scope="col">Boîte / emplacement</th><th scope="col">Statut</th><th scope="col">Création</th></tr></thead><tbody>{result.items.map((document) => <tr key={document.id}><td><Link className="font-semibold text-blue-700 hover:underline" href={`/documents/${document.id}`}>{document.reference}</Link>{document.confidentiel ? <span className="mt-1 block text-xs font-medium text-amber-800">Confidentiel</span> : null}</td><td>{document.titre}<span className="mt-1 block text-xs text-slate-500">{document.classification ?? "Non classé"}</span></td><td><Link className="hover:text-blue-700 hover:underline" href={`/boites/${document.boite.id}`}>{document.boite.code}</Link><span className="mt-1 block text-xs text-slate-500">{document.boite.emplacement.zone} / {document.boite.emplacement.rack} / {document.boite.emplacement.niveau}</span></td><td><StatusBadge value={document.statut} /></td><td className="whitespace-nowrap">{formatDate(document.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucun document trouvé" description="Modifiez ou réinitialisez les filtres. Les documents confidentiels non autorisés restent invisibles." />}
    <PaginationLinks page={result.page} pageSize={result.pageSize} params={filters} pathname="/documents" total={result.total} />
  </div>;
}

function Field({ label, name, value, placeholder, type = "text", list }: { label: string; name: string; value?: string; placeholder?: string; type?: string; list?: string }) { return <div><label className="field-label" htmlFor={`filter-${name}`}>{label}</label><input className="field" defaultValue={value} id={`filter-${name}`} list={list} name={name} placeholder={placeholder} type={type} /></div>; }
function Select({ label, name, value, options }: { label: string; name: string; value?: string; options: string[][] }) { return <div><label className="field-label" htmlFor={`filter-${name}`}>{label}</label><select className="field" defaultValue={value} id={`filter-${name}`} name={name}>{options.map(([key, text]) => <option key={`${name}-${key}`} value={key}>{text}</option>)}</select></div>; }
function unique(values: string[]) { return [...new Set(values)]; }
