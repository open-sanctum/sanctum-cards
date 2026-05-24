import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { openZip, listZipEntries, readZipEntry } from "./input/zip.js";
import { parseNcd } from "./input/ncd.js";
import { parseCardText } from "./input/cardtext.js";
import { parseDeck } from "./input/decks.js";
import { mergeCards } from "./enrich/mergeCard.js";
import { writeCardsBulk, writeCardsPerCard } from "./output/writeCards.js";
import { writeEnums } from "./output/writeEnums.js";
import { writeArtAssets } from "./output/writeAssets.js";
import { writeDecks } from "./output/writeDecks.js";
import { validateCards } from "./validate.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");

const ZIP_PATH = resolve(REPO_ROOT, "inputs/Sanctum18-04.zip");
const DATA_DIR = resolve(REPO_ROOT, "data");
const ASSETS_DIR = resolve(REPO_ROOT, "assets");
const SCHEMA_PATH = resolve(REPO_ROOT, "data/schema.json");

const CARD_TEXT_FILES = [
  "CardTextA.txt",
  "CardTextB.txt",
  "CardTextC.txt",
  "CardTextO.txt",
  "CardTextR.txt",
  "CardTextW.txt",
] as const;

async function main(): Promise<void> {
  console.log(`Opening ${ZIP_PATH}`);
  const zip = openZip(ZIP_PATH);

  console.log("Parsing Cache/Sanctum.ncd ...");
  const ncd = parseNcd(readZipEntry(zip, "Sanctum18/Cache/Sanctum.ncd"));
  console.log(`  ${ncd.length} records`);

  console.log("Parsing Cache/CardText*.txt ...");
  const cardText = CARD_TEXT_FILES.flatMap((file) =>
    parseCardText(readZipEntry(zip, `Sanctum18/Cache/${file}`), file)
  );
  console.log(`  ${cardText.length} records across ${CARD_TEXT_FILES.length} files`);

  console.log(`Writing card art to ${ASSETS_DIR} ...`);
  const manifest = await writeArtAssets(zip, ASSETS_DIR, {
    onWarning: (msg) => console.warn(`  WARN: ${msg}`),
  });
  console.log(
    `  ${Object.keys(manifest.art.big).length} big, ${Object.keys(manifest.art.small).length} small`
  );

  const bigArtIds = new Set(Object.keys(manifest.art.big));
  const smallArtIds = new Set(Object.keys(manifest.art.small));

  console.log("Merging ...");
  const cards = mergeCards(ncd, cardText, {
    onWarning: (msg) => console.warn(`  WARN: ${msg}`),
    bigArtIds,
    smallArtIds,
  });
  console.log(`  ${cards.length} cards`);

  console.log("Validating against schema ...");
  validateCards(cards, SCHEMA_PATH);
  console.log("  all cards valid");

  console.log(`Writing ${DATA_DIR}/cards.json ...`);
  writeCardsBulk(cards, DATA_DIR);

  console.log(`Writing per-card files to ${DATA_DIR}/cards/ ...`);
  writeCardsPerCard(cards, DATA_DIR);

  console.log(`Writing ${DATA_DIR}/enums.json ...`);
  writeEnums(cards, DATA_DIR);

  console.log(`Parsing preconstructed decks ...`);
  const DECKS_PREFIX = "Sanctum18/Decks/PRECONSTRUCTED/";
  const deckEntries = listZipEntries(zip, DECKS_PREFIX).filter((n) =>
    n.toLowerCase().endsWith(".dck")
  );
  const decks = deckEntries.map((entry) => ({
    slug: entry
      .slice(DECKS_PREFIX.length)
      .replace(/\.dck$/i, "")
      .toLowerCase(),
    deck: parseDeck(readZipEntry(zip, entry)),
  }));
  console.log(`  ${decks.length} decks`);

  console.log(`Writing per-deck files to ${DATA_DIR}/decks/ ...`);
  writeDecks(decks, DATA_DIR);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
