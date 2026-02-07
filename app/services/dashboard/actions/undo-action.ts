import type { TableStatus as TableStatusType } from "@prisma/client";

import {
    serviceDayEndLocal,
    serviceDayStartLocal,
    todayServiceDayLocal,
} from "../../../utils/service-day";
import { DomainError, setTableStatus } from "../../table-management.server";
import {
    TableStatus,
    WaitlistStatus,
    createDashboardAction,
    isInRange,
    undoSeatingsById,
} from "../utils";

export async function handleUndoAction(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
    floorplanId: string | null;
}): Promise<Response> {
    let { formData, prisma, restaurantId, floorplanId } = args;

    let actionId = String(formData.get("actionId") ?? "").trim();
    if (!actionId) {
        return Response.json(
            { ok: false, formError: "Missing action" },
            { status: 400 },
        );
    }

    if (!prisma.dashboardAction) {
        return Response.json(
            {
                ok: false,
                formError:
                    "Undo is not available yet. Run `npm run db:generate` and restart `npm run dev`.",
            },
            { status: 500 },
        );
    }

    try {
        let now = new Date();
        let serviceDay = todayServiceDayLocal(now);
        let dayStart = serviceDayStartLocal(serviceDay);
        let dayEnd = serviceDayEndLocal(serviceDay);

        await prisma.$transaction(async (tx: any) => {
            let action = await tx.dashboardAction.findFirst({
                where: { id: actionId, restaurantId, undoneAt: null },
                select: {
                    id: true,
                    kind: true,
                    meta: true,
                    floorplanId: true,
                    createdAt: true,
                },
            });
            if (!action) throw new DomainError("Action not found");

            let createdAt = action.createdAt as Date | null;
            if (
                !(createdAt instanceof Date) ||
                !isInRange(createdAt, dayStart, dayEnd)
            ) {
                throw new DomainError("Only today's actions can be undone");
            }

            if (floorplanId && action.floorplanId) {
                if (String(action.floorplanId) !== floorplanId) {
                    throw new DomainError(
                        "That action is not in this floorplan",
                    );
                }
            }

            let meta = (action.meta ?? {}) as any;

            if (action.kind === "set-table-status") {
                let tableId = String(meta.tableId ?? "").trim();
                let beforeStatus = String(meta.beforeStatus ?? "").trim();
                let afterStatus = String(meta.afterStatus ?? "").trim();
                if (!tableId || !beforeStatus || !afterStatus) {
                    throw new DomainError("Action data is incomplete");
                }

                let table = await tx.table.findFirst({
                    where: { id: tableId, restaurantId },
                    select: { status: true },
                });
                if (!table) throw new DomainError("Table not found");
                if (String(table.status) !== afterStatus) {
                    throw new DomainError("Table changed; can't undo");
                }

                if (beforeStatus === TableStatus.SEATED) {
                    let beforeSeating = meta.beforeSeating ?? null;
                    if (!beforeSeating || !beforeSeating.id) {
                        throw new DomainError(
                            "That action can't be undone safely",
                        );
                    }

                    // Restore only if the seating still exists and is the latest seating for the table.
                    let seating = await tx.tableSeating.findFirst({
                        where: {
                            restaurantId,
                            id: String(beforeSeating.id),
                            tableId,
                        },
                        select: {
                            id: true,
                            seatedAt: true,
                            partySize: true,
                            endedAt: true,
                        },
                    });
                    if (!seating) throw new DomainError("Seating not found");
                    if (!seating.endedAt) {
                        throw new DomainError("Table already restored");
                    }

                    let latest = await tx.tableSeating.findFirst({
                        where: { restaurantId, tableId },
                        orderBy: [{ seatedAt: "desc" }],
                        select: { id: true },
                    });
                    if (!latest || String(latest.id) !== String(seating.id)) {
                        throw new DomainError("Table changed; can't undo");
                    }

                    await tx.tableSeating.update({
                        where: { id: seating.id },
                        data: { endedAt: null },
                    });

                    await tx.table.update({
                        where: { id: tableId },
                        data: {
                            status: TableStatus.SEATED,
                            seatedAt: seating.seatedAt,
                            seatedPartySize: Number(seating.partySize ?? 0),
                        },
                    });

                    await tx.tableStatusEvent.create({
                        data: {
                            restaurantId,
                            tableId,
                            fromStatus: table.status,
                            toStatus: TableStatus.SEATED,
                            occurredAt: now,
                            partySize: Number(seating.partySize ?? 0),
                            notes: "Undo",
                            seatingId: seating.id,
                        },
                    });
                } else {
                    await setTableStatus({
                        restaurantId,
                        tableId,
                        toStatus: beforeStatus as Exclude<
                            TableStatusType,
                            "SEATED"
                        >,
                        notes: "Undo",
                    });
                }
            } else if (action.kind === "seat-table") {
                let seatingId = String(meta.seatingId ?? "").trim();
                if (!seatingId)
                    throw new DomainError("Action data is incomplete");

                await undoSeatingsById({
                    tx,
                    restaurantId,
                    seatingIds: [seatingId],
                    dayStart,
                    dayEnd,
                });
            } else if (action.kind === "seat-waitlist-combined") {
                let seatingId = String(meta.seatingId ?? "").trim();
                let extraSeatingIds = Array.isArray(meta.extraSeatingIds)
                    ? (meta.extraSeatingIds as any[])
                          .map((s) => String(s ?? "").trim())
                          .filter(Boolean)
                    : [];
                let extraTables = Array.isArray(meta.extraTables)
                    ? (meta.extraTables as any[])
                    : [];
                if (!seatingId)
                    throw new DomainError("Action data is incomplete");

                for (let row of extraTables) {
                    let tableId = String(row?.tableId ?? "").trim();
                    let afterStatus = String(row?.afterStatus ?? "").trim();
                    if (!tableId || !afterStatus) continue;
                    let table = await tx.table.findFirst({
                        where: { restaurantId, id: tableId },
                        select: { status: true },
                    });
                    if (!table) throw new DomainError("Table not found");
                    if (String(table.status) !== afterStatus) {
                        throw new DomainError("A table changed; can't undo");
                    }
                }

                for (let row of extraTables) {
                    let tableId = String(row?.tableId ?? "").trim();
                    let beforeStatus = String(row?.beforeStatus ?? "").trim();
                    if (!tableId || !beforeStatus) continue;
                    if (beforeStatus === TableStatus.SEATED) {
                        throw new DomainError(
                            "That action can't be undone safely",
                        );
                    }
                    await setTableStatus({
                        restaurantId,
                        tableId,
                        toStatus: beforeStatus as Exclude<
                            TableStatusType,
                            "SEATED"
                        >,
                        notes: "Undo combined seating",
                    });
                }

                await undoSeatingsById({
                    tx,
                    restaurantId,
                    seatingIds: [seatingId, ...extraSeatingIds],
                    dayStart,
                    dayEnd,
                });
            } else if (action.kind === "add-temp-table") {
                let assignmentId = String(meta.assignmentId ?? "").trim();
                let tableId = String(meta.tableId ?? "").trim();
                let prevToSectionId = meta.prevToSectionId
                    ? String(meta.prevToSectionId).trim()
                    : "";
                let fromSectionId = meta.fromSectionId
                    ? String(meta.fromSectionId).trim()
                    : "";
                let toSectionId = meta.toSectionId
                    ? String(meta.toSectionId).trim()
                    : "";
                if (!assignmentId)
                    throw new DomainError("Action data is incomplete");

                let assignment = await tx.tempTableAssignment.findFirst({
                    where: {
                        id: assignmentId,
                        restaurantId,
                        endedAt: null,
                    },
                    select: {
                        id: true,
                        tableId: true,
                        toSectionId: true,
                        restoreToStatus: true,
                    },
                });
                if (!assignment) {
                    throw new DomainError("Temp table is already ended");
                }

                let tid = tableId || String(assignment.tableId);
                let table = await tx.table.findFirst({
                    where: { id: tid, restaurantId },
                    select: { status: true },
                });
                if (!table) throw new DomainError("Table not found");
                let isOffFloorplanBorrow =
                    fromSectionId &&
                    toSectionId &&
                    fromSectionId === toSectionId;
                if (
                    table.status === TableStatus.SEATED &&
                    !isOffFloorplanBorrow
                ) {
                    throw new DomainError("Can't undo while table is seated");
                }

                if (prevToSectionId) {
                    await tx.tempTableAssignment.update({
                        where: { id: assignmentId },
                        data: { toSectionId: prevToSectionId },
                    });
                } else {
                    await tx.tempTableAssignment.update({
                        where: { id: assignmentId },
                        data: { endedAt: now },
                    });

                    if ((assignment as any).restoreToStatus) {
                        let restoreToStatus = String(
                            (assignment as any).restoreToStatus,
                        );
                        await tx.table.update({
                            where: { id: tid },
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
                                    tableId: tid,
                                    fromStatus: table.status,
                                    toStatus: restoreToStatus as any,
                                    occurredAt: now,
                                    notes: "Undo temp borrow restore status",
                                },
                            });
                        } catch {
                            // ignore
                        }
                    }
                }
            } else if (action.kind === "set-section-server-id") {
                let sectionId = String(meta.sectionId ?? "").trim();
                let beforeServerId = meta.beforeServerId
                    ? String(meta.beforeServerId)
                    : null;
                let afterServerId = meta.afterServerId
                    ? String(meta.afterServerId)
                    : null;
                if (!sectionId)
                    throw new DomainError("Action data is incomplete");

                let section = await tx.floorplanSection.findFirst({
                    where: { id: sectionId, floorplan: { restaurantId } },
                    select: { id: true, serverId: true },
                });
                if (!section) throw new DomainError("Section not found");
                let current = section.serverId
                    ? String(section.serverId)
                    : null;
                if (current !== afterServerId) {
                    throw new DomainError("Section changed; can't undo");
                }

                await tx.floorplanSection.update({
                    where: { id: sectionId },
                    data: { serverId: beforeServerId, serverName: null },
                });
            } else if (action.kind === "set-section-status") {
                let changes = Array.isArray(meta.changes)
                    ? (meta.changes as any[])
                    : [];
                let toStatus = String(meta.toStatus ?? "").trim();
                if (!toStatus || changes.length === 0) {
                    throw new DomainError("Action data is incomplete");
                }

                let tableIds = changes
                    .map((c) => String(c.tableId ?? "").trim())
                    .filter(Boolean);
                let tables = await tx.table.findMany({
                    where: { restaurantId, id: { in: tableIds } },
                    select: { id: true, status: true },
                });
                let statusById = new Map(
                    (tables ?? []).map((t: any) => [String(t.id), t.status]),
                );

                for (let c of changes) {
                    let tableId = String(c.tableId ?? "").trim();
                    let current = statusById.get(tableId);
                    if (!current) throw new DomainError("Table not found");
                    if (String(current) !== toStatus) {
                        throw new DomainError("A table changed; can't undo");
                    }
                }

                for (let c of changes) {
                    let tableId = String(c.tableId ?? "").trim();
                    let fromStatus = String(c.fromStatus ?? "").trim();
                    if (!tableId || !fromStatus) continue;

                    if (fromStatus === TableStatus.SEATED) {
                        let beforeSeating = (c as any).beforeSeating as
                            | { seatedAt?: string; partySize?: number }
                            | undefined;

                        // Can't restore seating if there's already an active one now.
                        let active = await tx.tableSeating.findFirst({
                            where: {
                                restaurantId,
                                tableId,
                                endedAt: null,
                            },
                            select: { id: true },
                        });
                        if (active?.id) {
                            throw new DomainError(
                                "A table changed; can't undo",
                            );
                        }

                        let partySize = Math.max(
                            0,
                            Number(beforeSeating?.partySize ?? 0),
                        );
                        if (!Number.isFinite(partySize) || partySize <= 0) {
                            throw new DomainError(
                                "That action can't be undone safely",
                            );
                        }

                        let seatedAt = (() => {
                            let iso = String(beforeSeating?.seatedAt ?? "");
                            let d = iso ? new Date(iso) : null;
                            if (d && !Number.isNaN(d.getTime())) return d;
                            return now;
                        })();

                        await tx.tableSeating.create({
                            data: {
                                restaurantId,
                                tableId,
                                partySize,
                                seatedAt,
                            },
                        });

                        await tx.table.update({
                            where: { id: tableId },
                            data: {
                                status: TableStatus.SEATED,
                                seatedAt,
                                seatedPartySize: partySize,
                            },
                        });

                        try {
                            await tx.tableStatusEvent.create({
                                data: {
                                    restaurantId,
                                    tableId,
                                    fromStatus: toStatus as any,
                                    toStatus: TableStatus.SEATED,
                                    occurredAt: now,
                                    partySize,
                                    notes: "Undo section update (restore seated)",
                                },
                            });
                        } catch {
                            // ignore
                        }

                        continue;
                    }

                    await setTableStatus({
                        restaurantId,
                        tableId,
                        toStatus: fromStatus as Exclude<
                            TableStatusType,
                            "SEATED"
                        >,
                        notes: "Undo section update",
                    });
                }
            } else {
                throw new DomainError("That action type can't be undone yet");
            }

            await tx.dashboardAction.update({
                where: { id: actionId },
                data: { undoneAt: now },
            });
        });

        return Response.json({ ok: true } as const);
    } catch (error) {
        if (error instanceof Error) {
            let msg = String(error.message ?? "");
            if (
                msg.includes("DashboardAction") &&
                (msg.includes("does not exist") ||
                    msg.includes("relation") ||
                    msg.includes("table"))
            ) {
                return Response.json(
                    {
                        ok: false,
                        formError:
                            "Undo needs a DB migration. Run `npm run db:migrate` and restart `npm run dev`.",
                    },
                    { status: 500 },
                );
            }
        }
        let message =
            error instanceof DomainError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "Could not undo";
        return Response.json(
            { ok: false, formError: message },
            { status: 400 },
        );
    }
}
