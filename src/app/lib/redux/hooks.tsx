import { useEffect } from "react";
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import { useAuth } from "@clerk/nextjs";
import { syncStateToServerDebounced } from "lib/redux/server-sync";
import { store, type RootState, type AppDispatch } from "lib/redux/store";
import {
  loadStateFromLocalStorage,
  saveStateToLocalStorageDebounced,
  flushStateToLocalStorage,
} from "lib/redux/local-storage";
import { initialResumeState, setResume } from "lib/redux/resumeSlice";
import {
  initialSettings,
  setSettings,
  type Settings,
} from "lib/redux/settingsSlice";
import { deepMerge } from "lib/deep-merge";
import type { Resume } from "lib/redux/types";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Hook to save store to local storage on store change (debounced for performance)
 */
export const useSaveStateToLocalStorageOnChange = (documentId: string | null) => {
  const { userId } = useAuth();

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      saveStateToLocalStorageDebounced(state);
      if (userId) syncStateToServerDebounced(documentId, state);
    });

    const handleBeforeUnload = () => {
      flushStateToLocalStorage();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushStateToLocalStorage();
    };
  }, [userId, documentId]);
};

export const useSetInitialStore = (documentId: string | null) => {
  const dispatch = useAppDispatch();
  const { userId } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const loadServer = async (): Promise<boolean> => {
      if (!userId || !documentId) return false;
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return true;
          dispatch(setResume(deepMerge(initialResumeState, data.resume) as Resume));
          dispatch(setSettings(deepMerge(initialSettings, data.settings) as Settings));
          return true;
        }
      } catch {
        // fall to local cache
      }
      return false;
    };

    const init = async () => {
      const ok = await loadServer();
      if (ok || cancelled) return;

      const state = loadStateFromLocalStorage();
      if (!state) return;
      if (state.resume) {
        const mergedResumeState = deepMerge(initialResumeState, state.resume) as Resume;
        dispatch(setResume(mergedResumeState));
      }
      if (state.settings) {
        const mergedSettingsState = deepMerge(initialSettings, state.settings) as Settings;
        dispatch(setSettings(mergedSettingsState));
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [userId, documentId, dispatch]);
};

