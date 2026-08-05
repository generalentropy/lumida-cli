// Huit hauteurs de bloc : lues verticalement le long d'un tableau, elles
// dessinent la tendance d'une série sans occuper de largeur.
const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

export const SPARK_PLACEHOLDER = " ";

/**
 * Barre d'une seule cellule représentant `value` relativement à `maximum`.
 * Retourne un espace quand la valeur est absente ou l'échelle inutilisable,
 * pour que la colonne reste alignée.
 */
export function sparkBar(value: number | null, maximum: number): string {
  if (value === null || !Number.isFinite(maximum) || maximum <= 0) {
    return SPARK_PLACEHOLDER;
  }

  const ratio = Math.min(1, Math.max(0, value / maximum));
  const index = Math.max(0, Math.ceil(ratio * BLOCKS.length) - 1);

  return BLOCKS[Math.min(index, BLOCKS.length - 1)];
}

/** Plus grande valeur exploitable d'une série, 0 si elle n'en contient aucune. */
export function sparkScale(values: readonly (number | null)[]): number {
  return values.reduce<number>(
    (maximum, value) =>
      value !== null && Number.isFinite(value) && value > maximum
        ? value
        : maximum,
    0,
  );
}
