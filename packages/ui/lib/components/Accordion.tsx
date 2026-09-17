import { useId, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import { transition } from "../../tokens/motion";
import { usePactra } from "../PactraProvider";
import { cx } from "../cx";

/* Glossary: "Accordion", and the "Chunking" principle it exists to serve. */

export interface AccordionItem {
  id: string;
  title: ReactNode;
  /** Quiet line under the title, visible while collapsed. */
  summary?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Controlled set of open ids. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (open: string[]) => void;
  /** Only one panel open at a time. */
  single?: boolean;
  className?: string;
}

export function Accordion({ items, value, defaultValue = [], onValueChange, single = false, className }: AccordionProps) {
  const groupId = useId().replace(/[:»«]/g, "");
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const open = value ?? internal;
  const { reducedMotion } = usePactra();

  const toggle = (id: string) => {
    const isOpen = open.includes(id);
    const next = single ? (isOpen ? [] : [id]) : isOpen ? open.filter((x) => x !== id) : [...open, id];
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <div className={cx("pactra-accordion", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id} className={cx("pactra-accordion__item", isOpen && "pactra-accordion__item--open")}>
            <h3 className="pactra-accordion__heading">
              <button
                type="button"
                id={`${groupId}-trigger-${item.id}`}
                className="pactra-accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={`${groupId}-panel-${item.id}`}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
              >
                <span className="pactra-accordion__text">
                  <span className="pactra-accordion__title">{item.title}</span>
                  {item.summary ? <span className="pactra-accordion__summary">{item.summary}</span> : null}
                </span>
                <motion.span
                  className="pactra-accordion__chevron"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={reducedMotion ? { duration: 0 } : transition.control}
                  aria-hidden="true"
                >
                  <Icon name="chevron-down" />
                </motion.span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="panel"
                  id={`${groupId}-panel-${item.id}`}
                  role="region"
                  aria-labelledby={`${groupId}-trigger-${item.id}`}
                  className="pactra-accordion__panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={reducedMotion ? { duration: 0 } : transition.settle}
                >
                  <div className="pactra-accordion__content">{item.content}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
