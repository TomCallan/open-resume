"use client";
import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "lib/redux/hooks";
import { initialResumeState, setResume } from "lib/redux/resumeSlice";
import { initialSettings, setSettings } from "lib/redux/settingsSlice";
import { deepMerge } from "lib/deep-merge";
import { onSyncStatusChange } from "lib/redux/server-sync";
import { store } from "lib/redux/store";
import type { Resume } from "lib/redux/types";
import type { Settings } from "lib/redux/settingsSlice";

interface StoredSnapshot {
  version: number;
  name?: string | null;
  createdAt?: string;
  resume: unknown;
  settings: unknown;
}

export const VersionHistoryPanel = ({ documentId }: { documentId: string | null }) => {
  const dispatch = useAppDispatch();
  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"saving" | "saved" | null>(null);

  useEffect(() => onSyncStatusChange(setSyncStatus), []);

  const listVersions = useCallback(async () => {
    if (!documentId) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.versions ?? []);
      } else {
        setError("Could not load version history.");
      }
    } catch {
      setError("Could not load version history.");
    }
  }, [documentId]);

  useEffect(() => {
    void listVersions();
  }, [listVersions]);

  const handleSaveVersion = async () => {
    if (busy) return;
    if (!documentId) return;
    setBusy(true);
    setError(null);
    try {
      const name = window.prompt("Version name (optional)");
      const state = store.getState();
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          resume: JSON.parse(JSON.stringify(state.resume)),
          settings: JSON.parse(JSON.stringify(state.settings)),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      await listVersions();
    } catch {
      setError("Could not save version.");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (busy) return;
    if (!documentId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) throw new Error("restore failed");
      const data = await res.json();
      dispatch(setResume(deepMerge(initialResumeState, data.resume) as Resume));
      dispatch(
        setSettings(deepMerge(initialSettings, data.settings) as Settings)
      );
      await listVersions();
    } catch {
      setError("Could not restore version.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Version History</h2>
        <span className="text-xs text-gray-400">
          {syncStatus === "saving"
            ? "Saving…"
            : syncStatus === "saved"
              ? "Saved just now"
              : ""}
        </span>
        <button
          onClick={handleSaveVersion}
          disabled={busy}
          className="rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Save version
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {snapshots.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {snapshots.map((s) => (
            <li
              key={s.version}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700"
            >
              <span>
                v{s.version}
                {s.name ? ` · ${s.name}` : ""}
              </span>
              <button
                onClick={() => handleRestore(s.version)}
                disabled={busy}
                className="font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
