import { useEffect, useId, useRef, type CSSProperties } from "react";
import type { LifecycleState, LifecycleTrigger } from "page-lifecycle-tracker";
import { useReducedMotion } from "../lib/hooks.ts";
import { useElementWidth } from "../lib/use-element-width.ts";
import { edgeFor, LANDSCAPE, PORTRAIT, type DiagramLayout, type Edge, type EdgeId } from "./diagram-geometry.ts";
import { STATE_TEXT, STATES, stateColor, stateWash } from "./states.ts";
import styles from "./LifecycleDiagram.module.css";

/** The last transition, for the animation. `key` is different for each transition. */
export type DiagramTransition = {
  from: LifecycleState;
  to: LifecycleState;
  trigger: LifecycleTrigger;
  key: string | number;
};

export type LifecycleDiagramProps = {
  /** The current state. Its node glows. */
  state: LifecycleState;
  last?: DiagramTransition | undefined;
  /** The accessible name of the diagram. */
  label: string;
  className?: string | undefined;
};

type Style = CSSProperties & Record<`--${string}`, string>;

/** Below this width of the frame, in CSS pixels, the diagram uses the tall arrangement. */
export const PORTRAIT_BELOW = 560;

/** The arrangement for a frame width. Before the first measurement, the width is the width of the wide view box. */
export function layoutFor(width: number): DiagramLayout {
  return width > 0 && width < PORTRAIT_BELOW ? PORTRAIT : LANDSCAPE;
}

/** The text of an edge label, with one `tspan` for each line. */
function LabelLines({ text, x }: { text: string; x: number }) {
  const lines = text.split("\n");
  if (lines.length === 1) return <>{text}</>;
  return (
    <>
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 0 : "1.15em"}>
          {line}
        </tspan>
      ))}
    </>
  );
}

/**
 * A dot that moves along the edge of a new transition, one time. The dot is
 * transparent until its animation starts, because before the start it is at
 * the origin of the diagram.
 */
function Comet({ edge, color }: { edge: Edge; color: string }) {
  const motion = useRef<SVGAnimateMotionElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  useEffect(() => {
    try {
      motion.current?.beginElement();
      dot.current?.setAttribute("data-running", "");
    } catch {
      // A browser without SMIL animations shows the trace of the edge only.
    }
  }, []);
  return (
    <circle ref={dot} className={styles.comet} r={7} cx={0} cy={0} style={{ fill: color }}>
      <animateMotion
        ref={motion}
        dur="0.9s"
        begin="indefinite"
        fill="freeze"
        path={edge.d}
        calcMode="spline"
        keyTimes="0;1"
        keyPoints="0;1"
        keySplines="0.45 0 0.2 1"
      />
    </circle>
  );
}

/**
 * The state diagram of the Page Lifecycle API. The node of the current state
 * glows. The edge of the last transition has the color of the new state,
 * and its label shows the event that caused it. A new transition draws its
 * edge and moves a dot along it, if the reader permits motion.
 */
export function LifecycleDiagram({ state, last, label, className }: LifecycleDiagramProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const reducedMotion = useReducedMotion();
  const [frameRef, frameWidth] = useElementWidth<HTMLDivElement>(LANDSCAPE.viewBox.width);
  const layout = layoutFor(frameWidth);
  const { nodes, group, edges } = layout;
  // A transition that was there before the diagram showed does not start an animation.
  const firstKey = useRef(last?.key);
  const isNew = last !== undefined && last.key !== firstKey.current;
  const litEdge: EdgeId | undefined = last === undefined ? undefined : edgeFor(last);
  const litColor = last === undefined ? undefined : stateColor(last.to);
  const lit = litEdge === undefined ? undefined : edges.find((candidate) => candidate.id === litEdge);

  const labelFor = (edge: Edge): string => {
    if (last !== undefined && edge.id === litEdge && edge.label !== "" && last.trigger !== edge.label.split(/\s/)[0]) {
      return last.trigger === "pagehide" || last.trigger === "pageshow" ? `${last.trigger} (persisted)` : last.trigger;
    }
    return edge.label;
  };
  const labelIsLit = (edge: Edge): boolean =>
    litEdge !== undefined && (edge.id === litEdge || (edge.id === "toHidden" && litEdge === "toVisible"));

  return (
    <div ref={frameRef} className={[styles.frame, className].filter(Boolean).join(" ")}>
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
      role="img"
      aria-labelledby={`${id}-title`}
      data-state={state}
      data-layout={layout.name}
    >
      <title id={`${id}-title`}>{label}</title>
      <defs>
        <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10Z" className={styles.arrowMuted} />
        </marker>
        {STATES.map((target) => (
          <marker
            key={target}
            id={`${id}-arrow-${target}`}
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10Z" style={{ fill: stateColor(target) }} />
          </marker>
        ))}
        <filter id={`${id}-glow`} x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect className={styles.group} x={group.x} y={group.y} width={group.width} height={group.height} rx={26} />
      <text className={styles.groupLabel} x={group.labelX} y={group.labelY}>
        {group.label}
      </text>

      {edges.map((edge) => {
        const isLit = edge.id === litEdge;
        return (
          <path
            key={edge.id}
            className={styles.edge}
            d={edge.d}
            data-edge={edge.id}
            data-lit={isLit ? "" : undefined}
            style={isLit && litColor ? ({ "--edge-color": litColor } as Style) : undefined}
            markerEnd={`url(#${id}-arrow${isLit && last ? `-${last.to}` : ""})`}
          />
        );
      })}

      {lit && last && isNew ? (
        <g key={String(last.key)} style={{ "--edge-color": litColor ?? "" } as Style}>
          <path className={styles.trace} d={lit.d} pathLength={1} data-motion={reducedMotion ? "reduced" : "full"} />
          {reducedMotion ? null : <Comet edge={lit} color={litColor ?? ""} />}
        </g>
      ) : null}

      {edges
        .filter((edge) => edge.label !== "")
        .map((edge) => (
          <text
            key={edge.id}
            className={styles.edgeLabel}
            x={edge.labelX}
            y={edge.labelY}
            textAnchor={edge.anchor}
            data-lit={labelIsLit(edge) ? "" : undefined}
          >
            <LabelLines text={labelFor(edge)} x={edge.labelX} />
          </text>
        ))}

      {STATES.map((name) => {
        const box = nodes[name];
        const isCurrent = name === state;
        const x = box.x - box.width / 2;
        const y = box.y - box.height / 2;
        const rx = box.height / 2;
        return (
          <g
            key={name}
            className={styles.node}
            data-node={name}
            data-current={isCurrent ? "" : undefined}
            style={{ "--node-color": stateColor(name), "--node-wash": stateWash(name) } as Style}
          >
            {isCurrent ? (
              <rect
                className={styles.halo}
                x={x - 8}
                y={y - 8}
                width={box.width + 16}
                height={box.height + 16}
                rx={rx + 8}
                filter={`url(#${id}-glow)`}
              />
            ) : null}
            <rect className={styles.pill} x={x} y={y} width={box.width} height={box.height} rx={rx} />
            {isCurrent ? <circle className={styles.liveDot} cx={x + 22} cy={box.y} r={5} /> : null}
            <text className={styles.stateName} x={box.x + (isCurrent ? 8 : 0)} y={box.y - 3} textAnchor="middle">
              {name}
            </text>
            <text className={styles.summary} x={box.x + (isCurrent ? 8 : 0)} y={box.y + 17} textAnchor="middle">
              {STATE_TEXT[name].summary}
            </text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}
