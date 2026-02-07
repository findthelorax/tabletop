import * as React from "react";
import { Form, useLoaderData, useSubmit } from "react-router";

import type { Route } from "./+types/history";
import { requireAuth } from "../utils/auth.server";
import { loadHistoryData } from "../services/history.server";

export async function loader({ request }: Route.LoaderArgs) {
    await requireAuth(request);
    return loadHistoryData(request);
}

function formatTimeLocal(iso: string): string {
    let d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

type Grouped = Array<{
    serverName: string;
    events: Array<{
        time: string;
        label: string;
        tone: "plus" | "minus" | "move" | "neutral";
        tablesDelta: number;
        tablesTotal: number;
        guestsDelta: number;
        guestsTotal: number;
        subRows: Array<{ time: string; label: string }>;
    }>;
}>;

function groupRows(
    data: ReturnType<typeof useLoaderData<typeof loader>>,
): Grouped {
    let rowsByServer = new Map<string, typeof data.rows>();

    for (let r of data.rows) {
        let serverName = r.serverName?.trim()
            ? r.serverName.trim()
            : "Unassigned";
        let list = rowsByServer.get(serverName);
        if (!list) {
            list = [];
            rowsByServer.set(serverName, list);
        }
        list.push(r);
    }

    let servers = Array.from(rowsByServer.entries())
        .map(([serverName, rows]) => ({ serverName, rows }))
        .sort((a, b) => a.serverName.localeCompare(b.serverName));

    return servers.map((s) => {
        let tablesTotal = 0;
        let guestsTotal = 0;

        let events: Grouped[number]["events"] = [];
        let lastSeatEventIndexByTableId = new Map<string, number>();

        // Ensure chronological within server.
        let sortedRows = [...s.rows].sort(
            (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt),
        );

        for (let r of sortedRows) {
            let isSeat =
                r.kind === "seat-table" || r.kind === "seat-waitlist-combined";
            let isMove = r.kind === "move-seating";
            let isSection = r.kind === "set-section-status";

            let tablesDelta =
                isSeat && r.tableCount
                    ? r.isUndo
                        ? -r.tableCount
                        : r.tableCount
                    : 0;

            let guestsDelta =
                isSeat && r.guestCount
                    ? r.isUndo
                        ? -r.guestCount
                        : r.guestCount
                    : 0;

            tablesTotal = Math.max(0, tablesTotal + tablesDelta);
            guestsTotal = Math.max(0, guestsTotal + guestsDelta);

            let time = formatTimeLocal(r.occurredAt);

            // Attach table-status notes under the most recent seat event for that table.
            if (r.kind === "set-table-status" && r.tableId) {
                let lastIdx = lastSeatEventIndexByTableId.get(r.tableId);
                if (lastIdx != null) {
                    events[lastIdx]?.subRows.push({ time, label: r.label });
                    continue;
                }
            }

            let tone: "plus" | "minus" | "move" | "neutral" = "neutral";
            if (isMove) tone = "move";
            else if (tablesDelta > 0 || guestsDelta > 0) tone = "plus";
            else if (tablesDelta < 0 || guestsDelta < 0) tone = "minus";

            let idx = events.push({
                time,
                label: r.label,
                tone,
                tablesDelta,
                tablesTotal,
                guestsDelta,
                guestsTotal,
                subRows: [],
            });

            // Seat events anchor future table-status notes.
            if (isSeat && r.tableId) {
                lastSeatEventIndexByTableId.set(r.tableId, idx - 1);
            }

            // Keep section events as standalone items.
            if (isSection) {
                // no-op
            }
        }

        return { serverName: s.serverName, events };
    });
}

function Metrics({
    tablesDelta,
    tablesTotal,
    guestsDelta,
    guestsTotal,
}: {
    tablesDelta: number;
    tablesTotal: number;
    guestsDelta: number;
    guestsTotal: number;
}) {
    if (tablesDelta === 0 && guestsDelta === 0) return null;

    return (
        <span className="historyMetrics">
            {tablesDelta !== 0 ? (
                <span className="historyDelta">
                    {tablesDelta > 0 ? `+${tablesDelta}` : String(tablesDelta)}{" "}
                    {Math.abs(tablesDelta) === 1 ? "Table" : "Tables"}
                </span>
            ) : null}
            {tablesDelta !== 0 && guestsDelta !== 0 ? (
                <span className="historyMetricSep">·</span>
            ) : null}
            {guestsDelta !== 0 ? (
                <span className="historyDelta">
                    {guestsDelta > 0 ? `+${guestsDelta}` : String(guestsDelta)}{" "}
                    {Math.abs(guestsDelta) === 1 ? "Guest" : "Guests"}
                </span>
            ) : null}
            <span className="historyMetricSep">·</span>
            <span className="historyTotal">
                Total: {tablesTotal} {tablesTotal === 1 ? "Table" : "Tables"}
                {" / "}
                {guestsTotal} {guestsTotal === 1 ? "Guest" : "Guests"}
            </span>
        </span>
    );
}

export default function History(_: Route.ComponentProps) {
    let data = useLoaderData<typeof loader>();
    let submit = useSubmit();

    let grouped = React.useMemo(() => groupRows(data), [data]);

    return (
        <div className="page">
            <div className="pageTitleRow">
                <h1 className="pageTitle">History</h1>
                <Form method="get" className="historyControls">
                    <label className="historyDateLabel">
                        Day
                        <input
                            className="historyDateInput"
                            type="date"
                            name="day"
                            value={data.serviceDay}
                            onChange={(e) => submit(e.currentTarget.form)}
                        />
                    </label>
                </Form>
            </div>

            <p className="pageSubtitle">
                Table and section actions, grouped by server.
            </p>

            {grouped.length === 0 ? (
                <div className="historyEmpty">No actions for this day.</div>
            ) : (
                <div className="historyGroups">
                    {grouped.map((server) => (
                        <section
                            key={server.serverName}
                            className="historyServer"
                        >
                            <h2 className="historyServerTitle">
                                {server.serverName}
                            </h2>

                            <div className="historyTimeline">
                                {server.events.map((ev, idx) => (
                                    <div key={`${server.serverName}-${idx}`}>
                                        <div
                                            className={`historyRow historyRowTone--${ev.tone}`}
                                        >
                                            <div className="historyTime">
                                                {ev.time}
                                            </div>
                                            <div className="historyLabel">
                                                <span className="historyLabelText">
                                                    {ev.label}
                                                </span>
                                                <Metrics
                                                    tablesDelta={ev.tablesDelta}
                                                    tablesTotal={ev.tablesTotal}
                                                    guestsDelta={ev.guestsDelta}
                                                    guestsTotal={ev.guestsTotal}
                                                />
                                            </div>
                                        </div>

                                        {ev.subRows.length > 0 ? (
                                            <div className="historySubRows">
                                                {ev.subRows.map((s, sIdx) => (
                                                    <div
                                                        key={`${server.serverName}-${idx}-sub-${sIdx}`}
                                                        className="historySubRow"
                                                    >
                                                        <div className="historySubTime">
                                                            {s.time}
                                                        </div>
                                                        <div className="historySubLabel">
                                                            {s.label}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
