import { buildRestoredEntry } from "lib/resume-versions";

describe("buildRestoredEntry", () => {
  it("frames a restored snapshot as a new version with a marker name", () => {
    const entry = buildRestoredEntry(3, { profile: {} }, { template: "elegant" });
    expect(entry).toEqual({
      version: 3,
      resume: { profile: {} },
      settings: { template: "elegant" },
      name: "Restored v3",
    });
  });
});