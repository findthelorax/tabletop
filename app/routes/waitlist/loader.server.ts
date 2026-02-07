import type { Route } from "../+types/waitlist";

import { getPrisma } from "../../utils/db.server";
import { requireRestaurantId } from "../../utils/auth.server";
import { todayServiceDayLocal } from "../../utils/service-day";

import type { WaitlistItem, WaitlistLoaderData } from "./types";
import { average, isServiceDay, minutesBetween } from "./utils";

function todayServiceDay(): string {
    return todayServiceDayLocal();
}

export async function loader({
    request,
}: Route.LoaderArgs): Promise<WaitlistLoaderData> {
    let restaurantId = await requireRestaurantId(request);

    let items: WaitlistItem[] = [];
    let selectedServiceDay = todayServiceDay();
    let lunchAverageWaitMinutes: number | null = null;
    let dinnerAverageWaitMinutes: number | null = null;

    try {
        let prisma = getPrisma();

        let url = new URL(request.url);
        let requested = url.searchParams.get("date")?.trim();
        if (requested && isServiceDay(requested))
            selectedServiceDay = requested;

        let rows = await prisma.waitlistEntry.findMany({
            where: {
                restaurantId,
                serviceDay: selectedServiceDay,
            },
            orderBy: [{ createdAt: "asc" }],
            select: {
                id: true,
                partyName: true,
                partySize: true,
                phoneNumber: true,
                status: true,
                isCallAhead: true,
                quotedWaitMinutes: true,
                notes: true,
                preferredTable: {
                    select: {
                        tableNumber: true,
                    },
                },
                waitingStartedAt: true,
                createdAt: true,
                removedAt: true,
                seatedAt: true,
                seating: {
                    select: {
                        table: {
                            select: {
                                tableNumber: true,
                                label: true,
                            },
                        },
                    },
                },
            },
        });

        items = rows.map((row: any) => {
            let seatedTableLabel = row.seating?.table
                ? row.seating.table.label
                    ? row.seating.table.label
                    : `Table ${row.seating.table.tableNumber}`
                : null;

            let waitingStartedAtIso = row.waitingStartedAt
                ? row.waitingStartedAt.toISOString()
                : null;
            let createdAtIso = row.createdAt.toISOString();
            let seatedAtIso = row.seatedAt ? row.seatedAt.toISOString() : null;
            let removedAtIso = row.removedAt
                ? row.removedAt.toISOString()
                : null;

            let preferredTableNumber =
                row.preferredTable?.tableNumber != null
                    ? Number(row.preferredTable.tableNumber)
                    : null;

            // Wait time: prefer actual seat time, otherwise time until removed.
            let waitMinutes =
                minutesBetween(seatedAtIso, waitingStartedAtIso) ??
                minutesBetween(removedAtIso, waitingStartedAtIso);

            // Meal period is determined by seatedAt time.
            let mealPeriod: "lunch" | "dinner" | null = null;
            if (seatedAtIso) {
                let h = new Date(seatedAtIso).getHours();
                if (h >= 11 && h < 16) mealPeriod = "lunch";
                else if (h >= 16 && h < 24) mealPeriod = "dinner";
            }

            return {
                id: row.id,
                partyName: row.partyName,
                partySize: row.partySize,
                phoneNumber: row.phoneNumber,
                status: row.status,
                isCallAhead: row.isCallAhead,
                quotedWaitMinutes: row.quotedWaitMinutes,
                notes: row.notes,
                preferredTableNumber,
                waitingStartedAt: waitingStartedAtIso,
                createdAt: createdAtIso,
                removedAt: removedAtIso,
                seatedAt: seatedAtIso,
                seatedTableLabel,
                waitMinutes,
                mealPeriod,
            } satisfies WaitlistItem;
        });

        let lunchWaits = items
            .filter(
                (i) =>
                    i.status === "SEATED" &&
                    i.mealPeriod === "lunch" &&
                    typeof i.waitMinutes === "number",
            )
            .map((i) => i.waitMinutes as number);

        let dinnerWaits = items
            .filter(
                (i) =>
                    i.status === "SEATED" &&
                    i.mealPeriod === "dinner" &&
                    typeof i.waitMinutes === "number",
            )
            .map((i) => i.waitMinutes as number);

        lunchAverageWaitMinutes = average(lunchWaits);
        dinnerAverageWaitMinutes = average(dinnerWaits);
    } catch {
        // If DB isn't configured/available, render an empty report.
        items = [];
    }

    return {
        items,
        selectedServiceDay,
        lunchAverageWaitMinutes,
        dinnerAverageWaitMinutes,
    };
}
