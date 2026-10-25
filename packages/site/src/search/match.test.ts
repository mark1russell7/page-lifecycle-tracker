import { describe, expect, it } from "vitest";
import { queryWords, search, type SearchEntry } from "./match.ts";

const ENTRIES: SearchEntry[] = [
  {
    path: "docs/concepts/back-forward-cache",
    section: "Concepts",
    title: "Back/forward cache (bfcache) restores and pagehide",
    description: "How the tracker follows a page into the bfcache.",
    headings: [{ text: "pagehide replaces unload", id: "pagehide-replaces-unload" }],
    text: "A page goes into the back/forward cache at pagehide. The unload event is deprecated.",
  },
  {
    path: "docs/api",
    section: "Docs",
    title: "API reference",
    description: "Each export.",
    headings: [{ text: "getPageLifecycle()", id: "getpagelifecycle" }],
    text: "getPageLifecycle gives the shared tracker. The tracker listens for pagehide.",
  },
];

describe("search", () => {
  it("splits a query into lower-case words", () => {
    expect(queryWords("  Pagehide vs UNLOAD! ")).toEqual(["pagehide", "vs", "unload"]);
    expect(queryWords("")).toEqual([]);
  });

  it("puts a match in the title first, and finds the best heading and a snippet", () => {
    const results = search(ENTRIES, "pagehide");
    expect(results.map((result) => result.entry.path)).toEqual(["docs/concepts/back-forward-cache", "docs/api"]);
    expect(results[0]?.heading?.id).toBe("pagehide-replaces-unload");
    expect(results[0]?.snippet?.match.toLowerCase()).toBe("pagehide");
  });

  it("highlights the match in the raw text when the normalization changes the length of the text before it", () => {
    const entry = (text: string): SearchEntry => ({ path: "p", section: "S", title: "T", description: "D", headings: [], text });
    // NFKD makes "..." of "…" and "fi" of the ligature "ﬁ". A combining mark goes away.
    for (const text of ["Wait… then pagehide comes.", "The ﬁrst pagehide comes.", "Cafe\u0301 au lait, then pagehide comes."]) {
      const snippet = search([entry(text)], "pagehide")[0]?.snippet;
      expect(snippet?.match).toBe("pagehide");
      expect(`${snippet?.before}${snippet?.match}${snippet?.after}`).toBe(`${text}…`);
    }
    // A character that the normalization makes longer stays complete in the snippet.
    expect(search([entry("A ﬁle")], "file")[0]?.snippet?.match).toBe("ﬁle");
  });

  it("finds only the pages that contain all the words", () => {
    expect(search(ENTRIES, "pagehide unload").map((result) => result.entry.path)).toEqual(["docs/concepts/back-forward-cache"]);
    expect(search(ENTRIES, "nothing here")).toEqual([]);
    expect(search(ENTRIES, "")).toEqual([]);
  });
});
