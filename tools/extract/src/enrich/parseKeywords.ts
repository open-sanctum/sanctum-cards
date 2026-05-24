export function parseKeywords(rulesText: string, allowlist: readonly string[]): string[] {
  const found = new Set<string>();
  for (const kw of allowlist) {
    const re = new RegExp(`\\b${escapeRegex(kw)}\\b`);
    if (re.test(rulesText)) found.add(kw);
  }
  return [...found].sort();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
