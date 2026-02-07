import * as React from "react";

import { ConfirmDialog } from "../../../ui/confirm-dialog";

import type { ActionFetcher } from "./types";

export function RemoveAreaDialog({
    open,
    areaName,
    areaId,
    fetcher,
    onCancel,
}: {
    open: boolean;
    areaName: string;
    areaId: string;
    fetcher: ActionFetcher;
    onCancel: () => void;
}) {
    return (
        <ConfirmDialog
            open={open}
            title="Delete area?"
            description={`Delete area "${areaName}"? Tables will be moved to Unassigned.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            isBusy={fetcher.state !== "idle"}
            onConfirm={() => {
                let fd = new FormData();
                fd.set("intent", "delete-area");
                fd.set("areaId", areaId);
                fetcher.submit(fd, { method: "post" });
            }}
            onCancel={onCancel}
        />
    );
}
