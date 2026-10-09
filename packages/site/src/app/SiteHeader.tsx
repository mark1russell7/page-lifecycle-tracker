import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "react-router";
import { SearchButton } from "../search/Search.tsx";
import { ThemeToggle } from "../theme/ThemeToggle.tsx";
import { BrandMark } from "./BrandMark.tsx";
import { isCurrent, NAV_ITEMS } from "./navigation.ts";
import { REPOSITORY_URL, SITE_NAME } from "./site.ts";
import styles from "./SiteHeader.module.css";

/** The mark of GitHub, for the link to the repository. */
export function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      {open ? (
        <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

/**
 * The site header: the name, the main navigation, the search, the theme
 * button and the link to GitHub. On a narrow screen, a menu button shows and
 * hides the navigation, the theme button and the link to GitHub.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label={`${SITE_NAME}, the home page`}>
          <BrandMark />
          <span>{SITE_NAME}</span>
        </Link>
        <div id={panelId} className={styles.panel} data-open={open ? "true" : undefined}>
          <nav className={styles.nav} aria-label="Main">
            <ul className={styles.list}>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={styles.link} aria-current={isCurrent(item, pathname) ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.tools}>
            <ThemeToggle />
            <a className={styles.github} href={REPOSITORY_URL} aria-label={`${SITE_NAME} on GitHub`}>
              <GitHubMark />
            </a>
          </div>
        </div>
        <div className={styles.search}>
          <SearchButton />
        </div>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close the menu" : "Open the menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <MenuIcon open={open} />
        </button>
      </div>
    </header>
  );
}
