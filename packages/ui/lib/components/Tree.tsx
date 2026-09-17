import { useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { spring } from "../../tokens/spring";
import { usePactra } from "../PactraProvider";
import { cx } from "../cx";

/* ==========================================================================
   Tree and Timeline — both are the connection map's filament, run vertically.
   ========================================================================== */

export interface TreeNode {
  id: string;
  label: ReactNode;
  icon?: IconName;
  meta?: ReactNode;
  children?: TreeNode[];
}

export interface TreeProps {
  nodes: TreeNode[];
  value?: string;
  onValueChange?: (id: string) => void;
  defaultExpanded?: string[];
  className?: string;
}

export function Tree({ nodes, value, onValueChange, defaultExpanded = [], className }: TreeProps) {
  const [expanded, setExpanded] = useState<string[]>(defaultExpanded);
  const { reducedMotion } = usePactra();

  const toggle = (id: string) =>
    setExpanded((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const render = (node: TreeNode, depth: number): ReactNode => {
    const open = expanded.includes(node.id);
    const hasChildren = Boolean(node.children?.length);

    return (
      <li key={node.id} className="pactra-tree__node" role="treeitem" aria-expanded={hasChildren ? open : undefined}>
        <div
          className={cx("pactra-tree__row", node.id === value && "pactra-tree__row--active")}
          style={{ paddingLeft: `${depth * 15 + 8}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="pactra-tree__twist"
              aria-label={open ? "Collapse" : "Expand"}
              onClick={() => toggle(node.id)}
            >
              <motion.span animate={{ rotate: open ? 90 : 0 }} transition={reducedMotion ? { duration: 0 } : spring.snap}>
                <Icon name="chevron-right" />
              </motion.span>
            </button>
          ) : (
            <span className="pactra-tree__twist pactra-tree__twist--leaf" aria-hidden="true" />
          )}

          <button type="button" className="pactra-tree__label" onClick={() => onValueChange?.(node.id)}>
            {node.icon ? <Icon name={node.icon} className="pactra-tree__icon" /> : null}
            <span>{node.label}</span>
            {node.meta ? <span className="pactra-tree__meta">{node.meta}</span> : null}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {hasChildren && open ? (
            <motion.ul
              className="pactra-tree__children"
              role="group"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : spring.settle}
            >
              {node.children!.map((child) => render(child, depth + 1))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </li>
    );
  };

  return (
    <ul className={cx("pactra-tree", className)} role="tree">
      {nodes.map((node) => render(node, 0))}
    </ul>
  );
}

/* ---- Timeline ------------------------------------------------------------ */

export interface TimelineEntry {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  icon?: IconName;
  tone?: "default" | "positive" | "caution" | "critical";
}

export interface TimelineProps {
  entries: TimelineEntry[];
  /** Marks the last entry as still running, with a pulsing node. */
  live?: boolean;
  className?: string;
}

export function Timeline({ entries, live = false, className }: TimelineProps) {
  const { reducedMotion } = usePactra();

  return (
    <ol className={cx("pactra-timeline", className)}>
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        return (
          <motion.li
            key={entry.id}
            className={cx("pactra-timeline__entry", `pactra-timeline__entry--${entry.tone ?? "default"}`)}
            initial={reducedMotion ? false : { opacity: 0, x: -8 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ ...spring.settle, delay: index * 0.04 }}
          >
            <span className="pactra-timeline__rail" aria-hidden="true">
              <span
                className={cx(
                  "pactra-timeline__node",
                  live && isLast && !reducedMotion && "pactra-timeline__node--live",
                )}
              >
                {entry.icon ? <Icon name={entry.icon} /> : null}
              </span>
            </span>
            <div className="pactra-timeline__content">
              <p className="pactra-timeline__title">{entry.title}</p>
              {entry.description ? <p className="pactra-timeline__description">{entry.description}</p> : null}
              {entry.timestamp ? <span className="pactra-timeline__timestamp">{entry.timestamp}</span> : null}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
