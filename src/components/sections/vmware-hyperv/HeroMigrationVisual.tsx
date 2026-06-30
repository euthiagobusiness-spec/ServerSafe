"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

const visualPanels = [
  { label: "Ambiente atual", value: "VMware" },
  { label: "Destino planejado", value: "Hyper-V" },
] as const;

const resetVars = {
  "--hero-rotate-x": "0deg",
  "--hero-rotate-y": "0deg",
  "--hero-shift-x": "0px",
  "--hero-shift-y": "0px",
  "--hero-glare-x": "50%",
  "--hero-glare-y": "45%",
} as CSSProperties;

export function HeroMigrationVisual() {
  const visualRef = useRef<HTMLDivElement>(null);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const updateMotion = (event: PointerEvent<HTMLDivElement>) => {
    const element = visualRef.current;
    if (!element || event.pointerType === "touch") return;

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 10;
    const rotateX = (0.5 - y) * 8;

    element.style.setProperty("--hero-rotate-x", `${rotateX.toFixed(2)}deg`);
    element.style.setProperty("--hero-rotate-y", `${rotateY.toFixed(2)}deg`);
    element.style.setProperty("--hero-shift-x", `${((x - 0.5) * 12).toFixed(2)}px`);
    element.style.setProperty("--hero-shift-y", `${((y - 0.5) * 10).toFixed(2)}px`);
    element.style.setProperty("--hero-glare-x", `${(x * 100).toFixed(1)}%`);
    element.style.setProperty("--hero-glare-y", `${(y * 100).toFixed(1)}%`);
  };

  const resetMotion = () => {
    const element = visualRef.current;
    if (!element) return;

    for (const [property, value] of Object.entries(resetVars)) {
      element.style.setProperty(property, value);
    }
  };

  return (
    <div
      ref={visualRef}
      className={`hero-migration-visual relative min-h-[420px] lg:min-h-[490px] ${
        isEntered ? "is-entered" : ""
      }`}
      style={resetVars}
      onPointerMove={updateMotion}
      onPointerLeave={resetMotion}
    >
      <div className="hero-migration-stage relative min-h-[420px] overflow-hidden bg-[#142925] lg:min-h-[490px]">
        <Image
          src="/assets/brand/server-safe-3d-wallpaper.png"
          alt="Infraestrutura corporativa preparada para migracao de virtualizacao"
          width={1280}
          height={780}
          priority
          className="hero-migration-image absolute inset-0 h-full w-full object-cover opacity-82"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,41,37,0.84),rgba(20,41,37,0.28)_48%,rgba(20,41,37,0.08))]" />
        <div className="hero-migration-glare absolute inset-0" aria-hidden="true" />
        <div className="hero-migration-route absolute left-[18%] top-[44%] hidden h-px w-[58%] bg-cyan-100/60 sm:block" aria-hidden="true">
          <span className="hero-migration-pulse" />
        </div>

        <div className="absolute bottom-6 left-5 right-5 grid gap-3 sm:bottom-8 sm:left-8 sm:right-8 sm:grid-cols-2">
          {visualPanels.map((panel, index) => (
            <MigrationPanel key={panel.value} label={panel.label} value={panel.value} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MigrationPanel({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <div className="hero-migration-panel border border-white/35 bg-white/18 px-5 py-4 text-white backdrop-blur-md" style={{ "--panel-delay": `${index * 110}ms` } as CSSProperties}>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
