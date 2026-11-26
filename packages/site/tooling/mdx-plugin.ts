import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import type { Plugin } from "vite";
import { isFrontmatterRequest } from "./frontmatter.ts";
import { CODE_LANGUAGES, CODE_THEMES } from "./highlight.ts";
import { rehypeExportToc } from "./rehype-export-toc.ts";

/**
 * This plugin compiles `.mdx` files. Each module exports:
 * - `default`: the page component
 * - `frontmatter`: the YAML frontmatter
 * - `toc`: the `h2` and `h3` headings
 *
 * Shiki highlights the code at build time, so the browser gets no
 * highlighter. The wrapper skips `page.mdx?frontmatter` requests, which
 * `mdxFrontmatterPlugin` serves.
 */
export function mdxPlugin(): Plugin {
  const inner = mdx({
    remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: "frontmatter" }], remarkGfm],
    rehypePlugins: [
      // Each code block gets the colors of the light and the dark theme as CSS variables.
      [rehypeShiki, { themes: CODE_THEMES, defaultColor: false, langs: CODE_LANGUAGES, fallbackLanguage: "text" }],
      rehypeSlug,
      rehypeExportToc,
      [rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["heading-anchor"] } }],
    ],
  });

  return {
    name: "plt-site:mdx",
    enforce: "pre",
    config(config, env) {
      inner.config(config, env);
    },
    async transform(code, id) {
      if (isFrontmatterRequest(id)) return undefined;
      const result = await inner.transform(code, id);
      if (result === undefined) return undefined;
      return { code: result.code, ...(result.map === undefined ? {} : { map: result.map }) };
    },
  };
}
