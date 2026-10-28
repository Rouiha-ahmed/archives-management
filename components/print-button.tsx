"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return <button className="button-secondary print:hidden" onClick={() => window.print()} type="button"><Printer className="mr-2 size-4" />Imprimer l&apos;étiquette</button>;
}
