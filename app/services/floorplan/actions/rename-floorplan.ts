import { getPrismaErrorInfo } from "../../prisma-errors.server";

export async function handleRenameFloorplan(options: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
}): Promise<Response> {
    let { prisma, restaurantId, formData } = options;

    let floorplanId = String(formData.get("floorplanId") ?? "").trim();
    let name = String(formData.get("name") ?? "").trim();

    let fieldErrors: Record<string, string> = {};
    if (!floorplanId) fieldErrors.floorplanId = "Missing floorplan";
    if (!name) fieldErrors.name = "Name is required";
    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    try {
        await prisma.floorplan.update({
            where: { id: floorplanId, restaurantId },
            data: { name },
            select: { id: true },
        });
        return Response.json({ ok: true } as const);
    } catch (error) {
        let { code } = getPrismaErrorInfo(error);
        if (code === "P2002") {
            return Response.json(
                {
                    ok: false,
                    fieldErrors: {
                        name: "That floorplan name already exists",
                    },
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
                        : "Could not rename floorplan",
            },
            { status: 500 },
        );
    }
}
