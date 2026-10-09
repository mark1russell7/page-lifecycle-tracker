import { afterEach, describe, expect, it, vi } from "vitest";
import { PageLifecycle } from "./page-lifecycle.ts";
import { createPageLifecycle, getPageLifecycle, resetSharedPageLifecycle } from "./shared.ts";
import { createFakeEventTarget } from "./test-fakes.ts";

function fakePage() {
  const document = Object.assign(createFakeEventTarget(), { visibilityState: "visible", hasFocus: () => true });
  const window = createFakeEventTarget();
  return { document, window, clock: { now: () => 1_000 } };
}

afterEach(() => {
  resetSharedPageLifecycle();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("subscriber phases", () => {
  it("starts every observe subscriber before every export subscriber, whatever the order of the subscriptions", () => {
    const page = fakePage();
    const tracker = new PageLifecycle(page.document, page.window, page.clock, { log: vi.fn() });
    const order: string[] = [];
    tracker.subscribe(() => order.push("exporter"), { phase: "export" });
    tracker.subscribe(() => order.push("monitor 1"));
    tracker.subscribe(() => order.push("monitor 2"), { phase: "observe" });

    page.window.dispatch("pagehide", { type: "pagehide", persisted: false });

    expect(order).toEqual(["monitor 1", "monitor 2", "exporter"]);
  });

  it("lets a function subscribe two times and unsubscribe one time, in each phase", () => {
    const page = fakePage();
    const tracker = new PageLifecycle(page.document, page.window, page.clock, { log: vi.fn() });
    const listener = vi.fn();
    const first = tracker.subscribe(listener, { phase: "export" });
    tracker.subscribe(listener, { phase: "export" });
    first();
    first();

    page.document.visibilityState = "hidden";
    page.document.dispatch("visibilitychange", { type: "visibilitychange" });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not start a subscriber that a subscriber of the same transition added", () => {
    const page = fakePage();
    const tracker = new PageLifecycle(page.document, page.window, page.clock, { log: vi.fn() });
    const late = vi.fn();
    tracker.subscribe(() => {
      tracker.subscribe(late);
    });

    page.window.dispatch("blur", { type: "blur" });
    expect(late).not.toHaveBeenCalled();
    page.window.dispatch("focus", { type: "focus" });
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("logs an error of an export subscriber with its phase, and starts the other subscribers", () => {
    const page = fakePage();
    const logger = { log: vi.fn() };
    const tracker = new PageLifecycle(page.document, page.window, page.clock, logger);
    const after = vi.fn();
    tracker.subscribe(() => {
      throw new Error("export failed");
    }, { phase: "export" });
    tracker.subscribe(after, { phase: "export" });

    page.window.dispatch("blur", { type: "blur" });

    expect(after).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith("error", "Error in a lifecycle subscriber.", { error: expect.any(Error), phase: "export", type: "PageLifecycle" });
  });
});

describe("createPageLifecycle", () => {
  it("uses the options, and starts in the state of the document", () => {
    const page = fakePage();
    page.document.visibilityState = "hidden";
    const tracker = createPageLifecycle({ document: page.document, window: page.window, clock: page.clock });
    expect(tracker.getState()).toBe("hidden");
    expect(page.window.listeners().map((l) => l.type).sort()).toEqual(["blur", "focus", "pagehide", "pageshow"]);
  });

  it("uses the global document, window and performance by default, and logs subscriber errors to the console", () => {
    const page = fakePage();
    vi.stubGlobal("document", page.document);
    // The window of a page: in Node, the global object has no event listeners
    const added = vi.fn();
    vi.stubGlobal("addEventListener", added);
    vi.stubGlobal("removeEventListener", vi.fn());
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const tracker = createPageLifecycle();
    tracker.subscribe(() => {
      throw new Error("boom");
    });

    page.document.visibilityState = "hidden";
    page.document.dispatch("visibilitychange", { type: "visibilitychange" });

    expect(added).toHaveBeenCalledWith("pagehide", expect.any(Function), { capture: true });
    expect(error).toHaveBeenCalledWith("[page-lifecycle-tracker] Error in a lifecycle subscriber.", expect.objectContaining({ phase: "observe" }));
  });

  it("throws an error where there is no document, for example in a worker", () => {
    vi.stubGlobal("document", undefined);
    expect(() => createPageLifecycle({ window: fakePage().window })).toThrow(/needs a document/);
  });
});

describe("getPageLifecycle", () => {
  it("gives one tracker to all callers, made with the options of the first call", () => {
    const first = fakePage();
    const second = fakePage();
    const a = getPageLifecycle({ document: first.document, window: first.window, clock: first.clock });
    const b = getPageLifecycle({ document: second.document, window: second.window, clock: second.clock });

    expect(b).toBe(a);
    expect(second.window.listeners()).toEqual([]);
  });

  it("keeps the tracker under a global symbol, so that another copy of the package finds it", () => {
    const page = fakePage();
    const tracker = getPageLifecycle({ document: page.document, window: page.window });
    const slot = (globalThis as unknown as Record<symbol, { tracker: PageLifecycle } | undefined>)[Symbol.for("page-lifecycle-tracker.shared")];
    expect(slot?.tracker).toBe(tracker);
  });

  it("disposes of the shared tracker at a reset, and makes a new one at the next call", () => {
    const page = fakePage();
    const a = getPageLifecycle({ document: page.document, window: page.window });
    resetSharedPageLifecycle();
    expect(page.window.listeners()).toEqual([]);
    expect(getPageLifecycle({ document: page.document, window: page.window })).not.toBe(a);
    resetSharedPageLifecycle();
    resetSharedPageLifecycle();
  });
});
