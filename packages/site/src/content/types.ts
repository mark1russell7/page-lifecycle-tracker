import type { MDXComponents } from "mdx/types";
import type { ComponentType } from "react";

export type PageStatus = "draft" | "final";

/** The frontmatter fields of a content page. */
export type PageMeta = {
  /** The full title of the page. The heading, the document title and the search results show it. */
  title: string;
  /** A short name for the sidebar and for the links to the previous page and the next page. The default is the title. */
  nav?: string;
  /** One or two sentences. The page header, the meta description and the search results show it. */
  description: string;
  /**
   * The position of the page in its section. Lower numbers come first. The
   * pages in a folder show as one group, at the lowest order in the folder.
   */
  order: number;
  status?: PageStatus;
  /** The value "wide" gives the article the width of the table of contents too, for large interactive parts. */
  layout?: "wide";
};

/** One heading in the table of contents. `build/rehype-export-toc.ts` exports this shape as `toc`. */
export type TocEntry = {
  id: string;
  depth: 2 | 3;
  text: string;
};

export type MdxPageProps = {
  components?: MDXComponents;
};

/** The exports of a compiled MDX page. */
export type ContentModule = {
  default: ComponentType<MdxPageProps>;
  toc?: readonly TocEntry[];
  frontmatter?: unknown;
};

/** One `.mdx` file, as a content source gives it to the registry. */
export type ContentEntry = {
  /** The path of the file from the glob, for example "../../content/docs/concepts/marks.mdx". */
  key: string;
  frontmatter: unknown;
  load: () => Promise<ContentModule>;
};

export type ContentPage = {
  section: string;
  /** The path in the section: "concepts/marks", or "" for the section index. */
  slug: string;
  /** The site path: "/docs/concepts/marks". */
  path: string;
  /** The file to edit, from the root of the repository. */
  sourcePath: string;
  /** The first folder in the section, for example "concepts". A page at the top of the section has no group. */
  group: string | undefined;
  meta: PageMeta;
  /** This function loads the page module. It gives the same promise each time, so that `use()` can read it. */
  load: () => Promise<ContentModule>;
};

export type SidebarPageItem = { kind: "page"; page: ContentPage };
export type SidebarGroupItem = { kind: "group"; id: string; label: string; pages: readonly ContentPage[] };
export type SidebarItem = SidebarPageItem | SidebarGroupItem;

export type ContentProblem = {
  sourcePath: string;
  message: string;
};

export type PageNeighbors = {
  previous?: ContentPage;
  next?: ContentPage;
};

/** The read access to the content pages. The components use this type, not the file source. */
export type ContentRegistry = {
  sections(): readonly string[];
  /** The pages of a section, in reading order (the order of the sidebar). */
  pages(section: string): readonly ContentPage[];
  page(section: string, slug: string): ContentPage | undefined;
  sidebar(section: string): readonly SidebarItem[];
  neighbors(page: ContentPage): PageNeighbors;
  /** The pages with a frontmatter problem or a duplicate path. The site still shows them. */
  problems(): readonly ContentProblem[];
};
