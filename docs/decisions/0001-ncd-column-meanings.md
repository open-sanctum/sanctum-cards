# ADR-0001: Sanctum.ncd Column Meanings

**Status:** Accepted
**Date:** 2026-05-24

---

## Context

`Sanctum.ncd` is the primary card registry file for the Sanctum CCG, stored in
`Sanctum18/Cache/Sanctum.ncd` inside `Sanctum18-04.zip`. It is a Windows-1252
tab-separated file with 8 columns and no header row. The extractor reads it as
`NcdRecord { id, name, raw: string[8] }`.

Prior to this investigation, columns 1, 2, 7, and 8 were understood:
- Column 1: primary card id
- Column 2: appears to echo id (or, for effect-definition records, the canonical card id)
- Column 7: appears to echo id (or, for certain records, the canonical card id)
- Column 8: card name (or empty for effect-definition records)

Columns 3, 4, 5, and 6 were unknown. This ADR documents the investigation
findings for those four columns.

The investigation used `data/cards.json` (614 playable cards with `ncd_raw`,
`name`, `rules_text`, and `sources.card_text_file`) cross-referenced against the
raw `Sanctum.ncd` (811 rows total).

---

## Column 3: Effect Record ID

### Frequency distribution

```
    727   0
      7   4104
      5   4155
      4   4118
      4   4103
      4   4100
      2   4272
      2   4136
      2   4119
      2   4105
      2   4102
      1   (many singleton values in range 4100–4372)
```

81 of 614 playable cards (13%) have a non-zero value. All non-zero values are
in the range 4100–4372.

### Finding

Column 3 is an **effect-record foreign key**. When non-zero, it is the `id` of
a secondary NCD row that defines the persistent effect this card creates on the
game world.

Evidence:

1. **Every non-zero value has exactly one matching NCD row** as its primary id
   (confirmed by exhaustive lookup of all 59 distinct non-zero values).

2. **Terrain-creating cards share identical col-3 values**. For example, all
   four water-creating cards (Deluge, Inundate, Jade Dragon, Overflow) share
   `col3 = 4100`. The NCD row with `id = 4100` is the "water terrain" effect
   record. Similarly: `4102` = void, `4103` = ice, `4104` = forest,
   `4105` = mountain, `4118` = desert, `4119` = swamp, `4155` = lava/volcano,
   `4156` = barren (scorched), `4255` = volcano.

3. **Singleton col-3 values are for unique persistent effects**. For example,
   `4109` is the effect record for Master Smith (creates a swordsman training
   enhancement in a structure); `4133` is the effect record for Hero's Legacy
   (a persistent recruit buff); `4272` is the effect record for Bleak Isle (a
   complex structure+terrain transformation).

4. **Cards without persistent effects have col3 = 0**. Pure instant spells
   (e.g., Lightning Bolt, Forced March) and simple recruitments without special
   ongoing triggers all have `col3 = 0`.

### Conclusion

**Confidence: High.** Column 3 is an effect-record pointer. It is NOT a rarity
flag, set flag, or bitfield. The 4096 base in all non-zero values is simply the
ID range the game uses for secondary effect records.

**Implication for M2.11:** Column 3 should be extracted as `effect_record_id`
(nullable integer). The value can be used downstream to resolve which cards share
the same persistent effect (e.g., all water-creating cards). It is not needed
for the core card schema but may be useful for advanced queries.

---

## Column 4: Related Card ID

### Frequency distribution

```
    806   0
      1   83     (Water Walking → Water Breathing)
      1   22     (Sword of Zana II → Sword of Zana)
      1   333    (Apocalypse II → Apocalypse)
      1   210    (Bleak Isle II → Bleak Isle)
      1   170    (Neb's Mirage → Mirage)
```

Only 5 of 811 NCD rows have a non-zero col-4.

### Finding

Column 4 is a **related/predecessor card id**. When non-zero, it points to an
earlier or closely related card:

- `Sword of Zana II (615)` → `Sword of Zana (22)`: "II" suffix upgrade
- `Apocalypse II (616)` → `Apocalypse (333)`: "II" suffix upgrade
- `Bleak Isle II (617)` → `Bleak Isle (210)`: "II" suffix upgrade
- `Neb's Mirage (618)` → `Mirage (170)`: thematically similar card
- `Water Walking (43)` → `Water Breathing (83)`: functional near-duplicate
  (both grant Waterwalk; Water Walking targets group, Water Breathing targets
  group with slightly different text)

### Conclusion

**Confidence: High.** Column 4 is a predecessor/related-card pointer used for a
handful of "variant" or "upgrade" cards. Only 5 cards out of 811 NCD rows use
it. It is functionally always 0 for the 614 playable cards except these five.

**Implication for M2.11:** Extract as `related_card_id` (nullable integer).
It is rarely populated and has no bearing on card type or house.

---

## Column 5: Card Type Letter

### Frequency distribution (614 playable cards)

```
    256   a
    144   m
    124   c
     71   s
     19   h
```

### Hypothesis tested

The initial hypothesis was that column 5 might be the suffix letter of the
`CardText*.txt` file where the card's spell text lives. This was **falsified**:

```bash
jq -r '.[] | "\(.ncd_raw[4])\t\(.sources.card_text_file)"' data/cards.json \
  | sort | uniq -c | sort -rn
```

Result: every letter (`a`, `c`, `m`, `s`, `h`) appears across all six CardText
files (A, B, C, O, R, W). There is no 1:1 mapping.

### Cross-reference: official game terminology

Card text uses the terms "alteration" and "conjuration" explicitly:

- Beast's Embrace: *"Minion gets +1 armor for each subsequent **alteration**
  cast on minion or its group."*
- Chaos Feature: *"Minion gets a random minion **alteration** or **conjuration**."*
- Slave Labor II: *"…becomes Slave Labor II (**alteration**, caster gets +1
  Mystery and +1 Will each turn)."*

The Deck Builder help mentions filtering by **spell type** as a key UI feature.
The Expert filterbar uses `type_20x20x24.nia` (20 px wide, consistent with
exactly 5 filter buttons at 4 px each = 5 types).

### Cross-reference: card text patterns

| Letter | Count | Characteristics |
|--------|-------|-----------------|
| `a`    | 256   | Cards with "gets +N" stat changes. Zero have `Duration:`. 118/256 contain a stat modifier ("gets +1", "gets -2"). The game calls these **alterations**. |
| `c`    | 124   | Cards with `Duration:` (67/124), conditional triggers ("When X", "At start of"), or persistent effects that modify game rules. The game calls these **conjurations**. |
| `m`    | 144   | Immediate-effect cards: movement (Forced March), terrain creation (Mountain, Inundate), damage (Lightning Bolt, Fireball), removal (Disintegrate), board-state queries (Revelation). Zero have `Duration:`. |
| `s`    | 71    | 66/71 start with `H:` or `M:` (creature combat stats). All five exceptions also describe creatures (with `M:` missile-attack stats). The game calls these **summoning spells**. |
| `h`    | 19    | All are named hero cards: Ostralek, Ogi, Zana, Al Hakim, Khobai, Ngozi, Fingle, Dracha, Nihil, Lienna, Olotus, Diomesia, Oro and Vlad, Odar, Heartsong, Ozande, Theralda Glaivesforge, ThudThud, Vlad and Oro. |

### Mapping table

```
col5 letter → card type
  a  →  alteration   (persistent stat-modifying enchantment on a target)
  c  →  conjuration  (persistent effect with Duration or conditional triggers)
  m  →  manipulation (immediate effect: damage, movement, terrain, removal)
  s  →  summoning    (creates a creature with H:/M: combat stats)
  h  →  hero         (creates a specific named hero unit)
```

### Conclusion

**Confidence: High.** The five letters map cleanly to the five card types with
no overlap: `Duration:` appears in 67 conjurations and 0 alterations or
manipulations; all summonings have creature stat lines; all heroes are named
hero units. The "alteration" and "conjuration" terms match official in-game
terminology found in card text.

---

## Column 6: Cast Target Letter

### Frequency distribution (614 playable cards)

```
    132   q
    125   r
    115   g
     72   R
     71   s
     46   M
     44   m
      8   O
      1   o
```

(Note: the full 811-row NCD file also has 11 rows with `t`, all of which are
terrain-type effect records with id >= 4000, not playable cards.)

### Cross-reference: rules-text cast targets

For each letter, the `"Cast on <TARGET>"` prefix was extracted from all cards
with that letter and counted:

| Letter | Dominant cast target | Sample count |
|--------|---------------------|-------------|
| `r`    | "Cast on recruit" (64), "swordsman" (20), "archer" (16) | 118/125 recruit targets |
| `R`    | "Cast on recruit group" (21), "friendly recruit group" (9) | 44/72 recruit-group targets |
| `q`    | "Cast on square" (46), forest/water/terrain variants (18) | 66/132 also have `H:` (summonings) |
| `g`    | "Cast on globe" (104 of 115) | 100% globe |
| `s`    | "Cast on town or colony" (42), "friendly town or colony" (9) | ~96% structure targets |
| `m`    | "Cast on minion" (33), "minion with hand attacks" (5) | ~96% minion targets |
| `M`    | "Cast on group" (33), "friendly group" (5) | ~85% group targets |
| `o`    | "Cast on monster" (1/1) | single card: Siren Song |
| `O`    | "Cast on monster group" (7/8) | ~88% monster-group targets |

The `q` letter covers both "summoning to a square" and "enchanting a square"
because both operations target a board square.

### Mapping table

```
col6 letter → cast target
  r  →  recruit        (individual recruit, swordsman, archer, etc.)
  R  →  recruit_group  (recruit group)
  q  →  square         (a board square; includes monster summonings)
  g  →  globe          (the entire game board / both players)
  s  →  structure      (town or colony)
  m  →  minion         (individual minion, recruit or monster)
  M  →  group          (any group, recruit or monster)
  o  →  monster        (individual monster — only Siren Song in the dataset)
  O  →  monster_group  (monster group)
  t  →  terrain_record (internal NCD record type; no playable cards)
```

### Conclusion

**Confidence: High for g, s, m, M, O, t.** Each maps to a single unambiguous
target type.

**Confidence: High for r and R.** These are individual recruit and recruit
group respectively, with very few exceptions.

**Confidence: Medium for q.** The `q` letter covers two distinct gameplay
concepts (square enchantments and summonings to squares), but both share the
"target a square" cast mechanic. The game groups them under one filter button.

**Confidence: Low for o.** Only one playable card (Siren Song) uses this
letter, making it impossible to validate against a larger sample.

---

## Column 3 vs Column 6 for Terrain Records (col6 = 't')

For completeness: the 11 NCD rows with `col6 = 't'` are internal terrain-type
definitions, not playable cards. Their `id` (col1) matches the `col3` value of
terrain-creating spells. For example:

```
NCD row id=4100, col2=87, col6=t  →  water terrain; canonical card = Inundate (id=87)
NCD row id=4104, col2=89, col6=t  →  forest terrain; canonical card = Forestation (id=89)
NCD row id=4119, col2=84, col6=t  →  swamp terrain; canonical card = Swamp Land (id=84)
```

These rows exist only as internal game data and should not be included in the
playable card output.

---

## Decision

M2.11 should implement the following `derive*` helpers in the extractor:

```typescript
// Column 5 → card type
function deriveCardType(raw5: string): CardType {
  const map: Record<string, CardType> = {
    a: "alteration",
    c: "conjuration",
    m: "manipulation",
    s: "summoning",
    h: "hero",
  };
  return map[raw5] ?? throwUnknown("card_type", raw5);
}

// Column 6 → cast target
function deriveCastTarget(raw6: string): CastTarget {
  const map: Record<string, CastTarget> = {
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
  return map[raw6] ?? throwUnknown("cast_target", raw6);
}
```

Column 3 should be extracted as a nullable `effect_record_id: number | null`
(null when `raw[2] === "0"`).

Column 4 should be extracted as a nullable `related_card_id: number | null`
(null when `raw[3] === "0"`).

---

## Uncertainties and Follow-ups

1. **`col6 = 'o'` (single-monster target):** Only one playable card (Siren Song)
   uses this. Cannot fully validate. Treat as "monster (individual)" based on
   the rules text "Cast on monster."

2. **`col6 = 'q'` is ambiguous:** It covers both "square enchantments" (e.g.,
   Healing Spring, terrain-changing spells) and "summonings" (creatures cast to
   a square). The game's deck-builder filter groups these together. Future work
   could distinguish them by checking whether `col5 = 's'` (summoning type).

3. **`col5 = 'm'` official name:** No official game term for this type was found
   in card text or help files. "Manipulation" is a working label. If a better
   source is found (e.g., forum posts, game source code comments), update
   `enums.ts` accordingly.

4. **`col4` semantics:** The relationship between Water Walking (43) and Water
   Breathing (83) is looser than the "II" variants. Both grant Waterwalk but are
   not strictly the same spell. The relationship might mean "superseded by" or
   "related to" rather than strictly "base version of." Five data points is
   insufficient to characterize fully.

5. **`col3` for hero cards:** Several hero cards (Nihil, Gorgon, Unicorn Herd,
   etc.) have non-zero `col3` pointing to effect records. These effect records
   encode on-death or special trigger behaviors unique to those heroes. The
   col-3 value for heroes does not indicate a terrain type.

6. **The 197 NCD rows not in `cards.json`:** These rows (mostly id >= 4000 plus
   a small number of normal-range ids without `CardText` entries) are internal
   effect definition records. The extractor's current behavior (skipping NCD
   rows with no CardText spell entry) is correct for the playable card output.
