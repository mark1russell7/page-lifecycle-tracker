import { Suspense, use } from "react";
import { SITE_NAME } from "../../app/site.ts";
import { Callout } from "../../components/Callout.tsx";
import { ErrorBoundary } from "../../components/ErrorBoundary.tsx";
import { useMdxComponents } from "../../mdx/MdxComponentsContext.tsx";
import { useContentRegistry } from "../ContentRegistryContext.tsx";
import type { ContentPage, PageMeta } from "../types.ts";
import { PageFooter } from "./PageFooter.tsx";
import { SectionSidebar } from "./SectionSidebar.tsx";
import { TableOfContents } from "./TableOfContents.tsx";
import styles from "./ContentPageView.module.css";

function PageHeader({ meta, group }: { meta: PageMeta; group: string | undefined }) {
  return (
    <header className={styles.header}>
      {group ? <p className={styles.group}>{group}</p> : null}
      <h1 className={styles.title}>{meta.title}</h1>
      {meta.description ? <p className={styles.description}>{meta.description}</p> : null}
      {meta.status === "draft" ? <Callout type="note">This page is a draft. The content is not complete and can change.</Callout> : null}
    </header>
  );
}

function groupLabel(page: ContentPage): string | undefined {
  if (page.group === undefined) return undefined;
  return page.group.charAt(0).toUpperCase() + page.group.slice(1).replace(/[-_]+/g, " ");
}

/** The article and the table of contents, after the page module loads. */
function LoadedPage({ page }: { page: ContentPage }) {
  const module = use(page.load());
  const components = useMdxComponents();
  const Content = module.default;
  const toc = module.toc ?? [];
  const hasToc = toc.length > 1;
  return (
    <>
      {hasToc ? <TableOfContents entries={toc} className={styles.toc} /> : null}
      <article className={styles.article}>
        <PageHeader meta={page.meta} group={groupLabel(page)} />
        {hasToc ? <TableOfContents entries={toc} variant="inline" className={styles.tocInline} /> : null}
        <div className="prose">
          <Content components={components} />
        </div>
        <PageFooter page={page} />
      </article>
    </>
  );
}

function LoadingPage({ page }: { page: ContentPage }) {
  return (
    <article className={styles.article} aria-busy="true" data-loading="">
      <PageHeader meta={page.meta} group={groupLabel(page)} />
      <p className={styles.loading}>The page loads.</p>
    </article>
  );
}

function FailedPage({ page, error, retry }: { page: ContentPage; error: Error; retry: () => void }) {
  return (
    <article className={styles.article}>
      <PageHeader meta={page.meta} group={groupLabel(page)} />
      <Callout type="warning" title="The page did not load">
        <p>{error.message}</p>
        <p>
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
        </p>
      </Callout>
    </article>
  );
}

export type ContentPageViewProps = {
  page: ContentPage;
  sectionLabel: string;
};

/** A content page: the section sidebar, the article and the table of contents. */
export function ContentPageView({ page, sectionLabel }: ContentPageViewProps) {
  const registry = useContentRegistry();
  return (
    <div className={styles.layout} data-layout={page.meta.layout}>
      <title>{`${page.meta.title} – ${SITE_NAME}`}</title>
      {page.meta.description ? <meta name="description" content={page.meta.description} /> : null}
      <SectionSidebar label={sectionLabel} items={registry.sidebar(page.section)} className={styles.sidebar} />
      <ErrorBoundary resetKey={page.path} fallback={(error, reset) => <FailedPage page={page} error={error} retry={reset} />}>
        <Suspense fallback={<LoadingPage page={page} />}>
          <LoadedPage page={page} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
