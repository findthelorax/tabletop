export async function loadSeatingById(options: {
    prisma: any;
    restaurantId: string;
    seatingIds: Set<string>;
}): Promise<
    Map<
        string,
        {
            id: string;
            serverId: string | null;
            serverName: string | null;
            tableId: string;
            tableNumber: number | null;
        }
    >
> {
    let { prisma, restaurantId, seatingIds } = options;

    let seatingById = new Map<
        string,
        {
            id: string;
            serverId: string | null;
            serverName: string | null;
            tableId: string;
            tableNumber: number | null;
        }
    >();

    if (seatingIds.size > 0 && prisma.tableSeating) {
        try {
            let rows = await prisma.tableSeating.findMany({
                where: {
                    restaurantId,
                    id: { in: Array.from(seatingIds) },
                },
                select: {
                    id: true,
                    serverId: true,
                    server: prisma.server
                        ? { select: { name: true } }
                        : undefined,
                    tableId: true,
                    table: { select: { tableNumber: true } },
                },
            });

            for (let r of rows ?? []) {
                seatingById.set(String(r.id), {
                    id: String(r.id),
                    serverId: r.serverId ? String(r.serverId) : null,
                    serverName:
                        r.server && (r.server as any).name
                            ? String((r.server as any).name)
                            : null,
                    tableId: String(r.tableId),
                    tableNumber:
                        typeof (r.table as any)?.tableNumber === "number"
                            ? Number((r.table as any).tableNumber)
                            : null,
                });
            }
        } catch {
            // ignore
        }
    }

    return seatingById;
}

export async function loadSectionById(options: {
    prisma: any;
    restaurantId: string;
    sectionIds: Set<string>;
}): Promise<
    Map<
        string,
        {
            id: string;
            name: string;
            serverId: string | null;
            serverName: string | null;
        }
    >
> {
    let { prisma, restaurantId, sectionIds } = options;

    let sectionById = new Map<
        string,
        {
            id: string;
            name: string;
            serverId: string | null;
            serverName: string | null;
        }
    >();

    if (sectionIds.size > 0 && prisma.floorplanSection) {
        try {
            let rows = await prisma.floorplanSection.findMany({
                where: {
                    id: { in: Array.from(sectionIds) },
                    floorplan: { restaurantId },
                },
                select: {
                    id: true,
                    name: true,
                    serverId: true,
                    serverName: true,
                    server: prisma.server
                        ? { select: { name: true } }
                        : undefined,
                },
            });

            for (let s of rows ?? []) {
                let explicitName =
                    s.server && (s.server as any).name
                        ? String((s.server as any).name)
                        : s.serverName
                          ? String(s.serverName)
                          : null;

                sectionById.set(String(s.id), {
                    id: String(s.id),
                    name: String(s.name),
                    serverId: s.serverId ? String(s.serverId) : null,
                    serverName: explicitName,
                });
            }
        } catch {
            // ignore
        }
    }

    return sectionById;
}

export async function loadTableNumberById(options: {
    prisma: any;
    restaurantId: string;
    tableIds: Set<string>;
}): Promise<Map<string, number>> {
    let { prisma, restaurantId, tableIds } = options;

    let tableNumberById = new Map<string, number>();

    if (tableIds.size > 0 && prisma.table) {
        try {
            let rows = await prisma.table.findMany({
                where: { restaurantId, id: { in: Array.from(tableIds) } },
                select: { id: true, tableNumber: true },
            });
            for (let t of rows ?? []) {
                if (typeof t.tableNumber === "number") {
                    tableNumberById.set(String(t.id), Number(t.tableNumber));
                }
            }
        } catch {
            // ignore
        }
    }

    return tableNumberById;
}
