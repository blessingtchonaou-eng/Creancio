export interface ReminderStep {
  offsetDays: number; // -3, 0, 7, 15…
  title: string;
  channel: string;
  tone: "neutre" | "accent" | "fort";
}

export interface Kpi {
  id: string;
  label: string;
  value: string;
  unit: string;
  delta: string;
  trend: "good" | "bad" | "neutral";
  /** Courbe facultative : seulement quand elle vient de vraies données. */
  series?: number[];
  inverse?: boolean;
}
