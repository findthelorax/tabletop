export function isValidServiceDay(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function safeString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
}

export function safeNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
    return null;
}
