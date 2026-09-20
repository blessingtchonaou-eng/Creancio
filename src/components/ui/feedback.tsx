import { AlertCircle, CheckCircle2, FileText, Info, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "danger" | "info";
const toneStyles: Record<Tone, { border: string; icon: ReactNode }> = {
  success: { border: "border-l-success", icon: <CheckCircle2 className="size-5 text-success" aria-hidden /> },
  danger: { border: "border-l-danger", icon: <AlertCircle className="size-5 text-danger" aria-hidden /> },
  info: { border: "border-l-info", icon: <Info className="size-5 text-info" aria-hidden /> },
};

export function Toast({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  const s = toneStyles[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-[14px] border-l-4 bg-surface p-3.5 shadow-float", s.border)}>
      {s.icon}
      <div className="text-body-sm">
        <p className="font-semibold">{title}</p>
        {children && <p className="text-ink-muted">{children}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-border-strong p-6 text-center">
      <FileText className="size-10 text-primary" strokeWidth={1.6} aria-hidden />
      <p className="font-semibold">{title}</p>
      <p className="max-w-xs text-body-sm text-ink-muted">{children}</p>
      {action}
    </div>
  );
}

export function ErrorState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-[14px] border border-st-overdue-bg bg-st-overdue-bg/30 p-6 text-center">
      <WifiOff className="size-9 text-danger" aria-hidden />
      <p className="font-semibold">{title}</p>
      <p className="max-w-xs text-body-sm text-ink-muted">{children}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-surface-muted", className)} aria-hidden />;
}
