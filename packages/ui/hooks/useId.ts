import { useId as useReactId } from "react";

/** Stable, prefixed id for aria wiring. */
export function usePactraId(prefix: string, provided?: string): string {
  const generated = useReactId();
  return provided ?? `pactra-${prefix}-${generated.replace(/[:»«]/g, "")}`;
}
