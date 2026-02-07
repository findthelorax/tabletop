export async function loadAllTables(args: {
    prisma: any;
    restaurantId: string;
}): Promise<{
    allTables: any[];
    allTablesById: Map<string, any>;
}> {
    let { prisma, restaurantId } = args;

    let allTables = await prisma.table.findMany({
        where: { restaurantId },
        orderBy: [{ tableNumber: "asc" }],
        select: {
            id: true,
            tableNumber: true,
            capacity: true,
            status: true,
            seatedPartySize: true,
            seatedAt: true,
        },
    });

    let allTablesById = new Map<string, any>(
        (allTables ?? []).map((t: any) => [String(t.id), t] as [string, any]),
    );

    return { allTables: allTables ?? [], allTablesById };
}
