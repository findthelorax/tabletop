import {
    serviceDayEndLocal,
    serviceDayStartLocal,
    todayServiceDayLocal,
} from "../../../utils/service-day";
import { DomainError } from "../../table-management.server";
import { TableStatus, WaitlistStatus } from "../utils";

export async function handleUndoSeating(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
}): Promise<Response> {
    let { formData, prisma, restaurantId } = args;

    let seatingId = String(formData.get("seatingId") ?? "").trim();

    let fieldErrors: Record<string, string> = {};
    if (!seatingId) fieldErrors.seatingId = "Missing seating";
    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    try {
        let now = new Date();
        let serviceDay = todayServiceDayLocal(now);
        let dayStart = serviceDayStartLocal(serviceDay);
        let dayEnd = serviceDayEndLocal(serviceDay);

        await prisma.$transaction(async (tx: any) => {
            let seating = await tx.tableSeating.findFirst({
                where: { id: seatingId, restaurantId },
                select: { id: true, tableId: true, seatedAt: true },
            });

            if (!seating) {
                throw new DomainError("Seating not found");
            }

            // Only allow undoing seatings from today (safety guard).
            if (
                !seating.seatedAt ||
                seating.seatedAt < dayStart ||
                seating.seatedAt >= dayEnd
            ) {
                throw new DomainError("Only today's seatings can be undone");
            }

            let table = await tx.table.findFirst({
                where: { id: seating.tableId, restaurantId },
                select: { status: true },
            });

            if (!table) throw new DomainError("Table not found");
            if (table.status === TableStatus.SEATED) {
                throw new DomainError(
                    "Clear the table first, then undo the seating",
                );
            }

            // Only allow undoing the most recent seating for that table.
            let latest = await tx.tableSeating.findFirst({
                where: { restaurantId, tableId: seating.tableId },
                orderBy: [{ seatedAt: "desc" }],
                select: { id: true },
            });
            if (!latest || String(latest.id) !== seatingId) {
                throw new DomainError(
                    "That is not the latest seating for this table",
                );
            }

            // If this seating is linked to a waitlist entry, restore it to WAITING.
            let linked = await tx.waitlistEntry.findFirst({
                where: { restaurantId, seatingId },
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

            await tx.tableSeating.delete({ where: { id: seatingId } });
        });

        return Response.json({ ok: true } as const);
    } catch (error) {
        let message =
            error instanceof DomainError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "Could not undo seating";
        return Response.json(
            { ok: false, formError: message },
            { status: 400 },
        );
    }
}
