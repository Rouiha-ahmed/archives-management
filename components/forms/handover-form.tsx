"use client";

import SignaturePad from "signature_pad";
import { useActionState, useEffect, useRef, useState } from "react";

import { ActionToast } from "@/components/action-toast";
import { confirmHandoverAction } from "@/modules/mouvements/actions";

export function HandoverForm({ demandeId }: { demandeId: string }) {
  const [state, action, pending] = useActionState(confirmHandoverAction, {});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.clientWidth;
      const height = 180;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current?.clear();
    };
    padRef.current = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.4,
      penColor: "#0f172a",
      backgroundColor: "#ffffff",
    });
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      padRef.current?.off();
    };
  }, []);

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(event) => {
        const pad = padRef.current;
        if (!pad || pad.isEmpty()) {
          event.preventDefault();
          setLocalError("La signature du bénéficiaire est obligatoire.");
          return;
        }
        if (!window.confirm("Confirmer la remise physique et figer cet accusé signé ?")) {
          event.preventDefault();
          return;
        }
        if (hiddenRef.current) hiddenRef.current.value = pad.toDataURL("image/png");
        setLocalError("");
      }}
    >
      <input name="demandeId" type="hidden" value={demandeId} />
      <input name="signature" ref={hiddenRef} type="hidden" />
      <div>
        <p className="field-label">Accusé manuscrit du bénéficiaire</p>
        <canvas aria-label="Zone de signature" className="h-[180px] w-full touch-none rounded-lg border border-slate-300 bg-white" ref={canvasRef} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <button className="button-secondary" onClick={() => { padRef.current?.clear(); setLocalError(""); }} type="button">Effacer</button>
          <span className="text-xs text-slate-500">Souris, stylet ou écran tactile</span>
        </div>
      </div>
      {localError ? <p className="text-sm text-red-700" role="alert">{localError}</p> : null}
      <button className="button-primary w-full" disabled={pending}>{pending ? "Confirmation…" : "Confirmer la remise"}</button>
      <p className="text-xs leading-5 text-slate-500">Cette capture constitue un accusé de remise interne, pas une signature électronique qualifiée.</p>
      <ActionToast state={state} />
    </form>
  );
}
