import { useId } from "react";
import { cx } from "../../lib/cx.ts";
import type { TocEntry } from "../types.ts";
import styles from "./TableOfContents.module.css";

export type TableOfContentsProps = {
  entries: readonly TocEntry[];
  /** `aside` is a column next to the article. `inline` is a box in the article, after the page header. */
  variant?: "aside" | "inline";
  className?: string | undefined;
};

/** The links to the `h2` and `h3` headings of the page. */
export function TableOfContents({ entries, variant = "aside", className }: TableOfContentsProps) {
  const headingId = useId();
  return (
    <nav className={cx(styles.toc, className)} data-variant={variant} aria-labelledby={headingId}>
      <p id={headingId} className={styles.title}>
        On this page
      </p>
      <ol className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id} data-depth={entry.depth}>
            <a href={`#${entry.id}`} className={styles.link}>
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
