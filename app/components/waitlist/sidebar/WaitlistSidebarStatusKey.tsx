import * as React from "react";

export function WaitlistSidebarStatusKey() {
    return (
        <div
            className="dashboardStatusKey waitlistSidebarStatusKey"
            aria-label="Table status key"
        >
            <span className="dashboardStatusChip" data-kind="available">
                Clean
            </span>
            <span className="dashboardStatusChip" data-kind="seated">
                Sat
            </span>
            <span className="dashboardStatusChip" data-kind="dirty">
                Dirty
            </span>
            <span className="dashboardStatusChip" data-kind="hold">
                On Hold
            </span>
            <span className="dashboardStatusChip" data-kind="disabled">
                Disabled
            </span>
            <span className="dashboardStatusChip" data-kind="temp">
                Temp
            </span>
        </div>
    );
}
