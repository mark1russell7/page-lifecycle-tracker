import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSearchIndex, headingsOf, labelOf, plainText } from "./search-index.ts";

const contentDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content");

describe("the search index", () => {
  it("gives the h2 and h3 headings with the IDs of rehype-slug, without code blocks", () => {
    const source = "---\ntitle: T\n---\n\n## The `pagehide` event\n\n```ts\n## not a heading\n```\n\n### Use [marks](/x)\n\n## The `pagehide` event\n";
    expect(headingsOf(source)).toEqual([
      { text: "The pagehide event", id: "the-pagehide-event" },
      { text: "Use marks", id: "use-marks" },
      { text: "The pagehide event", id: "the-pagehide-event-1" },
    ]);
  });

  it("gives the text without frontmatter, imports, JSX and Markdown marks", () => {
    const text = plainText(
      '---\ntitle: T\n---\nimport X from "y";\n\n## Head\n\nSome **bold** [link](/a) and `code`.\n\n<Callout type="note">Inside</Callout>\n\n| a | b |\n| --- | --- |\n',
    );
    expect(text).toBe("Head Some bold link and code . Inside a b");
  });

  it("makes labels from folder names", () => {
    expect(labelOf("recipes")).toBe("Recipes");
    expect(labelOf("getting-started")).toBe("Getting started");
  });

  it("has an entry for each page of the site, with its section and its title", async () => {
    const entries = await buildSearchIndex(contentDir);
    expect(entries.find((entry) => entry.path === "docs")).toMatchObject({ section: "Docs" });
    const bfcache = entries.find((entry) => entry.path === "docs/concepts/back-forward-cache");
    expect(bfcache).toMatchObject({ section: "Concepts" });
    expect(bfcache?.title).toMatch(/bfcache/);
    expect(entries.find((entry) => entry.path === "docs/recipes/flush-opentelemetry")).toMatchObject({ section: "Recipes" });
    for (const entry of entries) expect(entry.text.length, entry.path).toBeGreaterThan(100);
  });
});
