/** Collapses runs of blank lines/whitespace — used where line breaks are meaningful (lyrics, one line per row). */
export function trimExcessLines(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

/**
 * Strips every <br> tag and line break entirely, collapsing to one flowing
 * line — for text fields where a line break is never meaningful (titles,
 * subtitles, bios, row values). JioSaavn bios ship with raw \r\n between
 * bullet items; titles/subtitles should never contain a break at all.
 */
export function flattenText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
