import { useCallback, useRef, useState, type CSSProperties, type MouseEvent } from "react";

/**
 * Mouse-tracked perspective tilt, the same math the login page already
 * uses by hand for its branding panel — pulled out here so it can be
 * reused anywhere else in the app without copy-pasting the mouse-position
 * math again. Returns nothing (a flat, static style) when the visitor has
 * asked the OS for reduced motion, rather than relying on a CSS
 * transition-duration override to hide a still-snapping transform.
 */
export function use3DTilt(maxDeg = 8) {
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  const [style, setStyle] = useState<CSSProperties>({});

  const onMouseMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (reducedMotion.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setStyle({
        transform: `perspective(800px) rotateX(${(-y * maxDeg).toFixed(2)}deg) rotateY(${(x * maxDeg).toFixed(2)}deg)`,
      });
    },
    [maxDeg]
  );

  const onMouseLeave = useCallback(() => {
    if (reducedMotion.current) return;
    setStyle({ transform: "perspective(800px) rotateX(0deg) rotateY(0deg)" });
  }, []);

  return { style, onMouseMove, onMouseLeave };
}
