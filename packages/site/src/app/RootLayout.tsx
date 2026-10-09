import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { SiteFooter } from "./SiteFooter.tsx";
import { SiteHeader } from "./SiteHeader.tsx";
import styles from "./RootLayout.module.css";

/** This component tells screen reader users the title of the new page after a route change. */
function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [message, setMessage] = useState("");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    // Wait for the new page to set the document title.
    const timer = window.setTimeout(() => setMessage(document.title), 150);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <p className="visually-hidden" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  );
}

/** The frame of each page: the skip link, the header, the main content and the footer. */
export function RootLayout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to the content
      </a>
      <SiteHeader />
      <main id="main" className={styles.main} tabIndex={-1}>
        <Suspense
          fallback={
            <p className={styles.loading} aria-busy="true" data-loading="">
              The page loads.
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <RouteAnnouncer />
      <ScrollRestoration />
    </div>
  );
}
