"use client";

import type { CSSProperties, ReactNode } from "react";
import { useRef } from "react";

type InteractiveGlowCardProps = {
  children: ReactNode;
  className?: string;
};

type GlowStyle = CSSProperties & {
  "--x"?: string;
  "--y"?: string;
  "--rx"?: string;
  "--ry"?: string;
};

export function InteractiveGlowCard({ children, className = "" }: InteractiveGlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty("--x", `${x}px`);
      element.style.setProperty("--y", `${y}px`);
      element.style.setProperty("--rx", `${py * -7}deg`);
      element.style.setProperty("--ry", `${px * 8}deg`);
    });
  };

  const handlePointerLeave = () => {
    const element = ref.current;
    if (!element) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    element.style.setProperty("--rx", "0deg");
    element.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={ref}
      className={`interactive-glow-card ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ "--x": "50%", "--y": "50%", "--rx": "0deg", "--ry": "0deg" } as GlowStyle}
    >
      {children}
    </div>
  );
}
