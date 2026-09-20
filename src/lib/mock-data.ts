import type { Invoice, Kpi, ReminderStep } from "./types";

// Données de démonstration, à remplacer par les requêtes Prisma.

export const OUTSTANDING_TOTAL = 8_450_000;

export const KPIS: Kpi[] = [
  { id: "retard", label: "En retard", value: "3 120 000", unit: "FCFA", delta: "14 factures · +2 cette semaine", trend: "bad", series: [8, 10, 7, 14, 13, 19, 22] },
  { id: "dso", label: "Délai moyen de paiement", value: "38", unit: "jours", delta: "6 j de moins qu'en août", trend: "good", series: [24, 22, 23, 18, 15, 10, 6] },
  { id: "encaisse", label: "Encaissé ce mois", value: "5 275 000", unit: "FCFA", delta: "+18 % par rapport à août", trend: "good", series: [5, 9, 8, 14, 16, 21, 25] },
  { id: "relances", label: "Relances WhatsApp aujourd'hui", value: "23", unit: "envoyées", delta: "19 lues · 6 paiements reçus", trend: "neutral", series: [10, 14, 12, 18, 16, 22, 20], inverse: true },
];

export const INVOICES: Invoice[] = [
  { id: "1", number: "FA-2026-0142", clientName: "Quincaillerie Agbéko", amount: 1_250_000, amountPaid: 0, dueDate: "2026-08-28", status: "EN_RELANCE", nextReminder: "J+30 · demain" },
  { id: "2", number: "FA-2026-0137", clientName: "Pharmacie du Port", amount: 860_000, amountPaid: 0, dueDate: "2026-09-02", status: "ECHUE", nextReminder: "J+15 · aujourd'hui" },
  { id: "3", number: "FA-2026-0151", clientName: "Hôtel Les Cocotiers", amount: 540_000, amountPaid: 270_000, dueDate: "2026-09-10", status: "PARTIELLEMENT_PAYEE", nextReminder: "J+15 · 25/09" },
  { id: "4", number: "FA-2026-0158", clientName: "Boutique Ama Mode", amount: 320_000, amountPaid: 0, dueDate: "2026-09-25", status: "A_VENIR", nextReminder: "J-3 · 22/09" },
  { id: "5", number: "FA-2026-0129", clientName: "Garage Kodjo & Fils", amount: 475_000, amountPaid: 475_000, dueDate: "2026-08-20", status: "PAYEE", nextReminder: null },
  { id: "6", number: "FA-2026-0133", clientName: "Imprimerie Lumière", amount: 690_000, amountPaid: 0, dueDate: "2026-08-31", status: "ECHUE", nextReminder: "J+21 · 21/09" },
  { id: "7", number: "FA-2026-0146", clientName: "Restaurant Chez Tanti", amount: 210_000, amountPaid: 0, dueDate: "2026-09-05", status: "EN_RELANCE", nextReminder: "J+15 · 20/09" },
];

export const REMINDER_RESULTS = { sent: 124, paid: 41, readPending: 57, unread: 26 };

export const ACTIVE_SCENARIO: ReminderStep[] = [
  { offsetDays: -3, title: "Rappel amical", channel: "WhatsApp + lien de paiement", tone: "neutre" },
  { offsetDays: 0, title: "Échéance du jour", channel: "WhatsApp, ton neutre", tone: "neutre" },
  { offsetDays: 7, title: "Relance courtoise", channel: "WhatsApp, repli SMS", tone: "accent" },
  { offsetDays: 15, title: "Relance formelle", channel: "Appel suggéré au gérant", tone: "fort" },
];
