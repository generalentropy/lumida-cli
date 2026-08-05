/**
 * Longueur maximale d'une barre, en cellules. Bornée pour qu'une série au
 * profil inattendu ne déforme jamais la mise en page.
 */
export const BAR_MAX_CELLS = 20;

/**
 * Longueur minimale d'une barre non nulle. Une valeur faible reste une valeur :
 * elle doit rester visible et cliquable à l'œil, pas se réduire à un trait.
 */
export const BAR_MIN_CELLS = 3;

// Demi-bloc bas : il occupe la moitié inférieure de la cellule, ce qui donne
// une barre franche tout en laissant une demi-cellule de vide au-dessus. Un
// bloc pleine hauteur souderait les lignes voisines, un trait fin se perdrait.
const MARK = "▄";

/**
 * Barre horizontale représentant `value` rapporté à `maximum`.
 *
 * Rien n'est dessiné en l'absence de valeur exploitable : une bande vide se lit
 * comme « pas de mesure », alors qu'une barre de longueur nulle se confondrait
 * avec une mesure à zéro.
 */
export function renderBar(
  value: number | null,
  maximum: number,
  maxCells = BAR_MAX_CELLS,
): string {
  if (
    value === null ||
    !Number.isFinite(value) ||
    value <= 0 ||
    !Number.isFinite(maximum) ||
    maximum <= 0 ||
    maxCells < 1
  ) {
    return "";
  }

  const ratio = Math.min(1, value / maximum);
  const cells = Math.min(
    maxCells,
    Math.max(BAR_MIN_CELLS, Math.round(ratio * maxCells)),
  );

  return MARK.repeat(cells);
}

/** Plus grande valeur exploitable d'une série, 0 si elle n'en contient aucune. */
export function barScale(values: readonly (number | null)[]): number {
  return values.reduce<number>(
    (maximum, value) =>
      value !== null && Number.isFinite(value) && value > maximum
        ? value
        : maximum,
    0,
  );
}
