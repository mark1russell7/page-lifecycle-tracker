import { describe, expect, it, vi } from "vitest";
import { parsePageMeta } from "./frontmatter.ts";
import { createContentRegistry, folderLabel, parseContentKey, slugOf } from "./registry.ts";
import type { ContentEntry, ContentModule } from "./types.ts";

const module: ContentModule = { default: () => null, toc: [] };

function entry(key: string, title: string, order: number, extra: Record<string, unknown> = {}): ContentEntry {
  return {
    key: `../../content/${key}`,
    frontmatter: { title, description: `${title}.`, order, ...extra },
    load: () => Promise.resolve(module),
  };
}

const ENTRIES: ContentEntry[] = [
  entry("docs/index.mdx", "Documentation", 0),
  entry("docs/getting-started.mdx", "Getting started", 1),
  entry("docs/concepts/states-and-transitions.mdx", "States and transitions", 10, { nav: "States" }),
  entry("docs/concepts/marks.mdx", "Marks", 15),
  entry("docs/api.mdx", "API reference", 30),
  entry("docs/recipes/flush-opentelemetry.mdx", "Flush OpenTelemetry", 40),
];

describe("parsePageMeta", () => {
  it("accepts valid frontmatter with a short navigation label", () => {
    const result = parsePageMeta({ title: "Marks and windows", nav: "Marks", description: "About.", order: 2, status: "final" }, "Fallback");
    expect(result.errors).toEqual([]);
    expect(result.meta).toEqual({ title: "Marks and windows", nav: "Marks", description: "About.", order: 2, status: "final" });
  });

  it("uses safe values and marks the page as a draft for invalid fields", () => {
    const result = parsePageMeta({ title: " ", order: "first", status: "done", nav: 3 }, "Marks");
    expect(result.meta).toEqual({ title: "Marks", description: "", order: Number.MAX_SAFE_INTEGER, status: "draft" });
    expect(result.errors).toHaveLength(5);
  });

  it("accepts the wide layout and rejects other layouts", () => {
    expect(parsePageMeta({ title: "A", description: "", order: 0, layout: "wide" }, "F").meta.layout).toBe("wide");
    const invalid = parsePageMeta({ title: "A", description: "", order: 0, layout: "narrow" }, "F");
    expect(invalid.errors).toEqual(['Set `layout` to "wide", or remove it.']);
  });

  it("reports a missing frontmatter", () => {
    expect(parsePageMeta(undefined, "Page").errors[0]).toBe("The page has no frontmatter.");
  });
});

describe("the content registry", () => {
  const registry = createContentRegistry(ENTRIES, { sourceRoot: "packages/site/content" });

  it("parses the keys and the slugs", () => {
    expect(parseContentKey("../../content/docs/concepts/marks.mdx")).toEqual({ section: "docs", file: "concepts/marks" });
    expect(parseContentKey("../../content/loose.mdx")).toBeUndefined();
    expect(slugOf("index")).toBe("");
    expect(slugOf("recipes/index")).toBe("recipes");
    expect(folderLabel("getting-started")).toBe("Getting started");
  });

  it("finds pages by section and slug", () => {
    const page = registry.page("docs", "concepts/marks");
    expect(page?.path).toBe("/docs/concepts/marks");
    expect(page?.sourcePath).toBe("packages/site/content/docs/concepts/marks.mdx");
    expect(page?.group).toBe("concepts");
    expect(registry.page("docs", "")?.meta.title).toBe("Documentation");
    expect(registry.page("docs", "/api/")?.meta.title).toBe("API reference");
    expect(registry.page("docs", "missing")).toBeUndefined();
  });

  it("orders the sidebar by order, with each folder as one group", () => {
    const sidebar = registry.sidebar("docs").map((item) => (item.kind === "page" ? item.page.meta.title : `[${item.label}]`));
    expect(sidebar).toEqual(["Documentation", "Getting started", "[Concepts]", "API reference", "[Recipes]"]);
  });

  it("gives the previous and the next page in reading order", () => {
    const page = registry.page("docs", "concepts/marks");
    if (!page) throw new Error("No page");
    expect(registry.neighbors(page).previous?.slug).toBe("concepts/states-and-transitions");
    expect(registry.neighbors(page).next?.slug).toBe("api");
    expect(registry.problems()).toEqual([]);
  });

  it("loads a page module one time", async () => {
    const load = vi.fn(() => Promise.resolve(module));
    const single = createContentRegistry([{ ...entry("docs/a.mdx", "A", 1), load }], { sourceRoot: "content" });
    const page = single.page("docs", "a");
    expect(page?.load()).toBe(page?.load());
    await page?.load();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reports invalid frontmatter and duplicate paths", () => {
    const broken = createContentRegistry(
      [
        { key: "../../content/docs/a.mdx", frontmatter: { title: "A" }, load: () => Promise.resolve(module) },
        entry("docs/b.mdx", "B", 1),
        entry("docs/b/index.mdx", "B again", 2),
      ],
      { sourceRoot: "content" },
    );
    const messages = broken.problems().map((problem) => `${problem.sourcePath}: ${problem.message}`);
    expect(messages).toContain("content/docs/a.mdx: Add a `description` (text).");
    expect(messages.some((message) => message.includes("The path /docs/b is also the path of"))).toBe(true);
  });
});
