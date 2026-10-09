/**
 * The states of the Page Lifecycle API. Refer to
 * https://developer.chrome.com/docs/web-platform/page-lifecycle-api.
 *
 * ```text
 * active         ⇄ passive          focus / blur
 * active|passive → hidden           visibilitychange
 * hidden         → active|passive   visibilitychange
 * hidden         ⇄ frozen           freeze / resume
 * any            → frozen           pagehide (persisted: into the back/forward cache)
 * frozen         → active|passive   pageshow (persisted: from the back/forward cache)
 * any            → terminated       pagehide (not persisted)
 * ```
 *
 * The tracker does not model the "discarded" state. No script operates in a
 * discarded page. Thus a page can find a discard only after the reload,
 * through `document.wasDiscarded`.
 */
export type LifecycleState = "active" | "passive" | "hidden" | "frozen" | "terminated";

/** The browser events that cause the transitions. */
export type LifecycleTrigger = "focus" | "blur" | "visibilitychange" | "freeze" | "resume" | "pagehide" | "pageshow";

/** One change of the lifecycle state. */
export type StateTransition = {
  from: LifecycleState;
  to: LifecycleState;
  trigger: LifecycleTrigger;
  /** The time of the browser event, in `performance.now()` time. */
  timestamp: number;
};

/** A point in the stream of transitions (refer to `PageLifecycle.mark()`). */
export type LifecycleMark = {
  readonly id: symbol;
};

/**
 * The tracker reads only two properties of an event object: `persisted` (of
 * `pagehide` and `pageshow`) and `timeStamp`.
 */
export type LifecycleListener = (event: unknown) => void;

export type LifecycleListenerOptions = { capture?: boolean };

/** The part of an `EventTarget` that the tracker uses. */
export type LifecycleEventTarget = {
  addEventListener(type: string, listener: LifecycleListener, options?: LifecycleListenerOptions): void;
  removeEventListener(type: string, listener: LifecycleListener, options?: LifecycleListenerOptions): void;
};

/** The part of `document` that the tracker uses. */
export type LifecycleDocument = LifecycleEventTarget & {
  visibilityState: string;
  hasFocus?: () => boolean;
};

/** The part of `window` that the tracker uses. */
export type LifecycleWindow = LifecycleEventTarget;

/** A monotonic clock in milliseconds, for example `performance`. */
export type Clock = {
  now(): number;
};

/** A logger for the errors of subscribers. */
export type Logger = {
  log(level: string, message: string, details?: unknown): void;
};

/**
 * The phase of a subscriber. All `observe` subscribers of a transition start
 * before all `export` subscribers, in the order of their subscription in
 * each phase. Monitors observe. An exporter that sends the telemetry at the
 * end of the page exports. Thus the values of the monitors go into the last
 * export, whatever the order in which the scripts subscribed.
 */
export type SubscriberPhase = "observe" | "export";

export type SubscribeOptions = {
  /** The default is `observe`. */
  phase?: SubscriberPhase;
};
