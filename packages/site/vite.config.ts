import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { normalizeBase } from "./build/base.ts";
import { fontPreloadPlugin } from "./build/font-preload-plugin.ts";
import { mdxFrontmatterPlugin } from "./build/frontmatter-plugin.ts";
import { mdxPlugin } from "./build/mdx-plugin.ts";
import { searchPlugin } from "./build/search-plugin.ts";
import { staticSitePlugin } from "./build/static-site-plugin.ts";

/**
 * The Vite configuration of the site. Set `SITE_BASE` to deploy below a path,
 * as GitHub Pages does: `SITE_BASE=page-lifecycle-tracker` gives
 * `/page-lifecycle-tracker/`. Git Bash on Windows changes "/x" into a Windows
 * path, thus there use the form without slashes. `SITE_URL` gives the
 * absolute address for the canonical links and the sitemap.
 */
export default defineConfig({
  base: normalizeBase(process.env["SITE_BASE"]),
  plugins: [
    mdxFrontmatterPlugin(),
    mdxPlugin(),
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
    fontPreloadPlugin(),
    searchPlugin(),
    staticSitePlugin(),
  ],
  optimizeDeps: {
    // The dev server and Vitest browser mode load these modules first, so they do not load the page again later.
    include: ["react", "react-dom", "react-dom/client", "react-router", "react-router/dom"],
  },
  build: {
    target: "es2022",
  },
});
