import type { TableStatus as TableStatusType } from "@prisma/client";

import { getPrisma } from "../../utils/db.server";

import { DomainError } from "./errors";
import { TableStatus } from "./prisma-enums";

type SetTableStatusInput = {
    restaurantId: string;
    tableId: string;
    toStatus: Exclude<TableStatusType, "SEATED">;
    notes?: string;
};

/**
 * Changes a table status (non-seating):
 * - if leaving SEATED, ends the active TableSeating (endedAt)
 * - clears Table.seatedAt + Table.seatedPartySize (timer reset)
 * - sets Table.status = toStatus
 * - writes TableStatusEvent
 */
export async function setTableStatus(input: SetTableStatusInput) {
    let now = new Date();
    let prisma = getPrisma();

    return prisma.$transaction(async (tx: any) => {
        let table = await tx.table.findFirst({
            where: {
                id: input.tableId,
                restaurantId: input.restaurantId,
            },
            select: {
                id: true,
                status: true,
                updatedAt: true,
            },
        });

        if (!table) throw new DomainError("Table not found");
        let endedSeatingId: string | undefined;

        if (table.status === TableStatus.SEATED) {
            // End the most recent active seating (if any).
            let active = await tx.tableSeating.findFirst({
                where: {
                    restaurantId: input.restaurantId,
                    tableId: input.tableId,
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

        // Any non-SEATED status clears the timer fields.
        let updated = await tx.table.updateMany({
            where: {
                id: input.tableId,
                restaurantId: input.restaurantId,
                updatedAt: table.updatedAt,
            },
            data: {
                status: input.toStatus,
                seatedAt: null,
                seatedPartySize: null,
            },
        });

        if (updated.count !== 1) throw new DomainError("Table changed; retry");

        await tx.tableStatusEvent.create({
            data: {
                restaurantId: input.restaurantId,
                tableId: input.tableId,
                fromStatus: table.status,
                toStatus: input.toStatus,
                occurredAt: now,
                notes: input.notes,
                seatingId: endedSeatingId,
            },
        });

        // If this table was temp into another section temporarily,
        // return it to its home section once it's cleaned (AVAILABLE).
        if (input.toStatus === TableStatus.AVAILABLE) {
            try {
                let tempDelegate = (tx as any).tempTableAssignment;
                if (
                    tempDelegate &&
                    typeof tempDelegate.updateMany === "function"
                ) {
                    let restoreToStatus: string | null = null;
                    let fromSectionId: string | null = null;
                    let toSectionId: string | null = null;
                    try {
                        if (typeof tempDelegate.findFirst === "function") {
                            let active = await tempDelegate.findFirst({
                                where: {
                                    restaurantId: input.restaurantId,
                                    tableId: input.tableId,
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
                                toSectionId = String(
                                    (active as any).toSectionId,
                                );
                            }
                        }
                    } catch {
                        restoreToStatus = null;
                        fromSectionId = null;
                        toSectionId = null;
                    }

                    // If this is a temp table borrowed from *outside* the floorplan
                    // (fromSectionId === toSectionId), keep it in place when marked
                    // AVAILABLE so it doesn't disappear.
                    if (
                        fromSectionId &&
                        toSectionId &&
                        fromSectionId === toSectionId
                    ) {
                        return { ok: true } as const;
                    }

                    await tempDelegate.updateMany({
                        where: {
                            restaurantId: input.restaurantId,
                            tableId: input.tableId,
                            endedAt: null,
                        },
                        data: { endedAt: now },
                    });

                    if (restoreToStatus) {
                        // Restore status after ending the borrow (e.g. return to DISABLED).
                        // This happens after we set AVAILABLE so the "clean" action still
                        // serves as the return trigger.
                        await tx.table.update({
                            where: { id: input.tableId },
                            data: {
                                status: restoreToStatus as any,
                                seatedAt: null,
                                seatedPartySize: null,
                            },
                        });
                        try {
                            await tx.tableStatusEvent.create({
                                data: {
                                    restaurantId: input.restaurantId,
                                    tableId: input.tableId,
                                    fromStatus: TableStatus.AVAILABLE,
                                    toStatus: restoreToStatus as any,
                                    occurredAt: now,
                                    notes: "Restore temp borrow status",
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

        return { ok: true } as const;
    });
}
