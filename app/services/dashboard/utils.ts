import * as PrismaClientPkg from "@prisma/client";
import type { TableStatus as TableStatusType } from "@prisma/client";

import { DomainError } from "../table-management.server";

export const TableStatus = ((PrismaClientPkg as any).TableStatus ??
    (PrismaClientPkg as any).default?.TableStatus) as any;
export const WaitlistStatus = ((PrismaClientPkg as any).WaitlistStatus ??
    (PrismaClientPkg as any).default?.WaitlistStatus) as any;

export function isInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date < end;
}

export function minutesBetween(later: Date, earlier: Date): number {
    return (later.getTime() - earlier.getTime()) / 60000;
}

export function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

export async function createDashboardAction(
    prisma: any,
    data: {
        restaurantId: string;
        floorplanId: string | null;
        kind: string;
        label: string;
        meta?: any;
    },
) {
    try {
        if (!prisma.dashboardAction) return;
        await prisma.dashboardAction.create({
            data: {
                restaurantId: data.restaurantId,
                floorplanId: data.floorplanId,
                kind: data.kind,
                label: data.label,
                meta: data.meta ?? undefined,
            },
            select: { id: true },
        });
    } catch {
        // Best-effort only.
    }
}

export async function undoSeatingsById(options: {
    tx: any;
    restaurantId: string;
    seatingIds: string[];
    dayStart: Date;
    dayEnd: Date;
}) {
    let { tx, restaurantId, seatingIds, dayStart, dayEnd } = options;
    let now = new Date();
    let uniqueIds = Array.from(
        new Set(seatingIds.map((s) => String(s).trim()).filter(Boolean)),
    );
    if (uniqueIds.length === 0) throw new DomainError("Missing seating");

    let seatings = await tx.tableSeating.findMany({
        where: {
            restaurantId,
            id: { in: uniqueIds },
        },
        select: { id: true, tableId: true, seatedAt: true },
    });

    if (!seatings || seatings.length !== uniqueIds.length) {
        throw new DomainError("Seating not found");
    }

    for (let s of seatings) {
        let seatedAt = (s as any).seatedAt as Date | null;
        if (
            !(seatedAt instanceof Date) ||
            !isInRange(seatedAt, dayStart, dayEnd)
        ) {
            throw new DomainError("Only today's actions can be undone");
        }
    }

    let tableIds = Array.from(
        new Set(seatings.map((s: any) => String((s as any).tableId))),
    );
    let tables = await tx.table.findMany({
        where: { restaurantId, id: { in: tableIds } },
        select: { id: true, status: true },
    });
    let statusByTableId = new Map(
        (tables ?? []).map((t: any) => [String(t.id), t.status]),
    );

    let shouldClearToAvailable = new Set<string>();
    for (let tableId of tableIds) {
        let tableIdStr = String(tableId);
        let status = statusByTableId.get(tableIdStr) as
            | TableStatusType
            | undefined;
        if (!status) throw new DomainError("Table not found");
        if (status === TableStatus.SEATED)
            shouldClearToAvailable.add(tableIdStr);
    }

    for (let s of seatings) {
        let tableId = String((s as any).tableId);
        let latest = await tx.tableSeating.findFirst({
            where: { restaurantId, tableId },
            orderBy: [{ seatedAt: "desc" }],
            select: { id: true },
        });
        if (!latest || String(latest.id) !== String((s as any).id)) {
            throw new DomainError(
                "That is not the latest seating for this table",
            );
        }
    }

    let linked = await tx.waitlistEntry.findFirst({
        where: {
            restaurantId,
            seatingId: { in: uniqueIds },
        },
        select: { id: true, status: true },
    });

    if (linked) {
        await tx.waitlistEntry.update({
            where: { id: linked.id },
            data: {
                status:
                    linked.status === WaitlistStatus.SEATED
                        ? WaitlistStatus.WAITING
                        : linked.status,
                seatedAt: null,
                removedAt: null,
                seatingId: null,
            },
        });
    }

    // If the table is still marked SEATED, undo should also "clean" it (AVAILABLE)
    // so the user doesn't have to clear it first.
    for (let s of seatings) {
        let tableId = String((s as any).tableId);
        if (!shouldClearToAvailable.has(tableId)) continue;

        await tx.table.update({
            where: { id: tableId },
            data: {
                status: TableStatus.AVAILABLE,
                seatedAt: null,
                seatedPartySize: null,
            },
        });

        await tx.tableStatusEvent.create({
            data: {
                restaurantId,
                tableId,
                fromStatus: TableStatus.SEATED,
                toStatus: TableStatus.AVAILABLE,
                occurredAt: now,
                notes: "Undo seating",
                seatingId: String((s as any).id),
            },
        });

        // Maintain existing behavior: returning to AVAILABLE ends any temp borrow.
        try {
            let tempDelegate = (tx as any).tempTableAssignment;
            if (tempDelegate && typeof tempDelegate.updateMany === "function") {
                let restoreToStatus: string | null = null;
                let fromSectionId: string | null = null;
                let toSectionId: string | null = null;
                try {
                    if (typeof tempDelegate.findFirst === "function") {
                        let active = await tempDelegate.findFirst({
                            where: {
                                restaurantId,
                                tableId,
                                endedAt: null,
                            },
                            orderBy: { createdAt: "desc" },
                            select: {
                                restoreToStatus: true,
                                fromSectionId: true,
                                toSectionId: true,
                            },
                        });
                        if (active?.restoreToStatus) {
                            restoreToStatus = String(
                                (active as any).restoreToStatus,
                            );
                        }
                        if ((active as any)?.fromSectionId) {
                            fromSectionId = String(
                                (active as any).fromSectionId,
                            );
                        }
                        if ((active as any)?.toSectionId) {
                            toSectionId = String((active as any).toSectionId);
                        }
                    }
                } catch {
                    restoreToStatus = null;
                    fromSectionId = null;
                    toSectionId = null;
                }

                // Don't auto-end off-floorplan temp borrows when clearing to AVAILABLE.
                // Those should stay on the current floorplan.
                if (
                    fromSectionId &&
                    toSectionId &&
                    fromSectionId === toSectionId
                ) {
                    continue;
                }

                await tempDelegate.updateMany({
                    where: {
                        restaurantId,
                        tableId,
                        endedAt: null,
                    },
                    data: { endedAt: now },
                });

                if (restoreToStatus) {
                    await tx.table.update({
                        where: { id: tableId },
                        data: {
                            status: restoreToStatus as any,
                            seatedAt: null,
                            seatedPartySize: null,
                        },
                    });
                    try {
                        await tx.tableStatusEvent.create({
                            data: {
                                restaurantId,
                                tableId,
                                fromStatus: TableStatus.AVAILABLE,
                                toStatus: restoreToStatus as any,
                                occurredAt: now,
                                notes: "Restore temp borrow status",
                                seatingId: String((s as any).id),
                            },
                        });
                    } catch {
                        // ignore
                    }
                }
            }
        } catch {
            // ignore
        }
    }

    await tx.tableSeating.deleteMany({
        where: {
            restaurantId,
            id: { in: uniqueIds },
        },
    });
}
