export const HOUSES = [
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
] as const;
export type House = (typeof HOUSES)[number];

export const MANA_TYPES = [
  "clarity",
  "mystery",
  "order",
  "strife",
  "will",
  "world",
] as const;
export type ManaType = (typeof MANA_TYPES)[number];

// Type, rarity, set, and target enums are discovered during extraction
// and populated into data/enums.json. We keep an open allowlist here that
// the extractor extends; unknown values fail the build.
export const KNOWN_RARITIES = ["common", "uncommon", "rare", "promo"] as const;
export const KNOWN_SETS = ["classic"] as const;
