export type TempAssignmentSnap = {
    tableId: string;
    floorplanId: string;
    createdAt: Date;
    endedAt: Date | null;
    toSectionId: string;
    toSectionName: string;
    toServerId: string | null;
    toServerName: string | null;
};

export type SectionMembership = {
    tableId: string;
    floorplanId: string;
    sectionId: string;
    sectionName: string;
    sectionSortOrder: number;
    serverId: string | null;
    serverName: string | null;
};

export function buildMembershipResolver(options: {
    prisma: any;
    restaurantId: string;
    dayStart: Date;
    dayEnd: Date;
    tableIds: Set<string>;
    floorplanIds: Set<string>;
}): Promise<
    (options: { tableId: string; floorplanId: string; occurredAt: Date }) => {
        sectionId: string | null;
        sectionName: string | null;
        serverId: string | null;
        serverName: string | null;
    }
> {
    let { prisma, restaurantId, dayStart, dayEnd, tableIds, floorplanIds } =
        options;

    return (async () => {
        let tempAssignments: TempAssignmentSnap[] = [];
        if (
            tableIds.size > 0 &&
            floorplanIds.size > 0 &&
            prisma.tempTableAssignment
        ) {
            try {
                let rows = await prisma.tempTableAssignment.findMany({
                    where: {
                        restaurantId,
                        floorplanId: { in: Array.from(floorplanIds) },
                        tableId: { in: Array.from(tableIds) },
                        createdAt: { lt: dayEnd },
                        OR: [{ endedAt: null }, { endedAt: { gt: dayStart } }],
                    },
                    select: {
                        tableId: true,
                        floorplanId: true,
                        createdAt: true,
                        endedAt: true,
                        toSectionId: true,
                        toSection: {
                            select: {
                                id: true,
                                name: true,
                                serverId: true,
                                serverName: true,
                                server: prisma.server
                                    ? { select: { name: true } }
                                    : undefined,
                            },
                        },
                    },
                });

                for (let r of rows ?? []) {
                    let toServerName =
                        (r.toSection as any)?.server &&
                        ((r.toSection as any).server as any)?.name
                            ? String(((r.toSection as any).server as any).name)
                            : (r.toSection as any)?.serverName
                              ? String((r.toSection as any).serverName)
                              : null;

                    tempAssignments.push({
                        tableId: String(r.tableId),
                        floorplanId: String(r.floorplanId),
                        createdAt: (r.createdAt as Date) ?? new Date(0),
                        endedAt: (r.endedAt as Date | null) ?? null,
                        toSectionId: String(r.toSectionId),
                        toSectionName: String((r.toSection as any)?.name ?? ""),
                        toServerId: (r.toSection as any)?.serverId
                            ? String((r.toSection as any).serverId)
                            : null,
                        toServerName,
                    });
                }
            } catch {
                tempAssignments = [];
            }
        }

        let baseMemberships: SectionMembership[] = [];
        if (
            tableIds.size > 0 &&
            floorplanIds.size > 0 &&
            prisma.floorplanSectionTable
        ) {
            try {
                let rows = await prisma.floorplanSectionTable.findMany({
                    where: {
                        tableId: { in: Array.from(tableIds) },
                        floorplanSection: {
                            floorplanId: { in: Array.from(floorplanIds) },
                        },
                    },
                    select: {
                        tableId: true,
                        floorplanSection: {
                            select: {
                                id: true,
                                name: true,
                                floorplanId: true,
                                sortOrder: true,
                                serverId: true,
                                serverName: true,
                                server: prisma.server
                                    ? { select: { name: true } }
                                    : undefined,
                            },
                        },
                    },
                });

                for (let r of rows ?? []) {
                    let section = r.floorplanSection as any;
                    let serverName =
                        section?.server && section.server?.name
                            ? String(section.server.name)
                            : section?.serverName
                              ? String(section.serverName)
                              : null;

                    baseMemberships.push({
                        tableId: String(r.tableId),
                        floorplanId: String(section.floorplanId),
                        sectionId: String(section.id),
                        sectionName: String(section.name),
                        sectionSortOrder:
                            typeof section.sortOrder === "number"
                                ? Number(section.sortOrder)
                                : 0,
                        serverId: section.serverId
                            ? String(section.serverId)
                            : null,
                        serverName,
                    });
                }
            } catch {
                baseMemberships = [];
            }
        }

        return function resolveMembershipAt(args: {
            tableId: string;
            floorplanId: string;
            occurredAt: Date;
        }): {
            sectionId: string | null;
            sectionName: string | null;
            serverId: string | null;
            serverName: string | null;
        } {
            let { tableId, floorplanId, occurredAt } = args;

            // Temp assignment overrides base membership.
            let temp = tempAssignments.find((t) => {
                if (t.tableId !== tableId) return false;
                if (t.floorplanId !== floorplanId) return false;
                if (!(t.createdAt instanceof Date)) return false;
                if (t.createdAt.getTime() > occurredAt.getTime()) return false;
                if (
                    t.endedAt instanceof Date &&
                    t.endedAt.getTime() <= occurredAt.getTime()
                ) {
                    return false;
                }
                return true;
            });

            if (temp) {
                return {
                    sectionId: temp.toSectionId,
                    sectionName: temp.toSectionName || null,
                    serverId: temp.toServerId,
                    serverName: temp.toServerName,
                };
            }

            // Otherwise, pick the section with the lowest sortOrder.
            let candidates = baseMemberships
                .filter(
                    (m) =>
                        m.tableId === tableId && m.floorplanId === floorplanId,
                )
                .sort((a, b) => a.sectionSortOrder - b.sectionSortOrder);

            let m = candidates[0];
            return m
                ? {
                      sectionId: m.sectionId,
                      sectionName: m.sectionName,
                      serverId: m.serverId,
                      serverName: m.serverName,
                  }
                : {
                      sectionId: null,
                      sectionName: null,
                      serverId: null,
                      serverName: null,
                  };
        };
    })();
}
