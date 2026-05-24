export function FloatingOrb({
  className = "",
  intensity = "medium",
}: {
  className?: string;
  intensity?: "low" | "medium" | "high";
}) {
  const opacity = {
    low: "opacity-30",
    medium: "opacity-45",
    high: "opacity-60",
  }[intensity];

  return (
    <div
      aria-hidden="true"
      className={`floating-orb pointer-events-none absolute ${opacity} ${className}`}
    >
      <div className="h-full w-full rounded-[36%] bg-[radial-gradient(circle_at_35%_28%,rgba(219,234,254,0.95),rgba(191,219,254,0.48)_36%,rgba(226,232,240,0.20)_60%,transparent_74%)] blur-2xl" />
    </div>
  );
}
