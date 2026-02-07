import { getPrismaErrorInfo } from "../../prisma-errors.server";

import { uniqueStrings } from "../utils";

export async function handleCreateSection(options: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
}): Promise<Response> {
    let { prisma, restaurantId, formData } = options;

    let floorplanId = String(formData.get("floorplanId") ?? "").trim();
    let name = String(formData.get("name") ?? "").trim();
    let serverId = String(formData.get("serverId") ?? "").trim();
    let serverIdOrNull = serverId ? serverId : null;
    let tableIds = uniqueStrings(
        formData.getAll("tableIds").map((v) => String(v)),
    );

    let fieldErrors: Record<string, string> = {};
    if (!floorplanId) fieldErrors.floorplanId = "Missing floorplan";
    if (!name) fieldErrors.name = "Name is required";
    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
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

        if (serverIdOrNull) {
            let existingServer = await prisma.server.findFirst({
                where: { id: serverIdOrNull, restaurantId },
                select: { id: true },
            });
            if (!existingServer) {
                return Response.json(
                    { ok: false, formError: "Unknown server" },
                    { status: 400 },
                );
            }
        }

        // Validate tables belong to this restaurant.
        if (tableIds.length > 0) {
            let existing = await prisma.table.findMany({
                where: { restaurantId, id: { in: tableIds } },
                select: { id: true },
            });
            let existingSet = new Set(existing.map((t: any) => String(t.id)));
            if (tableIds.some((id) => !existingSet.has(id))) {
                return Response.json(
                    {
                        ok: false,
                        formError: "One or more tables are invalid",
                    },
                    { status: 400 },
                );
            }
        }

        // Ensure: each table belongs to at most one section per floorplan.
        // During section building/editing, allow "moving" a table by removing it from
        // any existing section on this floorplan, then adding it to the requested section.
        let created = await prisma.$transaction(async (tx: any) => {
            let created = await tx.floorplanSection.create({
                data: {
                    floorplanId,
                    name,
                    serverId: serverIdOrNull,
                    serverName: null,
                },
                select: { id: true },
            });

            if (tableIds.length > 0) {
                await tx.floorplanSectionTable.deleteMany({
                    where: {
                        tableId: { in: tableIds },
                        floorplanSection: { floorplanId },
                    },
                });
                await tx.floorplanSectionTable.createMany({
                    data: tableIds.map((tableId, idx) => ({
                        floorplanSectionId: created.id,
                        tableId,
                        sortOrder: idx,
                    })),
                });
            }

            return created;
        });

        return Response.json({ ok: true, sectionId: created.id } as const);
    } catch (error) {
        let { code } = getPrismaErrorInfo(error);
        if (code === "P2002") {
            return Response.json(
                {
                    ok: false,
                    fieldErrors: {
                        name: "That section name already exists",
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
                        : "Could not create section",
            },
            { status: 500 },
        );
    }
}
