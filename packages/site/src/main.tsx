import "@fontsource-variable/atkinson-hyperlegible-next/index.css";
import "@fontsource-variable/atkinson-hyperlegible-mono/index.css";
import "./styles/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { mountApp, routePathOf } from "./app/prerender-handoff.ts";
import { createAppRoutes, routerBasename } from "./app/routes.tsx";
import { SiteProviders } from "./app/SiteProviders.tsx";
import { siteContent } from "./content/site-content.ts";
import { getVisitStore } from "./live/visit.ts";
import { createBrowserPreferenceStore } from "./theme/theme.ts";

// The visit starts before the first render: the shared tracker of the real library records each transition from now on.
getVisitStore();

const router = createBrowserRouter(createAppRoutes(), { basename: routerBasename(import.meta.env.BASE_URL) });

const container = document.getElementById("root");
if (!container) throw new Error('index.html needs an element with the ID "root".');

// A prerendered page keeps its HTML until the app has the same page ready.
const mount = mountApp(container, routePathOf(window.location.pathname, import.meta.env.BASE_URL));
createRoot(mount.element, mount.options).render(
  <StrictMode>
    <SiteProviders services={{ content: siteContent, preferences: createBrowserPreferenceStore() }}>
      <RouterProvider router={router} />
    </SiteProviders>
  </StrictMode>,
);
