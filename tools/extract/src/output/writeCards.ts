import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import type { CardV0 } from "../enrich/mergeCard.js";

export function writeCardsBulk(cards: CardV0[], dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, "cards.json");
  const content = stableStringify(cards, 2) + "\n";
  writeFileSync(path, content, "utf8");
}
