import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { updateBoiteAction } from "@/modules/boites/actions";
import { generateBoiteQr } from "@/modules/boites/qr";
import { getBoite } from "@/modules/boites/service";
import { listEmplacements } from "@/modules/emplacements/service";

export const metadata: Metadata = { title: "Détail de la boîte" };
export const instant = false;

export default async function BoiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission(PERMISSIONS.ARCHIVES_READ);
  const { id } = await params;
  const data = await loadBox(actor.id, id);
  if (!data) notFound();
  const { box, qr } = data;
  const canManage = actor.permissions.includes(PERMISSIONS.BOITES_MANAGE);
  const locations = canManage ? await listEmplacements(actor.id, { pageSize: "100" }) : null;
  const location = `${box.emplacement.zone} / ${box.emplacement.rack} / ${box.emplacement.niveau}`;
  return <div className="space-y-8">
    <PageHeader eyebrow="Boîte sécurisée" title={box.code} description={`Emplacement ${location}`} actions={<PrintButton />} />
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <section className="qr-label card p-6 print:border-2 print:border-slate-950 print:shadow-none"><p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Archives Enterprise</p><div className="mx-auto mt-4 max-w-64 rounded-xl border bg-white p-4"><Image alt={`Code QR de la boîte ${box.code}`} height={512} src={qr} unoptimized width={512} /></div><h2 className="mt-4 text-center text-2xl font-bold tracking-wider">{box.code}</h2><p className="mt-1 text-center text-sm font-medium">{location}</p><p className="mt-3 text-center text-xs text-slate-500">Identification uniquement — aucune autorisation de retrait</p></section>
      <div className="space-y-6">
        <section className="card p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Contenu autorisé</h2><p className="mt-1 text-sm text-slate-500">Accès filtré selon vos permissions</p></div><span className="badge">{box.documents.length} visible(s) / {box._count.documents}</span></div>{box.documents.length ? <div className="mt-5 divide-y divide-slate-100">{box.documents.map((document) => <Link className="flex items-center justify-between gap-4 py-4 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500" href={`/documents/${document.id}`} key={document.id}><div><p className="font-medium">{document.reference} — {document.titre}</p><p className="mt-1 text-xs text-slate-500">{document.classification ?? "Non classé"}</p></div><StatusBadge value={document.statut} /></Link>)}</div> : <div className="mt-5"><EmptyState title="Aucun document visible" description="La boîte est vide ou son contenu est hors de votre périmètre d'accès." /></div>}</section>
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Métadonnées</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Description</dt><dd className="mt-1 font-medium">{box.description || "Aucune description"}</dd></div><div><dt className="text-slate-500">Créée le</dt><dd className="mt-1 font-medium">{formatDateTime(box.createdAt)}</dd></div><div><dt className="text-slate-500">Dernière modification</dt><dd className="mt-1 font-medium">{formatDateTime(box.updatedAt)}</dd></div></dl>
          {canManage && locations ? <details className="mt-6 border-t pt-5"><summary className="cursor-pointer font-semibold text-blue-800">Modifier la boîte</summary><form action={updateBoiteAction} className="mt-4 grid gap-4 sm:grid-cols-2"><input name="id" type="hidden" value={box.id} /><div><label className="field-label" htmlFor="box-edit-code">Code unique</label><input className="field" defaultValue={box.code} id="box-edit-code" name="code" required /></div><div><label className="field-label" htmlFor="box-edit-location">Emplacement</label><select className="field" defaultValue={box.emplacementId} id="box-edit-location" name="emplacementId" required>{locations.items.map((item) => <option key={item.id} value={item.id}>{item.zone} / {item.rack} / {item.niveau}</option>)}</select></div><div className="sm:col-span-2"><label className="field-label" htmlFor="box-edit-description">Description</label><textarea className="textarea-field" defaultValue={box.description ?? ""} id="box-edit-description" name="description" /></div><div className="sm:col-span-2"><button className="button-primary">Enregistrer les modifications</button></div></form></details> : null}
        </section>
      </div>
    </div>
  </div>;
}

async function loadBox(actorId: string, id: string) { try { const [box, qr] = await Promise.all([getBoite(actorId, id), generateBoiteQr(actorId, id)]); return { box, qr }; } catch { return null; } }
