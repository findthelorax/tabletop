import type { TableStatus as TableStatusType } from "@prisma/client";

import type { DashboardLoaderData } from "../types";
import { TableStatus } from "../utils";

export async function buildFloorplanData(args: {
    prisma: any;
    restaurantId: string;
    selectedFloorplanId: string | null;
    allTablesById: Map<string, any>;
    dayStart: Date;
    dayEnd: Date;
}): Promise<{
    sections: DashboardLoaderData["sections"];
    floorplanTables: DashboardLoaderData["floorplanTables"];
}> {
    let {
        prisma,
        restaurantId,
        selectedFloorplanId,
        allTablesById,
        dayStart,
        dayEnd,
    } = args;

    let floorplanTables: DashboardLoaderData["floorplanTables"] = [];
    let sections: DashboardLoaderData["sections"] = [];

    // Section-level seating metrics for today.
    // Important: if a table was temporarily temp into a section when it was seated,
    // that seating should count toward the borrowing section (even if the table later returns).
    let satTodayCountBySectionId = new Map<string, number>();
    let satTodayGuestCountBySectionId = new Map<string, number>();
    let lastSeatedAtBySectionId = new Map<string, string>();
    let serverAssignedAtBySectionId = new Map<string, Date>();

    if (!selectedFloorplanId) {
        return { sections, floorplanTables };
    }

    let sectionRows: any[] = [];
    try {
        sectionRows = await prisma.floorplanSection.findMany({
            where: { floorplanId: selectedFloorplanId },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
                id: true,
                name: true,
                serverName: true,
                serverId: true,
                server: { select: { name: true } },
                updatedAt: true,
                tables: {
                    orderBy: [{ sortOrder: "asc" }],
                    select: {
                        tableId: true,
                    },
                },
            },
        });
    } catch {
        // Prisma Client may not include Server/serverId yet (until db:migrate + generate).
        sectionRows = await prisma.floorplanSection.findMany({
            where: { floorplanId: selectedFloorplanId },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
                id: true,
                name: true,
                serverName: true,
                updatedAt: true,
                tables: {
                    orderBy: [{ sortOrder: "asc" }],
                    select: {
                        tableId: true,
                    },
                },
            },
        });
    }

    let tableIdToSectionId = new Map<string, string>();
    let sectionNameById = new Map<string, string>();
    let allSectionTableIds: string[] = [];
    for (let s of sectionRows) {
        let sectionId = String(s.id);
        sectionNameById.set(sectionId, String(s.name));
        for (let x of s.tables ?? []) {
            let tableId = String(x.tableId);
            if (!tableIdToSectionId.has(tableId)) {
                tableIdToSectionId.set(tableId, sectionId);
            }
            allSectionTableIds.push(tableId);
        }
    }

    // Load active temp assignments for this floorplan.
    let tempAssignments: any[] = [];
    try {
        tempAssignments = await prisma.tempTableAssignment.findMany({
            where: {
                restaurantId,
                floorplanId: selectedFloorplanId,
                createdAt: { lt: dayEnd },
                OR: [{ endedAt: null }, { endedAt: { gt: dayStart } }],
            },
            select: {
                tableId: true,
                fromSectionId: true,
                toSectionId: true,
                createdAt: true,
                endedAt: true,
            },
        });
    } catch {
        tempAssignments = [];
    }

    let activeTempAssignments = (tempAssignments ?? []).filter(
        (a: any) => (a as any).endedAt == null,
    );

    let assignmentsByTableId = new Map<
        string,
        Array<{
            toSectionId: string;
            createdAtMs: number;
            endedAtMs: number | null;
        }>
    >();
    for (let a of tempAssignments ?? []) {
        let tableId = String((a as any).tableId);
        let toSectionId = String((a as any).toSectionId);
        let createdAt = (a as any).createdAt as Date | null;
        let endedAt = (a as any).endedAt as Date | null;
        let createdAtMs =
            createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
                ? createdAt.getTime()
                : 0;
        let endedAtMs =
            endedAt instanceof Date && !Number.isNaN(endedAt.getTime())
                ? endedAt.getTime()
                : null;

        let list = assignmentsByTableId.get(tableId);
        if (!list) {
            list = [];
            assignmentsByTableId.set(tableId, list);
        }
        list.push({ toSectionId, createdAtMs, endedAtMs });
    }
    for (let list of assignmentsByTableId.values()) {
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
    }

    let tempTempOutByFromSectionId = new Map<string, Set<string>>();
    let tempTempInByToSectionId = new Map<string, Set<string>>();
    let tempTempTableIds = new Set<string>();

    for (let a of activeTempAssignments ?? []) {
        let tableId = String((a as any).tableId);
        let fromSectionId = String((a as any).fromSectionId);
        let toSectionId = String((a as any).toSectionId);
        tempTempTableIds.add(tableId);

        let outSet = tempTempOutByFromSectionId.get(fromSectionId);
        if (!outSet) {
            outSet = new Set();
            tempTempOutByFromSectionId.set(fromSectionId, outSet);
        }
        outSet.add(tableId);

        let inSet = tempTempInByToSectionId.get(toSectionId);
        if (!inSet) {
            inSet = new Set();
            tempTempInByToSectionId.set(toSectionId, inSet);
        }
        inSet.add(tableId);
    }

    // Compute satTodayCount/satTodayGuestCount/lastSeatedAt per section.
    // Use DashboardAction so metrics are stable across floorplan edits (AM/PM plans) and
    // can be reset when the section's server assignment changes.
    try {
        if (prisma.dashboardAction) {
            let sectionIds = sectionRows.map((s: any) => String(s.id));

            // Find the latest server assignment action per section today.
            try {
                let assigns = await prisma.dashboardAction.findMany({
                    where: {
                        restaurantId,
                        floorplanId: selectedFloorplanId,
                        kind: "set-section-server-id",
                        createdAt: { gte: dayStart, lt: dayEnd },
                    },
                    select: { createdAt: true, meta: true },
                    orderBy: [{ createdAt: "asc" }],
                });

                for (let a of assigns ?? []) {
                    let createdAt = (a as any).createdAt as Date | null;
                    if (!(createdAt instanceof Date)) continue;
                    let meta = ((a as any).meta ?? {}) as any;
                    let sid = meta.sectionId ? String(meta.sectionId) : null;
                    if (!sid || !sectionIds.includes(sid)) continue;
                    serverAssignedAtBySectionId.set(sid, createdAt);
                }
            } catch {
                // ignore
            }

            let seatActions = await prisma.dashboardAction.findMany({
                where: {
                    restaurantId,
                    floorplanId: selectedFloorplanId,
                    kind: { in: ["seat-table", "seat-waitlist-combined"] },
                    createdAt: { gte: dayStart, lt: dayEnd },
                },
                select: {
                    kind: true,
                    meta: true,
                    createdAt: true,
                    undoneAt: true,
                },
                orderBy: [{ createdAt: "asc" }],
            });

            for (let a of seatActions ?? []) {
                let createdAt = (a as any).createdAt as Date | null;
                if (
                    !(createdAt instanceof Date) ||
                    Number.isNaN(createdAt.getTime())
                )
                    continue;

                // If the action was undone at any point, don't count it.
                let undoneAt = (a as any).undoneAt as Date | null;
                if (
                    undoneAt instanceof Date &&
                    !Number.isNaN(undoneAt.getTime())
                )
                    continue;

                let kind = String((a as any).kind);
                let meta = ((a as any).meta ?? {}) as any;
                let sid = meta.sectionId ? String(meta.sectionId) : null;
                if (!sid || !sectionIds.includes(sid)) continue;

                let assignedAt = serverAssignedAtBySectionId.get(sid) ?? null;
                if (assignedAt && createdAt < assignedAt) continue;

                let tableCount = 1;
                if (kind === "seat-waitlist-combined") {
                    let extraTables = Array.isArray(meta.extraTables)
                        ? meta.extraTables
                        : [];
                    tableCount = 1 + extraTables.length;
                }

                satTodayCountBySectionId.set(
                    sid,
                    (satTodayCountBySectionId.get(sid) ?? 0) + tableCount,
                );

                let partySize = Number(meta.partySize ?? 0);
                satTodayGuestCountBySectionId.set(
                    sid,
                    (satTodayGuestCountBySectionId.get(sid) ?? 0) +
                        (Number.isFinite(partySize) ? partySize : 0),
                );

                let iso = createdAt.toISOString();
                let prevIso = lastSeatedAtBySectionId.get(sid);
                if (!prevIso || iso > prevIso) {
                    lastSeatedAtBySectionId.set(sid, iso);
                }
            }
        }
    } catch {
        // Best-effort; metrics will remain 0/null if this fails.
    }

    // Build a list of tables for the temp-table picker, with a best-effort
    // "home" section (if the table exists on this floorplan).
    try {
        let homeLinks = await prisma.floorplanSectionTable.findMany({
            where: {
                floorplanSectionId: {
                    in: sectionRows.map((s: any) => String(s.id)),
                },
            },
            select: {
                tableId: true,
                floorplanSectionId: true,
            },
        });

        // In case a table somehow appears in multiple sections, keep the first.
        let homeByTableId = new Map<string, { id: string; name: string }>();
        for (let l of homeLinks ?? []) {
            let tableId = String((l as any).tableId);
            if (homeByTableId.has(tableId)) continue;
            let sid = String((l as any).floorplanSectionId);
            homeByTableId.set(tableId, {
                id: sid,
                name: sectionNameById.get(sid) ?? "",
            });
        }

        floorplanTables = Array.from(allTablesById.values())
            .map((t: any): DashboardLoaderData["floorplanTables"][number] => {
                let tableId = String(t.id);
                let home = homeByTableId.get(tableId) ?? null;
                return {
                    id: tableId,
                    tableNumber: Number(t.tableNumber),
                    status: t.status as TableStatusType,
                    homeSectionId: home ? String(home.id) : "",
                    homeSectionName: home
                        ? String(home.name)
                        : "Not on floorplan",
                    isTempTemp: tempTempTableIds.has(tableId),
                };
            })
            .sort((a, b) => a.tableNumber - b.tableNumber);
    } catch {
        floorplanTables = [];
    }

    let lastBulkUpdateBySectionId = new Map<
        string,
        { occurredAt: string; toStatus: TableStatusType }
    >();

    if (allSectionTableIds.length > 0) {
        let bulkEvents = await prisma.tableStatusEvent.findMany({
            where: {
                restaurantId,
                tableId: { in: allSectionTableIds },
                notes: "Section bulk update",
            },
            orderBy: [{ occurredAt: "desc" }],
            select: {
                tableId: true,
                toStatus: true,
                occurredAt: true,
            },
        });

        for (let e of bulkEvents) {
            let sectionId = tableIdToSectionId.get(String(e.tableId));
            if (!sectionId) continue;
            if (lastBulkUpdateBySectionId.has(sectionId)) continue;
            lastBulkUpdateBySectionId.set(sectionId, {
                occurredAt: new Date(e.occurredAt as Date).toISOString(),
                toStatus: e.toStatus as TableStatusType,
            });
        }
    }

    sections = sectionRows.map((s: any) => {
        let sectionId = String(s.id);

        let tempOut = tempTempOutByFromSectionId.get(sectionId) ?? new Set();
        let tempIn = tempTempInByToSectionId.get(sectionId) ?? new Set();

        let effectiveTableIds = (s.tables ?? [])
            .map((x: any) => String(x.tableId))
            .filter((id: string) => !tempOut.has(id));

        let effectiveTableIdSet = new Set(effectiveTableIds);

        for (let tableId of tempIn) {
            if (!effectiveTableIdSet.has(tableId)) {
                effectiveTableIds.push(tableId);
                effectiveTableIdSet.add(tableId);
            }
        }

        let tablesForSection = effectiveTableIds
            .map((tableId: string) => ({
                tableId,
                table: allTablesById.get(tableId),
            }))
            .filter((x: any) => Boolean(x.table))
            .map((x: any) => {
                let t = x.table as any;
                let id = String(t.id);
                return {
                    id,
                    tableNumber: Number(t.tableNumber),
                    capacity: Number(t.capacity),
                    status: t.status as TableStatusType,
                    seatedPartySize:
                        typeof t.seatedPartySize === "number"
                            ? Number(t.seatedPartySize)
                            : null,
                    seatedAt: t.seatedAt
                        ? new Date(t.seatedAt as Date).toISOString()
                        : null,
                    isTemp: tempIn.has(String(x.tableId)),
                };
            })
            .sort((a: any, b: any) => a.tableNumber - b.tableNumber);

        let isSectionEnabled = tablesForSection.some(
            (t: any) => t.status !== TableStatus.DISABLED,
        );

        let satTodayCount = satTodayCountBySectionId.get(sectionId) ?? 0;

        let satTodayGuestCount =
            satTodayGuestCountBySectionId.get(sectionId) ?? 0;

        let lastSeatedAt: string | null =
            lastSeatedAtBySectionId.get(sectionId) ?? null;

        let enabledAt: string | null = null;
        let lastBulk = lastBulkUpdateBySectionId.get(String(s.id)) ?? null;
        if (lastBulk) {
            enabledAt =
                lastBulk.toStatus === TableStatus.DISABLED
                    ? null
                    : lastBulk.occurredAt;
        } else {
            // New sections can have AVAILABLE tables by default; do not start the timer
            // until the section is explicitly enabled (bulk enable) or assigned.
            let hasAssignedServer = Boolean(
                (s.serverId ? String(s.serverId).trim() : "") ||
                (s.serverName ? String(s.serverName).trim() : ""),
            );
            enabledAt =
                isSectionEnabled && hasAssignedServer
                    ? new Date(s.updatedAt as Date).toISOString()
                    : null;
        }

        // Section timers are "service-day" scoped (service day flips at 1am local).
        // If a section was enabled on a previous day and hasn't had activity today,
        // clamp enabledAt so the UI timer doesn't run for multiple days.
        if (enabledAt) {
            let enabledAtMs = new Date(enabledAt).getTime();
            if (
                Number.isFinite(enabledAtMs) &&
                enabledAtMs < dayStart.getTime()
            ) {
                enabledAt = dayStart.toISOString();
            }
        }

        let derivedServerName =
            (s.server && s.server.name ? String(s.server.name) : null) ??
            (s.serverName ? String(s.serverName) : null);

        return {
            id: sectionId,
            name: String(s.name),
            serverName: derivedServerName,
            serverId: s.serverId ? String(s.serverId) : null,
            satTodayCount,
            satTodayGuestCount,
            enabledAt,
            lastSeatedAt,
            tables: tablesForSection,
        };
    });

    return { sections, floorplanTables };
}
