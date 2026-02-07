import * as React from "react";

export function useDashboardSubmitters({
    selectedFloorplanId,
    tableActionFetcher,
    floorplanPrefFetcher,
    pendingToastRef,
    pendingIntentRef,
    searchParams,
    setSearchParams,
}: {
    selectedFloorplanId: string | null;
    tableActionFetcher: {
        submit: (fd: FormData, opts: { method: "post" }) => void;
    };
    floorplanPrefFetcher: {
        submit: (fd: FormData, opts: { method: "post" }) => void;
    };
    pendingToastRef: React.MutableRefObject<string | null>;
    pendingIntentRef: React.MutableRefObject<string | null>;
    searchParams: URLSearchParams;
    setSearchParams: (next: URLSearchParams) => void;
}) {
    let submitSetSectionServerId = React.useCallback(
        (sectionId: string, serverId: string | null) => {
            let fd = new FormData();
            fd.set("intent", "set-section-server-id");
            if (selectedFloorplanId) {
                fd.set("floorplanId", selectedFloorplanId);
            }
            fd.set("sectionId", sectionId);
            fd.set("serverId", serverId ?? "");
            pendingToastRef.current = "Updated section";
            pendingIntentRef.current = "set-section-server-id";
            tableActionFetcher.submit(fd, { method: "post" });
        },
        [
            pendingIntentRef,
            pendingToastRef,
            selectedFloorplanId,
            tableActionFetcher,
        ],
    );

    let submitSetSectionStatus = React.useCallback(
        (sectionId: string, toStatus: "AVAILABLE" | "DISABLED") => {
            let fd = new FormData();
            fd.set("intent", "set-section-status");
            if (selectedFloorplanId) {
                fd.set("floorplanId", selectedFloorplanId);
            }
            fd.set("sectionId", sectionId);
            fd.set("toStatus", toStatus);
            pendingToastRef.current =
                toStatus === "AVAILABLE"
                    ? "Enabled section"
                    : "Disabled section";
            pendingIntentRef.current = "set-section-status";
            tableActionFetcher.submit(fd, { method: "post" });
        },
        [
            pendingIntentRef,
            pendingToastRef,
            selectedFloorplanId,
            tableActionFetcher,
        ],
    );

    let submitDisableAvailableTables = React.useCallback(
        (sectionId: string) => {
            let fd = new FormData();
            fd.set("intent", "set-section-status");
            if (selectedFloorplanId) {
                fd.set("floorplanId", selectedFloorplanId);
            }
            fd.set("sectionId", sectionId);
            fd.set("toStatus", "DISABLED");
            fd.set("scope", "available");
            pendingToastRef.current = "Disabled clean tables";
            pendingIntentRef.current = "set-section-status";
            tableActionFetcher.submit(fd, { method: "post" });
        },
        [
            pendingIntentRef,
            pendingToastRef,
            selectedFloorplanId,
            tableActionFetcher,
        ],
    );

    let submitUndoAction = React.useCallback(
        (actionId: string) => {
            let fd = new FormData();
            fd.set("intent", "undo-action");
            fd.set("actionId", actionId);
            if (selectedFloorplanId) {
                fd.set("floorplanId", selectedFloorplanId);
            }
            pendingToastRef.current = "Action undone";
            pendingIntentRef.current = "undo-action";
            tableActionFetcher.submit(fd, { method: "post" });
        },
        [
            pendingIntentRef,
            pendingToastRef,
            selectedFloorplanId,
            tableActionFetcher,
        ],
    );

    let submitAddTempTable = React.useCallback(
        (toSectionId: string, tableId: string) => {
            let fd = new FormData();
            fd.set("intent", "add-temp-table");
            if (selectedFloorplanId) {
                fd.set("floorplanId", selectedFloorplanId);
            }
            fd.set("toSectionId", toSectionId);
            fd.set("tableId", tableId);
            pendingToastRef.current = "Temp table added";
            pendingIntentRef.current = "add-temp-table";
            tableActionFetcher.submit(fd, { method: "post" });
        },
        [
            pendingIntentRef,
            pendingToastRef,
            selectedFloorplanId,
            tableActionFetcher,
        ],
    );

    let onFloorplanChange = React.useCallback(
        (nextId: string) => {
            let next = new URLSearchParams(searchParams);
            if (!nextId) {
                next.delete("floorplanId");
            } else {
                next.set("floorplanId", nextId);
            }
            setSearchParams(next);

            let fd = new FormData();
            fd.set("intent", "set-dashboard-floorplan");
            fd.set("floorplanId", nextId);
            floorplanPrefFetcher.submit(fd, { method: "post" });
        },
        [floorplanPrefFetcher, searchParams, setSearchParams],
    );

    return {
        submitSetSectionServerId,
        submitSetSectionStatus,
        submitDisableAvailableTables,
        submitUndoAction,
        submitAddTempTable,
        onFloorplanChange,
    };
}
