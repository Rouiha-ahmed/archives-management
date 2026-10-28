"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = { dashboard: "Tableau de bord", documents: "Documents", boites: "Boîtes", emplacements: "Emplacements", demandes: "Demandes", validations: "Validations", mouvements: "Mouvements", sorties: "Remises", retours: "Retours", "qr-scanner": "Scanner QR", administration: "Administration", utilisateurs: "Utilisateurs", roles: "Rôles", audit: "Journal d'audit" };

export function Breadcrumbs() {
  const parts = usePathname().split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  return <nav aria-label="Fil d’Ariane" className="mb-5 overflow-x-auto text-sm text-slate-500"><ol className="flex min-w-max items-center gap-2"><li><Link aria-label="Tableau de bord" className="hover:text-blue-700" href="/dashboard"><Home aria-hidden="true" className="size-4" /></Link></li>{parts.map((part, index) => { const href = `/${parts.slice(0, index + 1).join("/")}`; const last = index === parts.length - 1; const label = labels[part] ?? (last ? "Détail" : part); return <li className="flex items-center gap-2" key={href}><ChevronRight aria-hidden="true" className="size-3.5" />{last ? <span aria-current="page" className="font-medium text-slate-800">{label}</span> : <Link className="hover:text-blue-700" href={href}>{label}</Link>}</li>; })}</ol></nav>;
}
