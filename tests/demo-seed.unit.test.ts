import { describe, expect, it } from "vitest";

import { buildDemoDataset, DEMO_BATCH, DEMO_MARKER } from "@/prisma/seed-data/demo";

describe("deterministic demo dataset", () => {
  it("builds the requested volumes and stable identifiers", () => {
    const first = buildDemoDataset();
    const second = buildDemoDataset();
    expect({
      locations: first.locations.length,
      boxes: first.boxes.length,
      documents: first.documents.length,
      users: first.users.length,
      requests: first.requests.length,
      movements: first.movements.length,
    }).toEqual({ locations: 30, boxes: 100, documents: 1_000, users: 20, requests: 150, movements: 80 });
    expect(first.documents.map((row) => row.id)).toEqual(second.documents.map((row) => row.id));
    expect(first.documents[0].reference).toBe("DEMO-DOC-0001");
    expect(first.documents[999].reference).toBe("DEMO-DOC-1000");
    expect(first.audits.every((row) => (row.metadata as { demoBatch: string }).demoBatch === DEMO_BATCH)).toBe(true);
  });

  it("keeps movements, requests, documents, validations, and evidence coherent", () => {
    const data = buildDemoDataset();
    const documents = new Map(data.documents.map((row) => [row.id, row]));
    const requests = new Map(data.requests.map((row) => [row.id, row]));
    const validations = new Map(data.validations.map((row) => [row.demandeId, row]));
    const active = data.movements.filter((row) => !row.dateRetour);
    const returned = data.movements.filter((row) => row.dateRetour);

    expect(new Set(active.map((row) => row.documentId)).size).toBe(active.length);
    expect(active).toHaveLength(45);
    expect(returned).toHaveLength(35);
    expect(data.signatures).toHaveLength(data.movements.length);
    expect(data.signatureBytes.subarray(1, 4).toString("ascii")).toBe("PNG");

    for (const movement of data.movements) {
      const request = requests.get(movement.demandeId);
      expect(request?.documentId).toBe(movement.documentId);
      expect(request?.type).toBe("SORTIE");
      expect(validations.get(movement.demandeId)?.decision).toBe("APPROUVEE");
      const document = documents.get(movement.documentId);
      if (!movement.dateRetour) expect(document?.statut).toBe("SORTI");
      else if (movement.etatRetour === "BON") expect(document?.statut).toBe("DISPONIBLE");
      else expect(document?.statut).toBe("INDISPONIBLE");
    }
    expect(data.requests.every((row) => row.motif.startsWith(DEMO_MARKER))).toBe(true);
  });
});
