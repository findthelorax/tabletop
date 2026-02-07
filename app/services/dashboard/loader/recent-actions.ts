import type { DashboardLoaderData } from "../types";

export async function loadRecentActions(args: {
    prisma: any;
    restaurantId: string;
    selectedFloorplanId: string | null;
    dayStart: Date;
    dayEnd: Date;
}): Promise<DashboardLoaderData["recentActions"]> {
    let { prisma, restaurantId, selectedFloorplanId, dayStart, dayEnd } = args;

    // Recent actions (today only, last 3), used to power Undo.
    try {
        if (selectedFloorplanId && prisma.dashboardAction) {
            let rows = await prisma.dashboardAction.findMany({
                where: {
                    restaurantId,
                    floorplanId: selectedFloorplanId,
                    createdAt: { gte: dayStart, lt: dayEnd },
                    undoneAt: null,
                },
                orderBy: [{ createdAt: "desc" }],
                take: 3,
                select: {
                    id: true,
                    kind: true,
                    label: true,
                    createdAt: true,
                },
            });

            return (rows ?? []).map((r: any) => {
                let createdAt = r.createdAt as Date | null;
                return {
                    id: String(r.id),
                    kind: String(r.kind ?? ""),
                    label: String(r.label ?? ""),
                    createdAt:
                        createdAt instanceof Date &&
                        !Number.isNaN(createdAt.getTime())
                            ? createdAt.toISOString()
                            : new Date().toISOString(),
                };
            });
        }
    } catch {
        // ignore
    }

    return [];
}
