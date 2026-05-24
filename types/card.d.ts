// AUTO-GENERATED from data/schema.json — do not edit by hand.
// Regenerate via: pnpm generate-types

export type ManaCost = {
  type: "clarity" | "mystery" | "order" | "strife" | "will" | "world";
  amount: number;
} & ManaCost1;
export type ManaCost1 = {
  type: "clarity" | "mystery" | "order" | "strife" | "will" | "world";
  amount: number;
} | null;

/**
 * One card from Sanctum 1.8. See docs/superpowers/specs/2026-05-24-sanctum-cards-design.md §7 for design notes; ADR-0001 for .ncd column meanings.
 */
export interface SanctumCard {
  id: number;
  name: string;
  type: "alteration" | "conjuration" | "manipulation" | "summoning" | "hero";
  target:
    | "recruit"
    | "recruit_group"
    | "square"
    | "globe"
    | "structure"
    | "minion"
    | "group"
    | "monster"
    | "monster_group";
  /**
   * Mana cost. Currently nullable for all subfields; will be populated by M2.5-RE binary extraction.
   */
  cost: {
    total: number | null;
    primary: ManaCost;
    secondary: ManaCost;
    tertiary: ManaCost;
  };
  /**
   * Card rarity. Populated by M2.5-RE; null until then.
   */
  rarity?: string | null;
  /**
   * Expansion/set the card belongs to. Populated by M2.5-RE; null until then.
   */
  set?: string | null;
  stats: {
    hand_damage: number | null;
    missile: number | null;
    hp_max: number | null;
    level: number | null;
    attack_rate: number | null;
  } | null;
  keywords: string[];
  rules_text: string;
  art: {
    big: string | null;
    small: string | null;
  } | null;
  audio: string | null;
  /**
   * Slugs of starter decks this card appears in (e.g., ['despair', 'death']). Empty for non-starter cards. Populated when M4 lands the deck parser.
   */
  starter_decks: (
    | "abomination"
    | "body"
    | "death"
    | "despair"
    | "hope"
    | "justice"
    | "life"
    | "making"
    | "mind"
    | "nature"
    | "unmaking"
    | "war"
  )[];
  /**
   * From .ncd col 3. Points to a secondary NCD record that defines a persistent effect (e.g., 4100 = water terrain effect). Null for cards with no persistent effect.
   */
  effect_record_id: number | null;
  /**
   * From .ncd col 4. Points to a related card (e.g., 'II' upgrade variants). Null for most cards.
   */
  related_card_id: number | null;
  sources: {
    ncd_row: number;
    card_text_file: string;
    card_text_line: number;
  };
}
