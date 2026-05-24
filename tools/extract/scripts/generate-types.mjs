import { compile } from "json-schema-to-typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");

const schema = JSON.parse(readFileSync(resolve(REPO, "data/schema.json"), "utf8"));
const out = await compile(schema, "Card", {
  bannerComment:
    "// AUTO-GENERATED from data/schema.json — do not edit by hand.\n// Regenerate via: pnpm generate-types\n",
  style: { semi: true, singleQuote: false, tabWidth: 2 },
  additionalProperties: false,
});
writeFileSync(resolve(REPO, "types/card.d.ts"), out);
console.log("Wrote types/card.d.ts");
