import type { StatutDemandeAcces } from "@/generated/prisma/client";
import { ConflictError } from "@/lib/errors";

const REQUEST_TRANSITIONS: Readonly<Record<StatutDemandeAcces, readonly StatutDemandeAcces[]>> = {
  EN_ATTENTE: ["APPROUVEE", "REFUSEE"],
  APPROUVEE: ["EN_COURS"],
  REFUSEE: [],
  EN_COURS: ["RETOURNEE"],
  RETOURNEE: [],
};

export function assertRequestTransition(from: StatutDemandeAcces, to: StatutDemandeAcces) {
  if (!REQUEST_TRANSITIONS[from].includes(to)) {
    throw new ConflictError(`Transition de demande interdite : ${from} → ${to}.`);
  }
}
