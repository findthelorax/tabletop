import * as React from "react";

export function WaitlistSidebarHeader({
    collapsed,
    count,
    onToggleCollapsed,
}: {
    collapsed: boolean;
    count: number;
    onToggleCollapsed: () => void;
}) {
    return (
        <div className="sidebarHeader">
            <button
                type="button"
                className="sidebarToggle"
                onClick={() => onToggleCollapsed()}
                aria-pressed={collapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed ? ">" : "<"}
            </button>

            {collapsed ? null : (
                <div className="waitlistSidebarHeaderInline">
                    <div className="waitlistSidebarTitle">Waitlist</div>
                    <div className="waitlistSidebarCount">{count}</div>
                </div>
            )}
        </div>
    );
}
