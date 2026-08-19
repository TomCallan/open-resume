import {
  saveStateToLocalStorage,
  saveStateToLocalStorageDebounced,
  flushStateToLocalStorage,
  loadStateFromLocalStorage,
} from "lib/redux/local-storage";

describe("local-storage persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("saves and loads state directly", () => {
    const state = { resume: { profile: { name: "Test User" } } } as any;
    saveStateToLocalStorage(state);
    expect(loadStateFromLocalStorage()).toEqual(state);
  });

  it("debounces save calls and flushes properly", () => {
    const state1 = { resume: { profile: { name: "First" } } } as any;
    const state2 = { resume: { profile: { name: "Second" } } } as any;

    saveStateToLocalStorageDebounced(state1, 300);
    expect(loadStateFromLocalStorage()).toBeUndefined();

    saveStateToLocalStorageDebounced(state2, 300);
    expect(loadStateFromLocalStorage()).toBeUndefined();

    jest.advanceTimersByTime(300);
    expect(loadStateFromLocalStorage()).toEqual(state2);
  });

  it("flushes pending state immediately on flushStateToLocalStorage", () => {
    const state = { resume: { profile: { name: "Flush Test" } } } as any;
    saveStateToLocalStorageDebounced(state, 500);
    expect(loadStateFromLocalStorage()).toBeUndefined();

    flushStateToLocalStorage();
    expect(loadStateFromLocalStorage()).toEqual(state);
  });
});
