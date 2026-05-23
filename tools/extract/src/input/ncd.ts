export interface NcdRecord {
  id: number;
  name: string;
  raw: string[]; // all 8 columns trimmed; preserved for later schema enrichment
}

const EXPECTED_COLUMNS = 8;

export function parseNcd(buf: Buffer): NcdRecord[] {
  const text = buf.toString("latin1"); // game-era encoding; ASCII-safe for our fields
  const records: NcdRecord[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim() === "") continue;
    const cols = line.split("\t").map((c) => c.trim());
    if (cols.length !== EXPECTED_COLUMNS) {
      throw new Error(
        `Malformed .ncd row: expected ${EXPECTED_COLUMNS} columns, got ${cols.length}: ${JSON.stringify(line)}`
      );
    }
    const idStr = cols[0]!;
    const name = cols[7]!;
    const id = parseInt(idStr, 10);
    if (!Number.isInteger(id)) {
      throw new Error(`Malformed .ncd row: id is not an integer: ${JSON.stringify(line)}`);
    }
    records.push({ id, name, raw: cols });
  }
  return records;
}
