import { CONTENT_SOURCE_ROOT } from "../app/site.ts";
import { createContentRegistry } from "./registry.ts";
import type { ContentEntry, ContentModule, ContentRegistry } from "./types.ts";

// The frontmatter loads eagerly through `?frontmatter` (refer to build/frontmatter-plugin.ts).
// Each page component loads lazily, in its own chunk.
const frontmatters = import.meta.glob<unknown>("../../content/**/*.mdx", {
  eager: true,
  query: "?frontmatter",
  import: "default",
});
const modules = import.meta.glob<ContentModule>("../../content/**/*.mdx");

/** Each `.mdx` file in `packages/site/content`. To add a page, add a file. */
export function globContentEntries(): ContentEntry[] {
  return Object.entries(modules).map(([key, load]) => ({ key, frontmatter: frontmatters[key], load }));
}

/** The registry of each content page of the site. */
export const siteContent: ContentRegistry = createContentRegistry(globContentEntries(), { sourceRoot: CONTENT_SOURCE_ROOT });
