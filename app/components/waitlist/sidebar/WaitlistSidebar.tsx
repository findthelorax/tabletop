import * as React from "react";
import { useFetcher, useNavigate, useSearchParams } from "react-router";

import {
    fdWaitlistAdd,
    fdWaitlistArrived,
    fdWaitlistEdit,
    fdWaitlistRemove,
    fdWaitlistText,
} from "../waitlist-formdata";
import { useWaitlistSidebarPolling } from "../use-waitlist-sidebar-polling";
import { useWaitlistActionFeedback } from "../use-waitlist-action-feedback";
import type {
    ActionResult,
    SidebarData,
    SidebarWaitlistItem,
} from "../waitlist-sidebar-types";

import { WaitlistCollapsedView } from "./WaitlistCollapsedView";
import { WaitlistSidebarDialogs } from "./WaitlistSidebarDialogs";
import { WaitlistSidebarHeader } from "./WaitlistSidebarHeader";
import { WaitlistList } from "./WaitlistList";
import { WaitlistSidebarStatusKey } from "./WaitlistSidebarStatusKey";

export function WaitlistSidebar({
    collapsed,
    initialData,
    onToggleCollapsed,
}: {
    collapsed: boolean;
    initialData?: SidebarData;
    onToggleCollapsed: () => void;
}) {
    let dataFetcher = useFetcher<SidebarData>();
    let actionFetcher = useFetcher<ActionResult>();

    let pendingToastRef = React.useRef<string | null>(null);
    let closeGuestOnSuccessRef = React.useRef(false);

    let [searchParams, setSearchParams] = useSearchParams();
    let navigate = useNavigate();

    let seatWaitlistId = searchParams.get("seatWaitlistId");

    let [addOpen, setAddOpen] = React.useState(false);
    let [activeGuestId, setActiveGuestId] = React.useState<string | null>(null);
    let [confirmRemoveId, setConfirmRemoveId] = React.useState<string | null>(
        null,
    );

    useWaitlistSidebarPolling(dataFetcher, {
        pollMs: 30_000,
        enabled: !collapsed,
    });

    useWaitlistActionFeedback({
        actionFetcher,
        dataFetcher,
        pendingToastRef,
        onSuccess: () => {
            setAddOpen(false);
            setConfirmRemoveId(null);
            if (closeGuestOnSuccessRef.current) {
                closeGuestOnSuccessRef.current = false;
                setActiveGuestId(null);
            }
        },
    });

    let items = dataFetcher.data?.items ?? initialData?.items ?? [];
    let tables = dataFetcher.data?.tables ?? initialData?.tables ?? [];
    let hasLoaded = (dataFetcher.data ?? initialData) != null;

    let activeGuest = React.useMemo(() => {
        if (!activeGuestId) return null;
        return items.find((i) => i.id === activeGuestId) ?? null;
    }, [activeGuestId, items]);

    let startSeating = React.useCallback(
        (guest: SidebarWaitlistItem) => {
            let next = new URLSearchParams(searchParams);
            next.set("seatWaitlistId", guest.id);
            next.set("seatPartySize", String(guest.partySize));
            next.set("seatPartyName", guest.partyName);
            navigate(`/?${next.toString()}`);
        },
        [navigate, searchParams],
    );

    let cancelSeating = React.useCallback(() => {
        let next = new URLSearchParams(searchParams);
        next.delete("seatWaitlistId");
        next.delete("seatPartySize");
        next.delete("seatPartyName");
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    let submitArrived = React.useCallback(
        (id: string) => {
            pendingToastRef.current = "Marked arrived";
            closeGuestOnSuccessRef.current = true;
            actionFetcher.submit(fdWaitlistArrived(id), {
                method: "post",
                action: "/waitlist",
            });
        },
        [actionFetcher],
    );

    let submitRemove = React.useCallback(
        (id: string, partyName?: string) => {
            pendingToastRef.current = partyName?.trim()
                ? `Removed ${partyName.trim()} from the waitlist`
                : "Removed from waitlist";
            actionFetcher.submit(fdWaitlistRemove(id), {
                method: "post",
                action: "/waitlist",
            });
        },
        [actionFetcher],
    );

    let submitEdit = React.useCallback(
        (values: {
            id: string;
            partyName: string;
            partySize: number;
            phoneNumber: string;
            isCallAhead: boolean;
            preferredTableId: string | null;
            quotedWaitMinutes: number | null;
            notes: string;
        }) => {
            pendingToastRef.current = "Updated guest";
            closeGuestOnSuccessRef.current = true;
            actionFetcher.submit(fdWaitlistEdit(values), {
                method: "post",
                action: "/waitlist",
            });
        },
        [actionFetcher],
    );

    let submitText = React.useCallback(
        (id: string) => {
            pendingToastRef.current = "Text sent";
            actionFetcher.submit(fdWaitlistText(id), {
                method: "post",
                action: "/waitlist",
            });
        },
        [actionFetcher],
    );

    return (
        <>
            <WaitlistSidebarHeader
                collapsed={collapsed}
                count={items.length}
                onToggleCollapsed={onToggleCollapsed}
            />

            <div className="waitlistSidebar">
                {collapsed ? (
                    <WaitlistCollapsedView
                        items={items}
                        onOpenGuest={(id) => setActiveGuestId(id)}
                    />
                ) : null}

                {collapsed ? null : (
                    <button
                        type="button"
                        className="waitlistAddButton"
                        onClick={() => setAddOpen(true)}
                    >
                        Add to waitlist
                    </button>
                )}

                {collapsed ? null : hasLoaded && items.length === 0 ? (
                    <div className="waitlistEmpty">No guests waiting</div>
                ) : collapsed ? null : (
                    <WaitlistList
                        items={items}
                        seatWaitlistId={seatWaitlistId ?? null}
                        onOpenGuest={(id) => setActiveGuestId(id)}
                        onCancelSeating={cancelSeating}
                    />
                )}

                {collapsed ? null : <WaitlistSidebarStatusKey />}

                <WaitlistSidebarDialogs
                    addOpen={addOpen}
                    onCloseAdd={() => setAddOpen(false)}
                    onSubmitAdd={(values) => {
                        pendingToastRef.current = values.partyName
                            ? `Added ${values.partyName}`
                            : "Added to waitlist";
                        actionFetcher.submit(fdWaitlistAdd(values), {
                            method: "post",
                            action: "/waitlist",
                        });
                    }}
                    activeGuest={activeGuest}
                    onCloseGuest={() => setActiveGuestId(null)}
                    isSeatingThisGuest={
                        !!seatWaitlistId &&
                        !!activeGuest &&
                        seatWaitlistId === activeGuest.id
                    }
                    tables={tables}
                    isBusy={actionFetcher.state !== "idle"}
                    onArrived={(id) => submitArrived(id)}
                    onRemove={(id) => setConfirmRemoveId(id)}
                    onEdit={submitEdit}
                    onText={submitText}
                    onSit={(guest) => {
                        setActiveGuestId(null);
                        startSeating(guest);
                    }}
                    onCancelSit={() => cancelSeating()}
                    confirmRemoveId={confirmRemoveId}
                    onConfirmRemove={() => {
                        if (!confirmRemoveId) return;
                        let guest =
                            items.find((i) => i.id === confirmRemoveId) ?? null;
                        submitRemove(confirmRemoveId, guest?.partyName);
                    }}
                    onCancelConfirmRemove={() => setConfirmRemoveId(null)}
                />
            </div>
        </>
    );
}
