export function digitsOnly(value: string): string {
    return value.replace(/\D+/g, "");
}

export function normalizePhone(value: string): string | null {
    let trimmed = value.trim();
    if (!trimmed) return null;
    let digits = digitsOnly(trimmed);
    if (digits.length !== 10) return null;
    return digits;
}

export function cleanNotes(notesBody: string): string | null {
    let cleaned = notesBody.trim();
    if (!cleaned) return null;

    // If older data included a legacy "Preferred table:" first-line prefix,
    // strip it so notes remain just notes.
    let lines = cleaned.split(/\r?\n/);
    if (lines.length > 0 && /^Preferred table:\s*/i.test(lines[0] ?? "")) {
        lines = lines.slice(1);
    }
    let rest = lines.join("\n").trim();
    return rest || null;
}

export function parsePositiveInt(raw: string): number | null {
    if (!/^\d+$/.test(raw)) return null;
    let n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

export function parseNonNegativeInt(raw: string): number | null {
    if (!/^\d+$/.test(raw)) return null;
    let n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
}
