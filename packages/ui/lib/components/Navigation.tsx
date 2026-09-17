import { useId, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { transition } from "../../tokens/motion";
import { cx } from "../cx";

/* ==========================================================================
   Glossary: "Breadcrumb", "Pagination", "Tab bar", plus the tab pattern
   under "Navigational components".
   ========================================================================== */

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: IconName;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Collapse the middle when there are more than this many. */
  maxItems?: number;
  separator?: ReactNode;
  className?: string;
}

/** Where am I, and how did I get here. The last item is never a link. */
export function Breadcrumb({ items, maxItems = 4, separator, className }: BreadcrumbProps) {
  const [expanded, setExpanded] = useState(false);
  const collapsed = !expanded && items.length > maxItems;
  const shown = collapsed ? [items[0], ...items.slice(-2)] : items;

  return (
    <nav aria-label="Breadcrumb" className={cx("pactra-breadcrumb", className)}>
      <ol className="pactra-breadcrumb__list">
        {shown.map((item, index) => {
          const isLast = index === shown.length - 1;
          const showEllipsis = collapsed && index === 1;
          return (
            <li key={index} className="pactra-breadcrumb__item">
              {showEllipsis ? (
                <>
                  <button
                    type="button"
                    className="pactra-breadcrumb__ellipsis"
                    aria-label="Show the full path"
                    onClick={() => setExpanded(true)}
                  >
                    <Icon name="meatball" />
                  </button>
                  <span className="pactra-breadcrumb__separator" aria-hidden="true">
                    {separator ?? <Icon name="chevron-right" />}
                  </span>
                </>
              ) : null}

              {isLast ? (
                <span className="pactra-breadcrumb__current" aria-current="page">
                  {item.icon ? <Icon name={item.icon} /> : null}
                  {item.label}
                </span>
              ) : (
                <>
                  <a
                    className="pactra-breadcrumb__link"
                    href={item.href}
                    onClick={(event) => {
                      if (item.onClick) {
                        event.preventDefault();
                        item.onClick();
                      }
                    }}
                  >
                    {item.icon ? <Icon name={item.icon} /> : null}
                    {item.label}
                  </a>
                  <span className="pactra-breadcrumb__separator" aria-hidden="true">
                    {separator ?? <Icon name="chevron-right" />}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---- Pagination ---------------------------------------------------------- */

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** How many numbers to show either side of the current page. */
  siblings?: number;
  /** Adds a "12 of 340" readout. */
  summary?: ReactNode;
  className?: string;
}

export function Pagination({ page, pageCount, onPageChange, siblings = 1, summary, className }: PaginationProps) {
  const pages: (number | "gap")[] = [];
  const push = (value: number | "gap") => pages.push(value);

  const start = Math.max(2, page - siblings);
  const end = Math.min(pageCount - 1, page + siblings);

  if (pageCount > 0) push(1);
  if (start > 2) push("gap");
  for (let i = start; i <= end; i++) push(i);
  if (end < pageCount - 1) push("gap");
  if (pageCount > 1) push(pageCount);

  return (
    <nav aria-label="Pagination" className={cx("pactra-pagination", className)}>
      <button
        type="button"
        className="pactra-pagination__arrow"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <Icon name="chevron-left" />
      </button>

      <ol className="pactra-pagination__list">
        {pages.map((entry, index) =>
          entry === "gap" ? (
            <li key={`gap-${index}`} className="pactra-pagination__gap" aria-hidden="true">
              <Icon name="meatball" />
            </li>
          ) : (
            <li key={entry}>
              <button
                type="button"
                className={cx("pactra-pagination__page", entry === page && "pactra-pagination__page--current")}
                aria-current={entry === page ? "page" : undefined}
                aria-label={`Page ${entry}`}
                onClick={() => onPageChange(entry)}
              >
                {entry}
              </button>
            </li>
          ),
        )}
      </ol>

      <button
        type="button"
        className="pactra-pagination__arrow"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <Icon name="chevron-right" />
      </button>

      {summary ? <span className="pactra-pagination__summary">{summary}</span> : null}
    </nav>
  );
}

/* ---- Tabs ---------------------------------------------------------------- */

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: IconName;
  badge?: ReactNode;
  disabled?: boolean;
  content?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** `line` underlines the active tab; `pill` sits it in a fired capsule. */
  appearance?: "line" | "pill";
  className?: string;
}

export function Tabs({ items, value, defaultValue, onValueChange, appearance = "line", className }: TabsProps) {
  const groupId = useId().replace(/[:»«]/g, "");
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id);
  const active = value ?? internal;
  const activeItem = items.find((item) => item.id === active);

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const enabled = items.filter((item) => !item.disabled);
    const position = enabled.findIndex((item) => item.id === items[index].id);
    const next = enabled[(position + step + enabled.length) % enabled.length];
    select(next.id);
    document.getElementById(`${groupId}-tab-${next.id}`)?.focus();
  };

  return (
    <div className={cx("pactra-tabs", `pactra-tabs--${appearance}`, className)}>
      <div role="tablist" className="pactra-tabs__list">
        {items.map((item, index) => (
          <button
            key={item.id}
            id={`${groupId}-tab-${item.id}`}
            role="tab"
            type="button"
            aria-selected={item.id === active}
            aria-controls={`${groupId}-panel-${item.id}`}
            tabIndex={item.id === active ? 0 : -1}
            disabled={item.disabled}
            className={cx("pactra-tabs__tab", item.id === active && "pactra-tabs__tab--active")}
            onClick={() => select(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.icon ? <Icon name={item.icon} /> : null}
            <span>{item.label}</span>
            {item.badge ? <span className="pactra-tabs__badge">{item.badge}</span> : null}
            {item.id === active ? (
              <motion.span
                layoutId={`pactra-tabs-marker-${groupId}`}
                className="pactra-tabs__marker"
                transition={transition.settle}
              />
            ) : null}
          </button>
        ))}
      </div>

      {activeItem?.content !== undefined ? (
        <div
          role="tabpanel"
          id={`${groupId}-panel-${active}`}
          aria-labelledby={`${groupId}-tab-${active}`}
          className="pactra-tabs__panel"
          tabIndex={0}
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}

/* ---- Tab bar ------------------------------------------------------------- */

export interface TabBarItem {
  id: string;
  label: ReactNode;
  icon: IconName;
  badge?: number;
}

export interface TabBarProps {
  items: TabBarItem[];
  value: string;
  onValueChange: (id: string) => void;
  className?: string;
}

/**
 * Glossary: "Tab bar". Bottom-of-screen navigation, so it is built for thumbs:
 * 3–5 destinations, each with a label, none of them hidden behind a menu.
 */
export function TabBar({ items, value, onValueChange, className }: TabBarProps) {
  return (
    <nav className={cx("pactra-tabbar", className)} aria-label="Primary">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            className={cx("pactra-tabbar__item", active && "pactra-tabbar__item--active")}
            aria-current={active ? "page" : undefined}
            onClick={() => onValueChange(item.id)}
          >
            <span className="pactra-tabbar__icon">
              <Icon name={item.icon} />
              {item.badge ? (
                <span className="pactra-tabbar__badge">{item.badge > 99 ? "99+" : item.badge}</span>
              ) : null}
            </span>
            <span className="pactra-tabbar__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
