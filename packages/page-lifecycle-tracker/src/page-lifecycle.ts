import type {
  Clock,
  LifecycleDocument,
  LifecycleEventTarget,
  LifecycleListener,
  LifecycleListenerOptions,
  LifecycleMark,
  LifecycleState,
  LifecycleTrigger,
  LifecycleWindow,
  Logger,
  StateTransition,
  SubscribeOptions,
  SubscriberPhase,
} from "./types.ts";

/** True for the states in which the page is visible and timers operate without throttling. */
export function isVisibleState(state: LifecycleState): boolean {
  return state === "active" || state === "passive";
}

function isPersisted(event: unknown): boolean {
  return (event as { persisted?: unknown } | undefined)?.persisted === true;
}

/**
 * This function gives the time of an event in `performance.now()` time. It is
 * the `timeStamp` of the event, or `now` when the time stamp is missing or
 * not in that time base. Old browsers gave Unix time.
 */
export function eventTime(event: unknown, now: number): number {
  const timeStamp = (event as { timeStamp?: unknown } | undefined)?.timeStamp;
  return typeof timeStamp === "number" && timeStamp > 0 && timeStamp <= now ? timeStamp : now;
}

type Subscriber = (transition: StateTransition) => void;

/**
 * This class follows the lifecycle state of a page: `active`, `passive`,
 * `hidden`, `frozen` and `terminated`. It gives:
 * - the current state (`getState()`), synchronized with `visibilityState`
 * - subscriptions to each transition, in two phases (`subscribe()`)
 * - marks, to ask which transitions occurred between a mark and this time
 * - `handle(event)`, for an exporter whose own listener starts first
 *
 * The tracker listens in the capture phase. At the target, capture
 * listeners go before the other listeners. Thus the subscribers record
 * their values before a listener of the page that sends them. Chromium
 * starts the listeners of `window` in the sequence of their registration,
 * thus an exporter must not depend on its own `pagehide` listener. It can
 * subscribe in the `export` phase instead.
 *
 * The tracker keeps the transitions only while a mark is open. On each
 * `resolve()` and `cancel()`, it removes the transitions that are older than
 * the earliest open mark. Thus resolve or cancel each mark.
 */
export class PageLifecycle {
  private currentState: LifecycleState;
  private transitions: StateTransition[] = [];
  /** The index of each open mark in `transitions`. */
  private readonly marks = new Map<symbol, number>();
  private readonly subscribers: Record<SubscriberPhase, Set<Subscriber>> = { observe: new Set(), export: new Set() };
  private readonly attached: Array<{
    target: LifecycleEventTarget;
    type: string;
    listener: LifecycleListener;
    options: LifecycleListenerOptions;
  }> = [];
  private totalTransitions = 0;
  /** The handler of each event type of the browser. The listeners and `handle()` use them. */
  private readonly handlers = new Map<string, LifecycleListener>();
  /** The event objects that the tracker handled, so that `handle()` and a listener handle each one time. */
  private readonly handled = new WeakSet<object>();

  constructor(
    private readonly document: LifecycleDocument,
    private readonly window: LifecycleWindow,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {
    this.currentState = this.document.visibilityState === "hidden" ? "hidden" : this.visibleState();
    this.attachListeners();
  }

  /**
   * This method gives the current lifecycle state.
   *
   * `document.visibilityState` changes synchronously, but the browser
   * dispatches `visibilitychange` as a separate task. Thus a timer callback
   * can start between the two. Each read synchronizes the state from
   * `visibilityState` again, so that such a callback also sees the page as
   * hidden.
   */
  getState(): LifecycleState {
    this.syncFromDocument();
    return this.currentState;
  }

  /**
   * This method puts a mark at the current point of the transition stream.
   * Use `resolve(mark)` later to get all transitions that occurred after the
   * mark.
   */
  mark(): LifecycleMark {
    this.syncFromDocument();
    const id = Symbol();
    this.marks.set(id, this.transitions.length);
    return { id };
  }

  /**
   * This method gives all transitions that occurred after the mark, and then
   * removes the mark. It gives an empty array if the mark is unknown, for
   * example if it is already resolved.
   */
  resolve(mark: LifecycleMark): StateTransition[] {
    this.syncFromDocument();
    const start = this.marks.get(mark.id);
    if (start === undefined) return [];
    const result = this.transitions.slice(start);
    this.marks.delete(mark.id);
    this.compact();
    return result;
  }

  /** This method removes a mark, but it does not get its transitions. */
  cancel(mark: LifecycleMark): void {
    if (this.marks.delete(mark.id)) this.compact();
  }

  /**
   * This method sends each transition to `listener`. It gives a function that
   * removes the subscription. All `observe` subscribers of a transition start
   * before all `export` subscribers (refer to `SubscriberPhase`).
   */
  subscribe(listener: Subscriber, options: SubscribeOptions = {}): () => void {
    const phase = options.phase ?? "observe";
    // A wrapper, so that the same function can subscribe two times and unsubscribe one time
    const entry: Subscriber = (transition) => listener(transition);
    this.subscribers[phase].add(entry);
    return () => {
      this.subscribers[phase].delete(entry);
    };
  }

  /**
   * This method handles a lifecycle event of the browser at once, before the
   * listener of the tracker gets it. Then the tracker handles that event
   * object only one time. The tracker ignores an event of another type, and
   * a value that is not an event.
   */
  handle(event: unknown): void {
    const type = (event as { type?: unknown } | null | undefined)?.type;
    const handler = typeof type === "string" ? this.handlers.get(type) : undefined;
    handler?.(event);
  }

  /** This method removes all DOM listeners, all marks, all subscribers and the buffered transitions. */
  dispose(): void {
    for (const { target, type, listener, options } of this.attached) {
      target.removeEventListener(type, listener, options);
    }
    this.attached.length = 0;
    this.handlers.clear();
    this.subscribers.observe.clear();
    this.subscribers.export.clear();
    this.marks.clear();
    this.transitions = [];
  }

  /** The number of transitions in the buffer at this time, for tests and debug. */
  getBufferedCount(): number {
    return this.transitions.length;
  }

  /** The number of open marks. */
  getMarkCount(): number {
    return this.marks.size;
  }

  /** The total number of transitions since the construction of the tracker. */
  getTotalTransitions(): number {
    return this.totalTransitions;
  }

  private compact(): void {
    if (this.marks.size === 0) {
      this.transitions = [];
      return;
    }
    let earliest = Infinity;
    for (const index of this.marks.values()) {
      if (index < earliest) earliest = index;
    }
    if (earliest > 0) {
      this.transitions = this.transitions.slice(earliest);
      for (const [id, index] of this.marks) this.marks.set(id, index - earliest);
    }
  }

  private syncFromDocument(event?: unknown): void {
    if (this.document.visibilityState === "hidden") {
      if (isVisibleState(this.currentState)) this.transition("hidden", "visibilitychange", event);
    } else if (this.currentState === "hidden") {
      this.transition(this.visibleState(), "visibilitychange", event);
    }
  }

  private visibleState(): LifecycleState {
    const focused = this.document.hasFocus ? this.document.hasFocus() : true;
    return focused ? "active" : "passive";
  }

  private transition(to: LifecycleState, trigger: LifecycleTrigger, event?: unknown, always = false): void {
    if (to === this.currentState && !always) return;
    const transition: StateTransition = {
      from: this.currentState,
      to,
      trigger,
      timestamp: eventTime(event, this.clock.now()),
    };
    this.currentState = to;
    this.totalTransitions++;
    // Nobody can resolve these later, thus the tracker does not keep them
    if (this.marks.size > 0) this.transitions.push(transition);
    for (const phase of ["observe", "export"] as const) {
      for (const subscriber of [...this.subscribers[phase]]) {
        try {
          subscriber(transition);
        } catch (error) {
          this.logger.log("error", "Error in a lifecycle subscriber.", { error, phase, type: "PageLifecycle" });
        }
      }
    }
  }

  private listen(target: LifecycleEventTarget, type: string, handler: LifecycleListener, options: LifecycleListenerOptions = {}): void {
    const listener: LifecycleListener = (event) => {
      if (typeof event === "object" && event !== null) {
        if (this.handled.has(event)) return;
        this.handled.add(event);
      }
      handler(event);
    };
    this.handlers.set(type, listener);
    target.addEventListener(type, listener, options);
    this.attached.push({ target, type, listener, options });
  }

  private attachListeners(): void {
    // Not in the capture phase: a capture listener on the window also gets
    // the focus and blur events of each element in the page
    this.listen(this.window, "focus", (event) => {
      if (this.currentState === "passive") this.transition("active", "focus", event);
    });
    this.listen(this.window, "blur", (event) => {
      if (this.currentState === "active") this.transition("passive", "blur", event);
    });

    // In the capture phase: at the target, capture listeners go before the other listeners
    const capture = { capture: true };
    this.listen(this.document, "visibilitychange", (event) => this.syncFromDocument(event), capture);
    this.listen(this.document, "freeze", (event) => this.transition("frozen", "freeze", event), capture);
    this.listen(this.document, "resume", (event) => this.transition("hidden", "resume", event), capture);
    this.listen(
      this.window,
      "pagehide",
      (event) => this.transition(isPersisted(event) ? "frozen" : "terminated", "pagehide", event),
      capture,
    );
    this.listen(
      this.window,
      "pageshow",
      (event) => {
        // Chromium fires resume and visibilitychange before pageshow, thus the state can be visible
        // already. A restore is always a transition, so that the subscribers know about it.
        if (isPersisted(event)) this.transition(this.visibleState(), "pageshow", event, true);
      },
      capture,
    );
    // No beforeunload listener: a script can cancel it (then a live page is
    // terminated), and it makes the page ineligible for the back/forward cache
  }
}

/** A summary of the state changes in a list of transitions, from `summarizeTransitions`. */
export type LifecycleSummary = {
  wasHidden: boolean;
  wasFrozen: boolean;
  wasTerminated: boolean;
  wasRestoredFromBFCache: boolean;
  wasFocused: boolean;
  wasBlurred: boolean;
  transitionCount: number;
};

/** This function summarizes a list of transitions, for example the transitions of a measurement window. */
export function summarizeTransitions(transitions: readonly StateTransition[]): LifecycleSummary {
  return {
    wasHidden: transitions.some((t) => t.to === "hidden"),
    wasFrozen: transitions.some((t) => t.to === "frozen"),
    wasTerminated: transitions.some((t) => t.to === "terminated"),
    wasRestoredFromBFCache: transitions.some((t) => t.trigger === "pageshow"),
    wasFocused: transitions.some((t) => t.trigger === "focus"),
    wasBlurred: transitions.some((t) => t.trigger === "blur"),
    transitionCount: transitions.length,
  };
}
