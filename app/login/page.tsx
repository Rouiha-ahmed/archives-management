import type { Metadata } from "next";
import { Archive, LockKeyhole } from "lucide-react";

import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[radial-gradient(circle_at_top_left,_#155e75,_#0f172a_55%)] p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold"><span className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20"><Archive className="size-5" /></span>Archives Enterprise</div>
        <div className="max-w-lg space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-200">Traçabilité documentaire</p>
          <h1 className="text-5xl font-semibold leading-tight">Chaque document. Chaque décision. Chaque mouvement.</h1>
          <p className="text-lg leading-8 text-slate-300">Un espace sécurisé pour gérer l&apos;accès aux archives physiques et préserver un historique fiable.</p>
        </div>
        <p className="text-sm text-slate-400">Accès réservé aux utilisateurs autorisés.</p>
      </section>
      <section className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-xl shadow-slate-950/5">
          <div className="mb-8">
            <span className="mb-5 grid size-11 place-items-center rounded-xl bg-cyan-950 text-white lg:hidden"><LockKeyhole className="size-5" /></span>
            <p className="text-sm font-medium text-cyan-700">Portail interne</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Connexion</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Utilisez les identifiants attribués par votre administrateur.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
