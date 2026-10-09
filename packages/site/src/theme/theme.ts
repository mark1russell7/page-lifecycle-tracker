export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** The key of the theme in `localStorage`. The script in `index.html` reads the same key. */
export const THEME_STORAGE_KEY = "plt-site:theme";

const ORDER: readonly ThemePreference[] = ["system", "light", "dark"];

const LABELS: Readonly<Record<ThemePreference, string>> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/** This function reads a stored value. A value that is not "light" or "dark" means "system". */
export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** The preference that the theme button selects next: system, light, dark, then system again. */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "system";
}

/** This function gives the theme that shows for a preference. */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/** The name of a preference for the button. */
export function themeLabel(preference: ThemePreference): string {
  return LABELS[preference];
}

/** A small key-value store for the preferences of the reader. */
export type PreferenceStore = {
  get(key: string): string | null;
  /** The value `null` removes the key. */
  set(key: string, value: string | null): void;
};

/**
 * A store on `localStorage`. Each access is in try/catch: the browser can
 * block the storage (private windows, site settings), or the storage can be
 * full. Then the store forgets values, and the site still works.
 */
export function createBrowserPreferenceStore(getStorage: () => Storage | undefined = () => window.localStorage): PreferenceStore {
  return {
    get(key) {
      try {
        return getStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        const storage = getStorage();
        if (!storage) return;
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        // The storage is not available. The preference stays until the page closes.
      }
    },
  };
}

/** A store in memory, for tests. */
export function createMemoryPreferenceStore(initial: Readonly<Record<string, string>> = {}): PreferenceStore {
  const values = new Map(Object.entries(initial));
  return {
    get: (key) => values.get(key) ?? null,
    set(key, value) {
      if (value === null) values.delete(key);
      else values.set(key, value);
    },
  };
}
