import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import type { Deck } from "../input/decks.js";

export interface DeckOutput {
  name: string;
  slug: string;
  cards: number[];
}

export function writeDecks(decks: { slug: string; deck: Deck }[], dataDir: string): void {
  const dir = join(dataDir, "decks");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const { slug, deck } of decks) {
    const out: DeckOutput = {
      name: deck.name,
      slug,
      cards: [...deck.cards].sort((a, b) => a - b),
    };
    writeFileSync(
      join(dir, `${slug}.json`),
      stableStringify(out, 2) + "\n",
      "utf8"
    );
  }
}
