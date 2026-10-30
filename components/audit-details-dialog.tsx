"use client";

import { Eye, X } from "lucide-react";
import { useId, useRef } from "react";

import type { AuditDetail, AuditLogView } from "@/modules/audit/presentation";

export function AuditDetailsDialog({
  entry,
  dateLabel,
}: {
  entry: AuditLogView;
  dateLabel: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        className="button-secondary gap-2 whitespace-nowrap"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <Eye aria-hidden="true" className="size-4" />
        Voir les détails
      </button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="m-auto max-h-[90vh] w-[min(760px,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/50"
        onClick={(event) => {
          if (event.currentTarget === event.target) event.currentTarget.close();
        }}
        ref={dialogRef}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Détail de l&apos;événement
            </p>
            <h2 className="mt-1 text-xl font-semibold" id={titleId}>{entry.action.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600" id={descriptionId}>{entry.description}</p>
          </div>
          <form method="dialog">
            <button
              aria-label="Fermer les détails"
              className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-3 focus-visible:ring-blue-600/25"
              type="submit"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </form>
        </div>

        <div className="space-y-6 px-6 py-6">
          <section aria-labelledby={`${titleId}-summary`}>
            <h3 className="text-sm font-semibold text-slate-950" id={`${titleId}-summary`}>Informations principales</h3>
            <dl className="mt-3 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <DetailTerm label="Date et heure" value={dateLabel} />
              <DetailTerm label="Effectué par" value={entry.actor.email ? `${entry.actor.name} — ${entry.actor.email}` : entry.actor.name} />
              <DetailTerm label="Action" value={entry.action.label} />
              <DetailTerm label="Élément concerné" value={entry.subject.label} />
              {entry.subject.businessReference ? <DetailTerm label="Référence métier" value={entry.subject.businessReference} /> : null}
            </dl>
          </section>

          <DetailSection details={entry.metadataDetails} title="Informations complémentaires" />
          <div className="grid gap-5 sm:grid-cols-2">
            <DetailSection details={entry.previousValues} emptyLabel="Aucune valeur antérieure enregistrée." title="Avant" />
            <DetailSection details={entry.newValues} emptyLabel="Aucune nouvelle valeur enregistrée." title="Après" />
          </div>

          {entry.canViewTechnicalDetails ? (
            <details className="rounded-xl border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                Informations techniques réservées aux administrateurs
              </summary>
              <div className="space-y-5 border-t border-slate-200 px-4 py-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {entry.technicalDetails.map((detail) => (
                    <DetailTerm key={`${detail.label}-${detail.value}`} label={detail.label} technical value={detail.value} />
                  ))}
                </dl>
                <TechnicalPayload label="Métadonnées d'origine" value={entry.technicalPayload.metadata} />
                <TechnicalPayload label="Valeurs antérieures d'origine" value={entry.technicalPayload.oldValues} />
                <TechnicalPayload label="Nouvelles valeurs d'origine" value={entry.technicalPayload.newValues} />
              </div>
            </details>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-slate-200 bg-white px-6 py-4">
          <form method="dialog">
            <button className="button-primary inline-flex" type="submit">Fermer</button>
          </form>
        </div>
      </dialog>
    </>
  );
}

function DetailSection({
  title,
  details,
  emptyLabel = "Aucune information complémentaire enregistrée.",
}: {
  title: string;
  details: AuditDetail[];
  emptyLabel?: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      {details.length ? (
        <dl className="mt-3 grid gap-3 rounded-xl border border-slate-200 p-4">
          {details.map((detail) => (
            <DetailTerm key={`${detail.label}-${detail.value}`} label={detail.label} value={detail.value} />
          ))}
        </dl>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </section>
  );
}

function DetailTerm({ label, value, technical = false }: { label: string; value: string; technical?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm text-slate-800 ${technical ? "font-mono text-xs" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

function TechnicalPayload({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
