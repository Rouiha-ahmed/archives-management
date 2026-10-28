import { AppNavigation, type NavigationItem } from "@/components/app-navigation";
import { requireActiveUser } from "@/lib/auth/dal";
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/definitions";

export async function Navigation() {
  const user = await requireActiveUser();
  const can = (permission: PermissionCode) => user.permissions.includes(permission);
  const items: Array<NavigationItem | false> = [
    { href: "/dashboard", label: "Tableau de bord", icon: "dashboard", section: "Pilotage" },
    can(PERMISSIONS.ARCHIVES_READ) && { href: "/documents", label: "Documents", icon: "documents", section: "Archives" },
    can(PERMISSIONS.ARCHIVES_READ) && { href: "/boites", label: "Boîtes", icon: "boxes", section: "Archives" },
    can(PERMISSIONS.ARCHIVES_READ) && { href: "/emplacements", label: "Emplacements", icon: "location", section: "Archives" },
    (can(PERMISSIONS.DEMANDES_READ_OWN) || can(PERMISSIONS.DEMANDES_READ_ALL)) && { href: "/demandes", label: "Demandes", icon: "requests", section: "Circulation" },
    can(PERMISSIONS.DEMANDES_READ_ALL) && { href: "/validations", label: "Validations", icon: "shield", section: "Circulation" },
    can(PERMISSIONS.MOUVEMENTS_HANDOVER) && { href: "/mouvements/sorties", label: "Remises", icon: "handover", section: "Circulation" },
    can(PERMISSIONS.MOUVEMENTS_RETURN) && { href: "/mouvements/retours", label: "Retours", icon: "return", section: "Circulation" },
    can(PERMISSIONS.MOUVEMENTS_READ) && { href: "/mouvements", label: "Historique", icon: "history", section: "Circulation" },
    can(PERMISSIONS.ARCHIVES_READ) && { href: "/qr-scanner", label: "Scanner QR", icon: "qr", section: "Outils" },
    can(PERMISSIONS.USERS_READ) && { href: "/administration/utilisateurs", label: "Utilisateurs", icon: "users", section: "Administration" },
    can(PERMISSIONS.ROLES_READ) && { href: "/administration/roles", label: "Rôles et permissions", icon: "shield", section: "Administration" },
    can(PERMISSIONS.AUDIT_READ) && { href: "/administration/audit", label: "Journal d'audit", icon: "audit", section: "Administration" },
  ];
  return <AppNavigation items={items.filter((item): item is NavigationItem => Boolean(item))} user={user} />;
}
