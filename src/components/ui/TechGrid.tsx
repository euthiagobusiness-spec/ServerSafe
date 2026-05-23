export function TechGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.42),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.30),transparent_70%)]" />
    </div>
  );
}
