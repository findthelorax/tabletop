import { DomainError, seatTable } from "../../table-management.server";
import { TableStatus, WaitlistStatus, createDashboardAction } from "../utils";

export async function handleMoveSeating(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
}): Promise<Response> {
    let { formData, prisma, restaurantId } = args;

    let fromTableId = String(formData.get("fromTableId") ?? "").trim();
    let toTableId = String(formData.get("toTableId") ?? "").trim();
    let toSectionId = String(formData.get("toSectionId") ?? "").trim();

    let fieldErrors: Record<string, string> = {};
    if (!fromTableId) fieldErrors.fromTableId = "Missing from table";
    if (!toTableId) fieldErrors.toTableId = "Missing to table";
    if (!toSectionId) fieldErrors.toSectionId = "Missing destination";
    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    if (fromTableId === toTableId) {
        return Response.json(
            { ok: false, formError: "Pick a different table" },
            { status: 400 },
        );
    }

    try {
        let toSection = await prisma.floorplanSection.findFirst({
            where: { id: toSectionId, floorplan: { restaurantId } },
            select: { id: true, floorplanId: true, serverId: true },
        });
        if (!toSection) throw new DomainError("Destination section not found");

        let movedPartySize: number | null = null;
        let fromTableNumber: number | null = null;
        let toTableNumber: number | null = null;
        let movedSeatingId: string | null = null;

        await prisma.$transaction(async (tx: any) => {
            let [fromTable, toTable] = await Promise.all([
                tx.table.findFirst({
                    where: { id: fromTableId, restaurantId },
                    select: {
                        id: true,
                        status: true,
                        seatedAt: true,
                        seatedPartySize: true,
                        tableNumber: true,
                    },
                }),
                tx.table.findFirst({
                    where: { id: toTableId, restaurantId },
                    select: {
                        id: true,
                        status: true,
                        tableNumber: true,
                    },
                }),
            ]);

            if (!fromTable) throw new DomainError("From table not found");
            if (!toTable) throw new DomainError("To table not found");

            if (fromTable.status !== TableStatus.SEATED) {
                throw new DomainError("That table is not seated");
            }

            fromTableNumber = Number((fromTable as any).tableNumber ?? 0) || 0;
            toTableNumber = Number((toTable as any).tableNumber ?? 0) || 0;
            movedPartySize = Number((fromTable as any).seatedPartySize ?? 0);

            if (toTable.status === TableStatus.SEATED) {
                throw new DomainError("That table is sat");
            }
            if (toTable.status === TableStatus.DISABLED) {
                throw new DomainError("That table is disabled");
            }
            if (toTable.status === TableStatus.DIRTY) {
                throw new DomainError("That table is dirty");
            }
            if (
                toTable.status !== TableStatus.AVAILABLE &&
                toTable.status !== TableStatus.ON_HOLD
            ) {
                throw new DomainError("That table cannot be used");
            }

            let seating = await tx.tableSeating.findFirst({
                where: {
                    restaurantId,
                    tableId: fromTableId,
                    endedAt: null,
                },
                orderBy: [{ seatedAt: "desc" }],
                select: { id: true, partySize: true, seatedAt: true },
            });
            if (!seating) {
                throw new DomainError("No active seating found for that table");
            }

            movedSeatingId = String((seating as any).id);

            let existingTo = await tx.tableSeating.findFirst({
                where: { restaurantId, tableId: toTableId, endedAt: null },
                select: { id: true },
            });
            if (existingTo) {
                throw new DomainError(
                    "That table already has an active seating",
                );
            }

            let now = new Date();
            let partySize = Number(seating.partySize);

            await tx.tableSeating.update({
                where: { id: seating.id },
                data: {
                    tableId: toTableId,
                    serverId: toSection.serverId
                        ? String(toSection.serverId)
                        : null,
                },
            });

            await Promise.all([
                tx.table.update({
                    where: { id: fromTableId },
                    data: {
                        status: TableStatus.AVAILABLE,
                        seatedAt: null,
                        seatedPartySize: null,
                    },
                }),
                tx.table.update({
                    where: { id: toTableId },
                    data: {
                        status: TableStatus.SEATED,
                        seatedAt: seating.seatedAt,
                        seatedPartySize: partySize,
                    },
                }),
            ]);

            // If the source table was temp into another section temporarily,
            // returning it to AVAILABLE should end any active assignment.
            try {
                let tempDelegate = (tx as any).tempTableAssignment;
                if (
                    tempDelegate &&
                    typeof tempDelegate.updateMany === "function"
                ) {
                    let restoreToStatus: string | null = null;
                    try {
                        if (typeof tempDelegate.findFirst === "function") {
                            let active = await tempDelegate.findFirst({
                                where: {
                                    restaurantId,
                                    floorplanId: String(toSection.floorplanId),
                                    tableId: fromTableId,
                                    endedAt: null,
                                },
                                orderBy: { createdAt: "desc" },
                                select: { restoreToStatus: true },
                            });
                            if (active?.restoreToStatus) {
                                restoreToStatus = String(
                                    (active as any).restoreToStatus,
                                );
                            }
                        }
                    } catch {
                        restoreToStatus = null;
                    }

                    await tempDelegate.updateMany({
                        where: {
                            restaurantId,
                            floorplanId: String(toSection.floorplanId),
                            tableId: fromTableId,
                            endedAt: null,
                        },
                        data: { endedAt: now },
                    });

                    if (restoreToStatus) {
                        await tx.table.update({
                            where: { id: fromTableId },
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
                                    tableId: fromTableId,
                                    fromStatus: TableStatus.AVAILABLE,
                                    toStatus: restoreToStatus as any,
                                    occurredAt: now,
                                    partySize,
                                    notes: "Restore temp borrow status",
                                    seatingId: seating.id,
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

            // Record status events for audit/history.
            try {
                await tx.tableStatusEvent.createMany({
                    data: [
                        {
                            restaurantId,
                            tableId: fromTableId,
                            fromStatus: TableStatus.SEATED,
                            toStatus: TableStatus.AVAILABLE,
                            occurredAt: now,
                            partySize,
                            notes: "Moved seating",
                            seatingId: seating.id,
                        },
                        {
                            restaurantId,
                            tableId: toTableId,
                            fromStatus: toTable.status,
                            toStatus: TableStatus.SEATED,
                            occurredAt: now,
                            partySize,
                            notes: "Moved seating",
                            seatingId: seating.id,
                        },
                    ],
                });
            } catch {
                // ignore
            }
        });

        // Create an explicit dashboard action so History can show move events.
        try {
            await createDashboardAction(prisma, {
                restaurantId,
                floorplanId: String(toSection.floorplanId),
                kind: "move-seating",
                label: `Moved seating: Table ${fromTableNumber ?? "?"} → Table ${toTableNumber ?? "?"}`,
                meta: {
                    fromTableId,
                    toTableId,
                    tableId: toTableId,
                    fromTableNumber,
                    toTableNumber,
                    partySize: movedPartySize,
                    serverId: toSection.serverId
                        ? String(toSection.serverId)
                        : null,
                },
            });
        } catch {
            // ignore
        }

        // Update section-level sat/guest counts and timers:
        // treat this as an "undo" of the original seat action (remove credit from
        // the old section) and a new "seat-table" action in the destination section
        // (add credit to the new section + reset the section timer).
        try {
            if (prisma.dashboardAction && movedSeatingId) {
                let now = new Date();

                let priorSeatAction = await prisma.dashboardAction.findFirst({
                    where: {
                        restaurantId,
                        floorplanId: String(toSection.floorplanId),
                        kind: "seat-table",
                        undoneAt: null,
                        meta: {
                            path: ["seatingId"],
                            equals: movedSeatingId,
                        },
                    },
                    orderBy: [{ createdAt: "desc" }],
                    select: { id: true, meta: true },
                });

                if (priorSeatAction) {
                    await prisma.dashboardAction.update({
                        where: { id: String(priorSeatAction.id) },
                        data: { undoneAt: now },
                        select: { id: true },
                    });

                    let linkedWaitlistEntryId: string | null = null;
                    try {
                        let linked = await prisma.waitlistEntry.findFirst({
                            where: { restaurantId, seatingId: movedSeatingId },
                            select: { id: true },
                        });
                        linkedWaitlistEntryId = linked?.id
                            ? String((linked as any).id)
                            : null;
                    } catch {
                        linkedWaitlistEntryId = null;
                    }

                    let partySize =
                        typeof movedPartySize === "number" &&
                        Number.isFinite(movedPartySize)
                            ? movedPartySize
                            : 0;

                    await createDashboardAction(prisma, {
                        restaurantId,
                        floorplanId: String(toSection.floorplanId),
                        kind: "seat-table",
                        label: `Sat Table ${toTableNumber ?? "?"} (party ${partySize})`,
                        meta: {
                            seatingId: movedSeatingId,
                            tableId: toTableId,
                            partySize,
                            waitlistEntryId: linkedWaitlistEntryId,
                            serverId: toSection.serverId
                                ? String(toSection.serverId)
                                : null,
                            sectionId: String(toSectionId),
                        },
                    });
                }
            }
        } catch {
            // ignore
        }

        return Response.json({ ok: true } as const);
    } catch (error) {
        let message =
            error instanceof DomainError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "Could not move table";
        return Response.json(
            { ok: false, formError: message },
            { status: 400 },
        );
    }
}

export async function handleSeatTable(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
    floorplanId: string | null;
}): Promise<Response> {
    let { formData, prisma, restaurantId, floorplanId } = args;

    let tableId = String(formData.get("tableId") ?? "").trim();
    let partySizeRaw = String(formData.get("partySize") ?? "").trim();
    let waitlistEntryId = String(formData.get("waitlistEntryId") ?? "").trim();
    let sectionId = String(formData.get("sectionId") ?? "").trim();

    let fieldErrors: Record<string, string> = {};
    if (!tableId) fieldErrors.tableId = "Missing table";
    if (!partySizeRaw) fieldErrors.partySize = "Party size is required";
    if (partySizeRaw && !/^\d+$/.test(partySizeRaw)) {
        fieldErrors.partySize = "Party size must be a whole number";
    }
    let partySize = /^\d+$/.test(partySizeRaw)
        ? Number.parseInt(partySizeRaw, 10)
        : Number.NaN;
    if (Number.isFinite(partySize) && partySize <= 0) {
        fieldErrors.partySize = "Party size must be > 0";
    }

    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    try {
        let serverId: string | undefined;
        if (sectionId) {
            try {
                let section = await prisma.floorplanSection.findFirst({
                    where: { id: sectionId, floorplan: { restaurantId } },
                    select: { id: true, serverId: true, floorplanId: true },
                });

                if (section) {
                    let membership =
                        await prisma.floorplanSectionTable.findFirst({
                            where: {
                                floorplanSectionId: sectionId,
                                tableId,
                            },
                            select: { tableId: true },
                        });

                    if (!membership) {
                        // Allow temp/temp tables to count as section membership.
                        try {
                            let temp =
                                await prisma.tempTableAssignment.findFirst({
                                    where: {
                                        restaurantId,
                                        floorplanId: String(
                                            section.floorplanId,
                                        ),
                                        tableId,
                                        toSectionId: sectionId,
                                        endedAt: null,
                                    },
                                    select: { id: true },
                                });
                            if (temp) {
                                membership = { tableId };
                            }
                        } catch {
                            // ignore
                        }
                    }
                    if (membership && section.serverId) {
                        serverId = String(section.serverId);
                    }
                }
            } catch {
                serverId = undefined;
            }
        }

        let result = await seatTable({
            restaurantId,
            tableId,
            partySize,
            waitlistEntryId: waitlistEntryId || undefined,
            serverId,
        });

        try {
            let tableRow = await prisma.table.findFirst({
                where: { id: tableId, restaurantId },
                select: { tableNumber: true },
            });

            let label = `Sat Table ${Number(tableRow?.tableNumber ?? 0)} (party ${partySize})`;
            await createDashboardAction(prisma, {
                restaurantId,
                floorplanId,
                kind: "seat-table",
                label,
                meta: {
                    seatingId: String((result as any)?.seatingId ?? ""),
                    tableId,
                    partySize,
                    waitlistEntryId: waitlistEntryId || null,
                    serverId: serverId ?? null,
                    sectionId: sectionId ? String(sectionId) : null,
                },
            });
        } catch {
            // ignore
        }
        return Response.json({ ok: true } as const);
    } catch (error) {
        let message =
            error instanceof DomainError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "Could not seat table";
        return Response.json(
            { ok: false, formError: message },
            { status: 400 },
        );
    }
}

export async function handleSeatWaitlistCombined(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
    floorplanId: string | null;
}): Promise<Response> {
    let { formData, prisma, restaurantId, floorplanId } = args;

    let waitlistEntryId = String(formData.get("waitlistEntryId") ?? "").trim();
    let partySizeRaw = String(formData.get("partySize") ?? "").trim();
    let primaryTableId = String(formData.get("primaryTableId") ?? "").trim();
    let extraTableIdsRaw = String(formData.get("extraTableIds") ?? "").trim();
    let sectionId = String(formData.get("sectionId") ?? "").trim();

    let fieldErrors: Record<string, string> = {};
    if (!waitlistEntryId) fieldErrors.waitlistEntryId = "Missing guest";
    if (!primaryTableId) fieldErrors.primaryTableId = "Missing table";
    if (!partySizeRaw) fieldErrors.partySize = "Party size is required";
    if (partySizeRaw && !/^\d+$/.test(partySizeRaw)) {
        fieldErrors.partySize = "Party size must be a whole number";
    }
    let partySize = /^\d+$/.test(partySizeRaw)
        ? Number.parseInt(partySizeRaw, 10)
        : Number.NaN;
    if (Number.isFinite(partySize) && partySize <= 0) {
        fieldErrors.partySize = "Party size must be > 0";
    }

    let extraTableIds = extraTableIdsRaw
        ? extraTableIdsRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
        : [];

    if (extraTableIds.includes(primaryTableId)) {
        fieldErrors.extraTableIds = "Invalid tables";
    }

    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    try {
        let now = new Date();

        let primarySeatingId: string | null = null;
        let extraSeatingIds: string[] = [];
        let primaryTableNumber: number | null = null;
        let extraTableChanges: Array<{
            tableId: string;
            tableNumber: number;
            beforeStatus: string;
            afterStatus: string;
        }> = [];

        await prisma.$transaction(async (tx: any) => {
            let waitlistEntry = await tx.waitlistEntry.findFirst({
                where: {
                    restaurantId,
                    id: waitlistEntryId,
                    removedAt: null,
                },
                select: {
                    id: true,
                    status: true,
                },
            });

            if (!waitlistEntry) throw new DomainError("Guest not found");
            if (waitlistEntry.status === WaitlistStatus.CALL_AHEAD) {
                throw new DomainError("Guest has not arrived");
            }
            if (waitlistEntry.status === WaitlistStatus.SEATED) {
                throw new DomainError("Guest is already sat");
            }
            if (
                waitlistEntry.status === WaitlistStatus.CANCELLED ||
                waitlistEntry.status === WaitlistStatus.NO_SHOW
            ) {
                throw new DomainError("Guest is not seatable");
            }

            // Primary table seating (mirrors seatTable logic)
            let primary = await tx.table.findFirst({
                where: {
                    restaurantId,
                    id: primaryTableId,
                },
                select: {
                    id: true,
                    status: true,
                    capacity: true,
                    updatedAt: true,
                },
            });
            if (!primary) throw new DomainError("Table not found");
            if (primary.status === TableStatus.DISABLED) {
                throw new DomainError("Table is disabled");
            }
            if (primary.status === TableStatus.SEATED) {
                throw new DomainError("Table is already sat");
            }
            if (primary.status === TableStatus.DIRTY) {
                throw new DomainError("Table is dirty");
            }
            if (primary.status === TableStatus.ON_HOLD) {
                throw new DomainError("Table is on hold");
            }

            let serverId: string | null = null;
            if (sectionId) {
                try {
                    let section = await tx.floorplanSection.findFirst({
                        where: {
                            id: sectionId,
                            floorplan: { restaurantId },
                        },
                        select: {
                            id: true,
                            serverId: true,
                            floorplanId: true,
                        },
                    });

                    if (section) {
                        let membership =
                            await tx.floorplanSectionTable.findFirst({
                                where: {
                                    floorplanSectionId: sectionId,
                                    tableId: primaryTableId,
                                },
                                select: { tableId: true },
                            });

                        if (!membership) {
                            // Allow temp/temp tables to count as section membership.
                            let temp = await tx.tempTableAssignment.findFirst({
                                where: {
                                    restaurantId,
                                    floorplanId: String(section.floorplanId),
                                    tableId: primaryTableId,
                                    toSectionId: sectionId,
                                    endedAt: null,
                                },
                                select: { id: true },
                            });
                            if (temp) {
                                membership = { tableId: primaryTableId };
                            }
                        }
                        if (membership && section.serverId) {
                            serverId = String(section.serverId);
                        }
                    }
                } catch {
                    serverId = null;
                }
            }

            // Split party size across the selected tables in order.
            let remaining = partySize;
            let primaryCapacity = Number((primary as any).capacity ?? 0);
            let primaryAssigned = Math.min(
                remaining,
                Number.isFinite(primaryCapacity) && primaryCapacity > 0
                    ? primaryCapacity
                    : remaining,
            );
            remaining -= primaryAssigned;

            let seating = await tx.tableSeating.create({
                data: {
                    restaurantId,
                    tableId: primaryTableId,
                    partySize: primaryAssigned,
                    seatedAt: now,
                    notes: "Combined seating",
                    serverId,
                },
                select: { id: true, seatedAt: true },
            });

            primarySeatingId = String(seating.id);

            let primaryUpdated = await tx.table.updateMany({
                where: {
                    id: primaryTableId,
                    restaurantId,
                    updatedAt: primary.updatedAt,
                },
                data: {
                    status: TableStatus.SEATED,
                    seatedAt: seating.seatedAt,
                    seatedPartySize: primaryAssigned,
                },
            });

            if (primaryUpdated.count !== 1) {
                throw new DomainError("Table changed; retry");
            }

            await tx.tableStatusEvent.create({
                data: {
                    restaurantId,
                    tableId: primaryTableId,
                    fromStatus: primary.status,
                    toStatus: TableStatus.SEATED,
                    occurredAt: now,
                    partySize: primaryAssigned,
                    notes: "Combined seating",
                    seatingId: seating.id,
                },
            });

            await tx.waitlistEntry.update({
                where: { id: waitlistEntryId },
                data: {
                    status: WaitlistStatus.SEATED,
                    seatedAt: now,
                    removedAt: now,
                    seatingId: seating.id,
                },
            });

            // Seat extra tables until the party is fully assigned.
            for (let tableId of extraTableIds) {
                if (remaining <= 0) break;

                let table = await tx.table.findFirst({
                    where: { restaurantId, id: tableId },
                    select: {
                        id: true,
                        status: true,
                        capacity: true,
                        updatedAt: true,
                    },
                });
                if (!table) throw new DomainError("Table not found");
                if (table.status === TableStatus.SEATED) {
                    throw new DomainError("A selected table is sat");
                }
                if (table.status === TableStatus.DISABLED) {
                    throw new DomainError("A selected table is disabled");
                }
                if (table.status === TableStatus.DIRTY) {
                    throw new DomainError("A selected table is dirty");
                }
                if (table.status === TableStatus.ON_HOLD) {
                    throw new DomainError("A selected table is on hold");
                }

                let cap = Number((table as any).capacity ?? 0);
                let assign = Math.min(
                    remaining,
                    Number.isFinite(cap) && cap > 0 ? cap : remaining,
                );
                remaining -= assign;

                let extraSeating = await tx.tableSeating.create({
                    data: {
                        restaurantId,
                        tableId,
                        partySize: assign,
                        seatedAt: now,
                        notes: "Combined seating",
                        serverId: null,
                    },
                    select: { id: true, seatedAt: true },
                });
                extraSeatingIds.push(String(extraSeating.id));

                let updated = await tx.table.updateMany({
                    where: {
                        id: tableId,
                        restaurantId,
                        updatedAt: table.updatedAt,
                    },
                    data: {
                        status: TableStatus.SEATED,
                        seatedAt: extraSeating.seatedAt,
                        seatedPartySize: assign,
                    },
                });

                if (updated.count !== 1) {
                    throw new DomainError("Table changed; retry");
                }

                await tx.tableStatusEvent.create({
                    data: {
                        restaurantId,
                        tableId,
                        fromStatus: table.status,
                        toStatus: TableStatus.SEATED,
                        occurredAt: now,
                        partySize: assign,
                        notes: "Combined seating",
                        seatingId: extraSeating.id,
                    },
                });

                try {
                    let tn = await tx.table.findFirst({
                        where: { restaurantId, id: tableId },
                        select: { tableNumber: true },
                    });
                    extraTableChanges.push({
                        tableId: String(tableId),
                        tableNumber: Number((tn as any)?.tableNumber ?? 0),
                        beforeStatus: String(table.status),
                        afterStatus: String(TableStatus.SEATED),
                    });
                } catch {
                    extraTableChanges.push({
                        tableId: String(tableId),
                        tableNumber: 0,
                        beforeStatus: String(table.status),
                        afterStatus: String(TableStatus.SEATED),
                    });
                }
            }

            if (remaining > 0) {
                throw new DomainError("Not enough seats selected");
            }

            try {
                let tn = await tx.table.findFirst({
                    where: { restaurantId, id: primaryTableId },
                    select: { tableNumber: true },
                });
                primaryTableNumber = Number((tn as any)?.tableNumber ?? 0);
            } catch {
                primaryTableNumber = null;
            }
        });

        try {
            let label = `Combined seating (Table ${primaryTableNumber ?? 0}, party ${partySize})`;
            await createDashboardAction(prisma, {
                restaurantId,
                floorplanId,
                kind: "seat-waitlist-combined",
                label,
                meta: {
                    seatingId: primarySeatingId,
                    extraSeatingIds,
                    waitlistEntryId,
                    primaryTableId,
                    partySize,
                    extraTables: extraTableChanges,
                    sectionId: sectionId ? String(sectionId) : null,
                },
            });
        } catch {
            // ignore
        }

        return Response.json({ ok: true } as const);
    } catch (error) {
        let message =
            error instanceof DomainError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "Could not seat guest";
        return Response.json(
            { ok: false, formError: message },
            { status: 400 },
        );
    }
}
