import * as React from "react";

import { ConfirmDialog } from "../../ui/confirm-dialog";

export function DashboardCombineTablesDialog(props: {
    open: boolean;
    seatPartySize: number | null;
    pendingCombineStart: {
        tableNumber: number;
        capacity: number;
    } | null;
    isBusy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <ConfirmDialog
            open={props.open}
            title="Combine tables?"
            description={
                props.pendingCombineStart && props.seatPartySize
                    ? `Party size ${props.seatPartySize} is larger than Table ${props.pendingCombineStart.tableNumber} (${props.pendingCombineStart.capacity} seats). Combine tables by selecting more tables until seats cover the party size.`
                    : "Combine tables by selecting more tables."
            }
            confirmLabel="Combine"
            cancelLabel="Cancel"
            isBusy={props.isBusy}
            onConfirm={props.onConfirm}
            onCancel={props.onCancel}
        />
    );
}
