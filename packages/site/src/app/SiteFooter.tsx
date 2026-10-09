import { Link } from "react-router";
import { LAG_SITE_URL, REPOSITORY_URL, SITE_NAME } from "./site.ts";
import styles from "./SiteFooter.module.css";

/** The footer of each page: the project, its origin, the license and the links. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.about}>
          <p className={styles.name}>{SITE_NAME}</p>
          <p className={styles.text}>
            A TypeScript library for the Page Lifecycle API, under the MIT license. It came from <a href={LAG_SITE_URL}>lag</a>, a monitor of the lag
            of the main thread of the browser.
          </p>
          <p className={styles.text}>
            An AI model (Claude, from Anthropic) wrote most of the text and the code of this site, under the direction of the author. The tests and an
            STE linter examine them.
          </p>
        </div>
        <nav className={styles.links} aria-label="Footer">
          <ul>
            <li>
              <Link to="/docs">Documentation</Link>
            </li>
            <li>
              <Link to="/docs/api">API reference</Link>
            </li>
            <li>
              <Link to="/docs/browser-support">Browser support</Link>
            </li>
            <li>
              <a href={REPOSITORY_URL}>Source code on GitHub</a>
            </li>
            <li>
              <a href={`${REPOSITORY_URL}/issues`}>Report a problem</a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
