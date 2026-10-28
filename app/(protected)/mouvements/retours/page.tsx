import type { Metadata } from "next";

import { ReturnForm } from "@/components/forms/return-form";
import { requirePermission } from "@/lib/auth/dal";
import { formatDateTime, overdueDays } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listBoites } from "@/modules/boites/service";
import { listActiveMovements } from "@/modules/mouvements/service";

export const metadata: Metadata = { title: "Retours physiques" };
export const instant = false;

export default async function ReturnsPage() {
  const actor = await requirePermission(PERMISSIONS.MOUVEMENTS_RETURN);
  const [movements, boxes] = await Promise.all([listActiveMovements(actor.id), listBoites(actor.id, { pageSize: "100" })]);
  return <div className="space-y-8"><header><p className="eyebrow">Réintégration</p><h1 className="page-title">Retours physiques</h1><p className="page-description">Vérifiez la référence, l&apos;état du document et sa boîte avant de clôturer le mouvement.</p></header><div className="grid gap-5">{movements.map((movement) => { const late = movement.retourPrevu ? overdueDays(movement.retourPrevu) : 0; return <article className="card p-6" key={movement.id}><div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{movement.document.reference} — {movement.document.titre}</h2><p className="mt-1 text-sm text-slate-500">Chez {movement.utilisateur.nom} depuis le {formatDateTime(movement.dateSortie)}</p></div>{late ? <span className="badge bg-red-50 text-red-700">Retard {late} j</span> : <span className="badge">Retour {formatDateTime(movement.retourPrevu)}</span>}</div><ReturnForm boites={boxes.items} mouvementId={movement.id} reference={movement.document.reference} /></article>; })}{movements.length === 0 ? <div className="card p-8 text-center text-sm text-slate-500">Aucune sortie active.</div> : null}</div></div>;
}
