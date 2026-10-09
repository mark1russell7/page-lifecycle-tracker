import { PageLifecycle } from "./page-lifecycle.ts";
import type { Clock, LifecycleDocument, LifecycleWindow, Logger } from "./types.ts";

/** The parts of the global object of a page that the tracker uses. */
export type LifecycleGlobals = {
  document?: LifecycleDocument;
  window?: LifecycleWindow;
  performance?: Clock;
};

export type PageLifecycleOptions = {
  /** The default is `globalThis.document`. */
  document?: LifecycleDocument;
  /** The default is `globalThis` (the window of the page). */
  window?: LifecycleWindow;
  /** The default is `performance`. */
  clock?: Clock;
  /** The logger of the errors of subscribers. The default writes them to `console.error`. */
  logger?: Logger;
};

/** The console of the page, without a dependency on the DOM types. */
const pageConsole = (globalThis as { console?: { error(...data: unknown[]): void } }).console;

const consoleLogger: Logger = {
  log: (_level, message, details) => pageConsole?.error(`[page-lifecycle-tracker] ${message}`, details),
};

/**
 * This function makes a tracker for the page, with the browser objects as
 * defaults. It throws an error where there is no `document`, for example in
 * a worker.
 */
export function createPageLifecycle(options: PageLifecycleOptions = {}): PageLifecycle {
  const globals = globalThis as LifecycleGlobals;
  const document = options.document ?? globals.document;
  const window = options.window ?? (globalThis as unknown as LifecycleWindow);
  const clock = options.clock ?? globals.performance ?? { now: () => Date.now() };
  if (!document) throw new Error("page-lifecycle-tracker needs a document: it follows the lifecycle of a page.");
  return new PageLifecycle(document, window, clock, options.logger ?? consoleLogger);
}

/** The key of the shared tracker on the global object. All copies of the package use the same key. */
const SHARED_KEY = Symbol.for("page-lifecycle-tracker.shared");

type SharedSlot = { tracker: PageLifecycle };

/**
 * This function gives the tracker that all libraries of the page share. The
 * first use makes it, with `options`. A later use gives the same tracker and
 * ignores its options. Thus a monitoring library and an exporter of the
 * same page see the same transitions, and the exporter can subscribe in the
 * `export` phase. Two copies of the package (for example two versions) also
 * share it, because the key is a global symbol.
 */
export function getPageLifecycle(options: PageLifecycleOptions = {}): PageLifecycle {
  const holder = globalThis as unknown as Record<symbol, SharedSlot | undefined>;
  const slot = holder[SHARED_KEY];
  if (slot) return slot.tracker;
  const tracker = createPageLifecycle(options);
  holder[SHARED_KEY] = { tracker };
  return tracker;
}

/** This function removes the shared tracker and disposes of it. Tests use it. */
export function resetSharedPageLifecycle(): void {
  const holder = globalThis as unknown as Record<symbol, SharedSlot | undefined>;
  holder[SHARED_KEY]?.tracker.dispose();
  holder[SHARED_KEY] = undefined;
}
