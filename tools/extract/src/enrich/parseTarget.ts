/**
 * Verification helper. The canonical target comes from .ncd col 6
 * (per ADR-0001); this parser surfaces the rules-text "Cast on X"
 * phrase for cross-checking. Returns null when the card has no
 * "Cast on" prefix (heroes, summonings without explicit cast clause,
 * stat-only rules text).
 */
export function parseTargetFromRulesText(rulesText: string): string | null {
  const match = rulesText.match(/^(?:H:\d+(?:\([^)]*\))?\s+|M:\d+\s+)?(?:A:\d+\s+)?(?:HP:\d+(?:\([^)]*\))?\s+)?(?:L:\d+\s+)?Cast on ([^.]+?)\./);
  if (!match) return null;
  return match[1]!.trim().toLowerCase();
}
