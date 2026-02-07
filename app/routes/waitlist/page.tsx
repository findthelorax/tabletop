import * as React from "react";
import type { WaitlistStatus } from "@prisma/client";
import { useLoaderData, useSearchParams } from "react-router";
import type { Route } from "../+types/waitlist";

import { computeWaitTimer } from "../../components/waitlist/waitlist-utils";
import { useNowMs } from "../../components/waitlist/use-waitlist-sidebar-polling";

import type { WaitlistItem, WaitlistLoaderData } from "./types";
import { isServiceDay } from "./utils";

export default function Waitlist(_: Route.ComponentProps) {
    let {
        items,
        selectedServiceDay,
        lunchAverageWaitMinutes,
        dinnerAverageWaitMinutes,
    } = useLoaderData() as WaitlistLoaderData;

    let [searchParams, setSearchParams] = useSearchParams();
    let nowMs = useNowMs(1_000);

    let outcomeFor = React.useCallback((status: WaitlistStatus) => {
        if (status === "SEATED") return "Sat";
        if (status === "CANCELLED" || status === "NO_SHOW") return "Cancelled";
        return "—";
    }, []);

    let waitLabel = React.useCallback(
        (item: WaitlistItem): React.ReactNode => {
            let isActive =
                item.status === "CALL_AHEAD" ||
                item.status === "WAITING" ||
                item.status === "ARRIVED";

            if (isActive) {
                let timer = computeWaitTimer({
                    isCallAhead: item.isCallAhead,
                    waitingStartedAt: item.waitingStartedAt,
                    quotedWaitMinutes: item.quotedWaitMinutes,
                    nowMs,
                });

                return (
                    <span
                        className="waitlistReportTimer"
                        data-state={timer.state}
                    >
                        {timer.label}
                    </span>
                );
            }

            if (typeof item.waitMinutes === "number")
                return `${item.waitMinutes}m`;
            return "—";
        },
        [nowMs],
    );

    let statusLabel = React.useCallback((item: WaitlistItem) => {
        if (item.status === "CALL_AHEAD") return "CALL AHEAD";
        if (item.status === "NO_SHOW") return "NO SHOW";
        return item.status;
    }, []);

    let outcomeLabel = React.useCallback((item: WaitlistItem) => {
        if (item.status === "SEATED") return item.seatedTableLabel ?? "—";
        if (item.status === "CANCELLED" || item.status === "NO_SHOW")
            return "Cancelled";
        return "—";
    }, []);

    return (
        <div className="page">
            <h1 className="pageTitle">Waitlist</h1>
            <p className="pageSubtitle">Track parties waiting to be seated.</p>

            <div className="waitlistReport">
                <div className="waitlistReportHeader" role="row">
                    <div role="columnheader">Service day</div>
                    <div role="columnheader">Lunch avg (11a–4p)</div>
                    <div role="columnheader">Dinner avg (4p–12a)</div>
                    <div role="columnheader"></div>
                </div>
                <div className="waitlistReportRow" role="row">
                    <div role="cell" className="waitlistReportParty">
                        <input
                            className="waitlistInput"
                            type="date"
                            value={selectedServiceDay}
                            onChange={(e) => {
                                let next = e.target.value;
                                let nextParams = new URLSearchParams(
                                    searchParams,
                                );
                                if (next && isServiceDay(next)) {
                                    nextParams.set("date", next);
                                } else {
                                    nextParams.delete("date");
                                }
                                setSearchParams(nextParams);
                            }}
                        />
                    </div>
                    <div role="cell" className="waitlistReportCell">
                        {lunchAverageWaitMinutes != null
                            ? `${lunchAverageWaitMinutes}m`
                            : "—"}
                    </div>
                    <div role="cell" className="waitlistReportCell">
                        {dinnerAverageWaitMinutes != null
                            ? `${dinnerAverageWaitMinutes}m`
                            : "—"}
                    </div>
                    <div role="cell" className="waitlistReportCell"></div>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="waitlistEmpty">No guests waiting</div>
            ) : (
                <div className="waitlistReport">
                    <div className="waitlistReportHeader" role="row">
                        <div role="columnheader">Party</div>
                        <div role="columnheader">Size</div>
                        <div role="columnheader">Wait</div>
                        <div role="columnheader">Preferred Table</div>
                        <div role="columnheader">Notes</div>
                        <div role="columnheader">Outcome</div>
                    </div>

                    <ul className="waitlistReportList" role="rowgroup">
                        {items.map((item) => (
                            <li
                                key={item.id}
                                className="waitlistReportRow"
                                role="row"
                            >
                                <div
                                    className="waitlistReportParty"
                                    role="cell"
                                >
                                    <div className="waitlistPartyName">
                                        {item.partyName}
                                    </div>
                                    <div className="waitlistReportMeta">
                                        <span className="waitlistReportStatus">
                                            {statusLabel(item)}
                                        </span>
                                    </div>
                                </div>
                                <div role="cell" className="waitlistReportCell">
                                    {item.partySize}
                                </div>
                                <div role="cell" className="waitlistReportCell">
                                    {waitLabel(item)}
                                </div>
                                <div role="cell" className="waitlistReportCell">
                                    {item.preferredTableNumber != null
                                        ? item.preferredTableNumber
                                        : "—"}
                                </div>
                                <div
                                    role="cell"
                                    className="waitlistReportCell waitlistReportNotesCell"
                                    title={item.notes ?? ""}
                                >
                                    {item.notes ? item.notes : "—"}
                                </div>
                                <div role="cell" className="waitlistReportCell">
                                    {outcomeLabel(item)}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
