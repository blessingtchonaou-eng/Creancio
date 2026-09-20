export function Sparkline({ series, className, width = 76, height = 30 }: { series: number[]; className?: string; width?: number; height?: number }) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = (width - 4) / (series.length - 1);
  const d = series
    .map((v, i) => `${i === 0 ? "M" : "L"}${(2 + i * step).toFixed(1)} ${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
