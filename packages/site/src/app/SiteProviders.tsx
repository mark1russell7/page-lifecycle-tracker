import type { ReactNode } from "react";
import { ContentRegistryProvider } from "../content/ContentRegistryContext.tsx";
import type { ContentRegistry } from "../content/types.ts";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import type { PreferenceStore } from "../theme/theme.ts";

/** The services that the components get from outside. The tests give their own values. */
export type SiteServices = {
  content: ContentRegistry;
  preferences: PreferenceStore;
};

/** The providers of the site, around the router. */
export function SiteProviders({ services, children }: { services: SiteServices; children: ReactNode }) {
  return (
    <ThemeProvider store={services.preferences}>
      <ContentRegistryProvider registry={services.content}>{children}</ContentRegistryProvider>
    </ThemeProvider>
  );
}
