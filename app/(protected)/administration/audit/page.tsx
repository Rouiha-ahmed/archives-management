import type { Metadata } from "next";
import Link from "next/link";
import { Filter, Search } from "lucide-react";

import { AuditDetailsDialog } from "@/components/audit-details-dialog";
import { EmptyState } from "@/components/empty-state";
import { PaginationLinks } from "@/components/pagination-links";
import { requirePermission } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_OPTIONS,
  type AuditActionTone,
  type AuditDetail,
  type AuditLogView,
} from "@/modules/audit/presentation";
import { listAuditLogs } from "@/modules/audit/service";

export const metadata: Metadata = { title: "Journal d'audit" };
export const instant = false;

type AuditSearchParams = {
  q?: string;
  action?: string;
  entity?: string;
  page?: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  const actor = await requirePermission(PERMISSIONS.AUDIT_READ);
  const { q = "", action = "", entity = "", page = "1" } = await searchParams;
  const result = await listAuditLogs(actor.id, {
    search: q,
    action,
    entityType: entity,
    page,
  });
  const actionCategories = [...new Set(AUDIT_ACTION_OPTIONS.map(({ category }) => category))];

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Sécurité et traçabilité</p>
        <h1 className="page-title">Journal d&apos;audit</h1>
        <p className="page-description">
          Comprenez qui a réalisé chaque opération, sur quel élément et à quel moment.
          Le journal reste en lecture seule et protégé contre la modification ou la suppression.
        </p>
      </header>

      <form className="card grid gap-4 p-5 lg:grid-cols-[minmax(280px,2fr)_minmax(220px,1fr)_minmax(190px,1fr)_auto]" method="get">
        <div>
          <label className="field-label" htmlFor="audit-search">Recherche</label>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-slate-400" />
            <input
              className="field pl-9"
              defaultValue={q}
              id="audit-search"
              name="q"
              placeholder="Rechercher par utilisateur, document ou action"
            />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="audit-action">Action</label>
          <select className="field" defaultValue={action} id="audit-action" name="action">
            <option value="">Toutes les actions</option>
            {actionCategories.map((category) => (
              <optgroup key={category} label={category}>
                {AUDIT_ACTION_OPTIONS.filter((option) => option.category === category).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="audit-entity">Élément concerné</label>
          <select className="field" defaultValue={entity} id="audit-entity" name="entity">
            <option value="">Tous les éléments</option>
            {AUDIT_ENTITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="button-primary inline-flex gap-2" type="submit">
            <Filter aria-hidden="true" className="size-4" />
            Filtrer
          </button>
          {(q || action || entity) ? <Link className="button-secondary" href="/administration/audit">Effacer</Link> : null}
        </div>
      </form>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Historique des opérations</h2>
          <p className="mt-1 text-sm text-slate-500">{result.total.toLocaleString("fr-FR")} événement(s) correspondant aux critères.</p>
        </div>
        <span className="badge">Lecture seule</span>
      </div>

      {result.items.length ? (
        <>
          <div className="table-shell hidden xl:block">
            <table className="data-table min-w-[1160px]">
              <caption className="sr-only">Journal des opérations sensibles</caption>
              <thead>
                <tr>
                  <th className="w-40" scope="col">Date et heure</th>
                  <th className="w-52" scope="col">Effectué par</th>
                  <th className="w-80" scope="col">Action</th>
                  <th className="w-64" scope="col">Élément concerné</th>
                  <th scope="col">Détails</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs font-medium text-slate-600">{formatDateTime(entry.createdAt)}</td>
                    <td>
                      <p className="font-medium text-slate-900">{entry.actor.name}</p>
                      {entry.actor.email ? <p className="mt-1 break-all text-xs text-slate-500">{entry.actor.email}</p> : null}
                    </td>
                    <td>
                      <ActionBadge entry={entry} />
                      <p className="mt-2 text-xs leading-5 text-slate-600">{entry.description}</p>
                    </td>
                    <td><p className="font-medium text-slate-900">{entry.subject.label}</p></td>
                    <td>
                      <DetailSummary details={entry.summaryDetails} />
                      <div className="mt-3"><AuditDetailsDialog dateLabel={formatDateTime(entry.createdAt)} entry={entry} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 xl:hidden">
            {result.items.map((entry) => (
              <article className="card p-5" key={entry.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <ActionBadge entry={entry} />
                  <time className="text-xs font-medium text-slate-500" dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                </div>
                <p className="mt-4 text-sm font-medium leading-6 text-slate-900">{entry.description}</p>
                <dl className="mt-4 grid gap-3 border-y border-slate-100 py-4 sm:grid-cols-2">
                  <div><dt className="text-xs text-slate-500">Effectué par</dt><dd className="mt-1 text-sm font-medium">{entry.actor.name}</dd></div>
                  <div><dt className="text-xs text-slate-500">Élément concerné</dt><dd className="mt-1 text-sm font-medium">{entry.subject.label}</dd></div>
                </dl>
                <div className="mt-4"><DetailSummary details={entry.summaryDetails} /></div>
                <div className="mt-4"><AuditDetailsDialog dateLabel={formatDateTime(entry.createdAt)} entry={entry} /></div>
              </article>
            ))}
          </div>

          <PaginationLinks
            page={result.page}
            pageSize={result.pageSize}
            params={{ q, action, entity }}
            pathname="/administration/audit"
            total={result.total}
          />
        </>
      ) : (
        <EmptyState
          description="Modifiez les filtres ou effacez-les pour afficher d'autres opérations."
          title="Aucun événement d'audit trouvé"
        />
      )}
    </div>
  );
}

function ActionBadge({ entry }: { entry: AuditLogView }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClass(entry.action.tone)}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {entry.action.label}
    </span>
  );
}

function DetailSummary({ details }: { details: AuditDetail[] }) {
  if (!details.length) return <p className="text-xs text-slate-500">Aucun détail complémentaire.</p>;
  return (
    <dl className="space-y-1.5 text-xs">
      {details.map((detail) => (
        <div className="grid grid-cols-[minmax(90px,auto)_1fr] gap-2" key={`${detail.label}-${detail.value}`}>
          <dt className="font-medium text-slate-500">{detail.label}</dt>
          <dd className="min-w-0 break-words text-slate-700">{detail.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function toneClass(tone: AuditActionTone) {
  return {
    danger: "bg-red-50 text-red-700 ring-red-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
  }[tone];
}
