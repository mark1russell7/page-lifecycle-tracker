/** One link of the main navigation. */
export type NavItem = {
  label: string;
  /** The site path of the link. */
  to: string;
  /** The link is current for each path that starts with this prefix. */
  match: string;
};

/** The main navigation of the site, in order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Get started", to: "/docs/getting-started", match: "/docs/getting-started" },
  { label: "Concepts", to: "/docs/concepts/states-and-transitions", match: "/docs/concepts" },
  { label: "API", to: "/docs/api", match: "/docs/api" },
  { label: "Recipes", to: "/docs/recipes/flush-opentelemetry", match: "/docs/recipes" },
  { label: "Browser support", to: "/docs/browser-support", match: "/docs/browser-support" },
];

/** True if the link `item` is current for the path `pathname` of the router. */
export function isCurrent(item: NavItem, pathname: string): boolean {
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
