import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";

import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { setRolePermissionAction } from "@/modules/roles/actions";
import { listPermissions, listRoles } from "@/modules/roles/service";

export const metadata: Metadata = { title: "Rôles et permissions" };
export const instant = false;

export default async function RolesPage() {
  const actor = await requirePermission(PERMISSIONS.ROLES_READ);
  const [roles, permissions] = await Promise.all([
    listRoles(actor.id),
    listPermissions(actor.id),
  ]);
  const canUpdate = actor.permissions.includes(PERMISSIONS.ROLES_UPDATE);

  return (
    <div className="space-y-8">
      <header><p className="eyebrow">Administration</p><h1 className="page-title">Rôles et permissions</h1><p className="page-description">Les rôles système sont protégés. Chaque modification invalide les sessions des utilisateurs concernés.</p></header>
      <div className="grid gap-5 xl:grid-cols-2">
        {roles.map((role) => {
          const enabled = new Set(role.permissions.map(({ permission }) => permission.id));
          return (
            <section className="card p-6" key={role.id}>
              <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-slate-950">{role.nom}</h2>{role.systeme ? <LockKeyhole className="size-4 text-amber-600" aria-label="Rôle système protégé" /> : null}</div><p className="mt-1 text-xs font-medium text-cyan-700">{role.code} · {role._count.utilisateurs} utilisateur(s)</p><p className="mt-3 text-sm leading-6 text-slate-600">{role.description}</p></div></div>
              <div className="mt-5 grid gap-2">
                {permissions.map((permission) => (
                  <form action={setRolePermissionAction} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5" key={permission.id}>
                    <input type="hidden" name="roleId" value={role.id} /><input type="hidden" name="permissionId" value={permission.id} /><input type="hidden" name="enabled" value={enabled.has(permission.id) ? "false" : "true"} />
                    <div><p className="text-sm font-medium text-slate-800">{permission.code}</p><p className="text-xs text-slate-500">{permission.description}</p></div>
                    <button className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled.has(permission.id) ? "bg-cyan-700" : "bg-slate-300"}`} disabled={!canUpdate} title={enabled.has(permission.id) ? "Retirer" : "Attribuer"} aria-label={`${enabled.has(permission.id) ? "Retirer" : "Attribuer"} ${permission.code}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${enabled.has(permission.id) ? "left-6" : "left-1"}`} /></button>
                  </form>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
