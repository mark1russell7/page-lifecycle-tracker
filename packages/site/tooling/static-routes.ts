import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_NAME } from "../src/app/site.ts";
import { extractFrontmatter } from "./frontmatter.ts";
import { mdxFiles } from "./search-index.ts";

/** One page that the build writes as its own HTML file. */
export type StaticRoute = {
  /** The path after the base URL, without slashes at the ends, for example "docs/concepts/marks". The home page is "". */
  path: string;
  /** The document title, for example "Marks – page-lifecycle-tracker". */
  title: string;
  /** The title of the page without the site name, for example "Marks". */
  heading: string;
  description?: string;
};

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** The document title of a content page. The app uses the same form (refer to `ContentPageView`). */
export function pageTitle(heading: string): string {
  return `${heading} – ${SITE_NAME}`;
}

/**
 * This function gives the routes of the content pages, as the content
 * registry gives them: "docs/index.mdx" is "docs", and
 * "docs/concepts/marks.mdx" is "docs/concepts/marks". The title is the title
 * in the frontmatter, as the page shows it. Draft pages are not routes.
 */
export async function contentRoutes(contentDir: string): Promise<StaticRoute[]> {
  const routes: StaticRoute[] = [];
  for (const file of await mdxFiles(contentDir)) {
    const meta = extractFrontmatter(await readFile(path.join(contentDir, file), "utf8"));
    if (meta["status"] === "draft") continue;
    const route = file.replace(/\.mdx$/, "").replace(/(^|\/)index$/, "");
    const heading = typeof meta["title"] === "string" ? meta["title"] : route;
    routes.push({
      path: route,
      title: pageTitle(heading),
      heading,
      ...(typeof meta["description"] === "string" ? { description: meta["description"] } : {}),
    });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * The route of the home page. The title and the description come from
 * `index.html`, because the home page uses them too. The heading is the text
 * after the first colon of the title, or the full title.
 */
export function homeRoute(template: string): StaticRoute {
  const title = unescapeHtml(/<title>([\s\S]*?)<\/title>/.exec(template)?.[1]?.trim() ?? SITE_NAME);
  const description = /<meta name="description" content="([^"]*)"/.exec(template)?.[1];
  const colon = title.indexOf(": ");
  return {
    path: "",
    title,
    heading: colon < 0 ? title : title.slice(colon + 2),
    ...(description === undefined ? {} : { description: unescapeHtml(description) }),
  };
}

/** Every page of the site: the home page, then each content page in path order. A new MDX file adds a route. */
export async function siteRoutes(template: string, contentDir: string): Promise<StaticRoute[]> {
  return [homeRoute(template), ...(await contentRoutes(contentDir))];
}

/**
 * This function gives the HTML of one route: the HTML of the app with the
 * title and the description of the route. The app sets both again when it
 * starts. A search engine and a link preview read them before that.
 */
export function routeHtml(template: string, route: StaticRoute): string {
  let html = template.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(route.title)}</title>`);
  if (route.description !== undefined) {
    const description = route.description;
    html = html.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      () => `<meta name="description" content="${escapeHtml(description)}" />`,
    );
  }
  return html;
}

/** The title of the page that GitHub Pages serves for an unknown path. */
export const NOT_FOUND_TITLE = `Page not found – ${SITE_NAME}`;

/**
 * The HTML of `404.html`: the app with an empty root element, the title of
 * the not-found page, and a `noindex` rule, so search engines do not keep
 * the address.
 */
export function notFoundHtml(template: string): string {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(NOT_FOUND_TITLE)}</title>\n    <meta name="robots" content="noindex" />`)
    .replace(/\s*<meta name="description" content="[^"]*"\s*\/?>/, "");
}

/**
 * The files of one route. GitHub Pages serves "marks.html" for the path
 * "marks". A route that is also a folder, for example "docs/concepts",
 * also gets "docs/concepts/index.html", for the path with a slash at the end.
 * The home page is "index.html".
 */
export function routeFiles(route: StaticRoute): string[] {
  return route.path === "" ? ["index.html"] : [`${route.path}.html`, `${route.path}/index.html`];
}
