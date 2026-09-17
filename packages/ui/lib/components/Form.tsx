import { forwardRef } from "react";
import type { FormHTMLAttributes, ReactNode } from "react";
import { cx } from "../cx";

/* Glossary: "Form", plus the "Chunking" it depends on to stay readable. */

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  /** Two columns above 720px. Below that a form is always one column. */
  columns?: 1 | 2;
  children?: ReactNode;
}

export const Form = forwardRef<HTMLFormElement, FormProps>(function Form(
  { columns = 1, className, children, ...rest },
  ref,
) {
  return (
    <form ref={ref} className={cx("pactra-form", `pactra-form--cols-${columns}`, className)} {...rest}>
      {children}
    </form>
  );
});

export interface FormSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Makes this section span both columns. */
  full?: boolean;
  children: ReactNode;
  className?: string;
}

/** A named group of fields. The unit a viewer actually reads a form in. */
export function FormSection({ title, description, full = false, children, className }: FormSectionProps) {
  return (
    <fieldset className={cx("pactra-form__section", full && "pactra-form__section--full", className)}>
      {title ? <legend className="pactra-form__legend">{title}</legend> : null}
      {description ? <p className="pactra-form__description">{description}</p> : null}
      <div className="pactra-form__fields">{children}</div>
    </fieldset>
  );
}

export interface FormActionsProps {
  children: ReactNode;
  align?: "start" | "end" | "between";
  className?: string;
}

export function FormActions({ children, align = "end", className }: FormActionsProps) {
  return <div className={cx("pactra-form__actions", `pactra-form__actions--${align}`, className)}>{children}</div>;
}
