import AdmZip from "adm-zip";

export type Zip = AdmZip;

export function openZip(path: string): Zip {
  return new AdmZip(path);
}

export function readZipEntry(zip: Zip, entryName: string): Buffer {
  const entry = zip.getEntry(entryName);
  if (!entry) {
    throw new Error(`Zip entry not found: ${entryName}`);
  }
  return entry.getData();
}

export function listZipEntries(zip: Zip, prefix?: string): string[] {
  return zip
    .getEntries()
    .map((e) => e.entryName)
    .filter((name) => (prefix ? name.startsWith(prefix) : true))
    .sort();
}
