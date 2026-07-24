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
