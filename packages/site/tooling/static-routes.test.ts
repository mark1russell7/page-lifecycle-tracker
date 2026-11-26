import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contentRoutes, homeRoute, NOT_FOUND_TITLE, notFoundHtml, routeFiles, routeHtml, siteRoutes } from "./static-routes.ts";

const TEMPLATE = `<!doctype html><html><head><meta name="description" content="The site &amp; more." /><title>page-lifecycle-tracker: Page Lifecycle API state for JavaScript</title></head><body><div id="root"></div></body></html>`;

async function contentDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "plt-routes-"));
  await mkdir(path.join(dir, "docs", "concepts"), { recursive: true });
  await writeFile(path.join(dir, "docs", "index.mdx"), "---\ntitle: Documentation\ndescription: The start.\n---\nText");
  await writeFile(path.join(dir, "docs", "concepts", "marks.mdx"), "---\ntitle: Marks\n---\nText");
  await writeFile(path.join(dir, "docs", "concepts", "index.mdx"), "---\ntitle: Concepts\n---\nText");
  await writeFile(path.join(dir, "docs", "draft.mdx"), "---\ntitle: Draft\nstatus: draft\n---\nText");
  return dir;
}

describe("static routes", () => {
  it("gives the content pages the paths and the titles of the content registry, in path order, without drafts", async () => {
    expect(await contentRoutes(await contentDir())).toEqual([
      { path: "docs", title: "Documentation – page-lifecycle-tracker", heading: "Documentation", description: "The start." },
      { path: "docs/concepts", title: "Concepts – page-lifecycle-tracker", heading: "Concepts" },
      { path: "docs/concepts/marks", title: "Marks – page-lifecycle-tracker", heading: "Marks" },
    ]);
  });

  it("takes the home route from the title and the description of index.html", () => {
    expect(homeRoute(TEMPLATE)).toEqual({
      path: "",
      title: "page-lifecycle-tracker: Page Lifecycle API state for JavaScript",
      heading: "Page Lifecycle API state for JavaScript",
      description: "The site & more.",
    });
    expect(homeRoute("<title>Only a name</title>").heading).toBe("Only a name");
  });

  it("lists the home page first, then the content pages", async () => {
    const routes = await siteRoutes(TEMPLATE, await contentDir());
    expect(routes.map((route) => route.path)).toEqual(["", "docs", "docs/concepts", "docs/concepts/marks"]);
  });

  it("gives each page of the site a unique title and a description", async () => {
    const siteContent = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content");
    const routes = await contentRoutes(siteContent);
    expect(routes.length).toBeGreaterThanOrEqual(14);
    expect(new Set(routes.map((route) => route.title)).size).toBe(routes.length);
    for (const route of routes) {
      expect(route.description, route.path).toBeTypeOf("string");
      expect(route.description?.length ?? 0, route.path).toBeGreaterThan(60);
      // Search engines show about 160 characters.
      expect(route.description?.length ?? 0, route.path).toBeLessThanOrEqual(180);
    }
  });

  it("puts the title and the description of the route into the HTML, with escapes", () => {
    const html = routeHtml(TEMPLATE, { path: "x", title: 'A <b> & "c" – plt', heading: "A", description: "Why 1 < 2 costs $1 and $&" });
    expect(html).toContain("<title>A &lt;b&gt; &amp; &quot;c&quot; – plt</title>");
    expect(html).toContain('<meta name="description" content="Why 1 &lt; 2 costs $1 and $&amp;" />');
    expect(html).toContain('<div id="root"></div>');
    expect(routeHtml(TEMPLATE, { path: "x", title: "T", heading: "T" })).toContain('content="The site &amp; more."');
  });

  it("gives the 404 page its title and noindex, and no description", () => {
    const html = notFoundHtml(TEMPLATE);
    expect(html).toContain(`<title>${NOT_FOUND_TITLE}</title>`);
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('name="description"');
  });

  it("writes a file for the path and a file for the path with a slash at the end", () => {
    expect(routeFiles({ path: "docs/concepts", title: "C", heading: "C" })).toEqual(["docs/concepts.html", "docs/concepts/index.html"]);
    expect(routeFiles({ path: "", title: "Home", heading: "Home" })).toEqual(["index.html"]);
  });
});
