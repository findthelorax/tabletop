import { getPrisma } from "../../utils/db.server";
import {
    serviceDayEndLocal,
    serviceDayStartLocal,
    todayServiceDayLocal,
} from "../../utils/service-day";
import { requireRestaurantId } from "../../utils/auth.server";
import type { DashboardLoaderData } from "./types";
import { buildFloorplanData } from "./loader/floorplan-data";
import {
    loadFloorplansAndServers,
    selectDashboardFloorplanId,
} from "./loader/floorplans";
import { loadRecentActions } from "./loader/recent-actions";
import { loadAllTables } from "./loader/tables";
import { loadWaitlistMetrics } from "./loader/waitlist-metrics";

export async function loadDashboardData(
    request: Request,
): Promise<DashboardLoaderData> {
    let now = new Date();
    let serviceDay = todayServiceDayLocal(now);

    try {
        let restaurantId = await requireRestaurantId(request);
        // Prisma Client types can lag behind schema changes until `prisma generate` is run.
        // Cast to `any` here so the route can compile even if the client hasn't been regenerated yet.
        let prisma = getPrisma() as any;

        let { floorplans, servers } = await loadFloorplansAndServers({
            prisma,
            restaurantId,
        });

        let selectedFloorplanId = await selectDashboardFloorplanId({
            request,
            floorplans,
        });

        let { allTablesById } = await loadAllTables({ prisma, restaurantId });

        let dayStart = serviceDayStartLocal(serviceDay);
        let dayEnd = serviceDayEndLocal(serviceDay);

        let { sections, floorplanTables } = await buildFloorplanData({
            prisma,
            restaurantId,
            selectedFloorplanId,
            allTablesById,
            dayStart,
            dayEnd,
        });

        let recentActions = await loadRecentActions({
            prisma,
            restaurantId,
            selectedFloorplanId,
            dayStart,
            dayEnd,
        });

        let {
            openMenusGuests,
            waitingGuests,
            averageWaitMinutesLastHour,
            waitTimeMissMinutesDailyAverage,
        } = await loadWaitlistMetrics({
            prisma,
            restaurantId,
            now,
            serviceDay,
        });

        return {
            openMenusGuests,
            waitingGuests,
            averageWaitMinutesLastHour,
            waitTimeMissMinutesDailyAverage,
            floorplans,
            selectedFloorplanId,
            servers,
            floorplanTables,
            recentActions,
            sections,
        };
    } catch {
        return {
            openMenusGuests: null,
            waitingGuests: null,
            averageWaitMinutesLastHour: null,
            waitTimeMissMinutesDailyAverage: null,
            floorplans: [],
            selectedFloorplanId: null,
            servers: [],
            floorplanTables: [],
            recentActions: [],
            sections: [],
        };
    }
}
