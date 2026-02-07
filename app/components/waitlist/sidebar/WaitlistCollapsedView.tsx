import * as React from "react";

import type { SidebarWaitlistItem } from "../waitlist-sidebar-types";

export function WaitlistCollapsedView({
    items,
    onOpenGuest,
}: {
    items: SidebarWaitlistItem[];
    onOpenGuest: (id: string) => void;
}) {
    return (
        <>
            <div className="waitlistSidebarIcon">WL</div>
            <ul className="waitlistCollapsedList" aria-label="Waitlist">
                {items.map((item) => (
                    <li key={item.id} className="waitlistCollapsedItem">
                        <button
                            type="button"
                            className="waitlistCollapsedItemButton"
                            onClick={() => onOpenGuest(item.id)}
                            title={`${item.partyName} • ${item.partySize}`}
                        >
                            <div className="waitlistCollapsedName">
                                {item.partyName}
                            </div>
                            <div className="waitlistCollapsedSize">
                                {item.partySize}
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </>
    );
}
