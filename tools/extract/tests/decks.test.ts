import { describe, it, expect } from "vitest";
import { parseDeck } from "../src/input/decks.js";
import { openZip, readZipEntry } from "../src/input/zip.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = resolve(__dirname, "../../../inputs/Sanctum18-04.zip");

const DECK_PATH = "Sanctum18/Decks/PRECONSTRUCTED/";

describe("parseDeck", () => {
  it("extracts name and card ids from ABOM_Starter.dck", () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, `${DECK_PATH}ABOM_Starter.dck`);
    const deck = parseDeck(buf);
    expect(deck.name).toBe("PRECON_ABOM");
    expect(deck.cards.length).toBeGreaterThanOrEqual(40);
    expect(deck.cards.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
  });

  it("handles a deck name with underscore and longer length (PRECON_DESPAIR)", () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, `${DECK_PATH}DESPAIR_Starter.dck`);
    const deck = parseDeck(buf);
    expect(deck.name).toBe("PRECON_DESPAIR");
    expect(deck.cards.length).toBeGreaterThanOrEqual(40);
  });

  it("handles the shortest deck name (PRECON_WAR)", () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, `${DECK_PATH}WAR_Starter.dck`);
    const deck = parseDeck(buf);
    expect(deck.name).toBe("PRECON_WAR");
    expect(deck.cards.length).toBeGreaterThanOrEqual(40);
  });

  it("parses card ids as integers, not strings", () => {
    const zip = openZip(ZIP_PATH);
    const buf = readZipEntry(zip, `${DECK_PATH}ABOM_Starter.dck`);
    const deck = parseDeck(buf);
    expect(typeof deck.cards[0]).toBe("number");
    expect(deck.cards[0]).toBeGreaterThan(0);
  });
});
