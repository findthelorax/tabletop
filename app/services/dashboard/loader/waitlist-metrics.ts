import { WaitlistStatus, minutesBetween, round1 } from "../utils";

export async function loadWaitlistMetrics(args: {
    prisma: any;
    restaurantId: string;
    now: Date;
    serviceDay: string;
}): Promise<{
    openMenusGuests: number | null;
    waitingGuests: number | null;
    averageWaitMinutesLastHour: number | null;
    waitTimeMissMinutesDailyAverage: number | null;
}> {
    let { prisma, restaurantId, now, serviceDay } = args;

    let since8 = new Date(now.getTime() - 8 * 60 * 1000);
    let since60 = new Date(now.getTime() - 60 * 60 * 1000);

    let openMenusGuests: number | null = null;
    try {
        let openMenusAgg = await prisma.tableSeating.aggregate({
            where: {
                restaurantId,
                seatedAt: { gte: since8 },
                endedAt: null,
            },
            _sum: { partySize: true },
        });
        openMenusGuests = openMenusAgg?._sum?.partySize ?? 0;
    } catch {
        openMenusGuests = null;
    }

    let waitingGuests: number | null = null;
    try {
        let waitingAgg = await prisma.waitlistEntry.aggregate({
            where: {
                restaurantId,
                serviceDay,
                status: {
                    in: [
                        WaitlistStatus.CALL_AHEAD,
                        WaitlistStatus.WAITING,
                        WaitlistStatus.ARRIVED,
                    ],
                },
            },
            _sum: { partySize: true },
        });
        waitingGuests = waitingAgg?._sum?.partySize ?? 0;
    } catch {
        waitingGuests = null;
    }

    let seatedLastHour: any[] = [];
    try {
        seatedLastHour = await prisma.waitlistEntry.findMany({
            where: {
                restaurantId,
                serviceDay,
                status: WaitlistStatus.SEATED,
                seatedAt: { gte: since60 },
                waitingStartedAt: { not: null },
            },
            select: {
                seatedAt: true,
                waitingStartedAt: true,
                seatingId: true,
            },
        });
    } catch {
        seatedLastHour = [];
    }

    let waitMinutesLastHour = seatedLastHour
        .map((r: any) => {
            if (!r.seatedAt || !r.waitingStartedAt) return null;
            return minutesBetween(
                r.seatedAt as Date,
                r.waitingStartedAt as Date,
            );
        })
        .filter(
            (v: number | null): v is number =>
                typeof v === "number" && Number.isFinite(v) && v >= 0,
        );

    // Direct (non-waitlist) seatings should count as 0-minute waits and be
    // included in the average.
    let waitlistSeatingIds = new Set<string>();
    for (let r of seatedLastHour ?? []) {
        if (r && r.seatingId) {
            waitlistSeatingIds.add(String(r.seatingId));
        }
    }

    let directSeatingCountLastHour = 0;
    try {
        let seatingsLastHour = await prisma.tableSeating.findMany({
            where: {
                restaurantId,
                seatedAt: { gte: since60 },
            },
            select: { id: true },
        });

        for (let s of seatingsLastHour ?? []) {
            let seatingId = String((s as any).id);
            if (!waitlistSeatingIds.has(seatingId)) {
                directSeatingCountLastHour += 1;
            }
        }
    } catch {
        directSeatingCountLastHour = 0;
    }

    let totalWaitMinutesLastHour = waitMinutesLastHour.reduce(
        (a: number, b: number) => a + b,
        0,
    );

    let totalSeatedCountLastHour =
        waitMinutesLastHour.length + directSeatingCountLastHour;

    let averageWaitMinutesLastHour =
        totalSeatedCountLastHour === 0
            ? null
            : round1(totalWaitMinutesLastHour / totalSeatedCountLastHour);

    let seatedWithEstimateToday: any[] = [];
    try {
        seatedWithEstimateToday = await prisma.waitlistEntry.findMany({
            where: {
                restaurantId,
                serviceDay,
                status: WaitlistStatus.SEATED,
                quotedWaitMinutes: { not: null },
                seatedAt: { not: null },
                waitingStartedAt: { not: null },
            },
            select: {
                seatedAt: true,
                waitingStartedAt: true,
                quotedWaitMinutes: true,
            },
        });
    } catch {
        seatedWithEstimateToday = [];
    }

    let missMinutes = seatedWithEstimateToday
        .map((r: any) => {
            if (!r.seatedAt || !r.waitingStartedAt) return null;
            if (typeof r.quotedWaitMinutes !== "number") return null;
            let actual = minutesBetween(
                r.seatedAt as Date,
                r.waitingStartedAt as Date,
            );
            if (!Number.isFinite(actual) || actual < 0) return null;
            return actual - (r.quotedWaitMinutes as number);
        })
        .filter(
            (v: number | null): v is number =>
                typeof v === "number" && Number.isFinite(v),
        );

    let waitTimeMissMinutesDailyAverage =
        missMinutes.length === 0
            ? null
            : round1(
                  missMinutes.reduce((a: number, b: number) => a + b, 0) /
                      missMinutes.length,
              );

    return {
        openMenusGuests,
        waitingGuests,
        averageWaitMinutesLastHour,
        waitTimeMissMinutesDailyAverage,
    };
}
