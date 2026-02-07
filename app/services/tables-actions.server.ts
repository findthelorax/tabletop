import * as PrismaClientPkg from "@prisma/client";
import type { TableKind as TableKindType } from "@prisma/client";

const TableKind = ((PrismaClientPkg as any).TableKind ??
    (PrismaClientPkg as any).default?.TableKind) as any;

import { getPrisma } from "../utils/db.server";
import { getPrismaErrorInfo, prismaP2021Message } from "./prisma-errors.server";
import { publishIfOkJsonResponse } from "../utils/live-updates.server";

export async function runTablesAction(options: {
    formData: FormData;
    restaurantId: string;
}): Promise<Response> {
    let { formData, restaurantId } = options;
    let intent = String(formData.get("intent") ?? "");

    let prisma;
    try {
        // Prisma Client types can lag behind schema changes until `prisma generate` is run.
        // Cast to `any` here so the route can compile even if the client hasn't been regenerated yet.
        prisma = getPrisma() as any;
    } catch (error) {
        let message =
            error instanceof Error
                ? error.message
                : "Database is not available";
        return Response.json(
            { ok: false, formError: message },
            { status: 500 },
        );
    }

    if (intent === "add-area") {
        let name = String(formData.get("areaName") ?? "").trim();
        if (!name) {
            return Response.json(
                {
                    ok: false,
                    fieldErrors: { areaName: "Area name is required" },
                },
                { status: 400 },
            );
        }

        try {
            let created = await prisma.tableArea.create({
                data: { restaurantId, name },
                select: { id: true },
            });
            let response = Response.json({
                ok: true,
                areaId: created.id,
            } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            let { code: prismaCode, modelName: prismaModelName } =
                getPrismaErrorInfo(error);

            if (prismaCode === "P2002") {
                return Response.json(
                    {
                        ok: false,
                        fieldErrors: {
                            areaName: "That area name already exists",
                        },
                    },
                    { status: 400 },
                );
            }

            if (prismaCode === "P2021") {
                return Response.json(
                    {
                        ok: false,
                        formError: prismaP2021Message(prismaModelName),
                    },
                    { status: 500 },
                );
            }

            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not create area",
                },
                { status: 500 },
            );
        }
    }

    if (intent === "rename-area") {
        let areaId = String(formData.get("areaId") ?? "").trim();
        let name = String(formData.get("areaName") ?? "").trim();

        let fieldErrors: Record<string, string> = {};
        if (!areaId) fieldErrors.areaId = "Missing area";
        if (!name) fieldErrors.areaName = "Area name is required";
        if (Object.keys(fieldErrors).length > 0) {
            return Response.json({ ok: false, fieldErrors }, { status: 400 });
        }

        try {
            await prisma.tableArea.update({
                where: { id: areaId, restaurantId },
                data: { name },
                select: { id: true },
            });
            let response = Response.json({ ok: true } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            let { code: prismaCode, modelName: prismaModelName } =
                getPrismaErrorInfo(error);

            if (prismaCode === "P2002") {
                return Response.json(
                    {
                        ok: false,
                        fieldErrors: {
                            areaName: "That area name already exists",
                        },
                    },
                    { status: 400 },
                );
            }

            if (prismaCode === "P2021") {
                return Response.json(
                    {
                        ok: false,
                        formError: prismaP2021Message(prismaModelName),
                    },
                    { status: 500 },
                );
            }

            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not rename area",
                },
                { status: 500 },
            );
        }
    }

    if (intent === "delete-area") {
        let areaId = String(formData.get("areaId") ?? "").trim();
        if (!areaId) {
            return Response.json(
                { ok: false, formError: "Missing area" },
                { status: 400 },
            );
        }

        try {
            await prisma.$transaction([
                prisma.table.updateMany({
                    where: { restaurantId, areaId },
                    data: { areaId: null },
                }),
                prisma.tableArea.delete({
                    where: { id: areaId, restaurantId },
                    select: { id: true },
                }),
            ]);
            let response = Response.json({ ok: true } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            let { code: prismaCode, modelName: prismaModelName } =
                getPrismaErrorInfo(error);

            if (prismaCode === "P2021") {
                return Response.json(
                    {
                        ok: false,
                        formError: prismaP2021Message(prismaModelName),
                    },
                    { status: 500 },
                );
            }

            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not delete area",
                },
                { status: 500 },
            );
        }
    }

    if (intent === "add-table") {
        let areaId = String(formData.get("areaId") ?? "").trim();
        let tableNumberRaw = String(formData.get("tableNumber") ?? "").trim();
        let capacityRaw = String(formData.get("capacity") ?? "").trim();
        let kindRaw = String(formData.get("kind") ?? "").trim();

        let fieldErrors: Record<string, string> = {};
        if (!areaId) fieldErrors.areaId = "Missing area";
        if (!/^\d+$/.test(tableNumberRaw))
            fieldErrors.tableNumber = "Table # must be a whole number";
        if (!/^\d+$/.test(capacityRaw))
            fieldErrors.capacity = "Seats must be a whole number";

        let tableNumber = /^\d+$/.test(tableNumberRaw)
            ? Number.parseInt(tableNumberRaw, 10)
            : Number.NaN;
        let capacity = /^\d+$/.test(capacityRaw)
            ? Number.parseInt(capacityRaw, 10)
            : Number.NaN;

        if (Number.isFinite(tableNumber) && tableNumber <= 0) {
            fieldErrors.tableNumber = "Table # must be at least 1";
        }
        if (Number.isFinite(capacity) && capacity <= 0) {
            fieldErrors.capacity = "Seats must be at least 1";
        }

        let isValidKind = Object.values(TableKind).includes(
            kindRaw as TableKindType,
        );
        if (!isValidKind) fieldErrors.kind = "Type is required";

        if (Object.keys(fieldErrors).length > 0) {
            return Response.json({ ok: false, fieldErrors }, { status: 400 });
        }

        try {
            await prisma.table.create({
                data: {
                    restaurantId,
                    areaId,
                    tableNumber,
                    capacity,
                    kind: kindRaw as TableKindType,
                },
                select: { id: true },
            });

            let response = Response.json({ ok: true } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            let { code: prismaCode, modelName: prismaModelName } =
                getPrismaErrorInfo(error);

            if (prismaCode === "P2002") {
                return Response.json(
                    {
                        ok: false,
                        fieldErrors: {
                            tableNumber: "That table number already exists",
                        },
                    },
                    { status: 400 },
                );
            }

            if (prismaCode === "P2021") {
                return Response.json(
                    {
                        ok: false,
                        formError: prismaP2021Message(prismaModelName),
                    },
                    { status: 500 },
                );
            }

            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not create table",
                },
                { status: 500 },
            );
        }
    }

    if (intent === "update-table") {
        let tableId = String(formData.get("tableId") ?? "").trim();
        let areaIdRaw = String(formData.get("areaId") ?? "").trim();
        let tableNumberRaw = String(formData.get("tableNumber") ?? "").trim();
        let capacityRaw = String(formData.get("capacity") ?? "").trim();
        let kindRaw = String(formData.get("kind") ?? "").trim();

        let areaId: string | null = areaIdRaw ? areaIdRaw : null;

        let fieldErrors: Record<string, string> = {};
        if (!tableId) fieldErrors.tableId = "Missing table";
        if (!/^[0-9]+$/.test(tableNumberRaw))
            fieldErrors.tableNumber = "Table # must be a whole number";
        if (!/^[0-9]+$/.test(capacityRaw))
            fieldErrors.capacity = "Seats must be a whole number";

        let tableNumber = /^[0-9]+$/.test(tableNumberRaw)
            ? Number.parseInt(tableNumberRaw, 10)
            : Number.NaN;
        let capacity = /^[0-9]+$/.test(capacityRaw)
            ? Number.parseInt(capacityRaw, 10)
            : Number.NaN;

        if (Number.isFinite(tableNumber) && tableNumber <= 0) {
            fieldErrors.tableNumber = "Table # must be at least 1";
        }
        if (Number.isFinite(capacity) && capacity <= 0) {
            fieldErrors.capacity = "Seats must be at least 1";
        }

        let isValidKind = Object.values(TableKind).includes(
            kindRaw as TableKindType,
        );
        if (!isValidKind) fieldErrors.kind = "Type is required";

        if (Object.keys(fieldErrors).length > 0) {
            return Response.json({ ok: false, fieldErrors }, { status: 400 });
        }

        try {
            // If an areaId is provided, ensure it belongs to this restaurant.
            if (areaId) {
                let exists = await prisma.tableArea.findFirst({
                    where: { id: areaId, restaurantId },
                    select: { id: true },
                });
                if (!exists) {
                    return Response.json(
                        { ok: false, fieldErrors: { areaId: "Unknown area" } },
                        { status: 400 },
                    );
                }
            }

            await prisma.table.update({
                where: { id: tableId, restaurantId },
                data: {
                    areaId,
                    tableNumber,
                    capacity,
                    kind: kindRaw as TableKindType,
                },
                select: { id: true },
            });

            let response = Response.json({ ok: true } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            let { code: prismaCode, modelName: prismaModelName } =
                getPrismaErrorInfo(error);

            if (prismaCode === "P2002") {
                return Response.json(
                    {
                        ok: false,
                        fieldErrors: {
                            tableNumber: "That table number already exists",
                        },
                    },
                    { status: 400 },
                );
            }

            if (prismaCode === "P2021") {
                return Response.json(
                    {
                        ok: false,
                        formError: prismaP2021Message(prismaModelName),
                    },
                    { status: 500 },
                );
            }

            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not update table",
                },
                { status: 500 },
            );
        }
    }

    if (intent === "delete-table") {
        let tableId = String(formData.get("tableId") ?? "").trim();
        if (!tableId) {
            return Response.json(
                { ok: false, formError: "Missing table" },
                { status: 400 },
            );
        }

        try {
            await prisma.table.delete({
                where: { id: tableId, restaurantId },
                select: { id: true },
            });
            let response = Response.json({ ok: true } as const);
            await publishIfOkJsonResponse(restaurantId, response);
            return response;
        } catch (error) {
            let { code: prismaCode, modelName: prismaModelName } =
                getPrismaErrorInfo(error);

            if (prismaCode === "P2021") {
                return Response.json(
                    {
                        ok: false,
                        formError: prismaP2021Message(prismaModelName),
                    },
                    { status: 500 },
                );
            }

            return Response.json(
                {
                    ok: false,
                    formError:
                        error instanceof Error
                            ? error.message
                            : "Could not delete table",
                },
                { status: 500 },
            );
        }
    }

    return Response.json(
        { ok: false, formError: "Unknown action" },
        { status: 400 },
    );
}
