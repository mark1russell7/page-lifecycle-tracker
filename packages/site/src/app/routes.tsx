import type { RouteObject } from "react-router";
import { ContentRoute } from "../content/components/ContentRoute.tsx";
import { HomePage } from "../home/HomePage.tsx";
import { NotFoundPage } from "./NotFoundPage.tsx";
import { RootLayout } from "./RootLayout.tsx";
import { RouteError } from "./RouteError.tsx";

function HydrateFallback() {
  return (
    <p aria-busy="true" data-loading="" style={{ padding: "2rem" }}>
      The page loads.
    </p>
  );
}

/** The route tree: the layout, the home page, the documentation and a not-found page. */
export function createAppRoutes(): RouteObject[] {
  return [
    {
      path: "/",
      element: <RootLayout />,
      errorElement: <RouteError />,
      HydrateFallback,
      children: [
        {
          errorElement: <RouteError />,
          children: [
            { index: true, element: <HomePage /> },
            { path: "docs/*", element: <ContentRoute section="docs" label="Docs" /> },
            { path: "*", element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ];
}

/** The router basename from the base URL of Vite: "/page-lifecycle-tracker/" gives "/page-lifecycle-tracker", and "/" gives "/". */
export function routerBasename(baseUrl: string): string {
  const path = /^[a-z][a-z0-9+.-]*:\/\//i.test(baseUrl) ? new URL(baseUrl).pathname : baseUrl;
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}
