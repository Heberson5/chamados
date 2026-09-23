import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { use3DTilt } from "@/hooks/use3DTilt";

interface Tilt3DProps {
  children: ReactNode;
  className?: string;
  maxDeg?: number;
}

/**
 * Wraps its children in a mouse-tracked 3D tilt, for the one or two
 * "hero" elements per screen that should feel physically present rather
 * than the whole page tilting on hover — see the login page's own
 * branding panel for the effect this generalizes. Kept as an explicit
 * opt-in wrapper (not baked into Card itself) so it isn't applied to
 * every card in the app, including tall ones full of form fields where
 * a tilt would fight with the content instead of framing it.
 */
export default function Tilt3D({ children, className, maxDeg = 8 }: Tilt3DProps) {
  const { style, onMouseMove, onMouseLeave } = use3DTilt(maxDeg);
  return (
    <div
      className={cn("transition-transform duration-200 ease-out will-change-transform", className)}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}
