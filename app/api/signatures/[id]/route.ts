import { getOptionalActiveUser } from "@/lib/auth/dal";
import { readSignatureEvidence } from "@/modules/signatures/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getOptionalActiveUser();
  if (!user) return new Response("Authentification requise.", { status: 401 });
  try {
    const { id } = await context.params;
    const evidence = await readSignatureEvidence(user.id, id);
    return new Response(new Uint8Array(evidence.bytes), {
      headers: {
        "Content-Type": evidence.mimeType,
        "Content-Disposition": `inline; filename="${evidence.filename.replaceAll('"', '')}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Accusé introuvable ou accès interdit.", { status: 404 });
  }
}
