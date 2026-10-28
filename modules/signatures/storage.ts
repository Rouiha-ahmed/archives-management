import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { ValidationError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions/definitions";
import { assertPermission } from "@/lib/permissions/service";
import { prisma } from "@/lib/prisma";
import { absoluteSignatureStoragePath } from "@/modules/signatures/storage-path";

const MAX_SIGNATURE_BYTES = 512_000;
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function absoluteStoragePath(storageKey: string) {
  try {
    return absoluteSignatureStoragePath(storageKey);
  } catch {
    throw new ValidationError("Référence de signature invalide.");
  }
}

export type StagedSignature = {
  storageKey: string;
  mimeType: "image/png";
  checksum: string;
  byteSize: number;
};

export async function stageSignature(dataUrl: string): Promise<StagedSignature> {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new ValidationError("La signature doit être une image PNG valide.");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length < 100 || bytes.length > MAX_SIGNATURE_BYTES) {
    throw new ValidationError("La taille de la signature est invalide.");
  }
  if (!bytes.subarray(0, PNG_HEADER.length).equals(PNG_HEADER)) {
    throw new ValidationError("Le contenu de la signature n'est pas un PNG valide.");
  }

  const storageKey = `signatures/${randomUUID()}.png`;
  const target = absoluteStoragePath(storageKey);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
  return {
    storageKey,
    mimeType: "image/png",
    checksum: createHash("sha256").update(bytes).digest("hex"),
    byteSize: bytes.length,
  };
}

export async function removeStagedSignature(evidence: StagedSignature) {
  await unlink(absoluteStoragePath(evidence.storageKey)).catch(() => undefined);
}

export async function readSignatureEvidence(actorId: string, signatureId: string) {
  await assertPermission(actorId, PERMISSIONS.SIGNATURES_READ);
  const signature = await prisma.signature.findUnique({
    where: { id: signatureId },
    select: {
      id: true,
      storageKey: true,
      mimeType: true,
      checksum: true,
      mouvement: { select: { document: { select: { reference: true } } } },
    },
  });
  if (!signature) throw new ValidationError("Signature introuvable.");
  const bytes = await readFile(
    /* turbopackIgnore: true */ absoluteStoragePath(signature.storageKey),
  );
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== signature.checksum) {
    throw new Error("Signature evidence integrity check failed.");
  }
  return {
    bytes,
    mimeType: signature.mimeType,
    filename: `accuse-${signature.mouvement.document.reference}.png`,
  };
}
