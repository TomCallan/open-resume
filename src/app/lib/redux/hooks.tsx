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
export const useSaveStateToLocalStorageOnChange = () => {
  const { userId } = useAuth();

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      saveStateToLocalStorageDebounced(state);
      if (userId) syncStateToServerDebounced(state);
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
  }, [userId]);
};

export const useSetInitialStore = () => {
  const dispatch = useAppDispatch();
  const { userId } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const loadServerState = async () => {
      if (!userId) return false;
      try {
        const res = await fetch("/api/resume");
        if (res.ok) {
          const data = await res.json();
          if (data?.resume) {
            if (cancelled) return true;
            const mergedResume = deepMerge(initialResumeState, data.resume) as Resume;
            dispatch(setResume(mergedResume));
            const mergedSettings = deepMerge(initialSettings, data.settings) as Settings;
            dispatch(setSettings(mergedSettings));
            return true;
          }
        }
      } catch {
        // fall through to local storage below
      }
      return false;
    };

    const init = async () => {
      const loadedFromServer = await loadServerState();
      if (loadedFromServer || cancelled) return;

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
  }, [userId, dispatch]);
};

