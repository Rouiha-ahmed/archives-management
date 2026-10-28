import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_KEY_PATTERN = /^signatures\/[0-9a-f-]{36}\.png$/i;

function signatureStorageRoot() {
  return path.resolve(/* turbopackIgnore: true */
    process.env.SIGNATURE_STORAGE_DIR || path.join(process.cwd(), "storage"),
  );
}

export function absoluteSignatureStoragePath(storageKey: string) {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error("Invalid signature storage key.");
  }
  const root = signatureStorageRoot();
  const target = path.resolve(root, storageKey);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid signature storage path.");
  }
  return target;
}

export async function writeImmutableSignatureEvidence(
  storageKey: string,
  bytes: Buffer,
  expectedChecksum: string,
) {
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== expectedChecksum) {
    throw new Error("Signature evidence checksum does not match its metadata.");
  }

  const target = absoluteSignatureStoragePath(storageKey);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  try {
    await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      throw error;
    }
    const existing = await readFile(/* turbopackIgnore: true */ target);
    const existingChecksum = createHash("sha256").update(existing).digest("hex");
    if (existingChecksum !== expectedChecksum) {
      throw new Error(`Existing signature evidence failed integrity verification: ${storageKey}`);
    }
  }
}
