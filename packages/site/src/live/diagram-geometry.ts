import type { LifecycleState, StateTransition } from "page-lifecycle-tracker";

/**
 * The geometry of the state diagram, in the units of its view box. The live
 * diagram of the site and the Open Graph images of the build use it.
 *
 * ```text
 *        pageshow (persisted), outer arc ────────────────┐
 *   ┌──── pagehide (persisted), inner arc ──────────┐    │
 *   │ visible                                       ▼    │
 *   │  active                hidden ── freeze ──▶ frozen
 *   │  ⇅ blur / focus  ⇄ visibilitychange ◀── resume ──
 *   │  passive                 │ pagehide
 *   └── pagehide ─────────▶ terminated
 * ```
 */
export const VIEW_BOX = { width: 800, height: 480 } as const;

export type NodeBox = { x: number; y: number; width: number; height: number };

/** The center and the size of each state node. */
export const NODES: Readonly<Record<LifecycleState, NodeBox>> = {
  active: { x: 148, y: 170, width: 176, height: 64 },
  passive: { x: 148, y: 310, width: 176, height: 64 },
  hidden: { x: 476, y: 240, width: 140, height: 64 },
  frozen: { x: 704, y: 240, width: 136, height: 64 },
  terminated: { x: 476, y: 400, width: 152, height: 60 },
};

/** The box around the two visible states. */
export const VISIBLE_GROUP = { x: 32, y: 96, width: 232, height: 288, label: "Visible" } as const;

export type EdgeId =
  | "blur"
  | "focus"
  | "toHidden"
  | "toVisible"
  | "freeze"
  | "resume"
  | "hiddenToTerminated"
  | "toBackForwardCache"
  | "fromBackForwardCache"
  | "visibleToTerminated";

export type Edge = {
  id: EdgeId;
  /** The SVG path, in the direction of the transition. */
  d: string;
  /** The text of the label when no transition of this visit used the edge. */
  label: string;
  /** The position of the label: the start of the text, or its center for `anchor: "middle"`. */
  labelX: number;
  labelY: number;
  anchor: "start" | "middle" | "end";
};

export const EDGES: readonly Edge[] = [
  { id: "blur", d: "M 126 204 L 126 276", label: "blur", labelX: 114, labelY: 244, anchor: "end" },
  { id: "focus", d: "M 170 276 L 170 204", label: "focus", labelX: 182, labelY: 244, anchor: "start" },
  { id: "toHidden", d: "M 266 226 L 404 226", label: "visibilitychange", labelX: 335, labelY: 244, anchor: "middle" },
  { id: "toVisible", d: "M 404 254 L 266 254", label: "", labelX: 335, labelY: 244, anchor: "middle" },
  { id: "freeze", d: "M 548 226 L 634 226", label: "freeze", labelX: 591, labelY: 214, anchor: "middle" },
  { id: "resume", d: "M 634 254 L 548 254", label: "resume", labelX: 591, labelY: 274, anchor: "middle" },
  { id: "hiddenToTerminated", d: "M 476 274 L 476 368", label: "pagehide", labelX: 488, labelY: 326, anchor: "start" },
  { id: "toBackForwardCache", d: "M 210 94 C 300 18, 650 18, 704 206", label: "pagehide (persisted)", labelX: 456, labelY: 72, anchor: "middle" },
  { id: "fromBackForwardCache", d: "M 744 206 C 714 -10, 160 -10, 110 94", label: "pageshow (persisted)", labelX: 430, labelY: 20, anchor: "middle" },
  { id: "visibleToTerminated", d: "M 148 386 C 160 446, 310 446, 398 406", label: "pagehide", labelX: 276, labelY: 462, anchor: "middle" },
];

const EDGE_BY_ID = new Map(EDGES.map((edge) => [edge.id, edge]));

/** The edge with an ID. */
export function edge(id: EdgeId): Edge {
  const found = EDGE_BY_ID.get(id);
  if (!found) throw new Error(`No edge ${id}`);
  return found;
}

/** One arrangement of the diagram: the view box, the nodes, the box of the visible states and the edges. */
export type DiagramLayout = {
  name: "landscape" | "portrait";
  viewBox: { width: number; height: number };
  nodes: Readonly<Record<LifecycleState, NodeBox>>;
  group: { x: number; y: number; width: number; height: number; label: string; labelX: number; labelY: number };
  /** A label can have two lines, with a line break ("\n") between them. */
  edges: readonly Edge[];
};

/** The wide arrangement, for a desktop screen and for the Open Graph images. */
export const LANDSCAPE: DiagramLayout = {
  name: "landscape",
  viewBox: VIEW_BOX,
  nodes: NODES,
  group: { ...VISIBLE_GROUP, labelX: VISIBLE_GROUP.x + 18, labelY: VISIBLE_GROUP.y + VISIBLE_GROUP.height - 14 },
  edges: EDGES,
};

/**
 * The tall arrangement, for a phone. The labels stay large enough to read.
 *
 * ```text
 *   ┌ visible ────────────────────────┐
 *   │  active  ⇄ blur / focus ⇄ passive │
 *   └─────────────────────────────────┘
 *  ╷   ⇅ visibilitychange    ⇅ pagehide / pageshow (persisted)
 *  ╷ hidden  ⇄ freeze / resume ⇄  frozen
 *  ╷   ↓ pagehide
 *  └▶ terminated
 * ```
 */
export const PORTRAIT: DiagramLayout = {
  name: "portrait",
  viewBox: { width: 420, height: 516 },
  nodes: {
    active: { x: 122, y: 96, width: 150, height: 56 },
    passive: { x: 318, y: 96, width: 150, height: 56 },
    hidden: { x: 122, y: 300, width: 150, height: 56 },
    frozen: { x: 318, y: 300, width: 150, height: 56 },
    terminated: { x: 122, y: 466, width: 150, height: 52 },
  },
  group: { x: 34, y: 36, width: 372, height: 134, label: "Visible", labelX: 48, labelY: 160 },
  edges: [
    { id: "blur", d: "M 201 88 L 239 88", label: "blur", labelX: 220, labelY: 64, anchor: "middle" },
    { id: "focus", d: "M 239 106 L 201 106", label: "focus", labelX: 220, labelY: 140, anchor: "middle" },
    { id: "toHidden", d: "M 108 174 L 108 268", label: "visibilitychange", labelX: 148, labelY: 226, anchor: "start" },
    { id: "toVisible", d: "M 136 268 L 136 174", label: "", labelX: 148, labelY: 226, anchor: "start" },
    { id: "freeze", d: "M 201 290 L 239 290", label: "freeze", labelX: 220, labelY: 266, anchor: "middle" },
    { id: "resume", d: "M 239 310 L 201 310", label: "resume", labelX: 220, labelY: 344, anchor: "middle" },
    { id: "hiddenToTerminated", d: "M 122 332 L 122 436", label: "pagehide", labelX: 134, labelY: 390, anchor: "start" },
    { id: "toBackForwardCache", d: "M 294 174 L 294 268", label: "pagehide\n(persisted)", labelX: 326, labelY: 198, anchor: "start" },
    { id: "fromBackForwardCache", d: "M 316 268 L 316 174", label: "pageshow\n(persisted)", labelX: 326, labelY: 240, anchor: "start" },
    { id: "visibleToTerminated", d: "M 42 160 C 8 250, 8 420, 42 460", label: "pagehide", labelX: 34, labelY: 236, anchor: "start" },
  ],
};

function isVisible(state: LifecycleState): boolean {
  return state === "active" || state === "passive";
}

/**
 * This function gives the edge that shows a transition, or `undefined` if no
 * edge shows it (for example `frozen` to `terminated`). Each restore from the
 * back/forward cache uses the outer arc, also when the state was visible
 * already, as in the event sequence of Chromium.
 */
export function edgeFor(transition: Pick<StateTransition, "from" | "to" | "trigger">): EdgeId | undefined {
  const { from, to, trigger } = transition;
  if (trigger === "pageshow" && isVisible(to)) return "fromBackForwardCache";
  if (from === "active" && to === "passive") return "blur";
  if (from === "passive" && to === "active") return "focus";
  if (isVisible(from) && to === "hidden") return "toHidden";
  if (from === "hidden" && isVisible(to)) return "toVisible";
  if (from === "hidden" && to === "frozen") return "freeze";
  if (from === "frozen" && to === "hidden") return "resume";
  if (from === "hidden" && to === "terminated") return "hiddenToTerminated";
  if (isVisible(from) && to === "frozen") return "toBackForwardCache";
  if (isVisible(from) && to === "terminated") return "visibleToTerminated";
  if (from === "frozen" && isVisible(to)) return "fromBackForwardCache";
  return undefined;
}
