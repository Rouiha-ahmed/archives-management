import "server-only";

import QRCode from "qrcode";

import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";

export async function generateBoiteQr(actorId: string, boiteId: string) {
  await assertPermission(actorId, PERMISSIONS.ARCHIVES_READ);
  const exists = await prisma.boite.findUnique({
    where: { id: boiteId },
    select: { id: true },
  });
  if (!exists) throw new ValidationError("Boîte introuvable.");
  const origin = new URL(process.env.AUTH_URL || "http://localhost:3000").origin;
  const securedUrl = new URL(`/boites/${exists.id}`, origin).toString();
  return QRCode.toDataURL(securedUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
