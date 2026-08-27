export interface VersionEntry {
  version: number;
  resume: unknown;
  settings: unknown;
  name: string;
}

export function buildRestoredEntry(
  version: number,
  resume: unknown,
  settings: unknown,
  name = `Restored v${version}`
): VersionEntry {
  return { version, resume, settings, name };
}
