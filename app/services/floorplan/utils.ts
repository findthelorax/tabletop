export function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

export function parseSectionCountFromFloorplanName(
    name: string,
): number | null {
    // Examples:
    // - "3 Servers AM" -> 3
    // - "5 Servers" -> 5
    // - "3 Server PM" -> 3
    let match = name.match(/(^|\s)(\d{1,3})\s*servers?\b/i);
    if (!match) return null;
    let n = Number.parseInt(match[2] ?? "", 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}
