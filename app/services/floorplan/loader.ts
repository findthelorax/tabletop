import { getPrisma } from "../../utils/db.server";
import { requireRestaurantId } from "../../utils/auth.server";

import type {
    FloorplanSectionModel,
    LoaderData,
    ServerOption,
    TableOption,
} from "../../components/floorplan/types";

export async function loadFloorplanData(request: Request): Promise<LoaderData> {
    try {
        let restaurantId = await requireRestaurantId(request);
        // Prisma Client types can lag behind schema changes until `prisma generate` is run.
        // Cast to `any` here so the route can compile even if the client hasn't been regenerated yet.
        let prisma = getPrisma() as any;

        let floorplans = await prisma.floorplan.findMany({
            where: { restaurantId },
            orderBy: [{ name: "asc" }],
            select: { id: true, name: true },
        });

        let url = new URL(request.url);
        let requestedId = url.searchParams.get("floorplanId");
        let selectedFloorplanId =
            requestedId && floorplans.some((f: any) => f.id === requestedId)
                ? requestedId
                : floorplans.length > 0
                  ? floorplans[0].id
                  : null;

        let selectedFloorplanName = selectedFloorplanId
            ? (floorplans.find((f: any) => f.id === selectedFloorplanId)
                  ?.name ?? null)
            : null;

        let tablesRaw = await prisma.table.findMany({
            where: { restaurantId },
            orderBy: [{ tableNumber: "asc" }],
            select: {
                id: true,
                tableNumber: true,
                label: true,
                area: { select: { name: true } },
            },
        });

        let tables: TableOption[] = tablesRaw.map((t: any) => {
            let base = t.label ? String(t.label) : `Table ${t.tableNumber}`;
            let areaSuffix = t.area?.name ? ` (${t.area.name})` : "";
            return {
                id: String(t.id),
                tableNumber: Number(t.tableNumber),
                label: `${base}${areaSuffix}`,
            };
        });

        let sections: FloorplanSectionModel[] = [];
        let servers: ServerOption[] = [];

        try {
            let serverRows = await prisma.server.findMany({
                where: { restaurantId },
                orderBy: [{ name: "asc" }],
                select: { id: true, name: true },
            });
            servers = serverRows.map((s: any) => ({
                id: String(s.id),
                name: String(s.name),
            }));
        } catch {
            servers = [];
        }

        if (selectedFloorplanId) {
            let rows = await prisma.floorplanSection.findMany({
                where: { floorplanId: selectedFloorplanId },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                select: {
                    id: true,
                    name: true,
                    serverName: true,
                    serverId: true,
                    server: { select: { name: true } },
                    tables: {
                        select: { tableId: true },
                        orderBy: [{ sortOrder: "asc" }],
                    },
                },
            });

            sections = rows.map((s: any) => ({
                id: String(s.id),
                name: String(s.name),
                serverId: s.serverId ? String(s.serverId) : null,
                serverName: s.server?.name
                    ? String(s.server.name)
                    : s.serverName
                      ? String(s.serverName)
                      : null,
                tableIds: (s.tables ?? []).map((x: any) => String(x.tableId)),
            }));
        }

        return {
            floorplans,
            selectedFloorplanId,
            selectedFloorplanName,
            sections,
            tables,
            servers,
        };
    } catch {
        return {
            floorplans: [],
            selectedFloorplanId: null,
            selectedFloorplanName: null,
            sections: [],
            tables: [],
            servers: [],
        };
    }
}
