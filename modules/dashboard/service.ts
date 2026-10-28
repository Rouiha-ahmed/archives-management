import "server-only";

import { overdueDays } from "@/lib/date";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { hasPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";

export async function getDashboardMetrics(actorId: string, filters: { from?: string; to?: string } = {}) {
  const [canReadArchives, canManageArchives, canReadRequests, canReadMovements] = await Promise.all([
    hasPermission(actorId, PERMISSIONS.ARCHIVES_READ),
    hasPermission(actorId, PERMISSIONS.ARCHIVES_UPDATE),
    hasPermission(actorId, PERMISSIONS.DEMANDES_READ_ALL),
    hasPermission(actorId, PERMISSIONS.MOUVEMENTS_READ),
  ]);
  const now = new Date();
  const from = validDate(filters.from, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)));
  const to = validDate(filters.to, now, true);
  const documentScope = { confidentiel: canManageArchives ? undefined : false };

  const [documents, boxes, available, checkedOut, pending, overdue, recent, requestGroups, movementRows, overdueRows, zoneRows] = await Promise.all([
    canReadArchives ? prisma.document.count({ where: documentScope }) : null,
    canReadArchives ? prisma.boite.count() : null,
    canReadArchives ? prisma.document.count({ where: { ...documentScope, statut: "DISPONIBLE" } }) : null,
    canReadMovements ? prisma.mouvement.count({ where: { dateRetour: null } }) : null,
    canReadRequests ? prisma.demandeAcces.count({ where: { statut: "EN_ATTENTE" } }) : null,
    canReadMovements ? prisma.mouvement.count({ where: { dateRetour: null, retourPrevu: { lt: now } } }) : null,
    canReadMovements ? prisma.mouvement.findMany({
      where: { dateSortie: { gte: from, lte: to } },
      select: { id: true, dateSortie: true, dateRetour: true, retourPrevu: true, document: { select: { reference: true, titre: true } }, utilisateur: { select: { nom: true } } },
      orderBy: { dateSortie: "desc" }, take: 8,
    }) : [],
    canReadRequests ? prisma.demandeAcces.groupBy({ by: ["statut"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }) : [],
    canReadMovements ? prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
      SELECT date_trunc('month', "date_sortie") AS bucket, COUNT(*)::bigint AS count
      FROM "mouvements" WHERE "date_sortie" >= ${from} AND "date_sortie" <= ${to}
      GROUP BY 1 ORDER BY 1
    ` : [],
    canReadMovements ? prisma.mouvement.findMany({ where: { dateRetour: null, retourPrevu: { lt: now } }, select: { retourPrevu: true } }) : [],
    canReadArchives ? prisma.$queryRaw<Array<{ zone: string; count: bigint }>>`
      SELECT e."zone", COUNT(DISTINCT d."id")::bigint AS count
      FROM "documents" d JOIN "boites" b ON b."id" = d."boite_id"
      JOIN "emplacements" e ON e."id" = b."emplacement_id"
      WHERE (${canManageArchives}::boolean OR d."confidentiel" = false)
      GROUP BY e."zone" ORDER BY count DESC, e."zone" ASC LIMIT 10
    ` : [],
  ]);

  const aging = { "1–7 jours": 0, "8–30 jours": 0, "> 30 jours": 0 };
  for (const row of overdueRows) { const days = row.retourPrevu ? overdueDays(row.retourPrevu, now) : 0; if (days > 30) aging["> 30 jours"] += 1; else if (days > 7) aging["8–30 jours"] += 1; else if (days > 0) aging["1–7 jours"] += 1; }

  return {
    documents, boxes, available, checkedOut, pending, overdue, from, to,
    recent: recent.map((item) => ({ ...item, overdueDays: !item.dateRetour && item.retourPrevu ? overdueDays(item.retourPrevu, now) : 0 })),
    requestsByStatus: requestGroups.map((item) => ({ label: item.statut, value: item._count._all })),
    movementsOverTime: movementRows.map((item) => ({ label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(item.bucket), value: Number(item.count) })),
    overdueAging: Object.entries(aging).map(([label, value]) => ({ label, value })),
    distributionByZone: zoneRows.map((item) => ({ label: item.zone, value: Number(item.count) })),
  };
}

function validDate(value: string | undefined, fallback: Date, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
