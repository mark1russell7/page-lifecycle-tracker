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

  it("finds only the pages that contain all the words", () => {
    expect(search(ENTRIES, "pagehide unload").map((result) => result.entry.path)).toEqual(["docs/concepts/back-forward-cache"]);
    expect(search(ENTRIES, "nothing here")).toEqual([]);
    expect(search(ENTRIES, "")).toEqual([]);
  });
});
