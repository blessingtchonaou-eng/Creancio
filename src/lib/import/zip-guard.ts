/**
 * Un .xlsx est une archive ZIP. Une « bombe » ZIP tient en 2 Mo et se décompresse en plusieurs giga-octets :
 * on lit l'annuaire de l'archive pour connaître la taille décompressée AVANT de la confier à exceljs.
 */
export const TAILLE_DECOMPRESSEE_MAX = 60 * 1024 * 1024;
export const ENTREES_MAX = 500;

const SIGNATURE_FIN = 0x06054b50;
const SIGNATURE_ENTREE = 0x02014b50;

export type ResultatZip = { ok: true; tailleDecompressee: number } | { ok: false; error: string };

export function verifierArchiveZip(octets: Uint8Array): ResultatZip {
  const illisible: ResultatZip = { ok: false, error: "Ce fichier .xlsx est illisible. Réenregistrez-le depuis Excel puis réessayez." };
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  if (octets.byteLength < 22 || vue.getUint16(0, true) !== 0x4b50) return illisible;

  // Fin de l'annuaire : dans les 64 Ko de queue (commentaire de longueur variable).
  let fin = -1;
  for (let i = octets.byteLength - 22; i >= Math.max(0, octets.byteLength - 22 - 65_535); i--) {
    if (vue.getUint32(i, true) === SIGNATURE_FIN) {
      fin = i;
      break;
    }
  }
  if (fin < 0) return illisible;

  const nbEntrees = vue.getUint16(fin + 10, true);
  const debut = vue.getUint32(fin + 16, true);
  if (nbEntrees === 0xffff || debut === 0xffffffff) return { ok: false, error: "Ce fichier est trop volumineux une fois ouvert." };
  if (nbEntrees > ENTREES_MAX) return { ok: false, error: "Ce fichier .xlsx contient trop d'éléments. Enregistrez uniquement vos factures." };

  let position = debut;
  let total = 0;
  for (let n = 0; n < nbEntrees; n++) {
    if (position + 46 > octets.byteLength || vue.getUint32(position, true) !== SIGNATURE_ENTREE) return illisible;
    const taille = vue.getUint32(position + 24, true);
    if (taille === 0xffffffff) return { ok: false, error: "Ce fichier est trop volumineux une fois ouvert." };
    total += taille;
    if (total > TAILLE_DECOMPRESSEE_MAX) return { ok: false, error: "Ce fichier est trop volumineux une fois ouvert. Enregistrez uniquement vos factures." };
    position += 46 + vue.getUint16(position + 28, true) + vue.getUint16(position + 30, true) + vue.getUint16(position + 32, true);
  }
  return { ok: true, tailleDecompressee: total };
}
