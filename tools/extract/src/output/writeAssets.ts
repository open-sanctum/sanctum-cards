import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { stableStringify } from "../util/stableStringify.js";
import { decodeImage } from "../input/images.js";
import { listZipEntries, readZipEntry, type Zip } from "../input/zip.js";

export interface AssetManifestEntry {
  path: string;
  sha256: string;
  width: number;
  height: number;
  bytes: number;
}

export interface AssetManifest {
  art: {
    big: Record<string, AssetManifestEntry>;
    small: Record<string, AssetManifestEntry>;
  };
}

const BIG_PREFIX = "Sanctum18/bin/bitmaps/cards/big_cards/";
const SMALL_PREFIX = "Sanctum18/bin/bitmaps/cards/small_cards/";

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
): Promise<Record<string, AssetManifestEntry>> {
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

  const out: Record<string, AssetManifestEntry> = {};
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
  const manifest: AssetManifest = { art: { big, small } };
  writeFileSync(
    join(assetsDir, "manifest.json"),
    stableStringify(manifest, 2) + "\n",
    "utf8"
  );
  return manifest;
}
