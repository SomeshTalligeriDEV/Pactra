import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { fieldAria, useField } from "./Field";
import { cx } from "../cx";

/* ==========================================================================
   Glossary: "Input field", "Text fields", "Input control", "Search field".
   ========================================================================== */

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  /** Icon inside the well, before the text. */
  iconStart?: IconName;
  /** Icon inside the well, after the text. */
  iconEnd?: IconName;
  /** Static text glued to the input, e.g. a currency or a domain. */
  prefix?: ReactNode;
  suffix?: ReactNode;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { iconStart, iconEnd, prefix, suffix, size = "md", invalid, className, onFocus, onBlur, ...rest },
  ref,
) {
  const field = useField();
  const [focused, setFocused] = useState(false);
  const aria = fieldAria(field);

  return (
    <div
      className={cx(
        "pactra-input",
        `pactra-input--${size}`,
        focused && "pactra-input--focused",
        (invalid ?? field?.invalid) && "pactra-input--invalid",
        (rest.disabled ?? field?.disabled) && "pactra-input--disabled",
        className,
      )}
    >
      {iconStart ? <Icon name={iconStart} className="pactra-input__icon" /> : null}
      {prefix ? <span className="pactra-input__affix">{prefix}</span> : null}
      <input
        ref={ref}
        className="pactra-input__control"
        {...aria}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      {suffix ? <span className="pactra-input__affix">{suffix}</span> : null}
      {iconEnd ? <Icon name={iconEnd} className="pactra-input__icon" /> : null}
    </div>
  );
});

/* ---- Textarea ------------------------------------------------------------ */

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grows to fit its content instead of scrolling. */
  autoGrow?: boolean;
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { autoGrow = false, invalid, className, rows = 4, onInput, ...rest },
  ref,
) {
  const field = useField();
  const aria = fieldAria(field);

  return (
    <div
      className={cx(
        "pactra-input",
        "pactra-input--area",
        (invalid ?? field?.invalid) && "pactra-input--invalid",
        (rest.disabled ?? field?.disabled) && "pactra-input--disabled",
        className,
      )}
    >
      <textarea
        ref={ref}
        rows={rows}
        className="pactra-input__control pactra-input__control--area"
        {...aria}
        {...rest}
        onInput={(event) => {
          if (autoGrow) {
            const el = event.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }
          onInput?.(event);
        }}
      />
    </div>
  );
});

/* ---- Search field -------------------------------------------------------- */

export interface SearchFieldProps extends Omit<TextFieldProps, "iconStart" | "type"> {
  /** Fires on submit and on the clear button. */
  onSearch?: (value: string) => void;
  /** Shows an inline clear affordance once there is a value. */
  clearable?: boolean;
}

/** Glossary: "Search field". */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ onSearch, clearable = true, className, defaultValue, value, onChange, ...rest }, ref) {
    const [internal, setInternal] = useState(String(defaultValue ?? ""));
    const current = value !== undefined ? String(value) : internal;

    return (
      <div className={cx("pactra-search", className)}>
        <TextField
          ref={ref}
          type="search"
          role="searchbox"
          iconStart="search"
          value={current}
          onChange={(event) => {
            if (value === undefined) setInternal(event.target.value);
            onChange?.(event);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearch?.(current);
          }}
          {...rest}
        />
        {clearable && current ? (
          <button
            type="button"
            className="pactra-search__clear"
            aria-label="Clear search"
            onClick={() => {
              if (value === undefined) setInternal("");
              onSearch?.("");
            }}
          >
            <Icon name="close" />
          </button>
        ) : null}
      </div>
    );
  },
);
