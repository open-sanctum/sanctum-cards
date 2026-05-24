import type { NcdRecord } from "../input/ncd.js";
import type { CardTextRecord } from "../input/cardtext.js";

export interface CardV0 {
  id: number;
  name: string;
  rules_text: string;
  ncd_raw: string[];
  sources: {
    ncd_row: number;
    card_text_file: string;
    card_text_line: number;
  };
}

export interface MergeOptions {
  onWarning?: (msg: string) => void;
}

export function mergeCards(
  ncd: NcdRecord[],
  cardText: CardTextRecord[],
  opts: MergeOptions = {}
): CardV0[] {
  // Only spell-text entries (type_letter === "s") are used for rules_text.
  // The other type_letters (f=flavor, n=short-name, h=help, m=mobile) are
  // tracked elsewhere in later milestones; M1 outputs spell text only.
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

  const cards: CardV0[] = [];
  for (let i = 0; i < ncd.length; i++) {
    const rec = ncd[i]!;
    const text = textById.get(rec.id);
    if (!text) {
      opts.onWarning?.(
        `.ncd id ${rec.id} (${rec.name}) has no spell text; skipping`
      );
      continue;
    }
    cards.push({
      id: rec.id,
      name: rec.name,
      rules_text: text.text,
      ncd_raw: rec.raw,
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
