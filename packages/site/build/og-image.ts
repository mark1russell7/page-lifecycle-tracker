import type { LifecycleState } from "page-lifecycle-tracker";
import { EDGES, NODES, VIEW_BOX, VISIBLE_GROUP, edge, type EdgeId } from "../src/live/diagram-geometry.ts";
import { STATE_TEXT, STATES } from "../src/live/states.ts";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, articleSection, type SiteFacts } from "./head-tags.ts";
import { escapeHtml, type StaticRoute } from "./static-routes.ts";

/** The text of one Open Graph image. */
export type OgCard = {
  /** The line above the title, for example "Concepts". */
  eyebrow: string;
  title: string;
  description: string;
  siteName: string;
  /** The site address without the protocol, for example "owner.github.io/repository". */
  address: string;
  /** The state that glows in the diagram, and the edge of the transition into it. */
  motif: OgMotif;
};

/** The topic of a page in the diagram: the state that glows and the edge that leads to it. */
export type OgMotif = { state: LifecycleState; edge: EdgeId };

/** The motif of each topic. A route that is not in the list gets the return of a visible page. */
const MOTIFS: ReadonlyArray<readonly [RegExp, OgMotif]> = [
  [/back-forward-cache|bfcache/, { state: "active", edge: "fromBackForwardCache" }],
  [/freeze/, { state: "frozen", edge: "freeze" }],
  [/listener-order|opentelemetry|shared-tracker/, { state: "terminated", edge: "hiddenToTerminated" }],
  [/marks|hidden/, { state: "hidden", edge: "toHidden" }],
  [/states-and-transitions/, { state: "passive", edge: "blur" }],
];

/** This function gives the motif of a route, from the words of its path. */
export function ogMotif(route: StaticRoute): OgMotif {
  return MOTIFS.find(([pattern]) => pattern.test(route.path))?.[1] ?? { state: "active", edge: "toVisible" };
}

/** The web fonts of the image, as `src` values of `@font-face`. */
export type OgFonts = {
  sans: readonly string[];
  mono: readonly string[];
};

/** The light theme colors of `src/styles/tokens.css`. */
export const OG_COLORS = {
  page: "#f5f5fa",
  surface: "#ffffff",
  ink: "#15141f",
  inkSecondary: "#464458",
  inkMuted: "#63607a",
  rule: "#dcdbe7",
  ruleStrong: "#b2b0c6",
  grid: "#e2e1ec",
  accent: "#0b7a52",
  states: {
    active: "#0f8a5f",
    passive: "#d29a00",
    hidden: "#6b56e0",
    frozen: "#0f9ccf",
    terminated: "#d94a6a",
  } satisfies Record<LifecycleState, string>,
} as const;

/** The light fill of a state: the state color on white, at 14 percent. */
function wash(hex: string, amount = 0.14): string {
  const channel = (index: number): number => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  const mixed = [0, 1, 2].map((index) => Math.round(255 + (channel(index) - 255) * amount));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

/** The text of the image of a route. The home page gets the language and the license of the library. */
export function ogCard(route: StaticRoute, site: SiteFacts, fallbackDescription: string): OgCard {
  const url = new URL(site.url);
  const address = `${url.host}${url.pathname}`.replace(/\/$/, "");
  return {
    eyebrow: route.path === "" ? `TypeScript library, ${site.license} license` : articleSection(route),
    title: route.heading,
    description: route.description ?? fallbackDescription,
    siteName: site.name,
    address,
    motif: ogMotif(route),
  };
}

function fontFaces(family: string, sources: readonly string[]): string {
  return sources
    .map((source) => `@font-face{font-family:"${family}";src:${source};font-weight:200 800;font-style:normal;font-display:block}`)
    .join("\n");
}

/** The site mark (refer to `src/app/BrandMark.tsx`), larger. */
export function brandMarkSvg(size: number, ink: string, accent: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a9 9 0 1 1-8.2 5.3" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="3" r="2.6" fill="${accent}"/>
    <circle cx="12" cy="12" r="3" fill="none" stroke="${ink}" stroke-width="1.6"/>
  </svg>`;
}

/**
 * The state diagram as an SVG string. The state of the motif glows, and the
 * edge of the motif has the color of that state. The image of each page
 * shows it.
 */
export function diagramSvg(motif: OgMotif, colors = OG_COLORS): string {
  const current = motif.state;
  const node = (state: LifecycleState): string => {
    const box = NODES[state];
    const color = colors.states[state];
    const isCurrent = state === current;
    const x = box.x - box.width / 2;
    const y = box.y - box.height / 2;
    const glow = isCurrent
      ? `<rect x="${x - 10}" y="${y - 10}" width="${box.width + 20}" height="${box.height + 20}" rx="${box.height / 2 + 10}" fill="${color}" opacity="0.32" filter="url(#glow)"/>`
      : "";
    const dash = state === "terminated" ? ` stroke-dasharray="6 5"` : "";
    return `<g>
      ${glow}
      <rect x="${x}" y="${y}" width="${box.width}" height="${box.height}" rx="${box.height / 2}" fill="${isCurrent ? wash(color, 0.18) : colors.surface}" stroke="${color}" stroke-width="${isCurrent ? 3 : 2}"${dash}/>
      <text x="${box.x}" y="${box.y - 4}" text-anchor="middle" class="state">${state}</text>
      <text x="${box.x}" y="${box.y + 16}" text-anchor="middle" class="summary">${escapeHtml(STATE_TEXT[state].summary)}</text>
    </g>`;
  };
  const lit = edge(motif.edge);
  const litColor = colors.states[current];
  // The edge back to a visible state has no label of its own. It shares the label of the edge to hidden.
  const litLabel: EdgeId = motif.edge === "toVisible" ? "toHidden" : motif.edge;
  const edges = EDGES.filter((item) => item.id !== motif.edge)
    .map((item) => `<path d="${item.d}" fill="none" stroke="${colors.ruleStrong}" stroke-width="2" marker-end="url(#arrow)"/>`)
    .join("\n");
  const labels = EDGES.filter((item) => item.label !== "")
    .map((item) => {
      const className = item.id === litLabel ? "edge lit" : "edge";
      return `<text x="${item.labelX}" y="${item.labelY}" text-anchor="${item.anchor}" class="${className}">${escapeHtml(item.label)}</text>`;
    })
    .join("\n");
  const group = VISIBLE_GROUP;
  return `<svg viewBox="0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}" width="100%" aria-hidden="true">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10Z" fill="${colors.ruleStrong}"/>
      </marker>
      <marker id="arrow-lit" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10Z" fill="${litColor}"/>
      </marker>
      <filter id="glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" rx="26" fill="none" stroke="${colors.rule}" stroke-width="2"/>
    <text x="${group.x + 18}" y="${group.y + 24}" class="group">${group.label}</text>
    ${edges}
    <path d="${lit.d}" fill="none" stroke="${litColor}" stroke-width="3.5" marker-end="url(#arrow-lit)"/>
    ${labels}
    ${STATES.map(node).join("\n")}
  </svg>`;
}

/** A short state strip under the diagram: an example visit with four transitions. */
function stripSvg(colors = OG_COLORS): string {
  const parts: Array<[LifecycleState, number]> = [
    ["active", 0.3],
    ["passive", 0.12],
    ["active", 0.2],
    ["hidden", 0.18],
    ["active", 0.2],
  ];
  let x = 0;
  const width = 520;
  const segments = parts.map(([state, share]) => {
    const w = share * width;
    const rect = `<rect x="${(x + 1).toFixed(1)}" y="0" width="${(w - 2).toFixed(1)}" height="22" rx="4" fill="${wash(colors.states[state], 0.22)}"/>
      <rect x="${(x + 1).toFixed(1)}" y="16" width="${(w - 2).toFixed(1)}" height="6" rx="2" fill="${colors.states[state]}"/>`;
    x += w;
    return rect;
  });
  return `<svg viewBox="0 0 ${width} 22" width="100%" aria-hidden="true">${segments.join("")}</svg>`;
}

/**
 * The HTML page that the build renders to a PNG file of 1200 × 630 pixels.
 * It uses the colors and the fonts of the site. A script makes the title
 * smaller until it fits in three lines. Then it sets `data-ready` on the body.
 */
export function ogImageHtml(card: OgCard, fonts: OgFonts): string {
  const c = OG_COLORS;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
${fontFaces("Atkinson Hyperlegible Next", fonts.sans)}
${fontFaces("Atkinson Hyperlegible Mono", fonts.mono)}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${OG_IMAGE_WIDTH}px; height: ${OG_IMAGE_HEIGHT}px; overflow: hidden; }
body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 560px;
  gap: 44px;
  padding: 56px 56px 56px 68px;
  background-color: ${c.page};
  background-image: radial-gradient(${c.grid} 1.4px, transparent 1.6px);
  background-size: 22px 22px;
  color: ${c.ink};
  font-family: "Atkinson Hyperlegible Next", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.text { display: grid; grid-template-rows: auto 1fr auto; min-width: 0; }
.brand { display: flex; align-items: center; gap: 14px; font-family: "Atkinson Hyperlegible Mono", monospace; font-size: 27px; font-weight: 700; letter-spacing: -0.01em; }
.main { min-width: 0; align-self: center; }
.eyebrow { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; color: ${c.accent}; font-size: 23px; font-weight: 700; }
.eyebrow::before { content: ""; width: 14px; height: 14px; border-radius: 50%; background: ${c.states.active}; box-shadow: 0 0 0 5px ${wash(c.states.active, 0.2)}; }
.title { font-size: 66px; font-weight: 800; line-height: 1.04; letter-spacing: -0.03em; text-wrap: balance; }
.description { display: -webkit-box; margin-top: 22px; overflow: hidden; color: ${c.inkSecondary}; font-size: 25px; line-height: 1.42; text-wrap: pretty; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.address { padding-top: 16px; border-top: 1.5px solid ${c.ruleStrong}; color: ${c.inkMuted}; font-family: "Atkinson Hyperlegible Mono", monospace; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.panel { display: flex; flex-direction: column; justify-content: center; gap: 18px; padding: 22px 20px; border: 1.5px solid ${c.ruleStrong}; border-radius: 18px; background: ${c.surface}; }
.panel .strip { padding: 0 20px; }
.state { fill: ${c.ink}; font-family: "Atkinson Hyperlegible Mono", monospace; font-size: 19px; font-weight: 700; }
.summary { fill: ${c.inkSecondary}; font-size: 13px; }
.edge { fill: ${c.inkMuted}; font-family: "Atkinson Hyperlegible Mono", monospace; font-size: 12.5px; paint-order: stroke; stroke: ${c.surface}; stroke-width: 5px; stroke-linejoin: round; }
.edge.lit { fill: ${c.ink}; font-weight: 700; }
.group { fill: ${c.inkMuted}; font-size: 14px; font-weight: 700; }
</style>
</head>
<body>
  <div class="text">
    <div class="brand">${brandMarkSvg(38, c.ink, c.states.active)}<span>${escapeHtml(card.siteName)}</span></div>
    <div class="main">
      <p class="eyebrow">${escapeHtml(card.eyebrow)}</p>
      <h1 class="title">${escapeHtml(card.title)}</h1>
      <p class="description">${escapeHtml(card.description)}</p>
    </div>
    <div class="address">${escapeHtml(card.address)}</div>
  </div>
  <div class="panel">
    ${diagramSvg(card.motif)}
    <div class="strip">${stripSvg()}</div>
  </div>
  <script>
    document.fonts.ready.then(function () {
      var title = document.querySelector(".title");
      var size = 66;
      while (size > 38 && (title.getBoundingClientRect().height > size * 1.04 * 3 + 2 || title.scrollWidth > title.clientWidth)) {
        size -= 2;
        title.style.fontSize = size + "px";
      }
      document.body.setAttribute("data-ready", "true");
    });
  </script>
</body>
</html>
`;
}
