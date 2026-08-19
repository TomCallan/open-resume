import { deepClone } from "lib/deep-clone";

describe("deepClone", () => {
  it("clones nested objects without mutating original", () => {
    const original = { a: 1, b: { c: "hello", d: [1, 2, 3] } };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
    expect(cloned.b.d).not.toBe(original.b.d);

    cloned.b.c = "world";
    expect(original.b.c).toBe("hello");
  });

  it("handles arrays and primitives", () => {
    expect(deepClone([1, "a", { x: 2 }])).toEqual([1, "a", { x: 2 }]);
    expect(deepClone("test")).toBe("test");
    expect(deepClone(42)).toBe(42);
  });
});
