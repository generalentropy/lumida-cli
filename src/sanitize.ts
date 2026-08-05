const MAX_SERVER_TEXT_LENGTH = 300;

/**
 * Tout texte venu du serveur finit affiché dans un terminal. Les caractères de
 * contrôle C0/C1 y sont interprétés comme des séquences d'échappement : elles
 * peuvent effacer l'écran, repositionner le curseur ou masquer du texte. Les
 * marques de direction bidirectionnelle permettent en plus d'inverser l'ordre
 * d'affichage d'une phrase sans modifier la chaîne (Trojan Source).
 */
function isUnsafeCodePoint(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  );
}

/**
 * Neutralise une chaîne fournie par le serveur avant de l'écrire dans le
 * terminal. Retourne une chaîne vide si rien d'affichable ne subsiste, ce qui
 * laisse l'appelant retomber sur son propre message.
 */
export function sanitizeServerText(value: string): string {
  const cleaned = Array.from(value, (character) =>
    isUnsafeCodePoint(character.codePointAt(0) ?? 0) ? " " : character,
  )
    .join("")
    .replace(/\s+/gu, " ")
    .trim();

  return cleaned.length > MAX_SERVER_TEXT_LENGTH
    ? `${cleaned.slice(0, MAX_SERVER_TEXT_LENGTH - 1)}…`
    : cleaned;
}
