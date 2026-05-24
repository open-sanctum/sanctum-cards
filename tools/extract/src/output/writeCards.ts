import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import type { Card } from "../enrich/mergeCard.js";

export function writeCardsBulk(cards: Card[], dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, "cards.json");
  const content = stableStringify(cards, 2) + "\n";
  writeFileSync(path, content, "utf8");
}

export function writeCardsPerCard(cards: Card[], dataDir: string): void {
  const dir = join(dataDir, "cards");
  // Reset the directory so deleted cards don't linger.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const card of cards) {
    writeFileSync(
      join(dir, `${card.id}.json`),
      stableStringify(card, 2) + "\n",
      "utf8"
    );
  }
}
