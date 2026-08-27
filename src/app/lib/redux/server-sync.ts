import type { RootState } from "lib/redux/store";

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let latest: { documentId: string | null; state: RootState } | null = null;

export const syncStateToServerDebounced = (documentId: string | null, state: RootState, delay = 500) => {
  if (!documentId) {
    saveStateToLocalStorageIgnored(state); // no-op; local autosave handled elsewhere
    return;
  }
  latest = { documentId, state };
  if (syncTimeout !== null) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (!latest) return;
    const { documentId: docId, state: snap } = latest;
    latest = null;
    syncTimeout = null;
    fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume: JSON.parse(JSON.stringify(snap.resume)),
        settings: JSON.parse(JSON.stringify(snap.settings)),
      }),
    }).catch(() => {});
  }, delay);
};

function saveStateToLocalStorageIgnored(_state: RootState) {
  // Intentionally empty placeholder so server-sync never introduces localStorage writes.
  return;
}