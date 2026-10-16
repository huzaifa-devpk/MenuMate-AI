import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (/\.(tsx?|css)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("client bundle secrets", () => {
  it("does not put an API key or provider credential in the frontend source", () => {
    const files = sourceFiles(path.resolve(import.meta.dirname, "../../client/src"));
    expect(files.length).toBeGreaterThan(5);
    const combined = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(combined).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
    expect(combined).not.toMatch(/x-goog-api-key/i);
    expect(combined).not.toMatch(/GEMMA_API_KEY\s*[:=]\s*["'][^"']+/);
    expect(combined).not.toMatch(/Authorization"\s*:\s*"Bearer\s+[A-Za-z0-9]/);
  });
});
