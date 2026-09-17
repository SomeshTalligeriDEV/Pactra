import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";
import { cx } from "../cx";

/* ==========================================================================
   Glossary: "Tag".
   ========================================================================== */

export type TagTone = "neutral" | "rose" | "violet" | "ember" | "positive" | "caution" | "critical" | "info";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  size?: "sm" | "md";
  /** Fired glaze instead of a quiet tint. Use sparingly — it shouts. */
  solid?: boolean;
  /** Shows a dismiss affordance and calls this. */
  onRemove?: () => void;
  /** A small leading dot, for status lists. */
  dot?: boolean;
  children: ReactNode;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { tone = "neutral", size = "md", solid = false, onRemove, dot = false, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cx("pactra-tag", `pactra-tag--${tone}`, `pactra-tag--${size}`, solid && "pactra-tag--solid", className)}
      {...rest}
    >
      {dot ? <span className="pactra-tag__dot" aria-hidden="true" /> : null}
      <span className="pactra-tag__label">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className="pactra-tag__remove"
          aria-label={typeof children === "string" ? `Remove ${children}` : "Remove"}
          onClick={onRemove}
        >
          <Icon name="close" />
        </button>
      ) : null}
    </span>
  );
});
