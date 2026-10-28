import type { ActionState } from "@/lib/action-state";

export function ActionToast({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-xl ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
      role={state.ok ? "status" : "alert"}
    >
      {state.message}
    </div>
  );
}
