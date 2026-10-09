/**
 * The types of the `.mdx` modules (refer to `build/mdx-plugin.ts`). The
 * content registry loads the pages with `import.meta.glob`. A direct
 * `import Example from "./example.mdx"` uses this declaration.
 */
declare module "*.mdx" {
  import type { MDXComponents } from "mdx/types";
  import type { ComponentType } from "react";

  export const frontmatter: Record<string, unknown>;
  export const toc: ReadonlyArray<{ id: string; depth: 2 | 3; text: string }>;

  const MDXContent: ComponentType<{ components?: MDXComponents }>;
  export default MDXContent;
}

/** The type of `virtual:search-index` (refer to `build/search-plugin.ts`). */
declare module "virtual:search-index" {
  export type SearchHeading = { text: string; id: string };
  export type SearchEntry = {
    path: string;
    section: string;
    title: string;
    description: string;
    headings: SearchHeading[];
    text: string;
  };
  const entries: SearchEntry[];
  export default entries;
}
