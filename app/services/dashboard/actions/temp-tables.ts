import { DomainError } from "../../table-management.server";
import { TableStatus, createDashboardAction } from "../utils";

export async function handleAddTempTable(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
}): Promise<Response> {
    let { formData, prisma, restaurantId } = args;

    let toSectionId = String(formData.get("toSectionId") ?? "").trim();
    let tableId = String(formData.get("tableId") ?? "").trim();

    let fieldErrors: Record<string, string> = {};
    if (!toSectionId) fieldErrors.toSectionId = "Missing section";
    if (!tableId) fieldErrors.tableId = "Missing table";
    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    try {
        let section = await prisma.floorplanSection.findFirst({
            where: { id: toSectionId, floorplan: { restaurantId } },
            select: { id: true, floorplanId: true },
        });
        if (!section) throw new DomainError("Section not found");

        let table = await prisma.table.findFirst({
            where: { id: tableId, restaurantId },
            select: { id: true, status: true },
        });
        if (!table) throw new DomainError("Table not found");

        let fromLink = await prisma.floorplanSectionTable.findFirst({
            where: {
                tableId,
                floorplanSection: {
                    floorplanId: String(section.floorplanId),
                },
            },
            select: { floorplanSectionId: true },
        });

        // If the table exists on this floorplan, enforce the usual status rules.
        if (fromLink) {
            if (table.status === TableStatus.SEATED) {
                throw new DomainError("That table is sat");
            }
        }

        // If borrowing a table that isn't currently part of this floorplan,
        // reset it to AVAILABLE so switching floorplans doesn't drag status
        // along (e.g. sat/dirty/hold from a different layout).
        //
        // Special case: if it was DISABLED, remember that so we can restore
        // DISABLED when the temp borrow is ended.
        let restoreToStatus: string | null = null;
        let isOffFloorplanBorrow = !fromLink;

        let shouldAutoResetToAvailable =
            (isOffFloorplanBorrow && table.status !== TableStatus.AVAILABLE) ||
            table.status === TableStatus.DISABLED;

        if (shouldAutoResetToAvailable) {
            let fromStatus = String((table as any).status);
            if (table.status === TableStatus.DISABLED) {
                restoreToStatus = TableStatus.DISABLED;
            }

            try {
                let now = new Date();

                // If it was marked SEATED, end the active seating so future
                // seating/status logic doesn't think it's still occupied.
                if (table.status === TableStatus.SEATED) {
                    try {
                        let active = await prisma.tableSeating.findFirst({
                            where: {
                                restaurantId,
                                tableId,
                                endedAt: null,
                            },
                            orderBy: { seatedAt: "desc" },
                            select: { id: true },
                        });
                        if (active?.id) {
                            await prisma.tableSeating.update({
                                where: { id: String(active.id) },
                                data: { endedAt: now },
                            });
                        }
                    } catch {
                        // ignore
                    }
                }

                await prisma.table.update({
                    where: { id: tableId },
                    data: {
                        status: TableStatus.AVAILABLE,
                        seatedAt: null,
                        seatedPartySize: null,
                    },
                });

                try {
                    await prisma.tableStatusEvent.create({
                        data: {
                            restaurantId,
                            tableId,
                            fromStatus: fromStatus as any,
                            toStatus: TableStatus.AVAILABLE,
                            occurredAt: now,
                            notes:
                                table.status === TableStatus.DISABLED
                                    ? "Temp borrow auto-clean"
                                    : "Temp borrow auto-reset",
                        },
                    });
                } catch {
                    // ignore
                }
            } catch {
                // ignore
            }
        }

        let existing = await prisma.tempTableAssignment.findFirst({
            where: {
                restaurantId,
                floorplanId: String(section.floorplanId),
                tableId,
                endedAt: null,
            },
            select: { id: true, fromSectionId: true, toSectionId: true },
        });

        // If the table exists on this floorplan, borrow it from its home section.
        // Otherwise allow borrowing any restaurant table by treating it as coming
        // from outside the floorplan (fromSectionId defaults to toSectionId).
        let fromSectionId = fromLink
            ? String(fromLink.floorplanSectionId)
            : toSectionId;
        if (fromLink && fromSectionId === toSectionId) {
            throw new DomainError("That table is already in this section");
        }

        let assignmentId: string;
        let prevToSectionId: string | null = null;

        if (existing) {
            if (String(existing.toSectionId) === toSectionId) {
                throw new DomainError("That table is already in this section");
            }

            prevToSectionId = String(existing.toSectionId);
            assignmentId = String(existing.id);

            await prisma.tempTableAssignment.update({
                where: { id: existing.id },
                data: {
                    toSectionId,
                    ...(restoreToStatus ? { restoreToStatus } : null),
                },
                select: { id: true },
            });
        } else {
            let created = await prisma.tempTableAssignment.create({
                data: {
                    restaurantId,
                    floorplanId: String(section.floorplanId),
                    tableId,
                    fromSectionId,
                    toSectionId,
                    ...(restoreToStatus ? { restoreToStatus } : null),
                },
                select: { id: true },
            });
            assignmentId = String(created.id);
        }

        try {
            let tableRow = await prisma.table.findFirst({
                where: { id: tableId, restaurantId },
                select: { tableNumber: true },
            });
            let toSection = await prisma.floorplanSection.findFirst({
                where: { id: toSectionId, floorplan: { restaurantId } },
                select: { name: true },
            });

            let tableNumber = Number(tableRow?.tableNumber ?? 0);
            let toName = String(toSection?.name ?? "");
            let label = fromLink
                ? `Temp ${tableNumber} → ${toName}`
                : `Temp Table ${tableNumber} → ${toName}`;
            await createDashboardAction(prisma, {
                restaurantId,
                floorplanId: String(section.floorplanId),
                kind: "add-temp-table",
                label,
                meta: {
                    assignmentId,
                    tableId,
                    fromSectionId,
                    toSectionId,
                    ...(prevToSectionId
                        ? { prevToSectionId: String(prevToSectionId) }
                        : null),
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
                  : "Could not add temp table";
        return Response.json(
            { ok: false, formError: message },
            { status: 400 },
        );
    }
}
