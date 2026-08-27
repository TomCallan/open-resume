import type { RootState } from "lib/redux/store";

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let latestStateToSync: RootState | null = null;

export const syncStateToServerDebounced = (state: RootState, delay = 500) => {
  latestStateToSync = state;
  if (syncTimeout !== null) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (latestStateToSync) {
      const payload = latestStateToSync;
      latestStateToSync = null;
      syncTimeout = null;
      fetch("/api/resume", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: JSON.parse(JSON.stringify(payload.resume)),
          settings: JSON.parse(JSON.stringify(payload.settings)),
        }),
      }).catch(() => {
        // Non-blocking sync: local persistence remains the fallback.
      });
    }
  }, delay);
};
