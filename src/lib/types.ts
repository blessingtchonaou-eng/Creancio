import type { StatutFacture } from "@/generated/prisma/enums";

export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: number; // FCFA, entier
  amountPaid: number; // FCFA, entier
  dueDate: string; // ISO AAAA-MM-JJ
  status: StatutFacture;
  nextReminder: string | null;
}

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
  series: number[];
  inverse?: boolean;
}
