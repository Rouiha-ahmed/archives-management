"use client";

import { Camera, Keyboard, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { resolveBoiteCodeAction } from "@/modules/boites/actions";

export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop(): void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState("");

  const openValue = async (value: string) => {
    try {
      const url = new URL(value, window.location.origin);
      const match = /^\/boites\/([0-9a-f-]{36})$/i.exec(url.pathname);
      if (url.origin === window.location.origin && match) {
        controlsRef.current?.stop();
        router.push(`/boites/${match[1]}`);
        return;
      }
    } catch {
      // Manual box codes are resolved securely on the server below.
    }
    const result = await resolveBoiteCodeAction(value);
    if (result.ok) {
      controlsRef.current?.stop();
      router.push(`/boites/${result.id}`);
    } else {
      setMessage(result.message ?? "Code non reconnu.");
    }
  };

  const start = async () => {
    setMessage("");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      if (!videoRef.current) return;
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) void openValue(result.getText());
        },
      );
      setScanning(true);
    } catch (error) {
      setScanning(false);
      setMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Accès caméra refusé. Autorisez la caméra ou utilisez la saisie manuelle."
          : "Caméra indisponible. Vérifiez HTTPS, les permissions et la présence d'une caméra.",
      );
    }
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <div className="flex items-center justify-between"><div><p className="eyebrow">Caméra</p><h2 className="mt-2 text-lg font-semibold">Scanner une étiquette</h2></div><Camera className="size-6 text-cyan-700" /></div>
        <video className="mt-5 aspect-video w-full rounded-xl bg-slate-950 object-cover" muted playsInline ref={videoRef} />
        <div className="mt-4 flex gap-3">
          <button className="button-primary" disabled={scanning} onClick={start} type="button">Activer la caméra</button>
          <button className="button-secondary" disabled={!scanning} onClick={() => { controlsRef.current?.stop(); setScanning(false); }} type="button"><Square className="mr-2 size-3" />Arrêter</button>
        </div>
      </section>
      <section className="card p-6">
        <div className="flex items-center justify-between"><div><p className="eyebrow">Alternative</p><h2 className="mt-2 text-lg font-semibold">Saisie manuelle</h2></div><Keyboard className="size-6 text-cyan-700" /></div>
        <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void openValue(manual); }}>
          <div><label className="field-label" htmlFor="manual-box-code">Code de boîte ou identifiant</label><input className="field" id="manual-box-code" onChange={(event) => setManual(event.target.value)} required value={manual} /></div>
          <button className="button-primary">Rechercher la boîte</button>
        </form>
        <p className="mt-6 text-sm leading-6 text-slate-500">Le scan identifie uniquement une boîte. Il ne constitue jamais une autorisation de retrait.</p>
      </section>
      {message ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 lg:col-span-2" role="alert">{message}</p> : null}
    </div>
  );
}
