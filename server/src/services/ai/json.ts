import { AiInvalidResponseError } from "./errors";

/** Pull a JSON object out of a model reply. Markdown fences are tolerated; other prose is not invented into a result. */
export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.unshift(fence[1].trim());
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  throw new AiInvalidResponseError();
}

/** Every number written in the source must still appear in the translation. */
export function numbersPreserved(source: string, translated: string): boolean {
  const numbers = source.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return numbers.every((value) => translated.includes(value));
}
