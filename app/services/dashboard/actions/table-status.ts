import type { TableStatus as TableStatusType } from "@prisma/client";

import { DomainError, setTableStatus } from "../../table-management.server";
import { TableStatus, createDashboardAction } from "../utils";

export async function handleSetTableStatus(args: {
    formData: FormData;
    prisma: any;
    restaurantId: string;
    floorplanId: string | null;
}): Promise<Response> {
    let { formData, prisma, restaurantId, floorplanId } = args;

    let tableId = String(formData.get("tableId") ?? "").trim();
    let toStatus = String(formData.get("toStatus") ?? "").trim();

    let fieldErrors: Record<string, string> = {};
    if (!tableId) fieldErrors.tableId = "Missing table";
    if (!toStatus) fieldErrors.toStatus = "Missing status";
    if (toStatus === "SEATED") fieldErrors.toStatus = "Invalid status";
    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    try {
        let before = await prisma.table.findFirst({
            where: { restaurantId, id: tableId },
            select: { status: true, tableNumber: true },
        });

        let beforeSeating: {
            id: string;
            seatedAt: string;
            partySize: number;
        } | null = null;

        if (
            before &&
            String((before as any).status) === String(TableStatus.SEATED)
        ) {
            try {
                let active = await prisma.tableSeating.findFirst({
                    where: {
                        restaurantId,
                        tableId,
                        endedAt: null,
                    },
                    orderBy: [{ seatedAt: "desc" }],
                    select: { id: true, seatedAt: true, partySize: true },
                });
                if (active) {
                    let seatedAt = (active as any).seatedAt as Date | null;
                    beforeSeating = {
                        id: String((active as any).id),
                        seatedAt:
                            seatedAt instanceof Date &&
                            !Number.isNaN(seatedAt.getTime())
                                ? seatedAt.toISOString()
                                : new Date().toISOString(),
                        partySize: Number((active as any).partySize ?? 0),
                    };
                }
            } catch {
                beforeSeating = null;
            }
        }

        await setTableStatus({
            restaurantId,
            tableId,
            toStatus: toStatus as Exclude<TableStatusType, "SEATED">,
        });

        // Best-effort: capture server/section context for history grouping.
        let sectionIdForMeta: string | null = null;
        let sectionNameForMeta: string | null = null;
        let serverIdForMeta: string | null = null;
        let serverNameForMeta: string | null = null;

        if (floorplanId) {
            try {
                // Temp assignment overrides base section membership.
                let temp = await prisma.tempTableAssignment.findFirst({
                    where: {
                        restaurantId,
                        floorplanId: String(floorplanId),
                        tableId,
                        endedAt: null,
                    },
                    select: {
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

                let s = (temp as any)?.toSection as any;
                if (!s) {
                    let link = await prisma.floorplanSectionTable.findFirst({
                        where: {
                            tableId,
                            floorplanSection: {
                                floorplanId: String(floorplanId),
                            },
                        },
                        select: {
                            floorplanSection: {
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
                    s = (link as any)?.floorplanSection as any;
                }

                if (s) {
                    sectionIdForMeta = s.id ? String(s.id) : null;
                    sectionNameForMeta = s.name ? String(s.name) : null;
                    serverIdForMeta = s.serverId ? String(s.serverId) : null;
                    serverNameForMeta = s.server?.name
                        ? String(s.server.name)
                        : s.serverName
                          ? String(s.serverName)
                          : null;
                }
            } catch {
                // ignore
            }
        }

        try {
            if (before) {
                let label = `Table ${Number((before as any).tableNumber ?? 0)} → ${toStatus}`;
                await createDashboardAction(prisma, {
                    restaurantId,
                    floorplanId,
                    kind: "set-table-status",
                    label,
                    meta: {
                        tableId,
                        tableNumber: Number((before as any).tableNumber ?? 0),
                        beforeStatus: String((before as any).status),
                        afterStatus: String(toStatus),
                        beforeSeating,
                        sectionId: sectionIdForMeta,
                        sectionName: sectionNameForMeta,
                        serverId: serverIdForMeta,
                        serverName: serverNameForMeta,
                    },
                });
            }
        } catch {
            // ignore
        }
        return Response.json({ ok: true } as const);
    } catch (error) {
        let message =
            error instanceof DomainError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "Could not update table";
        return Response.json(
            { ok: false, formError: message },
            { status: 400 },
        );
    }
}
