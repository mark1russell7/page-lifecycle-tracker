import type { CSSProperties } from "react";
import { formatDuration } from "../lib/format.ts";
import { useTicker } from "../lib/hooks.ts";
import { LifecycleDiagram, type DiagramTransition } from "./LifecycleDiagram.tsx";
import { STATE_TEXT, stateColor } from "./states.ts";
import { StateStrip } from "./StateStrip.tsx";
import { TransitionLog } from "./TransitionLog.tsx";
import { TryChecklist } from "./TryChecklist.tsx";
import { currentState, useVisitEvents } from "./use-visit.ts";
import { visitNow, type VisitEvent } from "./visit.ts";
import styles from "./LiveInstrument.module.css";

type Style = CSSProperties & Record<`--${string}`, string>;

/** The last transition of the visit, for the animation of the diagram. */
export function lastTransition(events: readonly VisitEvent[]): DiagramTransition | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.kind === "transition") return { from: event.from, to: event.to, trigger: event.trigger, key: `${event.at}-${index}` };
    if (event?.kind === "load") return undefined;
  }
  return undefined;
}

/**
 * The live panel of the home page. It shows the state of this page from the
 * shared tracker of the real library: the diagram, the state strip, the
 * experiments and the transitions.
 */
export function LiveInstrument() {
  const events = useVisitEvents();
  const now = useTicker(visitNow, 1000);
  const state = currentState(events);
  const transitions = events.filter((event) => event.kind === "transition").length;
  const awayHref = `${import.meta.env.BASE_URL}away.html`;
  const since = events[events.length - 1]?.at ?? now;

  return (
    <section className={styles.instrument} aria-labelledby="live-title" style={{ "--current": stateColor(state) } as Style} data-live-state={state}>
      <header className={styles.readout}>
        <h2 id="live-title" className={styles.readoutTitle}>
          <span className={styles.liveMark} aria-hidden="true" />
          Live: the Page Lifecycle state of this page
        </h2>
        <div className={styles.readoutBody}>
          <p className={styles.readoutLine} aria-live="polite" aria-atomic="true">
            <span className={styles.readoutLead}>This page is</span>{" "}
            <code key={state} className={styles.bigState}>
              {state}
            </code>
            <span className="visually-hidden">. {STATE_TEXT[state].sentence}</span>
          </p>
          <p className={styles.readoutMeta} aria-hidden="true">
            <span className={styles.readoutSince}>for {formatDuration(Math.max(0, now - since))}</span>
            <span className={styles.readoutSentence}>{STATE_TEXT[state].sentence}</span>
          </p>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.stage}>
          <LifecycleDiagram
            state={state}
            last={lastTransition(events)}
            label={`The state diagram of the Page Lifecycle API. The current state of this page is ${state}.`}
          />
        </div>
        <div className={styles.side}>
          <h3 className={styles.sideTitle}>Try it</h3>
          <TryChecklist events={events} awayHref={awayHref} />
          <h3 className={styles.sideTitle}>
            Transitions <span className={styles.sideCount}>{transitions}</span>
          </h3>
          <TransitionLog events={events} limit={5} />
        </div>
      </div>
      <div className={styles.timeline}>
        <h3 className="visually-hidden">The state strip of this visit</h3>
        <StateStrip events={events} now={Math.max(now, events[events.length - 1]?.at ?? now)} />
      </div>
    </section>
  );
}
