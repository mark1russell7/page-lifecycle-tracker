import type { CSSProperties } from "react";
import type { LifecycleState } from "page-lifecycle-tracker";
import { formatOffset } from "../lib/format.ts";
import { stateColor } from "./states.ts";
import type { VisitEvent } from "./visit.ts";
import styles from "./TransitionLog.module.css";

export type TransitionLogProps = {
  events: readonly VisitEvent[];
  /** The most rows. The newest events show first. */
  limit?: number;
  caption?: string;
};

type Style = CSSProperties & Record<`--${string}`, string>;

function StateName({ state }: { state: LifecycleState }) {
  return (
    <code className={styles.state} style={{ "--dot": stateColor(state) } as Style}>
      {state}
    </code>
  );
}

const NAVIGATION_TEXT: Readonly<Record<string, string>> = {
  navigate: "Page load",
  reload: "Page load (reload)",
  back_forward: "Page load (Back button)",
  prerender: "Page load (prerender)",
};

/** A table of the transitions of a visit: the time, the old state, the new state and the event. */
export function TransitionLog({ events, limit = 8, caption = "The transitions of this visit, the newest first" }: TransitionLogProps) {
  const start = events[0]?.at ?? 0;
  const rows = [...events].reverse().slice(0, limit);
  const hidden = events.length - rows.length;
  return (
    <div className={styles.wrap} role="region" aria-label="Transitions" tabIndex={0}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">Event</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((event, index) =>
            event.kind === "load" ? (
              <tr key={`${event.at}-${index}`} data-kind="load">
                <td className={styles.time}>{formatOffset(event.at - start)}</td>
                <td className={styles.muted}>{NAVIGATION_TEXT[event.navigation] ?? "Page load"}</td>
                <td>
                  <StateName state={event.state} />
                </td>
                <td className={styles.muted}>Start</td>
              </tr>
            ) : (
              <tr key={`${event.at}-${index}`} data-kind="transition">
                <td className={styles.time}>{formatOffset(event.at - start)}</td>
                <td>
                  <StateName state={event.from} />
                </td>
                <td>
                  <StateName state={event.to} />
                </td>
                <td>
                  <code className={styles.trigger}>{event.trigger}</code>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      {hidden > 0 ? <p className={styles.more}>{hidden} older events are not in the table.</p> : null}
    </div>
  );
}
