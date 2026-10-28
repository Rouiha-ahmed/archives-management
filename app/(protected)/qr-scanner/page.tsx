import type { Metadata } from "next";

import { QrScanner } from "@/components/qr-scanner";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions/definitions";

export const metadata: Metadata = { title: "Scanner QR" };
export const instant = false;

export default async function QrScannerPage() {
  await requirePermission(PERMISSIONS.ARCHIVES_READ);
  return <div className="space-y-8"><header><p className="eyebrow">Identification physique</p><h1 className="page-title">Scanner une boîte</h1><p className="page-description">Le navigateur demande l&apos;accès caméra uniquement à votre clic. Une saisie manuelle reste disponible.</p></header><QrScanner /></div>;
}
