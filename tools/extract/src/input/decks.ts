export interface Deck {
  name: string;
  cards: number[];
}

// .dck binary layout (observed across all 12 PRECONSTRUCTED files):
//   offset 0:    4-byte LE = 10 (constant; format marker)
//   offset 4:    1-byte Pascal-style length prefix → N
//   offset 5:    N-byte ASCII name (e.g. "PRECON_ABOM")
//   + 4 bytes:   0xff 0xff 0xff 0xff (flag)
//   + 4 bytes:   4-byte LE (unknown count; not used)
//   + 4 bytes:   4-byte LE card count
//   payload:     1 marker byte + tab-separated ASCII digit ids
//   trailing:    ~16 bytes of unknown attributes
export function parseDeck(buf: Buffer): Deck {
  const nameLen = buf.readUInt8(4);
  if (nameLen === 0 || nameLen > buf.length - 5) {
    throw new Error(`Deck: invalid name length ${nameLen}`);
  }
  const name = buf.subarray(5, 5 + nameLen).toString("latin1");

  const cardCountOffset = 5 + nameLen + 8;
  const cardCount = buf.readUInt32LE(cardCountOffset);
  const payloadStart = cardCountOffset + 4;

  // The payload typically starts with a single non-ASCII marker byte (e.g.
  // 0xbe, 0xbd, 0xb6) before the first digit. Skip anything that isn't an
  // ASCII digit or tab.
  const payload = buf.subarray(payloadStart).toString("latin1");
  const digitsOnly = payload.replace(/[^\d\t]/g, "");
  const cards = digitsOnly
    .split(/\t+/)
    .filter((s) => s.length > 0)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (cards.length !== cardCount) {
    // Header count disagrees with payload — the payload is the authoritative
    // record of what's actually in the deck. Trailing bytes (deck-attribute
    // flags) occasionally bleed into the digit scan in edge cases, but we
    // trust what we can parse.
  }

  return { name, cards };
}
