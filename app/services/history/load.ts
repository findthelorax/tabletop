import { getPrisma } from "../../utils/db.server";
import { requireRestaurantId } from "../../utils/auth.server";
import {
    serviceDayEndLocal,
    serviceDayStartLocal,
    todayServiceDayLocal,
} from "../../utils/service-day";

import { isValidServiceDay, safeNumber, safeString } from "./guards";
import {
    loadSeatingById,
    loadSectionById,
    loadTableNumberById,
} from "./lookups";
import { buildMembershipResolver } from "./membership";
import { seatGuestCountFor, seatTableCountFor } from "./seat-metrics";
import type { HistoryKind, HistoryLoaderData, HistoryRow } from "./types";

export async function loadHistoryData(
    request: Request,
): Promise<HistoryLoaderData> {
    let prisma = getPrisma() as any;
    let restaurantId = await requireRestaurantId(request);

    let url = new URL(request.url);
    let requested = String(url.searchParams.get("day") ?? "").trim();
    let serviceDay = isValidServiceDay(requested)
        ? requested
        : todayServiceDayLocal(new Date());

    let dayStart = serviceDayStartLocal(serviceDay);
    let dayEnd = serviceDayEndLocal(serviceDay);

    // If Prisma Client hasn't been regenerated yet, avoid crashing the route.
    if (!prisma.dashboardAction) {
        return {
            serviceDay,
            dayStartIso: dayStart.toISOString(),
            dayEndIso: dayEnd.toISOString(),
            rows: [],
        };
    }

    // Keep this page focused on the actions you asked for.
    let allowedKinds = new Set<HistoryKind>([
        "seat-table",
        "seat-waitlist-combined",
        "move-seating",
        "set-table-status",
        "set-section-status",
    ]);

    let actions: any[] = [];
    try {
        actions = await prisma.dashboardAction.findMany({
            where: {
                restaurantId,
                createdAt: { gte: dayStart, lt: dayEnd },
                kind: { in: Array.from(allowedKinds) },
            },
            orderBy: [{ createdAt: "asc" }],
            select: {
                id: true,
                kind: true,
                label: true,
                meta: true,
                createdAt: true,
                undoneAt: true,
                floorplanId: true,
            },
        });
    } catch {
        actions = [];
    }

    let tableIds = new Set<string>();
    let seatingIds = new Set<string>();
    let sectionIds = new Set<string>();
    let floorplanIds = new Set<string>();

    for (let a of actions) {
        if (a?.floorplanId) floorplanIds.add(String(a.floorplanId));

        let meta = (a as any)?.meta as any;
        let tableId = safeString(meta?.tableId);
        let seatingId = safeString(meta?.seatingId);
        let sectionId = safeString(meta?.sectionId);

        if (tableId) tableIds.add(tableId);
        if (seatingId) seatingIds.add(seatingId);
        if (sectionId) sectionIds.add(sectionId);
    }

    // Batch lookups.
    let seatingById = await loadSeatingById({
        prisma,
        restaurantId,
        seatingIds,
    });
    let sectionById = await loadSectionById({
        prisma,
        restaurantId,
        sectionIds,
    });
    let tableNumberById = await loadTableNumberById({
        prisma,
        restaurantId,
        tableIds,
    });

    // For table actions, resolve which section/server owned the table at that moment.
    // We do this best-effort and only for actions with a floorplanId.
    let resolveMembershipAt = await buildMembershipResolver({
        prisma,
        restaurantId,
        dayStart,
        dayEnd,
        tableIds,
        floorplanIds,
    });

    let out: HistoryRow[] = [];

    for (let a of actions) {
        let createdAt = (a.createdAt as Date) ?? new Date();
        let meta = (a as any)?.meta as any;

        let kind = String(a.kind) as HistoryKind;

        let tableCount = seatTableCountFor(kind, meta);
        let guestCount = seatGuestCountFor(kind, meta);

        let tableId = safeString(meta?.tableId);
        if (!tableId && kind === "seat-waitlist-combined") {
            tableId = safeString(meta?.primaryTableId);
        }
        if (!tableId && kind === "move-seating") {
            tableId = safeString(meta?.toTableId) ?? safeString(meta?.tableId);
        }
        let tableNumber = safeNumber(meta?.tableNumber);
        if (!tableNumber && kind === "move-seating") {
            tableNumber =
                safeNumber(meta?.toTableNumber) ??
                safeNumber(meta?.tableNumber);
        }

        let sectionId = safeString(meta?.sectionId);
        let sectionName: string | null = null;

        let serverId: string | null = null;
        let serverName: string | null = null;

        // Prefer explicit section info.
        if (sectionId) {
            let s = sectionById.get(sectionId);
            sectionName = s?.name ?? null;
            serverId = s?.serverId ?? null;
            serverName = s?.serverName ?? null;
        }

        // Seating action: pull server/table from the seating record.
        let seatingId = safeString(meta?.seatingId);
        if (!serverId && seatingId) {
            let s = seatingById.get(seatingId);
            if (s) {
                serverId = s.serverId;
                serverName = s.serverName;
                tableId = tableId ?? s.tableId;
                tableNumber =
                    tableNumber ??
                    (typeof s.tableNumber === "number" ? s.tableNumber : null);
            }
        }

        if (!tableNumber && tableId) {
            let n = tableNumberById.get(tableId);
            if (typeof n === "number") tableNumber = n;
        }

        // Table status action: resolve which section/server owned that table at action time.
        let floorplanId = a.floorplanId ? String(a.floorplanId) : null;
        if (!serverId && tableId && floorplanId) {
            let membership = resolveMembershipAt({
                tableId,
                floorplanId,
                occurredAt: createdAt,
            });
            sectionId = sectionId ?? membership.sectionId;
            sectionName = sectionName ?? membership.sectionName;
            serverId = membership.serverId;
            serverName = membership.serverName;
        }

        let baseRow: HistoryRow = {
            id: String(a.id),
            occurredAt: createdAt.toISOString(),
            isUndo: false,
            serverId,
            serverName,
            sectionId,
            sectionName,
            tableId,
            tableNumber,
            tableCount,
            guestCount,
            label: String(a.label ?? ""),
            kind,
        };

        out.push(baseRow);

        // If the action was undone, also include an explicit "undo" event at the undo time.
        // This makes it easy to visualize +/- effects on metrics.
        let undoneAt = (a.undoneAt as Date | null) ?? null;
        if (undoneAt instanceof Date && !Number.isNaN(undoneAt.getTime())) {
            if (undoneAt >= dayStart && undoneAt < dayEnd) {
                out.push({
                    ...baseRow,
                    occurredAt: undoneAt.toISOString(),
                    isUndo: true,
                    label: `Undo: ${baseRow.label}`,
                });
            }
        }
    }

    out.sort((a, b) => {
        let at = Date.parse(a.occurredAt);
        let bt = Date.parse(b.occurredAt);
        if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
        if (Number.isNaN(at)) return 1;
        if (Number.isNaN(bt)) return -1;
        if (at !== bt) return at - bt;
        if (a.isUndo !== b.isUndo) return a.isUndo ? 1 : -1;
        return a.id.localeCompare(b.id);
    });

    return {
        serviceDay,
        dayStartIso: dayStart.toISOString(),
        dayEndIso: dayEnd.toISOString(),
        rows: out,
    };
}
