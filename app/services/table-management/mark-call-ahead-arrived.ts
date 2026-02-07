import { getPrisma } from "../../utils/db.server";

import { DomainError } from "./errors";
import { WaitlistStatus } from "./prisma-enums";

type MarkCallAheadArrivedInput = {
    restaurantId: string;
    waitlistEntryId: string;
};

/**
 * Marks a call-ahead guest as arrived:
 * - sets arrivedAt
 * - sets waitingStartedAt (starts the wait timer)
 * - transitions status to WAITING
 */
export async function markCallAheadArrived(input: MarkCallAheadArrivedInput) {
    let now = new Date();
    let prisma = getPrisma();

    return prisma.$transaction(async (tx: any) => {
        let entry = await tx.waitlistEntry.findFirst({
            where: {
                id: input.waitlistEntryId,
                restaurantId: input.restaurantId,
            },
            select: {
                id: true,
                isCallAhead: true,
                status: true,
                waitingStartedAt: true,
            },
        });

        if (!entry) throw new DomainError("Waitlist entry not found");
        if (!entry.isCallAhead)
            throw new DomainError("Entry is not call-ahead");

        if (entry.status !== WaitlistStatus.CALL_AHEAD) {
            // Idempotency: if already started, allow a no-op.
            if (entry.waitingStartedAt) return { ok: true } as const;
            throw new DomainError("Call-ahead is not in CALL_AHEAD status");
        }

        await tx.waitlistEntry.update({
            where: { id: entry.id },
            data: {
                status: WaitlistStatus.WAITING,
                arrivedAt: now,
                waitingStartedAt: now,
            },
        });

        return { ok: true } as const;
    });
}
