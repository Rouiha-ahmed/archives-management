import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, href, danger = false }: { label: string; value: number; icon: LucideIcon; href: string; danger?: boolean }) {
  return <Link aria-label={`${label} : ${value}`} className="card group p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:ring-3 focus-visible:ring-blue-600/30" href={href}><div className="flex items-center justify-between"><span className={`grid size-10 place-items-center rounded-xl ${danger && value ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}><Icon aria-hidden="true" className="size-5" /></span><span className="text-3xl font-semibold tabular-nums text-slate-950">{value.toLocaleString("fr-FR")}</span></div><p className="mt-4 text-sm font-medium text-slate-600">{label}</p></Link>;
}
