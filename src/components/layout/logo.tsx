export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect x="1" y="1" width="28" height="28" rx="8" className="fill-primary" />
        <path d="M20 10.5a6.5 6.5 0 1 0 0 9" className="stroke-on-primary" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[1.375rem] font-semibold tracking-tight">Créancio</span>
    </span>
  );
}
