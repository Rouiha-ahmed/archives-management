import type { Metadata } from "next";
import { Search, UserPlus } from "lucide-react";

import { CreateUserForm } from "@/components/forms/create-user-form";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { listRoles } from "@/modules/roles/service";
import { setUserActiveAction, setUserRoleAction } from "@/modules/users/actions";
import { listUsers } from "@/modules/users/service";

export const metadata: Metadata = { title: "Utilisateurs" };
export const instant = false;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requirePermission(PERMISSIONS.USERS_READ);
  const { q = "" } = await searchParams;
  const [users, roles] = await Promise.all([listUsers(actor.id, q), listRoles(actor.id)]);
  const canCreate = actor.permissions.includes(PERMISSIONS.USERS_CREATE);
  const canAssign = actor.permissions.includes(PERMISSIONS.USERS_ASSIGN_ROLES);
  const canActivate = actor.permissions.includes(PERMISSIONS.USERS_ACTIVATE);
  const canUpdate = actor.permissions.includes(PERMISSIONS.USERS_UPDATE);

  return (
    <div className="space-y-8">
      <header><p className="eyebrow">Administration</p><h1 className="page-title">Utilisateurs</h1><p className="page-description">Créez les identités internes, gérez les rôles et révoquez immédiatement les accès.</p></header>
      {canCreate ? <details className="card group p-6" open><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><UserPlus className="size-4 text-cyan-700" />Créer un utilisateur</summary><div className="mt-5"><CreateUserForm roles={roles} /></div></details> : null}
      <form className="flex max-w-lg gap-2" method="get"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input className="field pl-9" defaultValue={q} name="q" placeholder="Nom ou adresse e-mail" /></div><button className="button-secondary" type="submit">Rechercher</button></form>
      <div className="table-shell"><table className="data-table"><thead><tr><th>Utilisateur</th><th>État</th><th>Rôles</th><th>Dernière connexion</th><th>Actions</th></tr></thead><tbody>
        {users.map((user) => {
          const assigned = new Set(user.roles.map(({ role }) => role.id));
          return <tr key={user.id}><td><p className="font-medium text-slate-950">{user.nom}</p><p className="text-xs text-slate-500">{user.email}</p></td><td><span className={`badge ${user.actif ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{user.actif ? "Actif" : "Inactif"}</span></td><td><div className="flex flex-wrap gap-1.5">{roles.map((role) => canAssign ? <form action={setUserRoleAction} key={role.id}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="roleId" value={role.id} /><input type="hidden" name="assigned" value={assigned.has(role.id) ? "false" : "true"} /><button className={`badge border ${assigned.has(role.id) ? "border-cyan-200 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-400"}`} title={assigned.has(role.id) ? "Retirer le rôle" : "Attribuer le rôle"}>{role.code}</button></form> : assigned.has(role.id) ? <span className="badge" key={role.id}>{role.code}</span> : null)}</div></td><td className="whitespace-nowrap text-xs">{user.lastLoginAt ? user.lastLoginAt.toLocaleString("fr-FR") : "Jamais"}</td><td><div className="flex flex-col items-start gap-2">{canActivate ? <form action={setUserActiveAction}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="active" value={user.actif ? "false" : "true"} /><button className={user.actif ? "button-danger" : "button-secondary"}>{user.actif ? "Désactiver" : "Activer"}</button></form> : null}{canUpdate ? <details><summary className="cursor-pointer text-xs font-medium text-cyan-800">Réinitialiser le mot de passe</summary><ResetPasswordForm userId={user.id} /></details> : null}</div></td></tr>;
        })}
      </tbody></table></div>
    </div>
  );
}
