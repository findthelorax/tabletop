import type { TableStatus } from "@prisma/client";

export function DashboardTableTile({
    tableNumber,
    capacity,
    status,
    subtitle,
    overdue,
    temp,
    disabled,
    onClick,
}: {
    tableNumber: number;
    capacity?: number;
    status: TableStatus;
    subtitle?: React.ReactNode;
    overdue: boolean;
    temp?: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className="dashboardTableTile"
            data-status={status}
            data-overdue={overdue ? "true" : "false"}
            data-temp={temp ? "true" : "false"}
            disabled={disabled}
            onClick={onClick}
        >
            <div className="dashboardTableTileNumber">{tableNumber}</div>
            {status === "ON_HOLD" ? (
                <div className="dashboardTableTileSeats dashboardTableTileHoldLabel">
                    Hold
                </div>
            ) : typeof capacity === "number" ? (
                <div className="dashboardTableTileSeats">{capacity}</div>
            ) : null}
            {subtitle ? (
                <div className="dashboardTableTileMeta">{subtitle}</div>
            ) : null}
        </button>
    );
}
