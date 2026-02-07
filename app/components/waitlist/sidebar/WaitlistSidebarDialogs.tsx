import * as React from "react";

import { ConfirmDialog } from "../../../ui/confirm-dialog";

import { WaitlistAddDialog } from "../WaitlistAddDialog";
import { WaitlistGuestDialog } from "../WaitlistGuestDialog";
import type {
    SidebarData,
    SidebarWaitlistItem,
} from "../waitlist-sidebar-types";

export function WaitlistSidebarDialogs({
    addOpen,
    onCloseAdd,
    onSubmitAdd,
    activeGuest,
    onCloseGuest,
    isSeatingThisGuest,
    tables,
    isBusy,
    onArrived,
    onRemove,
    onEdit,
    onText,
    onSit,
    onCancelSit,
    confirmRemoveId,
    onConfirmRemove,
    onCancelConfirmRemove,
}: {
    addOpen: boolean;
    onCloseAdd: () => void;
    onSubmitAdd: (values: {
        partyName: string;
        partySize: number;
        phoneNumber: string;
        isCallAhead: boolean;
        preferredTableId: string | null;
        quotedWaitMinutes: number | null;
        notes: string;
    }) => void;

    activeGuest: SidebarWaitlistItem | null;
    onCloseGuest: () => void;
    isSeatingThisGuest: boolean;

    tables: SidebarData["tables"];
    isBusy: boolean;

    onArrived: (id: string) => void;
    onRemove: (id: string) => void;
    onEdit: (values: {
        id: string;
        partyName: string;
        partySize: number;
        phoneNumber: string;
        isCallAhead: boolean;
        preferredTableId: string | null;
        quotedWaitMinutes: number | null;
        notes: string;
    }) => void;
    onText: (id: string) => void;
    onSit: (guest: SidebarWaitlistItem) => void;
    onCancelSit: () => void;

    confirmRemoveId: string | null;
    onConfirmRemove: () => void;
    onCancelConfirmRemove: () => void;
}) {
    return (
        <>
            <WaitlistAddDialog
                open={addOpen}
                isBusy={isBusy}
                tables={tables}
                onClose={onCloseAdd}
                onSubmit={onSubmitAdd}
            />

            <WaitlistGuestDialog
                open={activeGuest !== null}
                guest={activeGuest}
                isBusy={isBusy}
                isSeatingThisGuest={isSeatingThisGuest}
                tables={tables}
                onClose={onCloseGuest}
                onArrived={onArrived}
                onRemove={onRemove}
                onEdit={onEdit}
                onText={onText}
                onSit={onSit}
                onCancelSit={onCancelSit}
            />

            <ConfirmDialog
                open={confirmRemoveId !== null}
                title="Remove guest?"
                description="This will remove the guest from the active waitlist."
                confirmLabel="Remove"
                cancelLabel="Cancel"
                isBusy={isBusy}
                onConfirm={onConfirmRemove}
                onCancel={onCancelConfirmRemove}
            />
        </>
    );
}
