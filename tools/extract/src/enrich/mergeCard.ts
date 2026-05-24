import type { NcdRecord } from "../input/ncd.js";
import type { CardTextRecord } from "../input/cardtext.js";
import { parseStats, type Stats } from "./parseStats.js";
import { parseKeywords } from "./parseKeywords.js";
import keywordsData from "../keywords.json" with { type: "json" };

// Type letter from .ncd col 5 → card type (per ADR-0001 §"Column 5: Card Type Letter").
const TYPE_LETTER_MAP: Record<string, CardType> = {
  a: "alteration",
  c: "conjuration",
  m: "manipulation",
  s: "summoning",
  h: "hero",
};

// Target letter from .ncd col 6 → cast target (per ADR-0001 §"Column 6: Cast Target Letter").
const TARGET_LETTER_MAP: Record<string, CardTarget> = {
  r: "recruit",
  R: "recruit_group",
  q: "square",
  g: "globe",
  s: "structure",
  m: "minion",
  M: "group",
  o: "monster",
  O: "monster_group",
};

export type CardType = "alteration" | "conjuration" | "manipulation" | "summoning" | "hero";
export type CardTarget =
  | "recruit"
  | "recruit_group"
  | "square"
  | "globe"
  | "structure"
  | "minion"
  | "group"
  | "monster"
  | "monster_group";

export type ManaType = "clarity" | "mystery" | "order" | "strife" | "will" | "world";

export interface ManaCost {
  type: ManaType;
  amount: number;
}

export interface Cost {
  total: number | null;
  primary: ManaCost | null;
  secondary: ManaCost | null;
  tertiary: ManaCost | null;
}

export interface Card {
  id: number;
  name: string;
  type: CardType;
  target: CardTarget;
  cost: Cost;
  rarity: string | null;
  set: string | null;
  stats: Stats | null;
  keywords: string[];
  rules_text: string;
  art: { big: string | null; small: string | null } | null;
  audio: string | null;
  starter_decks: string[];
  effect_record_id: number | null;
  related_card_id: number | null;
  sources: {
    ncd_row: number;
    card_text_file: string;
    card_text_line: number;
  };
}

export interface MergeOptions {
  onWarning?: (msg: string) => void;
  bigArtIds?: Set<string>;
  smallArtIds?: Set<string>;
  audioIds?: Set<string>;
  starterDecks?: Map<number, string[]>; // card id → list of house slugs the card appears in
}

const ALLOWLIST = keywordsData.keywords as readonly string[];

const NULL_COST: Cost = { total: null, primary: null, secondary: null, tertiary: null };

export function mergeCards(
  ncd: NcdRecord[],
  cardText: CardTextRecord[],
  opts: MergeOptions = {}
): Card[] {
  const spellTexts = cardText.filter((t) => t.type_letter === "s");

  const textById = new Map<number, CardTextRecord>();
  for (const t of spellTexts) {
    if (textById.has(t.id)) {
      opts.onWarning?.(
        `Duplicate spell-text entry for id ${t.id} in ${t.source_file}:${t.source_line}; using first`
      );
      continue;
    }
    textById.set(t.id, t);
  }

  const ncdIds = new Set(ncd.map((r) => r.id));
  for (const t of spellTexts) {
    if (!ncdIds.has(t.id)) {
      opts.onWarning?.(
        `Spell-text id ${t.id} from ${t.source_file}:${t.source_line} has no .ncd entry; skipping`
      );
    }
  }

  const cards: Card[] = [];
  for (let i = 0; i < ncd.length; i++) {
    const rec = ncd[i]!;
    const text = textById.get(rec.id);
    if (!text) {
      opts.onWarning?.(
        `.ncd id ${rec.id} (${rec.name}) has no spell text; skipping`
      );
      continue;
    }

    const typeLetter = rec.raw[4] ?? "";
    const targetLetter = rec.raw[5] ?? "";
    const type = TYPE_LETTER_MAP[typeLetter];
    const target = TARGET_LETTER_MAP[targetLetter];
    if (!type) {
      opts.onWarning?.(`Unmapped type letter "${typeLetter}" for id ${rec.id} (${rec.name}); skipping`);
      continue;
    }
    if (!target) {
      opts.onWarning?.(`Unmapped target letter "${targetLetter}" for id ${rec.id} (${rec.name}); skipping`);
      continue;
    }

    const effectRecordRaw = rec.raw[2] ?? "0";
    const relatedRaw = rec.raw[3] ?? "0";
    const effect_record_id = effectRecordRaw === "0" ? null : parseInt(effectRecordRaw, 10);
    const related_card_id = relatedRaw === "0" ? null : parseInt(relatedRaw, 10);

    const stats = parseStats(text.text);
    const keywords = parseKeywords(text.text, ALLOWLIST);

    const idStr = rec.id.toString();
    const big = opts.bigArtIds?.has(idStr) ? `assets/art/big/${rec.id}.png` : null;
    const small = opts.smallArtIds?.has(idStr) ? `assets/art/small/${rec.id}.png` : null;
    const art = big !== null || small !== null ? { big, small } : null;

    const audio = opts.audioIds?.has(idStr) ? `assets/sounds/${rec.id}.wav` : null;
    const starter_decks = opts.starterDecks?.get(rec.id) ?? [];

    cards.push({
      id: rec.id,
      name: rec.name,
      type,
      target,
      cost: NULL_COST,
      rarity: null,
      set: null,
      stats,
      keywords,
      rules_text: text.text,
      art,
      audio,
      starter_decks,
      effect_record_id,
      related_card_id,
      sources: {
        ncd_row: i + 1,
        card_text_file: text.source_file,
        card_text_line: text.source_line,
      },
    });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}
