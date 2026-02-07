import type { TableStatus as TableStatusType } from "@prisma/client";

export type DashboardLoaderData = {
    openMenusGuests: number | null;
    waitingGuests: number | null;
    averageWaitMinutesLastHour: number | null;
    waitTimeMissMinutesDailyAverage: number | null;
    floorplans: Array<{ id: string; name: string }>;
    selectedFloorplanId: string | null;
    servers: Array<{ id: string; name: string }>;
    floorplanTables: Array<{
        id: string;
        tableNumber: number;
        status: TableStatusType;
        homeSectionId: string;
        homeSectionName: string;
        isTempTemp: boolean;
    }>;
    recentActions: Array<{
        id: string;
        kind: string;
        label: string;
        createdAt: string;
    }>;
    sections: Array<{
        id: string;
        name: string;
        serverName: string | null;
        serverId: string | null;
        satTodayCount: number;
        satTodayGuestCount: number;
        enabledAt: string | null;
        lastSeatedAt: string | null;
        tables: Array<{
            id: string;
            tableNumber: number;
            capacity: number;
            status: TableStatusType;
            seatedPartySize: number | null;
            seatedAt: string | null;
            isTemp: boolean;
        }>;
    }>;
};
