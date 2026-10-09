import { describe, expect, it } from "vitest";
import {
  createBrowserPreferenceStore,
  createMemoryPreferenceStore,
  nextThemePreference,
  parseThemePreference,
  resolveTheme,
  themeLabel,
} from "./theme.ts";

describe("theme", () => {
  it("reads a stored preference, and anything else is system", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("blue")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
  });

  it("goes from system to light to dark and back", () => {
    expect(nextThemePreference("system")).toBe("light");
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
  });

  it("resolves system with the preference of the system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(themeLabel("dark")).toBe("Dark");
  });
});

describe("preference stores", () => {
  it("keeps values in memory and removes them with null", () => {
    const store = createMemoryPreferenceStore({ a: "1" });
    expect(store.get("a")).toBe("1");
    store.set("a", null);
    expect(store.get("a")).toBeNull();
  });

  it("does not fail when the browser blocks the storage", () => {
    const blocked = createBrowserPreferenceStore(() => {
      throw new Error("SecurityError");
    });
    expect(blocked.get("theme")).toBeNull();
    expect(() => blocked.set("theme", "dark")).not.toThrow();
    const missing = createBrowserPreferenceStore(() => undefined);
    expect(missing.get("theme")).toBeNull();
  });
});
