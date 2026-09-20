import ExcelJS from "exceljs";
import { LIBELLE_COLONNE } from "@/lib/import/colonnes";
import { requireEntreprise } from "@/lib/session";

/** Modèle Excel à remplir : les bons titres de colonnes et deux lignes d'exemple. */
export async function GET() {
  await requireEntreprise();

  const classeur = new ExcelJS.Workbook();
  const feuille = classeur.addWorksheet("Factures");
  feuille.columns = [
    { header: LIBELLE_COLONNE.numero, key: "numero", width: 22 },
    { header: LIBELLE_COLONNE.client, key: "client", width: 30 },
    { header: LIBELLE_COLONNE.telephone, key: "telephone", width: 22 },
    { header: LIBELLE_COLONNE.montant, key: "montant", width: 18, style: { numFmt: "# ##0" } },
    { header: LIBELLE_COLONNE.dateFacture, key: "dateFacture", width: 18, style: { numFmt: "dd/mm/yyyy" } },
    { header: LIBELLE_COLONNE.echeance, key: "echeance", width: 16, style: { numFmt: "dd/mm/yyyy" } },
  ];
  feuille.getRow(1).font = { bold: true };
  feuille.addRow({ numero: "FA-2026-0001", client: "Kofi Agbo", telephone: "90 12 34 56", montant: 150_000, dateFacture: new Date(Date.UTC(2026, 8, 25)), echeance: new Date(Date.UTC(2026, 9, 25)) });
  feuille.addRow({ numero: "FA-2026-0002", client: "Ama Mensah", telephone: "+228 70 12 34 56", montant: 1_250_000, dateFacture: new Date(Date.UTC(2026, 9, 5)), echeance: new Date(Date.UTC(2026, 10, 5)) });

  const notes = classeur.addWorksheet("Mode d'emploi");
  notes.getColumn(1).width = 90;
  for (const ligne of [
    "Remplacez les deux lignes d'exemple par vos factures, une facture par ligne.",
    "Numéro de facture : unique. Une facture déjà importée est ignorée.",
    "Téléphone WhatsApp : 8 chiffres qui commencent par 7 ou 9 (le +228 est facultatif).",
    "Montant : en FCFA, sans centimes.",
    "Date de facture : JJ/MM/AAAA. Facultative : si la case est vide, la date du jour est utilisée.",
    "Échéance : JJ/MM/AAAA, par exemple 25/10/2026.",
  ]) {
    notes.addRow([ligne]);
  }

  const contenu = await classeur.xlsx.writeBuffer();
  return new Response(contenu, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-import-factures.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
