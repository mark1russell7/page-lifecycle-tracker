/**
 * This function gives a duration as short text: "0.4 s", "12 s", "3 min 05 s"
 * or "1 h 02 min". A negative value counts as zero.
 */
export function formatDuration(milliseconds: number): string {
  const ms = Math.max(0, milliseconds);
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)} s`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${String(seconds % 60).padStart(2, "0")} s`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** This function gives the time of an event from the start of the visit, for the tables: "+12.3 s". */
export function formatOffset(milliseconds: number): string {
  const ms = Math.max(0, milliseconds);
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return formatDuration(ms);
}

/** The steps of the time axis, in milliseconds. */
const TICK_STEPS = [
  1_000, 2_000, 5_000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000, 3_600_000, 7_200_000, 21_600_000,
];

/**
 * This function gives the ticks of a time axis from 0 to `span`
 * milliseconds. It gives at most `maximum` ticks. The step between two
 * ticks is the smallest step of `TICK_STEPS` that is sufficient.
 */
export function axisTicks(span: number, maximum = 6): number[] {
  const step = TICK_STEPS.find((candidate) => span / candidate <= maximum) ?? TICK_STEPS[TICK_STEPS.length - 1] ?? 1000;
  const ticks: number[] = [];
  for (let tick = 0; tick <= span; tick += step) ticks.push(tick);
  return ticks;
}

/** The text of a tick of the time axis: "0 s", "30 s", "2 min", "1 h". */
export function formatTick(milliseconds: number): string {
  if (milliseconds < 60_000) return `${Math.round(milliseconds / 1000)} s`;
  if (milliseconds < 3_600_000) {
    const minutes = milliseconds / 60_000;
    return Number.isInteger(minutes) ? `${minutes} min` : `${Math.floor(minutes)} min ${Math.round((milliseconds % 60_000) / 1000)} s`;
  }
  const hours = milliseconds / 3_600_000;
  return Number.isInteger(hours) ? `${hours} h` : `${Math.floor(hours)} h ${Math.round((milliseconds % 3_600_000) / 60_000)} min`;
}
