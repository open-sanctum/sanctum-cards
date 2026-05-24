import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import { decodeImage } from "../input/images.js";
import { listZipEntries, readZipEntry, type Zip } from "../input/zip.js";

export interface ArtManifestEntry {
  path: string;
  sha256: string;
  width: number;
  height: number;
  bytes: number;
}

export interface SoundManifestEntry {
  path: string;
  sha256: string;
  bytes: number;
}

export interface AssetManifest {
  art: {
    big: Record<string, ArtManifestEntry>;
    small: Record<string, ArtManifestEntry>;
  };
  sounds: Record<string, SoundManifestEntry>;
}

const BIG_PREFIX = "Sanctum18/bin/bitmaps/cards/big_cards/";
const SMALL_PREFIX = "Sanctum18/bin/bitmaps/cards/small_cards/";
const SOUNDS_PREFIX = "Sanctum18/bin/sounds/";

const ID_ENTRY = /^(\d+)\.(?:bm_|bmp|BMP|jpg|JPG)$/;

function idFromEntry(entryName: string, prefix: string): number | null {
  if (!entryName.startsWith(prefix)) return null;
  const tail = entryName.slice(prefix.length);
  const m = tail.match(ID_ENTRY);
  return m ? parseInt(m[1]!, 10) : null;
}

async function processSizeBucket(
  zip: Zip,
  prefix: string,
  assetsDir: string,
  bucketRel: string,
  onWarning: (msg: string) => void
): Promise<Record<string, ArtManifestEntry>> {
  const absDir = join(assetsDir, bucketRel);
  rmSync(absDir, { recursive: true, force: true });
  mkdirSync(absDir, { recursive: true });

  const entries = listZipEntries(zip, prefix);
  const byId = new Map<number, string>();
  for (const e of entries) {
    const id = idFromEntry(e, prefix);
    if (id === null) continue;
    if (byId.has(id)) {
      onWarning(`Duplicate art entry for id ${id} in ${prefix}; using first`);
      continue;
    }
    byId.set(id, e);
  }

  const out: Record<string, ArtManifestEntry> = {};
  const sortedIds = [...byId.keys()].sort((a, b) => a - b);
  for (const id of sortedIds) {
    const entry = byId.get(id)!;
    const buf = readZipEntry(zip, entry);
    let decoded;
    try {
      decoded = await decodeImage(buf);
    } catch (err) {
      onWarning(`Failed to decode ${entry}: ${(err as Error).message}; skipping`);
      continue;
    }
    writeFileSync(join(absDir, `${id}.png`), decoded.png);
    out[id.toString()] = {
      path: `assets/${bucketRel}/${id}.png`,
      sha256: createHash("sha256").update(decoded.png).digest("hex"),
      width: decoded.width,
      height: decoded.height,
      bytes: decoded.png.length,
    };
  }
  return out;
}

function writeSounds(
  zip: Zip,
  assetsDir: string,
  onWarning: (msg: string) => void
): Record<string, SoundManifestEntry> {
  const outDir = join(assetsDir, "sounds");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const entries = listZipEntries(zip, SOUNDS_PREFIX).filter((n) =>
    /\.wav$/i.test(n)
  );
  const out: Record<string, SoundManifestEntry> = {};
  for (const entry of entries) {
    const filename = entry.slice(SOUNDS_PREFIX.length);
    const key = filename.replace(/\.wav$/i, "").toLowerCase();
    if (out[key] !== undefined) {
      onWarning(`Duplicate sound name "${key}" from ${entry}; using first`);
      continue;
    }
    const buf = readZipEntry(zip, entry);
    const outName = `${key}.wav`;
    writeFileSync(join(outDir, outName), buf);
    out[key] = {
      path: `assets/sounds/${outName}`,
      sha256: createHash("sha256").update(buf).digest("hex"),
      bytes: buf.length,
    };
  }
  return out;
}

export interface WriteAssetsOptions {
  onWarning?: (msg: string) => void;
}

export async function writeArtAssets(
  zip: Zip,
  assetsDir: string,
  opts: WriteAssetsOptions = {}
): Promise<AssetManifest> {
  const warn = opts.onWarning ?? (() => {});
  mkdirSync(assetsDir, { recursive: true });
  const big = await processSizeBucket(zip, BIG_PREFIX, assetsDir, "art/big", warn);
  const small = await processSizeBucket(zip, SMALL_PREFIX, assetsDir, "art/small", warn);
  const sounds = writeSounds(zip, assetsDir, warn);
  const manifest: AssetManifest = { art: { big, small }, sounds };
  writeFileSync(
    join(assetsDir, "manifest.json"),
    stableStringify(manifest, 2) + "\n",
    "utf8"
  );
  return manifest;
}
