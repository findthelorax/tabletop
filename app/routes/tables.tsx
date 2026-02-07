import * as React from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import type { Route } from "./+types/tables";
import { TablesPage, type Area } from "../components/tables";
import { getPrisma } from "../utils/db.server";
import { requireRestaurantId } from "../utils/auth.server";
import { runTablesAction } from "../services/tables-actions.server";
import { useToast } from "../ui/toast";

export async function loader({ request }: Route.LoaderArgs) {
    let restaurantId = await requireRestaurantId(request);

    let areas: Area[] = [];
    let unassigned: Area["tables"] = [];

    try {
        // Prisma Client types can lag behind schema changes until `prisma generate` is run.
        // Cast to `any` here so the route can compile even if the client hasn't been regenerated yet.
        let prisma = getPrisma() as any;

        let rows = await prisma.tableArea.findMany({
            where: { restaurantId },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
                id: true,
                name: true,
                tables: {
                    orderBy: [{ tableNumber: "asc" }],
                    select: {
                        id: true,
                        areaId: true,
                        tableNumber: true,
                        capacity: true,
                        kind: true,
                        seatedPartySize: true,
                    },
                },
            },
        });

        areas = rows;

        unassigned = await prisma.table.findMany({
            where: { restaurantId, areaId: null },
            orderBy: [{ tableNumber: "asc" }],
            select: {
                id: true,
                areaId: true,
                tableNumber: true,
                capacity: true,
                kind: true,
                seatedPartySize: true,
            },
        });
    } catch {
        areas = [];
        unassigned = [];
    }

    return { areas, unassigned };
}

export async function action({ request }: Route.ActionArgs) {
    let restaurantId = await requireRestaurantId(request);
    let formData = await request.formData();
    return runTablesAction({ formData, restaurantId });
}

export default function Tables(_: Route.ComponentProps) {
    return <TablesPage />;
}
