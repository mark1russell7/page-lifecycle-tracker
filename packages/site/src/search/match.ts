import type { SearchEntry, SearchHeading } from "virtual:search-index";

export type { SearchEntry, SearchHeading };

/** One result: the page, the heading that matches best, and a part of the text around the first match. */
export type SearchResult = {
  entry: SearchEntry;
  score: number;
  heading: SearchHeading | undefined;
  snippet: { before: string; match: string; after: string } | undefined;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * This function gives the index in `raw` that agrees with the index `offset` in `normalize(raw)`.
 * The normalization can change the length of a character. For example, "…" becomes "..." and a combining mark goes away.
 * When `offset` is in the normalized form of one character, the index is the start of that character.
 */
function rawIndex(raw: string, offset: number): number {
  let index = 0;
  let length = 0;
  for (const char of raw) {
    length += normalize(char).length;
    if (length > offset) break;
    index += char.length;
  }
  return index;
}

function count(text: string, word: string, limit: number): number {
  let total = 0;
  for (let index = text.indexOf(word); index >= 0 && total < limit; index = text.indexOf(word, index + word.length)) total++;
  return total;
}

/** This function gives the words of a query: lower case, without marks and punctuation. */
export function queryWords(query: string): string[] {
  return normalize(query)
    .split(/[^\p{L}\p{N}.$/]+/u)
    .filter((word) => word.length > 0);
}

/**
 * This function finds the pages that contain all the words of `query`. A
 * word at the start of a word of the title counts most. Then come a word in
 * the title, in a heading, in the description and in the text.
 */
export function search(entries: readonly SearchEntry[], query: string, limit = 8): SearchResult[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const results: SearchResult[] = [];
  for (const entry of entries) {
    const title = normalize(entry.title);
    const description = normalize(entry.description);
    const text = normalize(entry.text);
    const headings = entry.headings.map((heading) => normalize(heading.text));
    let score = 0;
    let found = true;
    for (const word of words) {
      const inTitle = title.includes(word) ? (title.startsWith(word) || title.includes(` ${word}`) ? 12 : 8) : 0;
      const inHeading = headings.some((heading) => heading.includes(word)) ? 5 : 0;
      const inDescription = description.includes(word) ? 3 : 0;
      const inText = count(text, word, 5);
      const wordScore = inTitle + inHeading + inDescription + inText;
      if (wordScore === 0) {
        found = false;
        break;
      }
      score += wordScore;
    }
    if (!found) continue;
    // The heading that contains the most words of the query.
    let heading: SearchHeading | undefined;
    let best = 0;
    entry.headings.forEach((candidate, index) => {
      const matches = words.filter((word) => headings[index]?.includes(word)).length;
      if (matches > best) {
        best = matches;
        heading = candidate;
      }
    });
    const first = words.map((word) => ({ word, index: text.indexOf(word) })).find((item) => item.index >= 0);
    let snippet: SearchResult["snippet"];
    if (first !== undefined) {
      // The indexes of `text` are indexes of the normalized text. The snippet uses the indexes of the raw text.
      const start = rawIndex(entry.text, first.index);
      const end = rawIndex(entry.text, first.index + first.word.length);
      snippet = {
        before: `${start > 60 ? "…" : ""}${entry.text.slice(Math.max(0, start - 60), start)}`,
        match: entry.text.slice(start, end),
        after: `${entry.text.slice(end, end + 100)}…`,
      };
    }
    results.push({ entry, score, heading, snippet });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
