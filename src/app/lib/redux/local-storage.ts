import type { RootState } from "lib/redux/store";

// Reference: https://dev.to/igorovic/simplest-way-to-persist-redux-state-to-localstorage-e67

const LOCAL_STORAGE_KEY = "open-resume-state";

export const loadStateFromLocalStorage = () => {
  try {
    const stringifiedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stringifiedState) return undefined;
    return JSON.parse(stringifiedState);
  } catch (e) {
    return undefined;
  }
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let latestStateToSave: RootState | null = null;

export const saveStateToLocalStorage = (state: RootState) => {
  try {
    const stringifiedState = JSON.stringify(state);
    localStorage.setItem(LOCAL_STORAGE_KEY, stringifiedState);
  } catch (e) {
    // Ignore
  }
};

export const saveStateToLocalStorageDebounced = (state: RootState, delay = 500) => {
  latestStateToSave = state;
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    if (latestStateToSave) {
      saveStateToLocalStorage(latestStateToSave);
      latestStateToSave = null;
      saveTimeout = null;
    }
  }, delay);
};

export const flushStateToLocalStorage = () => {
  if (saveTimeout !== null && latestStateToSave !== null) {
    clearTimeout(saveTimeout);
    saveStateToLocalStorage(latestStateToSave);
    latestStateToSave = null;
    saveTimeout = null;
  }
};

export const getHasUsedAppBefore = () => Boolean(loadStateFromLocalStorage());

