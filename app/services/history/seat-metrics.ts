import { safeNumber } from "./guards";
import type { HistoryKind } from "./types";

export function seatTableCountFor(kind: HistoryKind, meta: any): number | null {
    if (kind === "seat-table") return 1;
    if (kind === "seat-waitlist-combined") {
        let extraTables = Array.isArray(meta?.extraTables)
            ? (meta.extraTables as any[])
            : [];
        return 1 + extraTables.length;
    }
    return null;
}

export function seatGuestCountFor(kind: HistoryKind, meta: any): number | null {
    if (kind === "seat-table") return safeNumber(meta?.partySize);
    if (kind === "seat-waitlist-combined") return safeNumber(meta?.partySize);
    return null;
}
