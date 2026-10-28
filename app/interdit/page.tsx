import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <ShieldX className="mx-auto size-12 text-amber-600" />
        <h1 className="mt-5 text-3xl font-semibold">Accès non autorisé</h1>
        <p className="mt-3 text-slate-600">Votre compte ne possède pas la permission nécessaire pour cette ressource.</p>
        <Link className="button-primary mt-6 inline-flex" href="/dashboard">Retour au tableau de bord</Link>
      </div>
    </main>
  );
}
