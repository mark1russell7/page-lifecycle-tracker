/** The name of the library and of the site. */
export const SITE_NAME = "page-lifecycle-tracker";

/** One sentence that tells what the library does. */
export const SITE_TAGLINE = "The Page Lifecycle API state of a web page, for monitoring and telemetry libraries.";

/** The repository of the project. */
export const REPOSITORY_URL = "https://github.com/mark1russell7/page-lifecycle-tracker";

/** The folder of the content pages, from the root of the repository. */
export const CONTENT_SOURCE_ROOT = "packages/site/content";

/** The address of the editor of a file in the repository on GitHub. */
export function editUrl(sourcePath: string): string {
  return `${REPOSITORY_URL}/edit/main/${sourcePath}`;
}

/** The site of the `lag` project, where the library came from. */
export const LAG_SITE_URL = "https://mark1russell7.github.io/lag/";
