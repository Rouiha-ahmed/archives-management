import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

import type { Prisma } from "../../generated/prisma/client";
import type { RoleCode } from "../../lib/permissions/definitions";
import { daysFrom, deterministicUuid, mulberry32, pad, pick } from "../seed-utils/deterministic";

export const DEMO_BATCH = "DEMO_2026";
export const DEMO_MARKER = `[${DEMO_BATCH}]`;
export const DEMO_ANCHOR = new Date("2026-10-28T12:00:00.000Z");
export const DEMO_RANDOM_SEED = 20_261_028;

type DemoUser = Prisma.UtilisateurCreateManyInput & { roleCode: RoleCode };

export type DemoDataset = {
  locations: Prisma.EmplacementCreateManyInput[];
  boxes: Prisma.BoiteCreateManyInput[];
  documents: Prisma.DocumentCreateManyInput[];
  users: DemoUser[];
  requests: Prisma.DemandeAccesCreateManyInput[];
  validations: Prisma.ValidationCreateManyInput[];
  movements: Prisma.MouvementCreateManyInput[];
  signatures: Prisma.SignatureCreateManyInput[];
  audits: Prisma.AuditLogCreateManyInput[];
  signatureBytes: Buffer;
  signatureChecksum: string;
};

const classifications = [
  "Dossiers administratifs",
  "Contrats",
  "Factures",
  "Correspondances",
  "Rapports",
  "Ressources humaines",
  "Dossiers juridiques",
  "Documents financiers",
] as const;

const titleTemplates = [
  "Dossier administratif annuel",
  "Contrat de prestation",
  "Facture fournisseur",
  "Correspondance interne",
  "Rapport administratif trimestriel",
  "Dossier de recrutement synthétique",
  "Convention de partenariat",
  "État financier mensuel",
] as const;

const reasons = [
  "Vérification administrative",
  "Contrôle comptable",
  "Consultation juridique",
  "Préparation d'un rapport",
  "Audit interne",
] as const;

const userDefinitions: Array<{ roleCode: RoleCode; count: number; prefix: string; label: string }> = [
  { roleCode: "ADMIN", count: 2, prefix: "admin", label: "Administrateur" },
  { roleCode: "ARCHIVISTE", count: 4, prefix: "archiviste", label: "Archiviste" },
  { roleCode: "VALIDATEUR", count: 4, prefix: "validateur", label: "Validateur" },
  { roleCode: "DEMANDEUR", count: 10, prefix: "demandeur", label: "Demandeur" },
];

export function buildDemoDataset(): DemoDataset {
  const random = mulberry32(DEMO_RANDOM_SEED);
  const locations: Prisma.EmplacementCreateManyInput[] = [];
  for (const zone of ["A", "B", "C", "D", "E"]) {
    for (let rack = 1; rack <= 2; rack += 1) {
      for (let level = 1; level <= 3; level += 1) {
        const key = `location-${zone}-${rack}-${level}`;
        locations.push({
          id: deterministicUuid(DEMO_BATCH, key),
          zone: `${DEMO_BATCH} / Zone ${zone}`,
          rack: `Rack ${pad(rack, 2)}`,
          niveau: `Niveau ${pad(level, 2)}`,
          createdAt: daysFrom(DEMO_ANCHOR, -500 + locations.length),
          updatedAt: daysFrom(DEMO_ANCHOR, -500 + locations.length),
        });
      }
    }
  }

  const boxes: Prisma.BoiteCreateManyInput[] = Array.from({ length: 100 }, (_, offset) => {
    const index = offset + 1;
    const createdAt = daysFrom(DEMO_ANCHOR, -460 + offset);
    return {
      id: deterministicUuid(DEMO_BATCH, `box-${index}`),
      code: `DEMO-B-${pad(index, 3)}`,
      description: `${DEMO_MARKER} Boîte d'archives synthétique ${pad(index, 3)}.`,
      emplacementId: locations[offset % locations.length].id!,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const users: DemoUser[] = [];
  for (const definition of userDefinitions) {
    for (let position = 1; position <= definition.count; position += 1) {
      const email = `${definition.prefix}.demo${pad(position, 2)}@example.test`;
      const createdAt = daysFrom(DEMO_ANCHOR, -180 + users.length);
      users.push({
        id: deterministicUuid(DEMO_BATCH, `user-${email}`),
        nom: `${DEMO_MARKER} ${definition.label} ${pad(position, 2)}`,
        email,
        actif: true,
        passwordHash: null,
        passwordChangedAt: null,
        createdAt,
        updatedAt: createdAt,
        roleCode: definition.roleCode,
      });
    }
  }

  const movementDocumentStatuses = new Map<number, "SORTI" | "INDISPONIBLE">();
  for (let index = 1; index <= 30; index += 1) movementDocumentStatuses.set(index, "SORTI");
  for (let index = 61; index <= 65; index += 1) movementDocumentStatuses.set(index, "INDISPONIBLE");
  for (let index = 66; index <= 80; index += 1) movementDocumentStatuses.set(index, "SORTI");

  const documents: Prisma.DocumentCreateManyInput[] = Array.from({ length: 1_000 }, (_, offset) => {
    const index = offset + 1;
    const classification = pick(classifications, random);
    const title = pick(titleTemplates, random);
    const createdAt = daysFrom(DEMO_ANCHOR, -420 + Math.floor(random() * 390));
    return {
      id: deterministicUuid(DEMO_BATCH, `document-${index}`),
      reference: `DEMO-DOC-${pad(index, 4)}`,
      titre: `${title} ${2022 + (index % 5)}`,
      description: `${DEMO_MARKER} Document fictif sans donnée personnelle réelle, catégorie ${classification.toLocaleLowerCase("fr")}.`,
      classification,
      confidentiel: index % 11 === 0,
      dateDocument: daysFrom(DEMO_ANCHOR, -(60 + Math.floor(random() * 1_700))),
      statut: movementDocumentStatuses.get(index) ?? "DISPONIBLE",
      boiteId: boxes[offset % boxes.length].id!,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const requesters = users.filter((user) => user.roleCode === "DEMANDEUR");
  const validators = users.filter((user) => user.roleCode === "VALIDATEUR");
  const archivists = users.filter((user) => user.roleCode === "ARCHIVISTE");
  const requests: Prisma.DemandeAccesCreateManyInput[] = [];
  const validations: Prisma.ValidationCreateManyInput[] = [];
  const movements: Prisma.MouvementCreateManyInput[] = [];
  const signatures: Prisma.SignatureCreateManyInput[] = [];
  const audits: Prisma.AuditLogCreateManyInput[] = [];
  const signatureBytes = makeDemoEvidencePng();
  const signatureChecksum = createHash("sha256").update(signatureBytes).digest("hex");

  for (const document of documents) {
    audits.push(audit({
      key: `document-${document.reference}`,
      actorId: archivists[Number(document.reference.slice(-4)) % archivists.length].id!,
      action: "document.created",
      entityType: "Document",
      entityId: document.id!,
      newValues: { reference: document.reference, statut: document.statut, synthetic: true },
      createdAt: new Date(document.createdAt!),
    }));
  }

  for (let index = 1; index <= 150; index += 1) {
    const document = documents[index - 1];
    const requester = requesters[(index - 1) % requesters.length];
    const validator = validators[(index - 1) % validators.length];
    const archivist = archivists[(index - 1) % archivists.length];
    const requestId = deterministicUuid(DEMO_BATCH, `request-${index}`);
    const requestCreatedAt = requestCreatedDate(index);
    const requestKind = requestShape(index);
    const expectedReturn = requestKind.type === "CONSULTATION"
      ? null
      : movementExpectedReturn(index, requestCreatedAt);
    const decisionAt = daysFrom(requestCreatedAt, 1);
    const handoverAt = daysFrom(requestCreatedAt, 2);
    const consultationStartedAt = requestKind.consultationStarted ? handoverAt : null;
    const consultationCompletedAt = requestKind.consultationCompleted
      ? daysFrom(handoverAt, 1)
      : null;

    requests.push({
      id: requestId,
      type: requestKind.type,
      statut: requestKind.status,
      motif: `${DEMO_MARKER} ${reasons[(index - 1) % reasons.length]} — scénario ${pad(index, 3)}.`,
      retourPrevu: expectedReturn,
      documentId: document.id!,
      demandeurId: requester.id!,
      consultationOperateurId: requestKind.consultationStarted ? archivist.id! : null,
      consultationStartedAt,
      consultationCompletedAt,
      createdAt: requestCreatedAt,
      updatedAt: consultationCompletedAt ?? consultationStartedAt ?? decisionAt,
    });

    audits.push(audit({
      key: `request-created-${index}`,
      actorId: requester.id!,
      action: "access_request.created",
      entityType: "DemandeAcces",
      entityId: requestId,
      newValues: { type: requestKind.type, statut: "EN_ATTENTE", synthetic: true },
      createdAt: requestCreatedAt,
    }));

    if (requestKind.decision) {
      const validationId = deterministicUuid(DEMO_BATCH, `validation-${index}`);
      const comment = requestKind.decision === "REFUSEE"
        ? `${DEMO_MARKER} Refus synthétique : justification insuffisante pour ce scénario.`
        : `${DEMO_MARKER} Approbation synthétique conforme au scénario.`;
      validations.push({
        id: validationId,
        demandeId: requestId,
        validateurId: validator.id!,
        decision: requestKind.decision,
        commentaire: comment,
        decidedAt: decisionAt,
      });
      audits.push(audit({
        key: `request-decision-${index}`,
        actorId: validator.id!,
        action: requestKind.decision === "APPROUVEE" ? "access_request.approved" : "access_request.rejected",
        entityType: "DemandeAcces",
        entityId: requestId,
        newValues: { statut: requestKind.decision, synthetic: true },
        createdAt: decisionAt,
      }));
    }

    if (index <= 80) {
      const movementId = deterministicUuid(DEMO_BATCH, `movement-${index}`);
      const isReturned = index >= 31 && index <= 65;
      const exception = isReturned && index >= 61;
      const returnedAt = isReturned ? daysFrom(handoverAt, 5 + (index % 14)) : null;
      const returnState = exception
        ? (["ENDOMMAGE", "NON_REINTEGRE", "PERDU", "ENDOMMAGE", "NON_REINTEGRE"] as const)[index - 61]
        : isReturned ? "BON" : null;
      movements.push({
        id: movementId,
        documentId: document.id!,
        demandeId: requestId,
        utilisateurId: requester.id!,
        operateurSortieId: archivist.id!,
        retourPrevu: expectedReturn,
        dateSortie: handoverAt,
        dateRetour: returnedAt,
        retourConfirmeParId: returnedAt ? archivists[index % archivists.length].id! : null,
        etatRetour: returnState,
        observationsRetour: returnedAt
          ? exception
            ? `${DEMO_MARKER} Exception synthétique constatée au retour.`
            : `${DEMO_MARKER} Retour synthétique conforme.`
          : null,
        boiteRetourId: returnedAt && !exception ? document.boiteId : null,
        signatureUrl: null,
        createdAt: handoverAt,
        updatedAt: returnedAt ?? handoverAt,
      });

      const storageUuid = deterministicUuid(DEMO_BATCH, `signature-file-${index}`);
      signatures.push({
        id: deterministicUuid(DEMO_BATCH, `signature-${index}`),
        mouvementId: movementId,
        signataireId: requester.id!,
        storageKey: `signatures/${storageUuid}.png`,
        mimeType: "image/png",
        checksum: signatureChecksum,
        byteSize: signatureBytes.length,
        signedAt: handoverAt,
        createdAt: handoverAt,
      });
      audits.push(audit({
        key: `movement-handover-${index}`,
        actorId: archivist.id!,
        action: "movement.handover_confirmed",
        entityType: "Mouvement",
        entityId: movementId,
        newValues: { documentId: document.id, demandeId: requestId, synthetic: true },
        createdAt: handoverAt,
      }));
      if (returnedAt) {
        audits.push(audit({
          key: `movement-return-${index}`,
          actorId: archivists[index % archivists.length].id!,
          action: "movement.return_confirmed",
          entityType: "Mouvement",
          entityId: movementId,
          newValues: { dateRetour: returnedAt.toISOString(), etatRetour: returnState, synthetic: true },
          createdAt: returnedAt,
        }));
      }
    }
  }

  audits.push(audit({
    key: "dataset-created",
    actorId: users[0].id!,
    action: "demo.dataset_seeded",
    entityType: "DemoDataset",
    entityId: deterministicUuid(DEMO_BATCH, "dataset"),
    newValues: { batch: DEMO_BATCH, synthetic: true },
    createdAt: DEMO_ANCHOR,
  }));

  return { locations, boxes, documents, users, requests, validations, movements, signatures, audits, signatureBytes, signatureChecksum };
}

function requestShape(index: number) {
  if (index <= 30) return { type: "SORTIE", status: "EN_COURS", decision: "APPROUVEE" } as const;
  if (index <= 65) return { type: "SORTIE", status: "RETOURNEE", decision: "APPROUVEE" } as const;
  if (index <= 80) return { type: "SORTIE", status: "EN_COURS", decision: "APPROUVEE" } as const;
  if (index <= 105) return { type: index % 4 === 0 ? "CONSULTATION" : "SORTIE", status: "EN_ATTENTE", decision: null } as const;
  if (index <= 120) return { type: "SORTIE", status: "APPROUVEE", decision: "APPROUVEE" } as const;
  if (index <= 135) return { type: index % 3 === 0 ? "CONSULTATION" : "SORTIE", status: "REFUSEE", decision: "REFUSEE" } as const;
  if (index <= 140) return { type: "CONSULTATION", status: "APPROUVEE", decision: "APPROUVEE" } as const;
  if (index <= 145) return { type: "CONSULTATION", status: "EN_COURS", decision: "APPROUVEE", consultationStarted: true } as const;
  return { type: "CONSULTATION", status: "RETOURNEE", decision: "APPROUVEE", consultationStarted: true, consultationCompleted: true } as const;
}

function requestCreatedDate(index: number) {
  if (index <= 30) return daysFrom(DEMO_ANCHOR, -45 + index);
  if (index <= 65) return daysFrom(DEMO_ANCHOR, -260 + index * 2);
  if (index <= 80) return daysFrom(DEMO_ANCHOR, -95 + index - 65);
  return daysFrom(DEMO_ANCHOR, -35 + ((index - 81) % 34));
}

function movementExpectedReturn(index: number, requestCreatedAt: Date) {
  if (index <= 30) return daysFrom(DEMO_ANCHOR, 7 + index * 2);
  if (index <= 65) return daysFrom(requestCreatedAt, 32);
  if (index <= 80) return daysFrom(DEMO_ANCHOR, -(5 + (index - 66) * 3));
  return daysFrom(requestCreatedAt, 30);
}

function audit(values: {
  key: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  newValues: Prisma.InputJsonValue;
  createdAt: Date;
}): Prisma.AuditLogCreateManyInput {
  return {
    id: deterministicUuid(DEMO_BATCH, `audit-${values.key}`),
    actorId: values.actorId,
    action: values.action,
    entityType: values.entityType,
    entityId: values.entityId,
    newValues: values.newValues,
    metadata: { demoBatch: DEMO_BATCH, synthetic: true },
    createdAt: values.createdAt,
  };
}

function makeDemoEvidencePng() {
  const width = 320;
  const height = 120;
  const pixels = Buffer.alloc((width * 4 + 1) * height, 255);
  for (let y = 0; y < height; y += 1) pixels[y * (width * 4 + 1)] = 0;

  const setPixel = (x: number, y: number, color: readonly [number, number, number, number]) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = y * (width * 4 + 1) + 1 + x * 4;
    pixels.set(color, offset);
  };
  const blue = [15, 70, 140, 255] as const;
  const orange = [230, 120, 20, 255] as const;
  for (let x = 5; x < width - 5; x += 1) {
    for (const y of [5, 6, height - 7, height - 6]) setPixel(x, y, orange);
  }
  for (let y = 5; y < height - 5; y += 1) {
    for (const x of [5, 6, width - 7, width - 6]) setPixel(x, y, orange);
  }

  const glyphs: Record<string, string[]> = {
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  };
  const scale = 9;
  let cursor = 48;
  for (const letter of "DEMO") {
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        if (glyphs[letter][row][column] !== "1") continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            setPixel(cursor + column * scale + dx, 28 + row * scale + dy, blue);
          }
        }
      }
    }
    cursor += 6 * scale;
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer) {
  const name = Buffer.from(type, "ascii");
  return Buffer.concat([u32(data.length), name, data, u32(crc32(Buffer.concat([name, data])))]);
}

function u32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
