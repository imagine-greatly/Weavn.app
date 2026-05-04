/** Plain text for UI — strips common markdown artifacts from model output. */
export function stripMarkdownForDisplay(text: string): string {
  return String(text ?? "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*_(.+?)_\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}
