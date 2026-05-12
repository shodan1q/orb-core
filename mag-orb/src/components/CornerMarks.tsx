export function CornerMarks({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute inset-0 text-zinc-500 ${className}`}
      aria-hidden
    >
      <span className="absolute left-1 top-1 text-[10px] leading-none opacity-70">
        +
      </span>
      <span className="absolute right-1 top-1 text-[10px] leading-none opacity-70">
        +
      </span>
      <span className="absolute bottom-1 left-1 text-[10px] leading-none opacity-70">
        +
      </span>
      <span className="absolute bottom-1 right-1 text-[10px] leading-none opacity-70">
        +
      </span>
    </span>
  )
}
