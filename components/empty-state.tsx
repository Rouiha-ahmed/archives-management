import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center"><Inbox aria-hidden="true" className="mx-auto size-8 text-slate-400" /><h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>{description ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}</div>;
}
