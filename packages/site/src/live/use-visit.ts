import { useSyncExternalStore } from "react";
import type { LifecycleState } from "page-lifecycle-tracker";
import { getVisitStore, stateAfter, type VisitEvent, type VisitStore } from "./visit.ts";

/** This hook gives the events of a visit store. The default is the store of this page. */
export function useVisitEvents(store: VisitStore = getVisitStore()): readonly VisitEvent[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** The state after the last event, or `active` for an empty visit. */
export function currentState(events: readonly VisitEvent[]): LifecycleState {
  const last = events[events.length - 1];
  return last === undefined ? "active" : stateAfter(last);
}
