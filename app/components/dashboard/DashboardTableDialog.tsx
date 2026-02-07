import * as React from "react";
import type { TableStatus } from "@prisma/client";

import { Modal } from "../../ui/modal";

type TableModel = {
    id: string;
    tableNumber: number;
    capacity: number;
    status: TableStatus;
    seatedPartySize: number | null;
    seatedAt: string | null;
};

function statusLabel(status: TableStatus) {
    switch (status) {
        case "AVAILABLE":
            return "Clean";
        case "SEATED":
            return "Sat";
        case "ON_HOLD":
            return "On Hold";
        case "DIRTY":
            return "Dirty";
        case "DISABLED":
            return "Disabled";
        default: {
            let raw = String(status);
            return raw
                .split("_")
                .map((s: string) => s.slice(0, 1) + s.slice(1).toLowerCase())
                .join(" ");
        }
    }
}

export function DashboardTableDialog({
    open,
    table,
    isBusy,
    onClose,
    onSeat,
    onSetStatus,
    onMove,
}: {
    open: boolean;
    table: TableModel | null;
    isBusy: boolean;
    onClose: () => void;
    onSeat: (partySize: number) => void;
    onSetStatus: (
        toStatus: "AVAILABLE" | "DIRTY" | "ON_HOLD" | "DISABLED",
    ) => void;
    onMove: () => void;
}) {
    if (!open || !table) return null;

    let isSeated = table.status === "SEATED";
    let isDisabled = table.status === "DISABLED";
    let isDirty = table.status === "DIRTY";
    let isHold = table.status === "ON_HOLD";
    let isAvailable = table.status === "AVAILABLE";

    let canSeat = isAvailable || isHold;

    if (isSeated) {
        return (
            <Modal
                open={open}
                title={`Table ${table.tableNumber}`}
                onClose={() => {
                    if (isBusy) return;
                    onClose();
                }}
            >
                <div className="dashboardDialogBody">
                    <div className="dashboardDialogActions">
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                            data-status="DIRTY"
                            disabled={isBusy}
                            onClick={() => onSetStatus("DIRTY")}
                        >
                            Dirty
                        </button>
                        <button
                            type="button"
                            className="tablesPrimaryButton tablesSmallButton dashboardStatusButton"
                            data-status="AVAILABLE"
                            disabled={isBusy}
                            onClick={() => onSetStatus("AVAILABLE")}
                        >
                            Clean
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                            data-status="ON_HOLD"
                            disabled={isBusy}
                            onClick={() => onSetStatus("ON_HOLD")}
                        >
                            Hold
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                            data-status="DISABLED"
                            disabled={isBusy}
                            onClick={() => onSetStatus("DISABLED")}
                        >
                            Disable
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton"
                            disabled={isBusy}
                            onClick={() => onMove()}
                            data-action="move"
                            data-kind="move"
                        >
                            Move
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    if (isDisabled) {
        return (
            <Modal
                open={open}
                title={`Table ${table.tableNumber}`}
                onClose={() => {
                    if (isBusy) return;
                    onClose();
                }}
            >
                <div className="dashboardDialogBody">
                    <div className="dashboardDialogActions">
                        <button
                            type="button"
                            className="tablesPrimaryButton tablesSmallButton dashboardStatusButton"
                            data-status="AVAILABLE"
                            disabled={isBusy}
                            onClick={() => onSetStatus("AVAILABLE")}
                        >
                            Clean
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                            data-status="ON_HOLD"
                            disabled={isBusy}
                            onClick={() => onSetStatus("ON_HOLD")}
                        >
                            Hold
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            open={open}
            title={`Table ${table.tableNumber}`}
            onClose={() => {
                if (isBusy) return;
                onClose();
            }}
        >
            <div className="dashboardDialogBody">
                {table.status === "DIRTY" ? null : (
                    <div className="dashboardDialogMeta">
                        <div>
                            <div className="tablesLabel">Status</div>
                            <div>{statusLabel(table.status)}</div>
                        </div>
                        <div>
                            <div className="tablesLabel">Seats</div>
                            <div>{table.capacity}</div>
                        </div>
                    </div>
                )}

                {canSeat ? (
                    <div className="dashboardDialogSection">
                        <div className="dashboardDialogSectionTitle">Seat</div>
                        <div className="dashboardSeatButtons" role="list">
                            {Array.from(
                                { length: Math.max(1, table.capacity) },
                                (_, i) => i + 1,
                            ).map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardSeatButton"
                                    disabled={isBusy}
                                    onClick={() => onSeat(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="dashboardDialogSection">
                    <div className="dashboardDialogActions">
                        {isAvailable ? (
                            <>
                                <button
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="DIRTY"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("DIRTY")}
                                >
                                    Dirty
                                </button>
                                <button
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="ON_HOLD"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("ON_HOLD")}
                                >
                                    Hold
                                </button>
                                <button
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="DISABLED"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("DISABLED")}
                                >
                                    Disable
                                </button>
                            </>
                        ) : isDirty ? (
                            <>
                                <button
                                    type="button"
                                    className="tablesPrimaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="AVAILABLE"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("AVAILABLE")}
                                >
                                    Clean
                                </button>
                                <button
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="ON_HOLD"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("ON_HOLD")}
                                >
                                    Hold
                                </button>
                                <button
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="DISABLED"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("DISABLED")}
                                >
                                    Disable
                                </button>
                            </>
                        ) : isHold ? (
                            <>
                                <button
                                    type="button"
                                    className="tablesPrimaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="AVAILABLE"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("AVAILABLE")}
                                >
                                    Clean
                                </button>
                                <button
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="DISABLED"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("DISABLED")}
                                >
                                    Disable
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="ON_HOLD"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("ON_HOLD")}
                                >
                                    Hold
                                </button>
                                <button
                                    type="button"
                                    className="tablesSecondaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="DISABLED"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("DISABLED")}
                                >
                                    Disable
                                </button>
                                <button
                                    type="button"
                                    className="tablesPrimaryButton tablesSmallButton dashboardStatusButton"
                                    data-status="AVAILABLE"
                                    disabled={isBusy}
                                    onClick={() => onSetStatus("AVAILABLE")}
                                >
                                    Clean
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
