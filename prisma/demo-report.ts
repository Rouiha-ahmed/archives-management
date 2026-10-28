import {
  createDemoPrisma,
  inspectSafeLocalDatabase,
  loadDemoEnvironment,
  verifyConnectedDatabaseIdentity,
} from "./seed-utils/context";
import { verifyDemoDataset } from "./seed-utils/verify-demo";

loadDemoEnvironment();
const { databaseUrl, identity } = inspectSafeLocalDatabase({ requireWriteOptIn: false });
const prisma = createDemoPrisma(databaseUrl);

async function main() {
  await verifyConnectedDatabaseIdentity(prisma, identity);
  const result = await verifyDemoDataset(prisma, identity);
  console.log(`Demo database report — ${result.batch}`);
  console.log(`Database: ${identity.host}:${identity.port}/${identity.database} (${identity.schema})`);
  console.log(`Verification: ${result.ok ? "PASS" : "FAIL"}`);
  console.log(`Counts: ${Object.entries(result.counts).map(([key, value]) => `${key}=${value}`).join(", ")}`);
  console.log(`Requests: ${Object.entries(result.requestStatusDistribution).map(([key, value]) => `${key}=${value}`).join(", ")}`);
  console.log(`Movements: active=${result.movementDistribution.active}, returned=${result.movementDistribution.returned}, overdue=${result.movementDistribution.overdue}`);
  console.log(`Sample search: ${result.samples.document} in ${result.samples.box}`);
  console.log(`Sample QR path: ${result.samples.qrPath}`);
  if (result.failures.length) console.log(`Failed checks: ${result.failures.join(", ")}`);
  if (!result.ok) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Demo report failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
