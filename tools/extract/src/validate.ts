import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import type { Card } from "./enrich/mergeCard.js";

export function validateCards(cards: Card[], schemaPath: string): void {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats.default(ajv);
  const validate = ajv.compile(schema);
  const failures: string[] = [];
  for (const card of cards) {
    const { id, name } = card;
    if (!validate(card)) {
      failures.push(
        `Card ${id} (${name}) failed validation:\n  ${
          validate.errors
            ?.map((e) => `${e.instancePath} ${e.message}`)
            .join("\n  ") ?? "unknown"
        }`
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `${failures.length} card(s) failed schema validation:\n${failures.join("\n\n")}`
    );
  }
}
