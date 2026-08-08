/** Session de sommeil, réduite à ce dont les agrégats ont besoin. */
export interface SleepSessionLike {
  endTime: string;
  isNap: boolean;
  minutesAsleep: number | null;
}

export interface SleepAggregates {
  /** Moyenne des nuits mesurées, `null` si aucune ne porte de durée. */
  averageMinutes: number | null;
  /** Nuits distinctes couvertes par la période. */
  recordedNights: number;
  /** Nombre de siestes, comptées à part : elles fausseraient la moyenne. */
  naps: number;
}

/**
 * Agrégats du pied de tableau de `lumida sleep`.
 *
 * Les nuits se comptent par jour de réveil, comme la colonne `Date` : deux
 * sessions terminées le même jour restent une seule nuit. Le décompte importe
 * autant que la moyenne, car une nuit sans mesure n'apparaît nulle part dans le
 * tableau : sans lui, un mois incomplet se lit comme un mois complet.
 */
export function summarizeSleep(
  sessions: readonly SleepSessionLike[],
): SleepAggregates {
  const nights = sessions.filter((session) => !session.isNap);
  const measured = nights
    .map((session) => session.minutesAsleep)
    .filter(
      (minutes): minutes is number =>
        minutes !== null && Number.isFinite(minutes),
    );

  const wakeDays = new Set(nights.map((session) => localDay(session.endTime)));

  return {
    averageMinutes:
      measured.length === 0
        ? null
        : measured.reduce((total, minutes) => total + minutes, 0) /
          measured.length,
    recordedNights: wakeDays.size,
    naps: sessions.length - nights.length,
  };
}

/**
 * Jour civil local du réveil. Le décalage porté par `endTime` est celui du
 * serveur : découper la chaîne ISO donnerait un jour différent de celui que la
 * colonne `Date` affiche, puisqu'elle passe par `Intl` en heure locale.
 */
function localDay(endTime: string): string {
  const date = new Date(endTime);

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
