export interface CardTextRecord {
  id: number;
  type_letter: string;
  text: string;
  source_file: string;
  source_line: number; // 1-based line index within source_file
}

export function parseCardText(buf: Buffer, sourceFile: string): CardTextRecord[] {
  const text = buf.toString("latin1");
  const records: CardTextRecord[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    if (raw.trim() === "") continue;
    // Format: id\ttype_letter[\ttext]
    // The text column is optional — some entries have only id and type_letter (empty rules text).
    const t1 = raw.indexOf("\t");
    if (t1 < 0) {
      throw new Error(
        `Malformed ${sourceFile} line ${i + 1}: expected at least 2 tab-separated columns: ${JSON.stringify(raw)}`
      );
    }
    const t2 = raw.indexOf("\t", t1 + 1);
    const idCol = raw.slice(0, t1).trim();
    const typeLetter = (t2 < 0 ? raw.slice(t1 + 1) : raw.slice(t1 + 1, t2)).trim();
    const textCol = t2 < 0 ? "" : raw.slice(t2 + 1);
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
      source_line: i + 1,
    });
  }
  return records;
}
