export function duplicateName(name: string): string {
  return `${name} (copy)`;
}

export interface VersionEntry {
  version: number;
  resume: unknown;
  settings: unknown;
  name: string;
}

export function buildVersionEntry(
  version: number,
  resume: unknown,
  settings: unknown,
  name: string
): VersionEntry {
  return { version, resume, settings, name };
}
