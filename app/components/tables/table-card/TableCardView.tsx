import * as React from "react";

export function TableCardView({
    tableNumber,
    kindLabel,
    capacity,
    occupied,
    onEdit,
    onDelete,
    disableActions,
}: {
    tableNumber: number;
    kindLabel: string;
    capacity: number;
    occupied: number;
    onEdit: () => void;
    onDelete: () => void;
    disableActions: boolean;
}) {
    return (
        <>
            <div className="tableCardHeader">
                <div className="tableCardNumber">{tableNumber}</div>
                <div className="tableCardKind">{kindLabel}</div>
            </div>

            <div
                className="tableSeatGrid"
                aria-label={`${occupied} of ${capacity} seats taken`}
            >
                {Array.from({ length: capacity }).map((_, idx) => (
                    <div
                        key={idx}
                        className={
                            idx < occupied
                                ? "tableSeat tableSeatOccupied"
                                : "tableSeat tableSeatOpen"
                        }
                    />
                ))}
            </div>

            <div className="tableCardActions">
                <button
                    type="button"
                    className="tablesSecondaryButton tablesSmallButton"
                    data-action="edit"
                    onClick={onEdit}
                    disabled={disableActions}
                >
                    Edit
                </button>

                <button
                    type="button"
                    className="tablesSecondaryButton tablesSmallButton"
                    data-action="delete"
                    disabled={disableActions}
                    onClick={onDelete}
                >
                    Delete
                </button>
            </div>
        </>
    );
}
