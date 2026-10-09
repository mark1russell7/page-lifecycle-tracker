import type { CSSProperties } from "react";
import { stateColor, stateWash } from "./states.ts";
import { currentState, useVisitEvents } from "./use-visit.ts";
import styles from "./LiveState.module.css";

type Style = CSSProperties & Record<`--${string}`, string>;

/** An inline badge with the current lifecycle state of this page, from the shared tracker. */
export function LiveState() {
  const state = currentState(useVisitEvents());
  return (
    <span className={styles.badge} style={{ "--dot": stateColor(state), "--wash": stateWash(state) } as Style} data-live-state={state}>
      <span className={styles.dot} aria-hidden="true" />
      <code>{state}</code>
    </span>
  );
}

export default LiveState;
