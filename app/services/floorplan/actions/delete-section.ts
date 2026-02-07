export async function handleDeleteSection(options: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
}): Promise<Response> {
    let { prisma, restaurantId, formData } = options;

    let floorplanId = String(formData.get("floorplanId") ?? "").trim();
    let sectionId = String(formData.get("sectionId") ?? "").trim();
    if (!floorplanId || !sectionId) {
        return Response.json(
            { ok: false, formError: "Missing section" },
            { status: 400 },
        );
    }

    try {
        // Ensure floorplan belongs to restaurant.
        let floorplan = await prisma.floorplan.findFirst({
            where: { id: floorplanId, restaurantId },
            select: { id: true },
        });
        if (!floorplan) {
            return Response.json(
                { ok: false, formError: "Unknown floorplan" },
                { status: 400 },
            );
        }

        await prisma.floorplanSection.delete({
            where: { id: sectionId, floorplanId },
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
                        : "Could not delete section",
            },
            { status: 500 },
        );
    }
}
