import { DomainError } from "../../table-management.server";
import { TableStatus, createDashboardAction } from "../utils";

export async function handleSetSectionStatus(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
}): Promise<Response> {
    let { formData, prisma, restaurantId } = args;

    let sectionId = String(formData.get("sectionId") ?? "").trim();
    let toStatus = String(formData.get("toStatus") ?? "").trim();
    let scope = String(formData.get("scope") ?? "").trim();

    let fieldErrors: Record<string, string> = {};
    if (!sectionId) fieldErrors.sectionId = "Missing section";
    if (!toStatus) fieldErrors.toStatus = "Missing status";
    if (toStatus !== "AVAILABLE" && toStatus !== "DISABLED") {
        fieldErrors.toStatus = "Invalid status";
    }
    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    try {
        let now = new Date();

        let beforeSeatingByTableId = new Map<
            string,
            { seatedAt: string; partySize: number }
        >();

        let section = await prisma.floorplanSection.findFirst({
            where: { id: sectionId, floorplan: { restaurantId } },
            select: { id: true, name: true, floorplanId: true },
        });
        if (!section) throw new DomainError("Section not found");

        // If disabling an entire section, first return any temp-in tables by
        // cleaning them (AVAILABLE). Cleaning ends the temp assignment so they
        // go back to their home section.
        let tempInTableIds: string[] = [];
        if (toStatus === "DISABLED" && scope !== "available") {
            try {
                let tempIn = await prisma.tempTableAssignment.findMany({
                    where: {
                        restaurantId,
                        floorplanId: String(section.floorplanId),
                        toSectionId: sectionId,
                        endedAt: null,
                    },
                    select: { tableId: true },
                });
                tempInTableIds = (tempIn ?? []).map((a: any) =>
                    String(a.tableId),
                );
            } catch {
                tempInTableIds = [];
            }
        }

        let tempInTables: any[] = [];
        if (tempInTableIds.length > 0) {
            tempInTables = await prisma.table.findMany({
                where: {
                    restaurantId,
                    id: { in: tempInTableIds },
                },
                select: {
                    id: true,
                    tableNumber: true,
                    status: true,
                    updatedAt: true,
                },
            });
        }

        let links = await prisma.floorplanSectionTable.findMany({
            where: {
                floorplanSectionId: sectionId,
            },
            select: { tableId: true },
        });

        let tableIds = links.map((l: any) => String(l.tableId));
        let tables =
            tableIds.length === 0
                ? ([] as any[])
                : await prisma.table.findMany({
                      where: {
                          restaurantId,
                          id: { in: tableIds },
                      },
                      select: {
                          id: true,
                          tableNumber: true,
                          status: true,
                          updatedAt: true,
                      },
                  });

        if (tableIds.length === 0 && tempInTables.length === 0) {
            return Response.json({ ok: true } as const);
        }

        if (toStatus === "DISABLED" && scope === "available") {
            tables = (tables ?? []).filter(
                (t: any) => String((t as any).status) === "AVAILABLE",
            );
        }

        await prisma.$transaction(async (tx: any) => {
            // Return temp-in tables first (so they leave this section instead
            // of being disabled with it).
            for (let table of tempInTables) {
                let endedSeatingId: string | undefined;

                if (table.status === TableStatus.SEATED) {
                    let active = await tx.tableSeating.findFirst({
                        where: {
                            restaurantId,
                            tableId: table.id,
                            endedAt: null,
                        },
                        orderBy: { seatedAt: "desc" },
                        select: { id: true },
                    });

                    if (active) {
                        endedSeatingId = active.id;
                        await tx.tableSeating.update({
                            where: { id: active.id },
                            data: { endedAt: now },
                        });
                    }
                }

                let updated = await tx.table.updateMany({
                    where: {
                        id: table.id,
                        restaurantId,
                        updatedAt: table.updatedAt,
                    },
                    data: {
                        status: TableStatus.AVAILABLE,
                        seatedAt: null,
                        seatedPartySize: null,
                    },
                });

                if (updated.count !== 1) {
                    throw new DomainError("A table changed; retry");
                }

                await tx.tableStatusEvent.create({
                    data: {
                        restaurantId,
                        tableId: table.id,
                        fromStatus: table.status,
                        toStatus: TableStatus.AVAILABLE,
                        occurredAt: now,
                        notes: "Section bulk return temp",
                        seatingId: endedSeatingId,
                    },
                });

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
                                        floorplanId: String(
                                            section.floorplanId,
                                        ),
                                        toSectionId: sectionId,
                                        tableId: table.id,
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
                                floorplanId: String(section.floorplanId),
                                toSectionId: sectionId,
                                tableId: table.id,
                                endedAt: null,
                            },
                            data: { endedAt: now },
                        });

                        if (restoreToStatus) {
                            await tx.table.update({
                                where: { id: table.id },
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
                                        tableId: table.id,
                                        fromStatus: TableStatus.AVAILABLE,
                                        toStatus: restoreToStatus as any,
                                        occurredAt: now,
                                        notes: "Restore temp borrow status",
                                        seatingId: endedSeatingId,
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

            for (let table of tables) {
                let endedSeatingId: string | undefined;

                // If leaving SEATED, end the active seating (if any).
                if (table.status === TableStatus.SEATED) {
                    let active = await tx.tableSeating.findFirst({
                        where: {
                            restaurantId,
                            tableId: table.id,
                            endedAt: null,
                        },
                        orderBy: { seatedAt: "desc" },
                        select: { id: true, seatedAt: true, partySize: true },
                    });

                    if (active) {
                        endedSeatingId = active.id;
                        try {
                            let seatedAt = (active as any)
                                .seatedAt as Date | null;
                            let iso =
                                seatedAt instanceof Date &&
                                !Number.isNaN(seatedAt.getTime())
                                    ? seatedAt.toISOString()
                                    : now.toISOString();
                            beforeSeatingByTableId.set(String(table.id), {
                                seatedAt: iso,
                                partySize: Number(
                                    (active as any).partySize ?? 0,
                                ),
                            });
                        } catch {
                            // ignore
                        }
                        await tx.tableSeating.update({
                            where: { id: active.id },
                            data: { endedAt: now },
                        });
                    }
                }

                // Optimistic concurrency: only succeed if nobody changed it since we read.
                let updated = await tx.table.updateMany({
                    where: {
                        id: table.id,
                        restaurantId,
                        updatedAt: table.updatedAt,
                    },
                    data: {
                        status: toStatus,
                        seatedAt: null,
                        seatedPartySize: null,
                    },
                });

                if (updated.count !== 1) {
                    throw new DomainError("A table changed; retry");
                }

                await tx.tableStatusEvent.create({
                    data: {
                        restaurantId,
                        tableId: table.id,
                        fromStatus: table.status,
                        toStatus,
                        occurredAt: now,
                        notes: "Section bulk update",
                        seatingId: endedSeatingId,
                    },
                });
            }
        });

        try {
            let changes = (tables ?? []).map((t: any) => ({
                tableId: String(t.id),
                tableNumber: Number(t.tableNumber ?? 0),
                fromStatus: String(t.status),
                ...(String(t.status) === String(TableStatus.SEATED) &&
                beforeSeatingByTableId.has(String(t.id))
                    ? {
                          beforeSeating: beforeSeatingByTableId.get(
                              String(t.id),
                          ),
                      }
                    : null),
            }));

            if (changes.length === 0) {
                return Response.json({ ok: true } as const);
            }

            let label =
                toStatus === "AVAILABLE"
                    ? `Enabled section ${String(section.name)}`
                    : scope === "available"
                      ? `Disabled clean tables in ${String(section.name)}`
                      : `Disabled section ${String(section.name)}`;
            await createDashboardAction(prisma, {
                restaurantId,
                floorplanId: String(section.floorplanId),
                kind: "set-section-status",
                label,
                meta: {
                    sectionId,
                    sectionName: String(section.name),
                    toStatus,
                    scope: scope || undefined,
                    changes,
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
                  : "Could not update section";
        return Response.json(
            { ok: false, formError: message },
            { status: 400 },
        );
    }
}

export async function handleSetSectionServerId(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
}): Promise<Response> {
    let { formData, prisma, restaurantId } = args;

    if (!prisma.server) {
        return Response.json(
            {
                ok: false,
                formError:
                    "Servers are not available yet. Run `npm run db:generate` and restart `npm run dev` to load the updated Prisma Client.",
            },
            { status: 500 },
        );
    }

    let sectionId = String(formData.get("sectionId") ?? "").trim();
    let serverIdRaw = String(formData.get("serverId") ?? "").trim();
    let serverIdOrNull = serverIdRaw ? serverIdRaw : null;

    if (!sectionId) {
        return Response.json(
            { ok: false, formError: "Missing section" },
            { status: 400 },
        );
    }

    try {
        let section = await prisma.floorplanSection.findFirst({
            where: { id: sectionId, floorplan: { restaurantId } },
            select: {
                id: true,
                name: true,
                serverId: true,
                floorplanId: true,
            },
        });

        if (!section) {
            return Response.json(
                { ok: false, formError: "Unknown section" },
                { status: 400 },
            );
        }

        if (serverIdOrNull) {
            let server = await prisma.server.findFirst({
                where: { id: serverIdOrNull, restaurantId },
                select: { id: true },
            });
            if (!server) {
                return Response.json(
                    { ok: false, formError: "Unknown server" },
                    { status: 400 },
                );
            }
        }

        // Ensure the section belongs to the current restaurant via its floorplan.
        let updated = await prisma.floorplanSection.updateMany({
            where: {
                id: sectionId,
                floorplan: { restaurantId },
            },
            data: {
                serverId: serverIdOrNull,
                serverName: null,
            },
        });

        if (updated.count !== 1) {
            return Response.json(
                { ok: false, formError: "Unknown section" },
                { status: 400 },
            );
        }

        try {
            let label = serverIdOrNull
                ? `Assigned server for ${String(section.name)}`
                : `Cleared server for ${String(section.name)}`;
            await createDashboardAction(prisma, {
                restaurantId,
                floorplanId: String(section.floorplanId),
                kind: "set-section-server-id",
                label,
                meta: {
                    sectionId,
                    beforeServerId: section.serverId
                        ? String(section.serverId)
                        : null,
                    afterServerId: serverIdOrNull,
                },
            });
        } catch {
            // ignore
        }

        return Response.json({ ok: true } as const);
    } catch (error) {
        let message =
            error instanceof Error ? error.message : "Could not update section";
        return Response.json(
            { ok: false, formError: message },
            { status: 500 },
        );
    }
}
