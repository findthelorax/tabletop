export type HistoryKind =
    | "seat-table"
    | "seat-waitlist-combined"
    | "move-seating"
    | "set-table-status"
    | "set-section-status";

export type HistoryRow = {
    id: string;
    occurredAt: string;
    isUndo: boolean;
    serverId: string | null;
    serverName: string | null;
    sectionId: string | null;
    sectionName: string | null;
    tableId: string | null;
    tableNumber: number | null;
    tableCount: number | null;
    guestCount: number | null;
    label: string;
    kind: HistoryKind;
};

export type HistoryLoaderData = {
    serviceDay: string;
    dayStartIso: string;
    dayEndIso: string;
    rows: HistoryRow[];
};
