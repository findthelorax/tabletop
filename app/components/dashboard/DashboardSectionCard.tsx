import * as React from "react";
import type { DashboardLoaderData } from "../../services/dashboard.server";

import { DashboardTableTile } from "./DashboardTableTile";
import { formatElapsedMinutes, minutesSince } from "./dashboard-utils";

type Section = DashboardLoaderData["sections"][number];
type Table = Section["tables"][number];

export function DashboardSectionCard({
    section,
    isBusy,
    onTableClick,
    onEditSection,
    onAddTempTable,
}: {
    section: Section;
    isBusy: boolean;
    onTableClick: (table: Table) => void;
    onEditSection: (sectionId: string) => void;
    onAddTempTable: (sectionId: string) => void;
}) {
    const [nowMs, setNowMs] = React.useState(() => Date.now());

    const isSectionEnabled = React.useMemo(() => {
        return section.tables.some((t) => t.status !== "DISABLED");
    }, [section.tables]);

    React.useEffect(() => {
        const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    let seatedGuests = React.useMemo(() => {
        return section.tables.reduce(
            (acc, t) =>
                t.status === "SEATED" && typeof t.seatedPartySize === "number"
                    ? acc + t.seatedPartySize
                    : acc,
            0,
        );
    }, [section.tables]);

    let enabledTimerMinutes = React.useMemo((): number | null => {
        if (!isSectionEnabled) return null;
        let enabledAtMs = section.enabledAt
            ? new Date(section.enabledAt).getTime()
            : null;
        let lastSeatedAtMs = section.lastSeatedAt
            ? new Date(section.lastSeatedAt).getTime()
            : null;

        let baseIso: string | null = null;
        if (enabledAtMs !== null && lastSeatedAtMs !== null) {
            baseIso =
                lastSeatedAtMs >= enabledAtMs
                    ? section.lastSeatedAt
                    : section.enabledAt;
        } else {
            baseIso = section.lastSeatedAt ?? section.enabledAt;
        }

        let mins = minutesSince(baseIso, nowMs);
        return mins;
    }, [isSectionEnabled, nowMs, section.enabledAt, section.lastSeatedAt]);

    return (
        <section className="dashboardSectionCard">
            <header className="dashboardSectionHeader">
                <div className="dashboardSectionHeaderRow">
                    <div className="dashboardSectionHeaderLeft">
                        <div className="dashboardSectionTitle">
                            <button
                                type="button"
                                className="dashboardSectionEditIconButton"
                                aria-label={`Edit ${section.name}`}
                                title="Edit"
                                disabled={isBusy}
                                onClick={() => onEditSection(section.id)}
                            >
                                ✎
                            </button>
                            <span className="dashboardSectionTitleText">
                                {section.name}
                            </span>
                            {section.serverName ? (
                                <span className="dashboardSectionTitleText dashboardSectionTitleSubText">
                                    {section.serverName}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <div className="dashboardSectionHeaderRight">
                        <button
                            type="button"
                            className="dashboardSectionEditIconButton"
                            aria-label={`Add temp table to ${section.name}`}
                            title="Add temp table"
                            disabled={isBusy}
                            onClick={() => onAddTempTable(section.id)}
                        >
                            ＋
                        </button>
                        <div className="dashboardSectionSymbol">★</div>
                    </div>
                </div>

                <div className="dashboardSectionHeaderMetrics">
                    <div className="dashboardSectionHeaderMetricsLeft dashboardSectionMeta">
                        <div className="dashboardSectionMetaRow">
                            <span>Tables: {section.satTodayCount}</span>
                            <span className="dashboardSectionMetaDivider">
                                •
                            </span>
                            <span>Guest: {section.satTodayGuestCount}</span>
                        </div>
                        <div className="dashboardSectionMetaRow">
                            <span>Sat Guests: {seatedGuests}</span>
                        </div>
                    </div>

                    <div className="dashboardSectionHeaderMetricsRight dashboardSectionMeta">
                        <div className="dashboardSectionTimerLabel">Timer:</div>
                        <div className="dashboardSectionTimerValue">
                            {formatElapsedMinutes(enabledTimerMinutes) ?? "—"}
                        </div>
                    </div>
                </div>
            </header>

            <div className="dashboardTablesGrid">
                {section.tables.length === 0 ? (
                    <div className="dashboardEmptyTables">
                        No tables in this section.
                    </div>
                ) : null}

                {section.tables.map((table) => {
                    let mins = minutesSince(table.seatedAt, nowMs);
                    let elapsed = formatElapsedMinutes(mins);
                    let subtitle =
                        table.status === "SEATED" ? (
                            <span className="dashboardTableTileMinutes">
                                {elapsed ?? "—"}
                            </span>
                        ) : null;

                    let overdue =
                        table.status === "SEATED" && mins !== null
                            ? mins >= 60
                            : false;

                    let disabled = isBusy === true;

                    return (
                        <DashboardTableTile
                            key={table.id}
                            tableNumber={table.tableNumber}
                            capacity={
                                table.status === "SEATED"
                                    ? undefined
                                    : table.capacity
                            }
                            status={table.status}
                            subtitle={subtitle}
                            overdue={overdue}
                            temp={table.isTemp}
                            disabled={disabled}
                            onClick={() => onTableClick(table)}
                        />
                    );
                })}
            </div>
        </section>
    );
}
