import { describe, expect, it } from "vitest";
import type { SiteFacts } from "./head-tags.ts";
import { diagramSvg, ogCard, ogImageHtml, ogMotif, type OgCard } from "./og-image.ts";
import { prerenderEnabled } from "./static-site-plugin.ts";

const SITE: SiteFacts = {
  url: "https://owner.github.io/plt/",
  name: "page-lifecycle-tracker",
  softwareDescription: "The library.",
  repository: "https://github.com/owner/plt",
  license: "MIT",
};

describe("Open Graph images", () => {
  it("gives a content page its section, its title and its description", () => {
    expect(ogCard({ path: "docs/concepts/marks", title: "Marks – plt", heading: "Marks", description: "The marks." }, SITE, "Fallback.")).toEqual({
      eyebrow: "Concepts",
      title: "Marks",
      description: "The marks.",
      siteName: "page-lifecycle-tracker",
      address: "owner.github.io/plt",
      motif: { state: "hidden", edge: "toHidden" },
    });
    expect(ogCard({ path: "docs", title: "Documentation – plt", heading: "Documentation" }, SITE, "Fallback.")).toMatchObject({
      eyebrow: "Docs",
      description: "Fallback.",
    });
  });

  it("gives the home page the language and the license of the library", () => {
    expect(ogCard({ path: "", title: "plt: x", heading: "x" }, SITE, "Fallback.").eyebrow).toBe("TypeScript library, MIT license");
  });

  it("escapes the text and uses the fonts of the site", () => {
    const card: OgCard = {
      eyebrow: "Docs",
      title: "<b>Bold</b> & co",
      description: "1 < 2",
      siteName: "plt",
      address: "a.b/c",
      motif: { state: "active", edge: "toVisible" },
    };
    const html = ogImageHtml(
      card,
      { sans: ["url(sans.woff2)"], mono: ["url(mono.woff2)"] },
    );
    expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt; &amp; co");
    expect(html).toContain("1 &lt; 2");
    expect(html).toContain(`@font-face{font-family:"Atkinson Hyperlegible Next";src:url(sans.woff2)`);
    expect(html).toContain(`@font-face{font-family:"Atkinson Hyperlegible Mono";src:url(mono.woff2)`);
    expect(html).toContain("width: 1200px; height: 630px;");
    expect(html).toContain("data-ready");
  });

  it("draws the five states in the diagram, and the state of the motif glows", () => {
    const svg = diagramSvg({ state: "frozen", edge: "freeze" });
    for (const state of ["active", "passive", "hidden", "frozen", "terminated"]) expect(svg).toContain(`>${state}</text>`);
    expect(svg.match(/filter="url\(#glow\)"/g)).toHaveLength(1);
    expect(svg).toContain('stroke="#0f9ccf" stroke-width="3.5"');
    expect(svg).toMatch(/class="edge lit">freeze</);
  });

  it("gives each topic its own motif", () => {
    const motif = (path: string) => ogMotif({ path, title: "T", heading: "T" });
    expect(motif("docs/concepts/back-forward-cache")).toEqual({ state: "active", edge: "fromBackForwardCache" });
    expect(motif("docs/recipes/detect-bfcache-restore")).toEqual({ state: "active", edge: "fromBackForwardCache" });
    expect(motif("docs/concepts/freeze-and-resume")).toEqual({ state: "frozen", edge: "freeze" });
    expect(motif("docs/recipes/flush-opentelemetry")).toEqual({ state: "terminated", edge: "hiddenToTerminated" });
    expect(motif("docs/recipes/pause-timers-while-hidden")).toEqual({ state: "hidden", edge: "toHidden" });
    expect(motif("")).toEqual({ state: "active", edge: "toVisible" });
  });
});

describe("prerender switch", () => {
  it("is on unless SITE_PRERENDER is 0, false, no or off", () => {
    expect(prerenderEnabled(undefined)).toBe(true);
    expect(prerenderEnabled("1")).toBe(true);
    for (const value of ["0", "false", "NO", " off "]) expect(prerenderEnabled(value)).toBe(false);
  });
});
