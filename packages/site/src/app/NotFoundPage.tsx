import { Link, useLocation } from "react-router";
import { SITE_NAME } from "./site.ts";
import styles from "./StatusPage.module.css";

/** The page for an unknown path. */
export function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <div className={styles.page}>
      <title>{`Page not found – ${SITE_NAME}`}</title>
      <meta name="robots" content="noindex" />
      <p className={styles.code} aria-hidden="true">
        <code className={styles.state}>terminated</code>
      </p>
      <h1>There is no page at this path</h1>
      <p>
        The site has no page at <code>{pathname}</code>. Make sure that the address is correct.
      </p>
      <ul className={styles.links}>
        <li>
          <Link to="/">Go to the home page</Link>
        </li>
        <li>
          <Link to="/docs">Read the documentation</Link>
        </li>
      </ul>
    </div>
  );
}
