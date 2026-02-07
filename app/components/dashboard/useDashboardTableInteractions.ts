import * as React from "react";
import type { FetcherWithComponents } from "react-router";

import type { DashboardLoaderData } from "../../services/dashboard.server";
import type { DashboardActionResult } from "./dashboard-utils";

type TableModel = DashboardLoaderData["sections"][number]["tables"][number];

type ToastFn = (message: string, kind: "success" | "error") => void;

type PendingCombineStart = {
    tableId: string;
    tableNumber: number;
    capacity: number;
};

type CombineSelection = {
    primaryTableId: string;
    tableIds: string[];
    totalSeats: number;
};

export function useDashboardTableInteractions(options: {
    sections: DashboardLoaderData["sections"];
    seatWaitlistId: string | null;
    seatPartySize: number | null;
    seatPartyName: string;
    addToast: ToastFn;
    tableActionFetcher: FetcherWithComponents<DashboardActionResult>;
    sectionIdByTableId: Map<string, string>;
    selectedFloorplanId: string | null;
    pendingToastRef: React.MutableRefObject<string | null>;
    pendingIntentRef: React.MutableRefObject<string | null>;
}) {
    let {
        sections,
        seatWaitlistId,
        seatPartySize,
        seatPartyName,
        addToast,
        tableActionFetcher,
        sectionIdByTableId,
        selectedFloorplanId,
        pendingToastRef,
        pendingIntentRef,
    } = options;

    let [activeTable, setActiveTable] = React.useState<TableModel | null>(null);

    let [moveSourceTable, setMoveSourceTable] =
        React.useState<TableModel | null>(null);

    let [pendingCombineStart, setPendingCombineStart] =
        React.useState<PendingCombineStart | null>(null);

    let [combineSelection, setCombineSelection] =
        React.useState<CombineSelection | null>(null);

    let clearCombineSelection = React.useCallback(() => {
        setPendingCombineStart(null);
        setCombineSelection(null);
    }, []);

    let onTableClick = React.useCallback(
        (table: TableModel) => {
            if (moveSourceTable) {
                if (tableActionFetcher.state !== "idle") return;

                if (table.id === moveSourceTable.id) {
                    // Treat clicking the source table again as cancel.
                    setMoveSourceTable(null);
                    setActiveTable(table);
                    return;
                }

                if (table.status === "SEATED") {
                    addToast("That table is sat", "error");
                    return;
                }
                if (table.status === "DISABLED") {
                    addToast("That table is disabled", "error");
                    return;
                }
                if (table.status === "DIRTY") {
                    addToast("That table is dirty", "error");
                    return;
                }

                let toSectionId = sectionIdByTableId.get(table.id) ?? null;
                if (!toSectionId) {
                    addToast("Pick a table in a section", "error");
                    return;
                }

                let fd = new FormData();
                fd.set("intent", "move-seating");
                if (selectedFloorplanId) {
                    fd.set("floorplanId", selectedFloorplanId);
                }
                fd.set("fromTableId", moveSourceTable.id);
                fd.set("toTableId", table.id);
                fd.set("toSectionId", toSectionId);

                pendingToastRef.current = `Moved to Table ${table.tableNumber}`;
                pendingIntentRef.current = null;
                setMoveSourceTable(null);
                tableActionFetcher.submit(fd, { method: "post" });
                return;
            }

            if (seatWaitlistId && seatPartySize) {
                if (tableActionFetcher.state !== "idle") return;
                if (table.status === "SEATED") {
                    addToast("That table is sat", "error");
                    return;
                }
                if (table.status === "DISABLED") {
                    addToast("That table is disabled", "error");
                    return;
                }
                if (table.status === "DIRTY") {
                    addToast("That table is dirty", "error");
                    return;
                }
                if (table.status === "ON_HOLD") {
                    addToast("That table is on hold", "error");
                    return;
                }

                if (combineSelection) {
                    // Toggle add/remove.
                    let isSelected = combineSelection.tableIds.includes(
                        table.id,
                    );
                    let nextIds = isSelected
                        ? combineSelection.tableIds.filter(
                              (id) => id !== table.id,
                          )
                        : [...combineSelection.tableIds, table.id];

                    // Ensure primary stays first.
                    if (!nextIds.includes(combineSelection.primaryTableId)) {
                        nextIds = [combineSelection.primaryTableId, ...nextIds];
                    }

                    let capacityById = new Map<string, number>();
                    for (let section of sections) {
                        for (let t of section.tables) {
                            capacityById.set(t.id, t.capacity);
                        }
                    }
                    let totalSeats = nextIds.reduce(
                        (acc, id) => acc + (capacityById.get(id) ?? 0),
                        0,
                    );

                    let nextSelection = {
                        primaryTableId: combineSelection.primaryTableId,
                        tableIds: nextIds,
                        totalSeats,
                    };
                    setCombineSelection(nextSelection);

                    if (totalSeats >= seatPartySize) {
                        let extras = nextIds.filter(
                            (id) => id !== combineSelection.primaryTableId,
                        );
                        let fd = new FormData();
                        fd.set("intent", "seat-waitlist-combined");
                        if (selectedFloorplanId) {
                            fd.set("floorplanId", selectedFloorplanId);
                        }
                        fd.set("waitlistEntryId", seatWaitlistId);
                        fd.set("partySize", String(seatPartySize));
                        fd.set(
                            "primaryTableId",
                            combineSelection.primaryTableId,
                        );
                        fd.set("extraTableIds", extras.join(","));
                        let primarySectionId =
                            sectionIdByTableId.get(
                                combineSelection.primaryTableId,
                            ) ?? null;
                        if (primarySectionId) {
                            fd.set("sectionId", primarySectionId);
                        }
                        pendingToastRef.current = seatPartyName.trim()
                            ? `Sat ${seatPartyName}`
                            : "Sat guest";
                        pendingIntentRef.current = "seat-waitlist-combined";
                        tableActionFetcher.submit(fd, { method: "post" });
                    }

                    return;
                }

                if (seatPartySize <= table.capacity) {
                    let fd = new FormData();
                    fd.set("intent", "seat-table");
                    if (selectedFloorplanId) {
                        fd.set("floorplanId", selectedFloorplanId);
                    }
                    fd.set("tableId", table.id);
                    fd.set("partySize", String(seatPartySize));
                    fd.set("waitlistEntryId", seatWaitlistId);
                    let sectionId = sectionIdByTableId.get(table.id) ?? null;
                    if (sectionId) fd.set("sectionId", sectionId);
                    pendingToastRef.current = seatPartyName.trim()
                        ? `Sat ${seatPartyName}`
                        : `Sat Table ${table.tableNumber}`;
                    pendingIntentRef.current = "seat-waitlist";
                    tableActionFetcher.submit(fd, { method: "post" });
                    return;
                }

                setPendingCombineStart({
                    tableId: table.id,
                    tableNumber: table.tableNumber,
                    capacity: table.capacity,
                });
                return;
            }

            setActiveTable(table);
        },
        [
            addToast,
            combineSelection,
            moveSourceTable,
            pendingIntentRef,
            pendingToastRef,
            seatPartyName,
            seatPartySize,
            seatWaitlistId,
            sectionIdByTableId,
            sections,
            selectedFloorplanId,
            tableActionFetcher,
        ],
    );

    let startMoveActiveTable = React.useCallback(() => {
        if (!activeTable) return;
        if (activeTable.status !== "SEATED") return;
        setMoveSourceTable(activeTable);
        setActiveTable(null);
    }, [activeTable]);

    let startCombineSelection = React.useCallback(() => {
        if (!pendingCombineStart) return;
        setCombineSelection({
            primaryTableId: pendingCombineStart.tableId,
            tableIds: [pendingCombineStart.tableId],
            totalSeats: pendingCombineStart.capacity,
        });
        setPendingCombineStart(null);
    }, [pendingCombineStart]);

    let cancelCombineStart = React.useCallback(() => {
        setPendingCombineStart(null);
    }, []);

    let seatActiveTable = React.useCallback(
        (partySize: number) => {
            if (!activeTable) return;
            if (tableActionFetcher.state !== "idle") return;
            if (!Number.isFinite(partySize) || partySize <= 0) return;
            if (partySize > activeTable.capacity) {
                addToast(
                    `Party size must be 1–${activeTable.capacity}`,
                    "error",
                );
                return;
            }

            let fd = new FormData();
            fd.set("intent", "seat-table");
            if (selectedFloorplanId) {
                fd.set("floorplanId", selectedFloorplanId);
            }
            fd.set("tableId", activeTable.id);
            fd.set("partySize", String(partySize));
            let sectionId = sectionIdByTableId.get(activeTable.id) ?? null;
            if (sectionId) fd.set("sectionId", sectionId);
            pendingToastRef.current = `Sat Table ${activeTable.tableNumber}`;
            pendingIntentRef.current = null;
            tableActionFetcher.submit(fd, { method: "post" });
        },
        [
            activeTable,
            addToast,
            pendingIntentRef,
            pendingToastRef,
            sectionIdByTableId,
            selectedFloorplanId,
            tableActionFetcher,
        ],
    );

    let setActiveTableStatus = React.useCallback(
        (toStatus: "AVAILABLE" | "DIRTY" | "ON_HOLD" | "DISABLED") => {
            if (!activeTable) return;
            if (tableActionFetcher.state !== "idle") return;

            let toastLabel = (() => {
                let n = activeTable.tableNumber;
                if (toStatus === "AVAILABLE") return `Marked Table ${n} clean`;
                if (toStatus === "DIRTY") return `Marked Table ${n} dirty`;
                if (toStatus === "ON_HOLD") return `Put Table ${n} on hold`;
                if (toStatus === "DISABLED") return `Disabled Table ${n}`;
                return `Updated Table ${n}`;
            })();

            let fd = new FormData();
            fd.set("intent", "set-table-status");
            if (selectedFloorplanId) {
                fd.set("floorplanId", selectedFloorplanId);
            }
            fd.set("tableId", activeTable.id);
            fd.set("toStatus", toStatus);
            pendingToastRef.current = toastLabel;
            pendingIntentRef.current = null;
            tableActionFetcher.submit(fd, { method: "post" });
        },
        [
            activeTable,
            pendingIntentRef,
            pendingToastRef,
            selectedFloorplanId,
            tableActionFetcher,
        ],
    );

    return {
        activeTable,
        setActiveTable,
        moveSourceTable,
        pendingCombineStart,
        combineSelection,
        setCombineSelection,
        clearCombineSelection,
        onTableClick,
        startCombineSelection,
        cancelCombineStart,
        seatActiveTable,
        setActiveTableStatus,
        startMoveActiveTable,
    };
}
