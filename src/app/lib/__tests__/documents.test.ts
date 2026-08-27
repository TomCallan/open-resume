import { duplicateName, buildVersionEntry } from "lib/documents";

describe("duplicateName", () => {
  it("appends a copy suffix", () => {
    expect(duplicateName("My Resume")).toBe("My Resume (copy)");
  });
});

describe("buildVersionEntry", () => {
  it("frames a restore as a new version row", () => {
    expect(buildVersionEntry(4, { profile: {} }, { template: "modern" }, "Restored v2")).toEqual({
      version: 4,
      resume: { profile: {} },
      settings: { template: "modern" },
      name: "Restored v2",
    });
  });
});