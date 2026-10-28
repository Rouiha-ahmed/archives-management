import { Suspense } from "react";
import { connection } from "next/server";

import { Navigation } from "@/components/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50"><div className="h-20 bg-slate-950 lg:fixed lg:inset-y-0 lg:w-72" /></div>}>
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}

async function ProtectedContent({ children }: { children: React.ReactNode }) {
  // Auth.js may generate cryptographic request state, so every protected route
  // must wait for a real request instead of running in the prerendered shell.
  await connection();
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="lg:pl-72"><div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-7 lg:px-10 lg:py-8"><Breadcrumbs />{children}</div></main>
    </div>
  );
}
