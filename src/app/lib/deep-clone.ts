/**
 * Object deep clone util using native structuredClone with JSON fallback.
 */
export const deepClone = <T>(object: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(object);
  }
  return JSON.parse(JSON.stringify(object)) as T;
};

