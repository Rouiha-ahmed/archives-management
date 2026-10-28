import {
  createDemoPrisma,
  inspectSafeLocalDatabase,
  loadDemoEnvironment,
  verifyConnectedDatabaseIdentity,
} from "./seed-utils/context";
import { DEMO_BATCH } from "./seed-data/demo";
import { verifyDemoDataset } from "./seed-utils/verify-demo";

loadDemoEnvironment();
const { databaseUrl, identity } = inspectSafeLocalDatabase({ requireWriteOptIn: false });
const prisma = createDemoPrisma(databaseUrl);

async function main() {
  await verifyConnectedDatabaseIdentity(prisma, identity);
  const result = await verifyDemoDataset(prisma, identity);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(JSON.stringify({
      ok: false,
      batch: DEMO_BATCH,
      error: error instanceof Error ? error.message : "Demo verification failed.",
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
