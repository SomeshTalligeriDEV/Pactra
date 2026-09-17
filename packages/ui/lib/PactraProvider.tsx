import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { PactraDefs } from "./primitives/PactraDefs";
import { usePactraReducedMotion } from "../hooks/useReducedMotion";
import { cx } from "./cx";

export interface PactraContextValue {
  /** True when the viewer asked for less motion. Components read this. */
  reducedMotion: boolean;
  /** Default glaze for surfaces that do not name one. */
  glaze: "rose" | "violet" | "ember";
}

const PactraContext = createContext<PactraContextValue>({
  reducedMotion: false,
  glaze: "rose",
});

export function usePactra(): PactraContextValue {
  return useContext(PactraContext);
}

export interface PactraProviderProps {
  children: ReactNode;
  /** House glaze for this subtree. */
  glaze?: PactraContextValue["glaze"];
  className?: string;
  /** Skip the root reset — useful when embedding inside an existing design. */
  bare?: boolean;
}

/**
 * Mounts the shared filter defs, the reset, and the motion preference once.
 * Wrap the app in it; nesting is allowed and only changes the house glaze.
 */
export function PactraProvider({ children, glaze = "rose", className, bare }: PactraProviderProps) {
  const reducedMotion = usePactraReducedMotion();
  const value = useMemo<PactraContextValue>(
    () => ({ reducedMotion, glaze }),
    [reducedMotion, glaze],
  );

  return (
    <PactraContext.Provider value={value}>
      <div className={cx(!bare && "pactra-root", className)} data-pactra-glaze={glaze}>
        <PactraDefs />
        {children}
      </div>
    </PactraContext.Provider>
  );
}
