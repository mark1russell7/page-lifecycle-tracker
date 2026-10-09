import "../styles/global.css";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { siteContent } from "../content/site-content.ts";
import { measureWindowOrder } from "../live/listener-order.ts";
import { createMemoryPreferenceStore } from "../theme/theme.ts";
import { createAppRoutes } from "./routes.tsx";
import { SiteProviders, type SiteServices } from "./SiteProviders.tsx";

const APP_PATHS = ["/", "/no/such/page", "/docs/no-such-page"];
const CONTENT_PATHS = siteContent.sections().flatMap((section) => siteContent.pages(section).map((page) => page.path));

function services(): SiteServices {
  return { content: siteContent, preferences: createMemoryPreferenceStore() };
}

const problems: string[] = [];
const onError = (event: ErrorEvent): void => {
  problems.push(`error event: ${event.message}`);
};
const onRejection = (event: PromiseRejectionEvent): void => {
  problems.push(`unhandled rejection: ${String(event.reason)}`);
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  problems.length = 0;
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    problems.push(`console.error: ${args.map(String).join(" ")}`);
  });
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  container.remove();
  window.removeEventListener("error", onError);
  window.removeEventListener("unhandledrejection", onRejection);
  vi.restoreAllMocks();
});

/** This function renders the app at `path` and waits until the page has a heading and nothing loads. */
async function renderPath(path: string): Promise<void> {
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] });
  root.render(
    <SiteProviders services={services()}>
      <RouterProvider router={router} />
    </SiteProviders>,
  );
  await vi.waitFor(
    () => {
      if (!container.querySelector("main h1")) throw new Error(`No h1 yet at ${path}`);
    },
    { timeout: 30_000, interval: 50 },
  );
  await vi.waitFor(
    () => {
      const busy = container.querySelector("[data-loading]");
      if (busy) throw new Error(`Still loading at ${path}: ${busy.textContent ?? ""}`);
    },
    { timeout: 30_000, interval: 50 },
  );
}

/** This function makes `document.visibilityState` give `value` until `restoreVisibility()`, and sends `visibilitychange`. */
function setVisibility(value: "hidden" | "visible"): void {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
  document.dispatchEvent(new Event("visibilitychange"));
}

function restoreVisibility(): void {
  delete (document as unknown as Record<string, unknown>)["visibilityState"];
}

function liveState(): string | null {
  return container.querySelector("[data-live-state]")?.getAttribute("data-live-state") ?? null;
}

describe("site routes", () => {
  it.each([...APP_PATHS, ...CONTENT_PATHS])("renders %s without errors", async (path) => {
    await renderPath(path);
    expect(container.querySelector("header nav[aria-label='Main']")).not.toBeNull();
    expect(container.querySelector("main h1")?.textContent?.trim()).not.toBe("");
    expect(problems).toEqual([]);
  });

  it("gives each content page the title and the description of its frontmatter in the head", async () => {
    for (const page of siteContent.pages("docs")) {
      root.unmount();
      root = createRoot(container);
      await renderPath(page.path);
      const expected = `${page.meta.title} – page-lifecycle-tracker`;
      await vi.waitFor(() => {
        const titles = [...document.head.querySelectorAll("title")].map((element) => element.textContent);
        if (!titles.includes(expected)) throw new Error(`No title "${expected}" at ${page.path}: ${titles.join(" | ")}`);
      });
      const descriptions = [...document.head.querySelectorAll("meta[name='description']")].map((element) => element.getAttribute("content"));
      expect(descriptions).toContain(page.meta.description);
    }
    expect(problems).toEqual([]);
  });
});

describe("the live diagram of the home page", () => {
  afterEach(() => {
    restoreVisibility();
  });

  it("follows a visibility change of this page with the real shared tracker", async () => {
    await renderPath("/");
    const diagram = (): SVGSVGElement | null => container.querySelector("svg[data-state]");
    const start = liveState();
    expect(start === "active" || start === "passive").toBe(true);
    expect(diagram()?.getAttribute("data-state")).toBe(start);

    setVisibility("hidden");
    await vi.waitFor(() => expect(liveState()).toBe("hidden"));
    expect(diagram()?.getAttribute("data-state")).toBe("hidden");
    expect(container.querySelector("[data-node='hidden'][data-current]")).not.toBeNull();
    expect(container.querySelector("[data-edge='toHidden'][data-lit]")).not.toBeNull();
    expect(container.querySelector("table")?.textContent).toContain("visibilitychange");

    setVisibility("visible");
    await vi.waitFor(() => expect(["active", "passive"]).toContain(liveState()));
    expect(container.querySelector("[data-edge='toVisible'][data-lit]")).not.toBeNull();
    expect(container.textContent).toContain("You got visibilitychange two times.");
    expect(problems).toEqual([]);
  });

  it("shows a restore from the back/forward cache as a pageshow transition", async () => {
    await renderPath("/");
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    await vi.waitFor(() => expect(liveState()).toBe("frozen"));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    await vi.waitFor(() => expect(["active", "passive"]).toContain(liveState()));
    expect(container.querySelector("[data-edge='fromBackForwardCache'][data-lit]")).not.toBeNull();
    expect(container.textContent).toContain("The browser restored the page from the back/forward cache");
    expect(problems).toEqual([]);
  });
});

describe("the search", () => {
  it("finds the back/forward cache page for the word bfcache", async () => {
    await renderPath("/");
    const button = container.querySelector<HTMLButtonElement>("header button[aria-label='Search the documentation']");
    if (!button) throw new Error("No search button");
    await userEvent.click(button);
    const input = await vi.waitFor(() => {
      const found = document.querySelector<HTMLInputElement>("dialog input[role='combobox']");
      if (!found) throw new Error("No search field");
      return found;
    });
    await userEvent.fill(input, "bfcache");
    await vi.waitFor(() => {
      const options = [...document.querySelectorAll("dialog [role='option']")].map((option) => option.textContent ?? "");
      if (!options.some((text) => text.includes("Back/forward cache (bfcache)"))) throw new Error(`Results: ${options.join(" | ")}`);
    });
    await userEvent.keyboard("{Escape}");
    expect(problems).toEqual([]);
  });
});

describe("experiment E1 in this Chromium", () => {
  it("starts the listeners of window in the order of registration, as the site says", () => {
    expect(measureWindowOrder(window)).toBe("registration");
    expect(measureWindowOrder(document)).toBe("capture-first");
  });
});
