import type { WaitlistStatus } from "@prisma/client";

import { getPrisma } from "../utils/db.server";
import { todayServiceDayLocal } from "../utils/service-day";

export type WaitlistSidebarItem = {
    id: string;
    partyName: string;
    partySize: number;
    phoneNumber: string | null;
    status: string;
    isCallAhead: boolean;
    quotedWaitMinutes: number | null;
    notes: string | null;
    preferredTableId: string | null;
    preferredTableNumber: number | null;
    waitingStartedAt: string | null;
    arrivedAt: string | null;
    createdAt: string;
    seatedTableLabel: string | null;
};

export type WaitlistSidebarTable = {
    id: string;
    tableNumber: number;
    label: string | null;
    capacity: number;
};

export type WaitlistSidebarData = {
    items: WaitlistSidebarItem[];
    tables: WaitlistSidebarTable[];
};

function toIso(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null;
}

function toMs(iso: string | null): number | null {
    if (!iso) return null;
    let ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : null;
}

function stripPreferredPrefix(notes: string | null | undefined): {
    notes: string | null;
    preferredLabel: string | null;
} {
    let raw = (notes ?? "").trim();
    if (!raw) return { notes: null, preferredLabel: null };
    let lines = raw.split(/\r?\n/);
    let first = (lines[0] ?? "").trim();
    if (/^Preferred table:\s*/i.test(first)) {
        let preferredLabel = first.replace(/^Preferred table:\s*/i, "").trim();
        let rest = lines.slice(1).join("\n").trim();
        return {
            notes: rest || null,
            preferredLabel: preferredLabel || null,
        };
    }
    return { notes: raw || null, preferredLabel: null };
}

function parsePreferredNumberFromLabel(label: string | null): number | null {
    if (!label) return null;
    let match = label.match(/\d+/);
    if (!match) return null;
    let n = Number.parseInt(match[0], 10);
    return Number.isFinite(n) ? n : null;
}

function sortRank(item: {
    status: string;
    isCallAhead: boolean;
    arrivedAt: string | null;
}): number {
    if (item.status === "CALL_AHEAD") return 2;
    if (item.isCallAhead && item.arrivedAt) return 0;
    if (item.status === "ARRIVED") return 0;
    return 1;
}

export async function getWaitlistSidebarData(options: {
    restaurantId: string;
}): Promise<WaitlistSidebarData> {
    let prisma = getPrisma();
    let todayServiceDay = todayServiceDayLocal();

    let restaurantId = options.restaurantId;

    let [rows, tables] = await Promise.all([
        prisma.waitlistEntry.findMany({
            where: {
                restaurantId,
                serviceDay: todayServiceDay,
                removedAt: null,
                status: {
                    in: [
                        "CALL_AHEAD",
                        "WAITING",
                        "ARRIVED",
                    ] as WaitlistStatus[],
                },
            },
            orderBy: [{ createdAt: "asc" }],
            select: {
                id: true,
                partyName: true,
                partySize: true,
                phoneNumber: true,
                status: true,
                isCallAhead: true,
                quotedWaitMinutes: true,
                notes: true,
                preferredTableId: true,
                preferredTable: {
                    select: { id: true, tableNumber: true },
                },
                waitingStartedAt: true,
                arrivedAt: true,
                createdAt: true,
                seating: {
                    select: {
                        table: {
                            select: {
                                tableNumber: true,
                                label: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.table.findMany({
            where: { restaurantId },
            orderBy: [{ tableNumber: "asc" }],
            select: {
                id: true,
                tableNumber: true,
                label: true,
                capacity: true,
            },
        }),
    ]);

    let items: WaitlistSidebarItem[] = rows.map((row: any) => {
        let seatedTableLabel = row.seating?.table
            ? row.seating.table.label
                ? row.seating.table.label
                : `Table ${row.seating.table.tableNumber}`
            : null;

        let legacy = stripPreferredPrefix(row.notes);
        let preferredTableId = row.preferredTableId
            ? String(row.preferredTableId)
            : null;
        let preferredTableNumber: number | null = null;
        if (row.preferredTable?.tableNumber != null) {
            preferredTableNumber = Number(row.preferredTable.tableNumber);
        } else if (!preferredTableId && legacy.preferredLabel) {
            preferredTableNumber = parsePreferredNumberFromLabel(
                legacy.preferredLabel,
            );
        }

        return {
            id: String(row.id),
            partyName: String(row.partyName),
            partySize: Number(row.partySize),
            phoneNumber: row.phoneNumber ? String(row.phoneNumber) : null,
            status: String(row.status),
            isCallAhead: Boolean(row.isCallAhead),
            quotedWaitMinutes:
                row.quotedWaitMinutes == null
                    ? null
                    : Number(row.quotedWaitMinutes),
            notes: legacy.notes,
            preferredTableId,
            preferredTableNumber,
            waitingStartedAt: toIso(row.waitingStartedAt),
            arrivedAt: toIso(row.arrivedAt),
            createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
            seatedTableLabel,
        };
    });

    items.sort((a, b) => {
        let ra = sortRank(a);
        let rb = sortRank(b);
        if (ra !== rb) return ra - rb;

        let aCreated = toMs(a.createdAt) ?? 0;
        let bCreated = toMs(b.createdAt) ?? 0;

        if (ra === 0) {
            let aArrived = toMs(a.arrivedAt) ?? aCreated;
            let bArrived = toMs(b.arrivedAt) ?? bCreated;
            if (aArrived !== bArrived) return bArrived - aArrived;
            return bCreated - aCreated;
        }

        if (ra === 1) {
            let aStarted = toMs(a.waitingStartedAt) ?? aCreated;
            let bStarted = toMs(b.waitingStartedAt) ?? bCreated;
            if (aStarted !== bStarted) return aStarted - bStarted;
            return aCreated - bCreated;
        }

        return aCreated - bCreated;
    });

    let sidebarTables: WaitlistSidebarTable[] = tables.map((t: any) => ({
        id: String(t.id),
        tableNumber: Number(t.tableNumber),
        label: t.label ? String(t.label) : null,
        capacity: Number(t.capacity),
    }));

    return { items, tables: sidebarTables };
}
