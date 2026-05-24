export interface Stats {
  hand_damage: number | null;
  missile: number | null;
  hp_max: number | null;
  level: number | null;
  attack_rate: number | null;
}

const HEAD = /^([HM]:\d+(?:\([^)]*\))?\s+)?(A:\d+\s+)?(HP:\d+(?:\([^)]*\))?\s+)?(L:\d+\s*)?/;

/**
 * Parses the leading stat block of a creature's rules text:
 *   "H:3 A:1 HP:10 L:2 Nomadic. …"  →  { hand_damage:3, attack:1, hp:10, level:2 }
 *   "M:2 A:0 HP:7 L:1 Cast on globe …" → missile=2
 * Returns null if no stat block is present (e.g. spells, structure cards).
 */
export function parseStats(rulesText: string): Stats | null {
  const trimmed = rulesText.trimStart();
  if (!/^[HM]:\d/.test(trimmed)) return null;
  const m = HEAD.exec(trimmed);
  if (!m) return null;
  const [, hOrM, a, hp, l] = m;
  if (!hp && !l && !a) return null;
  const hMatch = hOrM?.match(/^H:(\d+)/);
  const mMatch = hOrM?.match(/^M:(\d+)/);
  const aMatch = a?.match(/A:(\d+)/);
  const hpMatch = hp?.match(/HP:(\d+)/);
  const lMatch = l?.match(/L:(\d+)/);
  return {
    hand_damage: hMatch ? parseInt(hMatch[1]!, 10) : null,
    missile: mMatch ? parseInt(mMatch[1]!, 10) : null,
    hp_max: hpMatch ? parseInt(hpMatch[1]!, 10) : null,
    level: lMatch ? parseInt(lMatch[1]!, 10) : null,
    attack_rate: aMatch ? parseInt(aMatch[1]!, 10) : null,
  };
}
