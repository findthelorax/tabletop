import { getPrismaErrorInfo } from "../../prisma-errors.server";

import { parseSectionCountFromFloorplanName } from "../utils";

export async function handleCreateFloorplan(options: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
}): Promise<Response> {
    let { prisma, restaurantId, formData } = options;

    let name = String(formData.get("name") ?? "").trim();
    if (!name) {
        return Response.json(
            { ok: false, fieldErrors: { name: "Name is required" } },
            { status: 400 },
        );
    }

    let autoSectionCount = parseSectionCountFromFloorplanName(name);
    if (autoSectionCount != null && autoSectionCount > 50) {
        return Response.json(
            {
                ok: false,
                fieldErrors: {
                    name: "Please use 50 sections or fewer",
                },
            },
            { status: 400 },
        );
    }

    try {
        let created = await prisma.$transaction(async (tx: any) => {
            let created = await tx.floorplan.create({
                data: { restaurantId, name },
                select: { id: true },
            });

            if (autoSectionCount != null && autoSectionCount > 0) {
                await tx.floorplanSection.createMany({
                    data: Array.from(
                        { length: autoSectionCount },
                        (_, idx) => ({
                            floorplanId: created.id,
                            name: `Section ${idx + 1}`,
                            sortOrder: idx,
                        }),
                    ),
                });
            }

            return created;
        });

        return Response.json({
            ok: true,
            floorplanId: created.id,
        } as const);
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
                        : "Could not create floorplan",
            },
            { status: 500 },
        );
    }
}
