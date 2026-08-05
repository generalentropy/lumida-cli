import pc from "picocolors";

export const CONTENT_INDENT = "  ";

const SECTION_SEPARATOR = "─".repeat(38);

export function printSectionHeader(title: string, subtitle: string): void {
  console.log();
  console.log(indent(pc.bold(pc.cyan(title))));
  console.log(indent(pc.dim(subtitle)));
  console.log(indent(pc.dim(SECTION_SEPARATOR)));
}

export function indent(content: string): string {
  return `${CONTENT_INDENT}${content}`;
}

/**
 * Écrit la réponse telle que le serveur l'a renvoyée, sur la sortie standard.
 * Les diagnostics restent sur la sortie d'erreur, pour qu'un script puisse
 * consommer ce flux directement.
 */
export function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}
