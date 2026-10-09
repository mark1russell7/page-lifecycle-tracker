import { getPageLifecycle, type LifecycleState, type LifecycleTrigger, type PageLifecycle } from "page-lifecycle-tracker";
import { isLifecycleState, isLifecycleTrigger } from "./states.ts";

/** The start of a document: a page load. A restore from the back/forward cache is not a load. */
export type VisitLoad = {
  kind: "load";
  /** The time, in milliseconds since the Unix epoch (`performance.timeOrigin`). */
  at: number;
  /** The state of the tracker at the start. */
  state: LifecycleState;
  /** The type of the navigation entry, for example "navigate", "reload" or "back_forward". */
  navigation: string;
};

/** One transition of the shared tracker. */
export type VisitTransition = {
  kind: "transition";
  /** The time of the event, in milliseconds since the Unix epoch. */
  at: number;
  from: LifecycleState;
  to: LifecycleState;
  trigger: LifecycleTrigger;
};

export type VisitEvent = VisitLoad | VisitTransition;

/** The key of the visit in `sessionStorage`. The storage belongs to one tab. */
export const VISIT_STORAGE_KEY = "plt-site:visit";

/** The most events that the visit keeps. The oldest events go first. */
export const MAX_EVENTS = 250;

/** One part of the state strip: a state from `start` to `end`. */
export type Segment = {
  state: LifecycleState;
  start: number;
  end: number;
  /** True for the last segment, which continues at this time. */
  open: boolean;
  /** The event that started the segment. */
  cause: VisitEvent;
};

/** This function gives the state after an event. */
export function stateAfter(event: VisitEvent): LifecycleState {
  return event.kind === "load" ? event.state : event.to;
}

/**
 * This function changes the events of a visit into segments of the state
 * strip. Each event starts a segment, and the last segment continues to
 * `now`.
 */
export function segmentsOf(events: readonly VisitEvent[], now: number): Segment[] {
  const segments: Segment[] = [];
  events.forEach((event, index) => {
    const next = events[index + 1];
    const open = next === undefined;
    segments.push({ state: stateAfter(event), start: event.at, end: open ? Math.max(now, event.at) : Math.max(next.at, event.at), open, cause: event });
  });
  return segments;
}

/** The total time in each state, in milliseconds. */
export function timeInStates(segments: readonly Segment[]): Record<LifecycleState, number> {
  const totals: Record<LifecycleState, number> = { active: 0, passive: 0, hidden: 0, frozen: 0, terminated: 0 };
  for (const segment of segments) totals[segment.state] += segment.end - segment.start;
  return totals;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseEvent(value: unknown): VisitEvent | undefined {
  if (!isRecord(value) || typeof value["at"] !== "number" || !Number.isFinite(value["at"])) return undefined;
  const at = value["at"];
  if (value["kind"] === "load" && isLifecycleState(value["state"])) {
    return { kind: "load", at, state: value["state"], navigation: typeof value["navigation"] === "string" ? value["navigation"] : "navigate" };
  }
  if (value["kind"] === "transition" && isLifecycleState(value["from"]) && isLifecycleState(value["to"]) && isLifecycleTrigger(value["trigger"])) {
    return { kind: "transition", at, from: value["from"], to: value["to"], trigger: value["trigger"] };
  }
  return undefined;
}

/**
 * This function reads the stored events of the visit. It ignores an entry
 * that is not valid, and it gives an empty list for text that is not JSON.
 */
export function parseStoredEvents(text: string | null): VisitEvent[] {
  if (text === null || text === "") return [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!isRecord(data) || !Array.isArray(data["events"])) return [];
  const events: VisitEvent[] = [];
  for (const item of data["events"] as unknown[]) {
    const event = parseEvent(item);
    if (event) events.push(event);
  }
  return events.sort((a, b) => a.at - b.at);
}

/** The text that the visit keeps in `sessionStorage`. */
export function serializeEvents(events: readonly VisitEvent[]): string {
  return JSON.stringify({ version: 1, events });
}

/** The events of earlier documents of the tab, then the load of this document, at most `MAX_EVENTS`. */
export function startVisit(stored: readonly VisitEvent[], load: VisitLoad): VisitEvent[] {
  return [...stored.filter((event) => event.at < load.at), load].slice(-MAX_EVENTS);
}

/** A store of the events of the visit, for `useSyncExternalStore`. */
export type VisitStore = {
  getSnapshot(): readonly VisitEvent[];
  subscribe(listener: () => void): () => void;
  /** This method removes the subscription to the tracker. */
  dispose(): void;
};

export type VisitStorage = Pick<Storage, "getItem" | "setItem">;

export type VisitRecorderOptions = {
  tracker: PageLifecycle;
  /** The time origin of the document, in milliseconds since the Unix epoch. */
  timeOrigin: number;
  navigationType: string;
  /** Without a storage, the visit starts with this document and stays only in memory. */
  storage?: VisitStorage | undefined;
};

/**
 * This function makes the store of the visit. It subscribes to the tracker
 * in the `observe` phase and records each transition. The events stay in
 * memory, thus they survive a restore from the back/forward cache. After
 * each transition, also at `pagehide`, a copy goes to the storage. Thus a
 * new load of the page in the same tab continues the visit.
 */
export function createVisitRecorder(options: VisitRecorderOptions): VisitStore {
  const { tracker, timeOrigin, storage } = options;
  const read = (): string | null => {
    try {
      return storage?.getItem(VISIT_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  };
  const save = (): void => {
    try {
      storage?.setItem(VISIT_STORAGE_KEY, serializeEvents(events));
    } catch {
      // The storage is full or blocked. The visit stays in memory.
    }
  };
  let events: readonly VisitEvent[] = startVisit(parseStoredEvents(read()), {
    kind: "load",
    at: timeOrigin,
    state: tracker.getState(),
    navigation: options.navigationType,
  });
  save();
  const listeners = new Set<() => void>();
  const unsubscribe = tracker.subscribe(({ from, to, trigger, timestamp }) => {
    events = [...events, { kind: "transition" as const, at: timeOrigin + timestamp, from, to, trigger }].slice(-MAX_EVENTS);
    save();
    for (const listener of [...listeners]) listener();
  });
  return {
    getSnapshot: () => events,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      unsubscribe();
      listeners.clear();
    },
  };
}

function navigationType(): string {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as { type?: unknown } | undefined;
    return typeof entry?.type === "string" ? entry.type : "navigate";
  } catch {
    return "navigate";
  }
}

function sessionStorageOrUndefined(): VisitStorage | undefined {
  // An automated browser (the prerender of the build, the tests) starts each visit empty.
  if (typeof navigator !== "undefined" && navigator.webdriver) return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

let shared: VisitStore | undefined;

/**
 * This function gives the one store of the visit of this page. The first
 * use makes it with the shared tracker (`getPageLifecycle()`). `main.tsx`
 * uses it before the first render, so that the visit starts early.
 */
export function getVisitStore(): VisitStore {
  shared ??= createVisitRecorder({
    tracker: getPageLifecycle(),
    timeOrigin: performance.timeOrigin,
    navigationType: navigationType(),
    storage: sessionStorageOrUndefined(),
  });
  return shared;
}

/** The current time, in milliseconds since the Unix epoch, on the clock of the events. */
export function visitNow(): number {
  return performance.timeOrigin + performance.now();
}
