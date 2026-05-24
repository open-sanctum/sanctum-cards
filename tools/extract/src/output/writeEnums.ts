import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import type { Card } from "../enrich/mergeCard.js";

/**
 * Emits `data/enums.json` summarizing the observed enum values across
 * the corpus. Fixed enums (type, target, mana_type, house) are listed
 * for reference; discovered enums (keywords) reflect what's actually
 * present in the data.
 */
export function writeEnums(cards: Card[], dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });

  const collect = (vals: Iterable<string | null | undefined>): string[] => {
    const set = new Set<string>();
    for (const v of vals) if (v) set.add(v);
    return [...set].sort();
  };

  const enums = {
    type: collect(cards.map((c) => c.type)),
    target: collect(cards.map((c) => c.target)),
    rarity: collect(cards.map((c) => c.rarity ?? undefined)),
    set: collect(cards.map((c) => c.set ?? undefined)),
    keyword: collect(cards.flatMap((c) => c.keywords)),
    mana_type: ["clarity", "mystery", "order", "strife", "will", "world"],
    house: [
      "abomination",
      "body",
      "death",
      "despair",
      "hope",
      "justice",
      "life",
      "making",
      "mind",
      "nature",
      "unmaking",
      "war",
    ],
    starter_deck_affiliation: collect(cards.flatMap((c) => c.starter_decks)),
  };

  writeFileSync(
    join(dataDir, "enums.json"),
    stableStringify(enums, 2) + "\n",
    "utf8"
  );
}
