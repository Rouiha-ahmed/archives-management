import type { Metadata } from "next";
import { Search } from "lucide-react";

import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listAuditLogs } from "@/modules/audit/service";

export const metadata: Metadata = { title: "Journal d'audit" };
export const instant = false;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; entity?: string }>;
}) {
  const actor = await requirePermission(PERMISSIONS.AUDIT_READ);
  const { q = "", action = "", entity = "" } = await searchParams;
  const logs = await listAuditLogs(actor.id, {
    search: q,
    action,
    entityType: entity,
  });

  return (
    <div className="space-y-8">
      <header><p className="eyebrow">Sécurité et traçabilité</p><h1 className="page-title">Journal d&apos;audit</h1><p className="page-description">Vue en lecture seule des opérations sensibles. Les entrées sont protégées contre la modification et la suppression.</p></header>
      <form className="grid gap-3 sm:grid-cols-4" method="get">
        <div className="relative sm:col-span-2"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input className="field pl-9" defaultValue={q} name="q" placeholder="Acteur, cible ou opération" /></div>
        <input className="field" defaultValue={action} name="action" placeholder="Action exacte" />
        <div className="flex gap-2"><input className="field" defaultValue={entity} name="entity" placeholder="Type de cible" /><button className="button-secondary" type="submit">Filtrer</button></div>
      </form>
      <div className="table-shell"><table className="data-table"><thead><tr><th>Horodatage</th><th>Acteur</th><th>Opération</th><th>Cible</th><th>Métadonnées</th></tr></thead><tbody>
        {logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap text-xs">{log.createdAt.toLocaleString("fr-FR")}</td><td>{log.actor ? <><p className="font-medium">{log.actor.nom}</p><p className="text-xs text-slate-500">{log.actor.email}</p></> : <span className="text-slate-400">Système</span>}</td><td><code className="rounded bg-slate-100 px-2 py-1 text-xs">{log.action}</code></td><td><p className="font-medium">{log.entityType}</p><p className="max-w-48 truncate text-xs text-slate-500">{log.entityId ?? "—"}</p></td><td><pre className="max-w-80 overflow-hidden whitespace-pre-wrap text-xs text-slate-500">{log.metadata ? JSON.stringify(log.metadata, null, 2) : "—"}</pre></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
