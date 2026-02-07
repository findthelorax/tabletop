import * as React from "react";

import { computeWaitTimer } from "../waitlist-utils";
import { getWaitlistStatusLabel } from "../waitlist-status-label";
import { useNowMs } from "../use-waitlist-sidebar-polling";
import type { SidebarWaitlistItem } from "../waitlist-sidebar-types";

export function WaitlistList({
    items,
    seatWaitlistId,
    onOpenGuest,
    onCancelSeating,
}: {
    items: SidebarWaitlistItem[];
    seatWaitlistId: string | null;
    onOpenGuest: (id: string) => void;
    onCancelSeating: () => void;
}) {
    let nowMs = useNowMs(1_000);

    return (
        <ul className="waitlistList">
            {items.map((item) => {
                let timer = computeWaitTimer({
                    isCallAhead: item.isCallAhead,
                    waitingStartedAt: item.waitingStartedAt,
                    quotedWaitMinutes: item.quotedWaitMinutes,
                    nowMs,
                });

                let statusLabel = getWaitlistStatusLabel({
                    item,
                    seatWaitlistId,
                });

                let isSitting = !!seatWaitlistId && seatWaitlistId === item.id;

                return (
                    <li key={item.id} className="waitlistRow">
                        <div className="waitlistRowLayout">
                            <button
                                type="button"
                                className="waitlistRowButton"
                                onClick={() => onOpenGuest(item.id)}
                            >
                                <div className="waitlistPartyName">
                                    {item.partyName} • {item.partySize}
                                </div>

                                <div
                                    className="waitlistTimer"
                                    data-state={timer.state}
                                >
                                    {timer.label}
                                </div>

                                <div className="waitlistStatus">
                                    {statusLabel}
                                </div>

                                {item.preferredTableNumber != null ? (
                                    <div className="waitlistPref">
                                        Pref: {item.preferredTableNumber}
                                    </div>
                                ) : (
                                    <div className="waitlistPref" />
                                )}

                                {item.notes ? (
                                    <div className="waitlistMetaNote">
                                        {item.notes}
                                    </div>
                                ) : (
                                    <div className="waitlistMetaNote" />
                                )}
                            </button>

                            {isSitting ? (
                                <button
                                    type="button"
                                    className="waitlistRowCancelButton"
                                    data-action="cancel"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onCancelSeating();
                                    }}
                                >
                                    Cancel
                                </button>
                            ) : null}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
