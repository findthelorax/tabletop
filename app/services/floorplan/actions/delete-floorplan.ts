export async function handleDeleteFloorplan(options: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
}): Promise<Response> {
    let { prisma, restaurantId, formData } = options;

    let floorplanId = String(formData.get("floorplanId") ?? "").trim();
    if (!floorplanId) {
        return Response.json(
            { ok: false, formError: "Missing floorplan" },
            { status: 400 },
        );
    }

    try {
        await prisma.floorplan.delete({
            where: { id: floorplanId, restaurantId },
            select: { id: true },
        });
        return Response.json({ ok: true } as const);
    } catch (error) {
        return Response.json(
            {
                ok: false,
                formError:
                    error instanceof Error
                        ? error.message
                        : "Could not delete floorplan",
            },
            { status: 500 },
        );
    }
}
