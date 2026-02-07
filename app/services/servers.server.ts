import { getPrisma } from "../utils/db.server";
import {
    todayServiceDayLocal,
    serviceDayStartLocal,
    serviceDayEndLocal,
} from "../utils/service-day";
import { requireRestaurantId } from "../utils/auth.server";
import { getPrismaErrorInfo } from "./prisma-errors.server";
import { toTitleCaseName } from "../utils/name-case";
import { publishIfOkJsonResponse } from "../utils/live-updates.server";

export type ServersLoaderData = {
    serviceDay: string;
    servers: Array<{ id: string; name: string }>;
    rows: Array<{
        id: string;
        name: string;
        tablesToday: number;
        guestsToday: number;
        avgMorningTables: number | null;
        avgMorningGuests: number | null;
        avgEveningTables: number | null;
        avgEveningGuests: number | null;
    }>;
};

function isServiceDay(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shiftForLocalHour(hour: number): "morning" | "evening" | null {
    // Morning: 11am - 4pm
    if (hour >= 11 && hour < 16) return "morning";
    // Evening: 4pm - midnight
    if (hour >= 16 && hour < 24) return "evening";
    return null;
}

export async function loadServersData(
    request: Request,
): Promise<ServersLoaderData> {
    let prisma = getPrisma() as any;
    let restaurantId = await requireRestaurantId(request);

    let url = new URL(request.url);
    let requested = String(url.searchParams.get("day") ?? "").trim();
    let now = new Date();
    let serviceDay = isServiceDay(requested)
        ? requested
        : todayServiceDayLocal(now);
    let dayStart = serviceDayStartLocal(serviceDay);
    let dayEnd = serviceDayEndLocal(serviceDay);

    // If Prisma Client hasn't been regenerated yet, the Server model won't exist on the client.
    // Avoid crashing the whole app in dev.
    if (!prisma.server) {
        return { serviceDay, servers: [], rows: [] };
    }

    let servers = await prisma.server.findMany({
        where: { restaurantId },
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true },
    });

    // Totals for today.
    let todayAgg: any[] = [];
    try {
        todayAgg = await prisma.tableSeating.groupBy({
            by: ["serverId"],
            where: {
                restaurantId,
                serverId: { not: null },
                seatedAt: { gte: dayStart, lt: dayEnd },
            },
            _count: { _all: true },
            _sum: { partySize: true },
        });
    } catch {
        todayAgg = [];
    }

    let tablesTodayByServerId = new Map<string, number>();
    let guestsTodayByServerId = new Map<string, number>();
    for (let row of todayAgg ?? []) {
        let serverId = String((row as any).serverId);
        tablesTodayByServerId.set(
            serverId,
            Number((row as any)._count?._all ?? 0),
        );
        guestsTodayByServerId.set(
            serverId,
            Number((row as any)._sum?.partySize ?? 0),
        );
    }

    // Shift averages across history (only seatings with serverId).
    // Averages are computed over days where the server had at least one seating in that shift.
    let seatings: any[] = [];
    try {
        seatings = await prisma.tableSeating.findMany({
            where: {
                restaurantId,
                serverId: { not: null },
            },
            select: {
                serverId: true,
                seatedAt: true,
                partySize: true,
            },
        });
    } catch {
        seatings = [];
    }

    type ShiftTotals = { tables: number; guests: number };
    let perServerPerDayShift = new Map<
        string,
        Map<string, { morning?: ShiftTotals; evening?: ShiftTotals }>
    >();

    for (let s of seatings ?? []) {
        let serverId = String((s as any).serverId);
        let seatedAt = (s as any).seatedAt as Date | null;
        if (!(seatedAt instanceof Date) || Number.isNaN(seatedAt.getTime()))
            continue;

        let localHour = seatedAt.getHours();
        let shift = shiftForLocalHour(localHour);
        if (!shift) continue;

        let dayKey = todayServiceDayLocal(seatedAt);
        let partySize = Number((s as any).partySize ?? 0);
        if (!Number.isFinite(partySize)) partySize = 0;

        let byDay = perServerPerDayShift.get(serverId);
        if (!byDay) {
            byDay = new Map();
            perServerPerDayShift.set(serverId, byDay);
        }

        let day = byDay.get(dayKey);
        if (!day) {
            day = {};
            byDay.set(dayKey, day);
        }

        let current = (day as any)[shift] as ShiftTotals | undefined;
        if (!current) {
            current = { tables: 0, guests: 0 };
            (day as any)[shift] = current;
        }

        current.tables += 1;
        current.guests += partySize;
    }

    function avg(values: number[]): number | null {
        if (values.length === 0) return null;
        return (
            Math.round(
                (values.reduce((a, b) => a + b, 0) / values.length) * 10,
            ) / 10
        );
    }

    let rows = servers.map((srv: any) => {
        let id = String(srv.id);
        let byDay = perServerPerDayShift.get(id) ?? new Map();

        let morningTables: number[] = [];
        let morningGuests: number[] = [];
        let eveningTables: number[] = [];
        let eveningGuests: number[] = [];

        for (let totals of byDay.values()) {
            if (totals.morning) {
                morningTables.push(totals.morning.tables);
                morningGuests.push(totals.morning.guests);
            }
            if (totals.evening) {
                eveningTables.push(totals.evening.tables);
                eveningGuests.push(totals.evening.guests);
            }
        }

        return {
            id,
            name: String(srv.name),
            tablesToday: tablesTodayByServerId.get(id) ?? 0,
            guestsToday: guestsTodayByServerId.get(id) ?? 0,
            avgMorningTables: avg(morningTables),
            avgMorningGuests: avg(morningGuests),
            avgEveningTables: avg(eveningTables),
            avgEveningGuests: avg(eveningGuests),
        };
    });

    return {
        serviceDay,
        servers: servers.map((s: any) => ({
            id: String(s.id),
            name: String(s.name),
        })),
        rows,
    };
}

export async function runServersAction(request: Request): Promise<Response> {
    let formData = await request.formData();
    let intent = String(formData.get("intent") ?? "");

    let prisma = getPrisma() as any;
    let restaurantId = await requireRestaurantId(request);

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

    if (intent === "create-server") {
        let name = toTitleCaseName(String(formData.get("name") ?? ""));
        if (!name) {
            return Response.json(
                { ok: false, fieldErrors: { name: "Name is required" } },
                { status: 400 },
            );
        }
        if (name.length > 40) {
            return Response.json(
                { ok: false, fieldErrors: { name: "Name is too long" } },
                { status: 400 },
            );
        }

        try {
            let created = await prisma.server.create({
                data: { restaurantId, name },
                select: { id: true },
            });
            let response = Response.json({
                ok: true,
                serverId: String(created.id),
            } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            let { code } = getPrismaErrorInfo(error);
            if (code === "P2002") {
                return Response.json(
                    {
                        ok: false,
                        fieldErrors: { name: "That server already exists" },
                    },
                    { status: 400 },
                );
            }
            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not create server",
                },
                { status: 500 },
            );
        }
    }

    if (intent === "update-server") {
        let serverId = String(formData.get("serverId") ?? "").trim();
        let name = toTitleCaseName(String(formData.get("name") ?? ""));

        let fieldErrors: Record<string, string> = {};
        if (!serverId) fieldErrors.serverId = "Missing server";
        if (!name) fieldErrors.name = "Name is required";
        if (name.length > 40) fieldErrors.name = "Name is too long";
        if (Object.keys(fieldErrors).length > 0) {
            return Response.json({ ok: false, fieldErrors }, { status: 400 });
        }

        try {
            let updated = await prisma.server.updateMany({
                where: { id: serverId, restaurantId },
                data: { name },
            });

            if (updated.count !== 1) {
                return Response.json(
                    { ok: false, formError: "Server not found" },
                    { status: 404 },
                );
            }

            let response = Response.json({ ok: true } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            let { code } = getPrismaErrorInfo(error);
            if (code === "P2002") {
                return Response.json(
                    {
                        ok: false,
                        fieldErrors: { name: "That server already exists" },
                    },
                    { status: 400 },
                );
            }
            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not update server",
                },
                { status: 500 },
            );
        }
    }

    if (intent === "delete-server") {
        let serverId = String(formData.get("serverId") ?? "").trim();
        if (!serverId) {
            return Response.json(
                { ok: false, fieldErrors: { serverId: "Missing server" } },
                { status: 400 },
            );
        }

        try {
            let deleted = await prisma.server.deleteMany({
                where: { id: serverId, restaurantId },
            });

            if (deleted.count !== 1) {
                return Response.json(
                    { ok: false, formError: "Server not found" },
                    { status: 404 },
                );
            }

            let response = Response.json({ ok: true } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not delete server",
                },
                { status: 500 },
            );
        }
    }

    return Response.json(
        { ok: false, formError: "Unknown action" },
        { status: 400 },
    );
}
