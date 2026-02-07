import type * as React from "react";
import type { FetcherWithComponents } from "react-router";

import { ConfirmDialog } from "../../../ui/confirm-dialog";
import type { DeleteFloorplanResult } from "./types";

type Props = {
    open: boolean;
    isBusy: boolean;
    selectedFloorplanId: string | null;
    selectedFloorplanName: string | null;
    deleteFloorplanFetcher: FetcherWithComponents<DeleteFloorplanResult>;
    onCancel: () => void;
};

export function RemoveFloorplanDialog({
    open,
    isBusy,
    selectedFloorplanId,
    selectedFloorplanName,
    deleteFloorplanFetcher,
    onCancel,
}: Props) {
    return (
        <ConfirmDialog
            open={open}
            title="Delete floorplan?"
            description={`Delete floorplan "${selectedFloorplanName ?? ""}"?`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            isBusy={isBusy}
            onConfirm={() => {
                if (!selectedFloorplanId) return;
                let fd = new FormData();
                fd.set("intent", "delete-floorplan");
                fd.set("floorplanId", selectedFloorplanId);
                deleteFloorplanFetcher.submit(fd, { method: "post" });
            }}
            onCancel={onCancel}
        />
    );
}
