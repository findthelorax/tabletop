import { getPrisma } from "../../utils/db.server";

import { DomainError } from "./errors";
import { TableStatus, WaitlistStatus } from "./prisma-enums";

type SeatTableInput = {
    restaurantId: string;
    tableId: string;
    partySize: number;
    waitlistEntryId?: string;
    notes?: string;
    serverId?: string;
};

/**
 * Seats a table:
 * - creates TableSeating
 * - sets Table.status=SEATED, Table.seatedAt, Table.seatedPartySize
 * - writes TableStatusEvent (fromStatus -> SEATED) linked to the seating
 * - optionally links a WaitlistEntry (marks it SEATED)
 */
export async function seatTable(input: SeatTableInput) {
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
        if (table.status === TableStatus.DISABLED)
            throw new DomainError("Table is disabled");
        if (table.status === TableStatus.SEATED)
            throw new DomainError("Table is already seated");

        if (input.partySize <= 0)
            throw new DomainError("Party size must be > 0");

        if (input.waitlistEntryId) {
            let entry = await tx.waitlistEntry.findFirst({
                where: {
                    id: input.waitlistEntryId,
                    restaurantId: input.restaurantId,
                },
                select: {
                    id: true,
                    status: true,
                },
            });

            if (!entry) throw new DomainError("Waitlist entry not found");
            if (
                entry.status === WaitlistStatus.CANCELLED ||
                entry.status === WaitlistStatus.NO_SHOW ||
                entry.status === WaitlistStatus.SEATED
            ) {
                throw new DomainError("Waitlist entry is not seatable");
            }
        }

        let serverId: string | null | undefined = undefined;
        if (input.serverId) {
            try {
                let serverDelegate = (tx as any).server;
                if (
                    serverDelegate &&
                    typeof serverDelegate.findFirst === "function"
                ) {
                    let server = await serverDelegate.findFirst({
                        where: {
                            id: input.serverId,
                            restaurantId: input.restaurantId,
                        },
                        select: { id: true },
                    });
                    serverId = server ? input.serverId : null;
                }
            } catch {
                serverId = undefined;
            }
        }

        let seating = await (tx as any).tableSeating.create({
            data: {
                restaurantId: input.restaurantId,
                tableId: input.tableId,
                partySize: input.partySize,
                seatedAt: now,
                notes: input.notes,
                serverId,
            },
            select: {
                id: true,
                seatedAt: true,
            },
        });

        // Optimistic concurrency: only succeed if nobody changed the row since we read it.
        let updated = await tx.table.updateMany({
            where: {
                id: input.tableId,
                restaurantId: input.restaurantId,
                updatedAt: table.updatedAt,
            },
            data: {
                status: TableStatus.SEATED,
                seatedAt: seating.seatedAt,
                seatedPartySize: input.partySize,
            },
        });

        if (updated.count !== 1) throw new DomainError("Table changed; retry");

        await tx.tableStatusEvent.create({
            data: {
                restaurantId: input.restaurantId,
                tableId: input.tableId,
                fromStatus: table.status,
                toStatus: TableStatus.SEATED,
                occurredAt: now,
                partySize: input.partySize,
                notes: input.notes,
                seatingId: seating.id,
            },
        });

        if (input.waitlistEntryId) {
            await tx.waitlistEntry.update({
                where: { id: input.waitlistEntryId },
                data: {
                    status: WaitlistStatus.SEATED,
                    seatedAt: now,
                    removedAt: now,
                    seatingId: seating.id,
                },
            });
        }

        return { seatingId: seating.id };
    });
}
