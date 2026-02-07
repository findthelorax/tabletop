import * as React from "react";

import { ConfirmDialog } from "../../../ui/confirm-dialog";

export function TableCardDeleteConfirm({
    open,
    tableNumber,
    isBusy,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    tableNumber: number;
    isBusy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <ConfirmDialog
            open={open}
            title="Delete table?"
            description={`Delete table ${tableNumber}?`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            isBusy={isBusy}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}
