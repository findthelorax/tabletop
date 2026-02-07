import { dashboardFloorplanCookie } from "../../../utils/dashboard-floorplan.server";

export async function handleSetDashboardFloorplan(args: {
    prisma: any;
    restaurantId: string;
    floorplanId: string | null;
}): Promise<Response> {
    let { prisma, restaurantId, floorplanId } = args;

    try {
        if (floorplanId) {
            let exists = await prisma.floorplan.findFirst({
                where: { id: floorplanId, restaurantId },
                select: { id: true },
            });
            if (!exists) {
                return Response.json(
                    { ok: false, formError: "Unknown floorplan" },
                    { status: 400 },
                );
            }
        }

        let headers = new Headers();
        if (!floorplanId) {
            headers.set(
                "Set-Cookie",
                await dashboardFloorplanCookie.serialize("", {
                    maxAge: 0,
                }),
            );
        } else {
            headers.set(
                "Set-Cookie",
                await dashboardFloorplanCookie.serialize(floorplanId),
            );
        }

        return Response.json({ ok: true } as const, { headers });
    } catch (error) {
        let message =
            error instanceof Error ? error.message : "Could not save floorplan";
        return Response.json(
            { ok: false, formError: message },
            { status: 500 },
        );
    }
}
