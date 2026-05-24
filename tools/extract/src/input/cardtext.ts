export interface CardTextRecord {
  id: number;
  type_letter: string;
  text: string;
  source_file: string;
  source_line: number;
}

export function parseCardText(buf: Buffer, sourceFile: string): CardTextRecord[] {
  const text = buf.toString("latin1");
  const records: CardTextRecord[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    if (raw.trim() === "") continue;
    // Split on the first three tabs only; preserve everything after as the text column.
    const t1 = raw.indexOf("\t");
    const t2 = raw.indexOf("\t", t1 + 1);
    const t3 = raw.indexOf("\t", t2 + 1);
    if (t1 < 0 || t2 < 0 || t3 < 0) {
      throw new Error(
        `Malformed ${sourceFile} line ${i + 1}: expected at least 4 tab-separated columns: ${JSON.stringify(raw)}`
      );
    }
    const lineCol = raw.slice(0, t1).trim();
    const idCol = raw.slice(t1 + 1, t2).trim();
    const typeLetter = raw.slice(t2 + 1, t3).trim();
    const textCol = raw.slice(t3 + 1);
    const id = parseInt(idCol, 10);
    if (!Number.isInteger(id)) {
      throw new Error(
        `Malformed ${sourceFile} line ${i + 1}: id column "${idCol}" is not an integer`
      );
    }
    records.push({
      id,
      type_letter: typeLetter,
      text: textCol,
      source_file: sourceFile,
      source_line: parseInt(lineCol, 10) || i + 1,
    });
  }
  return records;
}
