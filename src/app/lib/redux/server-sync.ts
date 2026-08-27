import type { RootState } from "lib/redux/store";

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let latest: { documentId: string | null; state: RootState } | null = null;

type Listener = (status: "saving" | "saved" | null) => void;
const listeners = new Set<Listener>();
export function onSyncStatusChange(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function emit(s: "saving" | "saved" | null) {
  listeners.forEach((l) => l(s));
}

export const syncStateToServerDebounced = (
  documentId: string | null,
  state: RootState,
  delay = 500
) => {
  if (!documentId) {
    // no document open: server-sync no-ops; local autosave still runs elsewhere
    return;
  }
  latest = { documentId, state };
  if (syncTimeout !== null) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (!latest) return;
    const { documentId: docId, state: snap } = latest;
    latest = null;
    syncTimeout = null;
    emit("saving");
    fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume: JSON.parse(JSON.stringify(snap.resume)),
        settings: JSON.parse(JSON.stringify(snap.settings)),
      }),
    })
      .then(() => emit("saved"))
      .catch(() => emit("saved"));
  }, delay);
};
