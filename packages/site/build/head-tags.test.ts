import { describe, expect, it } from "vitest";
import { articleSection, breadcrumbs, headTags, jsonForScript, ogImageAlt, ogImageFile, sectionLabel, structuredData, type SiteFacts } from "./head-tags.ts";
import type { StaticRoute } from "./static-routes.ts";

const SITE: SiteFacts = {
  url: "https://owner.github.io/plt/",
  name: "page-lifecycle-tracker",
  softwareDescription: "The Page Lifecycle state of a web page.",
  repository: "https://github.com/owner/plt",
  license: "MIT",
  keywords: ["bfcache", "pagehide"],
  version: "0.1.0",
  author: "Mark Russell",
};

const HOME: StaticRoute = {
  path: "",
  title: "page-lifecycle-tracker: Page Lifecycle API state for JavaScript",
  heading: "Page Lifecycle API state for JavaScript",
  description: "The home.",
};
const DOCS: StaticRoute = { path: "docs", title: "Documentation – page-lifecycle-tracker", heading: "Documentation", description: "The docs." };
const MARKS: StaticRoute = {
  path: "docs/concepts/marks",
  title: "Marks – page-lifecycle-tracker",
  heading: "Marks",
  description: 'The "marks" <here>.',
};
const ROUTES = [HOME, DOCS, MARKS];

/** The JSON-LD object in the head tags. */
function jsonLd(tags: string): unknown {
  const text = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(tags)?.[1];
  if (text === undefined) throw new Error("No JSON-LD");
  return JSON.parse(text);
}

describe("head tags", () => {
  it("gives a content page its canonical URL, Open Graph, the Twitter card and the sitemap", () => {
    const tags = headTags(MARKS, ROUTES, SITE, "Fallback.");
    const url = "https://owner.github.io/plt/docs/concepts/marks";
    const image = "https://owner.github.io/plt/og/docs/concepts/marks.png";
    expect(tags).toContain(`<link rel="canonical" href="${url}" />`);
    expect(tags).toContain(`<meta property="og:url" content="${url}" />`);
    expect(tags).toContain(`<meta property="og:type" content="article" />`);
    expect(tags).toContain(`<meta property="og:site_name" content="page-lifecycle-tracker" />`);
    expect(tags).toContain(`<meta property="og:title" content="Marks" />`);
    expect(tags).toContain(`<meta property="og:description" content="The &quot;marks&quot; &lt;here&gt;." />`);
    expect(tags).toContain(`<meta property="og:image" content="${image}" />`);
    expect(tags).toContain(`<meta property="og:image:width" content="1200" />`);
    expect(tags).toContain(`<meta property="og:image:height" content="630" />`);
    expect(tags).toMatch(/<meta property="og:image:alt" content="Marks, [^"]+" \/>/);
    expect(tags).toContain(`<meta property="article:section" content="Concepts" />`);
    expect(tags).toContain(`<meta name="twitter:card" content="summary_large_image" />`);
    expect(tags).toContain(`<meta name="twitter:image" content="${image}" />`);
    expect(tags).toContain(`<link rel="sitemap" type="application/xml" href="https://owner.github.io/plt/sitemap.xml" />`);
  });

  it("gives the home page the full title, the type website and the site URL", () => {
    const tags = headTags(HOME, ROUTES, SITE, "Fallback.");
    expect(tags).toContain(`<link rel="canonical" href="https://owner.github.io/plt/" />`);
    expect(tags).toContain(`<meta property="og:type" content="website" />`);
    expect(tags).toContain(`<meta property="og:title" content="page-lifecycle-tracker: Page Lifecycle API state for JavaScript" />`);
    expect(tags).toContain(`<meta property="og:image" content="https://owner.github.io/plt/og/index.png" />`);
    expect(tags).not.toContain("article:section");
  });

  it("uses the fallback description for a page without a description", () => {
    const tags = headTags({ path: "docs/x", title: "X – plt", heading: "X" }, ROUTES, SITE, "Fallback.");
    expect(tags).toContain(`<meta property="og:description" content="Fallback." />`);
    expect(tags).toContain(`<meta name="twitter:description" content="Fallback." />`);
  });

  it("gives the home page a WebSite and a SoftwareSourceCode in TypeScript under the MIT license", () => {
    expect(jsonLd(headTags(HOME, ROUTES, SITE, "Fallback."))).toEqual(structuredData(HOME, ROUTES, SITE));
    expect(structuredData(HOME, ROUTES, SITE)).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://owner.github.io/plt/#website",
          url: "https://owner.github.io/plt/",
          name: "page-lifecycle-tracker",
          description: "The home.",
          inLanguage: "en",
        },
        {
          "@type": "SoftwareSourceCode",
          "@id": "https://owner.github.io/plt/#software",
          name: "page-lifecycle-tracker",
          description: "The Page Lifecycle state of a web page.",
          url: "https://owner.github.io/plt/",
          codeRepository: "https://github.com/owner/plt",
          programmingLanguage: "TypeScript",
          runtimePlatform: ["Web browsers"],
          license: "https://opensource.org/licenses/MIT",
          keywords: "bfcache, pagehide",
          version: "0.1.0",
          author: { "@type": "Person", name: "Mark Russell" },
        },
      ],
    });
  });

  it("gives a content page a TechArticle and a BreadcrumbList", () => {
    const graph = (structuredData(MARKS, ROUTES, SITE) as { "@graph": Array<Record<string, unknown>> })["@graph"];
    expect(graph[0]).toMatchObject({
      "@type": "TechArticle",
      headline: "Marks",
      url: "https://owner.github.io/plt/docs/concepts/marks",
      image: "https://owner.github.io/plt/og/docs/concepts/marks.png",
    });
    expect(graph[1]).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "page-lifecycle-tracker", item: "https://owner.github.io/plt/" },
        { "@type": "ListItem", position: 2, name: "Documentation", item: "https://owner.github.io/plt/docs" },
        { "@type": "ListItem", position: 3, name: "Marks", item: "https://owner.github.io/plt/docs/concepts/marks" },
      ],
    });
  });

  it("puts only the parent routes that exist into the breadcrumbs", () => {
    expect(breadcrumbs(MARKS, ROUTES, SITE).map((crumb) => crumb.path)).toEqual(["", "docs", "docs/concepts/marks"]);
    const concepts: StaticRoute = { path: "docs/concepts", title: "Concepts – plt", heading: "Concepts" };
    expect(breadcrumbs(MARKS, [...ROUTES, concepts], SITE).map((crumb) => crumb.name)).toEqual([
      "page-lifecycle-tracker",
      "Documentation",
      "Concepts",
      "Marks",
    ]);
    expect(breadcrumbs(HOME, ROUTES, SITE)).toEqual([{ name: "page-lifecycle-tracker", path: "" }]);
  });

  it("escapes the JSON so that a text cannot close the script element", () => {
    const value = "</script><script>alert(1)</script> &  ";
    const text = jsonForScript({ value });
    expect(text).not.toContain("<");
    expect(text).not.toContain(" ");
    expect(JSON.parse(text)).toEqual({ value });
  });

  it("names the image files, the sections and the text alternatives", () => {
    expect(ogImageFile(HOME)).toBe("og/index.png");
    expect(ogImageFile(MARKS)).toBe("og/docs/concepts/marks.png");
    expect(sectionLabel("docs")).toBe("Docs");
    expect(sectionLabel("getting-started")).toBe("Getting started");
    expect(articleSection(MARKS)).toBe("Concepts");
    expect(articleSection({ path: "docs/api", title: "API", heading: "API" })).toBe("Docs");
    expect(ogImageAlt(HOME, SITE)).toMatch(/^page-lifecycle-tracker: Page Lifecycle API state for JavaScript\. A state diagram/);
  });
});
