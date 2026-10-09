import { useState, type CSSProperties } from "react";
import { axisTicks, formatDuration, formatOffset, formatTick } from "../lib/format.ts";
import { useElementWidth } from "../lib/use-element-width.ts";
import { STATES, stateColor, stateWash } from "./states.ts";
import { segmentsOf, timeInStates, type Segment, type VisitEvent } from "./visit.ts";
import styles from "./StateStrip.module.css";

export type StateStripProps = {
  events: readonly VisitEvent[];
  /** The current time, on the clock of the events. */
  now: number;
};

type Style = CSSProperties & Record<`--${string}`, string>;

function causeText(segment: Segment): string {
  const cause = segment.cause;
  if (cause.kind === "load") return cause.navigation === "back_forward" ? "A new page load from the Back button" : "The page load";
  return `${cause.from} to ${cause.to}, from the ${cause.trigger} event`;
}

/**
 * The state strip: a track of the states of this visit, as the tracks of the
 * performance panel of the browser tools show them. Each segment has the
 * color of its state. The legend gives the total time in each state.
 */
export function StateStrip({ events, now }: StateStripProps) {
  const [trackRef, width] = useElementWidth<HTMLDivElement>(640);
  const [hover, setHover] = useState<number | undefined>(undefined);
  const segments = segmentsOf(events, now);
  const start = segments[0]?.start ?? now;
  const span = Math.max(1, now - start);
  const position = (time: number): number => ((time - start) / span) * 100;
  const ticks = axisTicks(span, width < 480 ? 4 : 7);
  const totals = timeInStates(segments);
  const summary = STATES.filter((state) => totals[state] > 0)
    .map((state) => `${state} for ${formatDuration(totals[state])}`)
    .join(", ");
  const hovered = hover === undefined ? undefined : segments[hover];

  return (
    <figure className={styles.strip}>
      <figcaption className="visually-hidden">The states of this visit on a time line.</figcaption>
      <div
        ref={trackRef}
        className={styles.track}
        role="img"
        aria-label={`The time line of this visit: ${summary}.`}
        onPointerLeave={() => setHover(undefined)}
      >
        {segments.map((segment, index) => {
          const left = position(segment.start);
          const share = position(segment.end) - left;
          const pixels = (share / 100) * width;
          return (
            <div
              key={`${segment.start}-${index}`}
              className={styles.segment}
              data-state={segment.state}
              data-open={segment.open ? "" : undefined}
              data-hover={hover === index ? "" : undefined}
              style={{ left: `${left}%`, width: `${share}%`, "--segment-color": stateColor(segment.state), "--segment-wash": stateWash(segment.state) } as Style}
              onPointerEnter={() => setHover(index)}
            >
              {pixels >= 72 ? <span className={styles.segmentLabel}>{segment.state}</span> : null}
            </div>
          );
        })}
        {segments.map((segment, index) =>
          index > 0 && segment.cause.kind === "load" ? (
            <span key={`load-${segment.start}`} className={styles.loadMarker} style={{ left: `${position(segment.start)}%` }} aria-hidden="true" />
          ) : null,
        )}
        <span className={styles.now} aria-hidden="true" />
        {hovered ? (
          <div className={styles.tooltip} style={{ left: `${Math.min(88, Math.max(12, position((hovered.start + hovered.end) / 2)))}%` }} aria-hidden="true">
            <strong className={styles.tooltipState}>{hovered.state}</strong>
            <span>
              {formatDuration(hovered.end - hovered.start)}
              {hovered.open ? ", until now" : ""}
            </span>
            <span className={styles.tooltipMuted}>
              From {formatOffset(hovered.start - start)}. {causeText(hovered)}.
            </span>
          </div>
        ) : null}
      </div>
      <div className={styles.axis} aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} className={styles.tick} style={{ left: `${(tick / span) * 100}%` }}>
            {formatTick(tick)}
          </span>
        ))}
      </div>
      <ul className={styles.legend} aria-label="The time in each state">
        {STATES.map((state) => (
          <li key={state} data-empty={totals[state] === 0 ? "" : undefined} style={{ "--segment-color": stateColor(state), "--segment-wash": stateWash(state) } as Style}>
            <span className={styles.swatch} data-state={state} aria-hidden="true" />
            <code>{state}</code>
            <span className={styles.total}>{formatDuration(totals[state])}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
