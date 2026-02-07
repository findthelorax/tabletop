import { dashboardFloorplanCookie } from "../../../utils/dashboard-floorplan.server";

export async function loadFloorplansAndServers(args: {
    prisma: any;
    restaurantId: string;
}): Promise<{
    floorplans: Array<{ id: string; name: string }>;
    servers: Array<{ id: string; name: string }>;
}> {
    let { prisma, restaurantId } = args;

    let floorplans = await prisma.floorplan.findMany({
        where: { restaurantId },
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true },
    });

    let servers: Array<{ id: string; name: string }> = [];
    try {
        if (prisma.server) {
            let serverRows = await prisma.server.findMany({
                where: { restaurantId },
                orderBy: [{ name: "asc" }],
                select: { id: true, name: true },
            });
            servers = (serverRows ?? []).map((s: any) => ({
                id: String(s.id),
                name: String(s.name),
            }));
        }
    } catch {
        servers = [];
    }

    return {
        floorplans: (floorplans ?? []).map((f: any) => ({
            id: String(f.id),
            name: String(f.name),
        })),
        servers,
    };
}

export async function selectDashboardFloorplanId(args: {
    request: Request;
    floorplans: Array<{ id: string; name: string }>;
}): Promise<string | null> {
    let { request, floorplans } = args;

    let url = new URL(request.url);
    let requestedFloorplanId = url.searchParams.get("floorplanId");

    let cookieHeader = request.headers.get("Cookie");
    let preferredFloorplanId = (await dashboardFloorplanCookie.parse(
        cookieHeader,
    )) as string | undefined;

    if (
        preferredFloorplanId &&
        !floorplans.some((f) => String(f.id) === String(preferredFloorplanId))
    ) {
        preferredFloorplanId = undefined;
    }

    return requestedFloorplanId &&
        floorplans.some((f) => String(f.id) === requestedFloorplanId)
        ? requestedFloorplanId
        : preferredFloorplanId
          ? String(preferredFloorplanId)
          : floorplans.length > 0
            ? String(floorplans[0].id)
            : null;
}
