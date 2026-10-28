"use client";

import Link from "next/link";
import { Archive, Boxes, ChevronDown, ClipboardCheck, FolderArchive, History, LayoutDashboard, LogOut, MapPin, Menu, PackageOpen, QrCode, RotateCcw, Shield, Users, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/lib/auth/actions";

export type NavigationIcon = "dashboard" | "documents" | "boxes" | "location" | "requests" | "shield" | "handover" | "return" | "history" | "qr" | "users" | "audit";
export type NavigationItem = { href: string; label: string; icon: NavigationIcon; section?: string };
const icons = { dashboard: LayoutDashboard, documents: FolderArchive, boxes: Boxes, location: MapPin, requests: ClipboardCheck, shield: Shield, handover: PackageOpen, return: RotateCcw, history: History, qr: QrCode, users: Users, audit: Archive };

export function AppNavigation({ user, items }: { user: { nom: string; email: string; roles: string[] }; items: NavigationItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <>
    <button aria-controls="main-navigation" aria-expanded={open} aria-label="Ouvrir le menu" className="fixed right-4 top-4 z-50 grid size-11 place-items-center rounded-xl bg-slate-950 text-white shadow-lg focus-visible:ring-3 focus-visible:ring-blue-500 lg:hidden" onClick={() => setOpen((value) => !value)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
    {open ? <button aria-label="Fermer le menu" className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden" onClick={() => setOpen(false)} /> : null}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-slate-950 text-slate-100 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`} id="main-navigation">
      <Link className="flex items-center gap-3 px-6 py-6 font-semibold focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400" href="/dashboard" onClick={() => setOpen(false)}><span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Archive aria-hidden="true" className="size-5" /></span><span>Archives Enterprise</span></Link>
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-4 pb-5 text-sm">{items.map((item, index) => { const previous = items[index - 1]?.section; const active = item.href === "/dashboard" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`); const Icon = icons[item.icon]; return <div key={item.href}>{item.section && item.section !== previous ? <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.section}</p> : null}<Link aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition focus-visible:ring-2 focus-visible:ring-blue-400 ${active ? "bg-blue-500/15 font-medium text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`} href={item.href} onClick={() => setOpen(false)}><Icon aria-hidden="true" className="size-4" />{item.label}</Link></div>; })}</nav>
      <details className="group border-t border-white/10 p-4"><summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg p-2 hover:bg-white/10"><span className="grid size-9 place-items-center rounded-full bg-blue-500/20 text-sm font-semibold text-blue-200">{initials(user.nom)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.nom}</span><span className="block truncate text-xs text-slate-400">{user.email}</span></span><ChevronDown aria-hidden="true" className="size-4 transition group-open:rotate-180" /></summary><div className="mt-2 rounded-lg bg-white/5 p-2"><p className="px-2 py-1 text-xs text-slate-400">{user.roles.join(" · ")}</p><form action={logoutAction}><button className="mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"><LogOut aria-hidden="true" className="size-4" />Déconnexion</button></form></div></details>
    </aside>
  </>;
}
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
