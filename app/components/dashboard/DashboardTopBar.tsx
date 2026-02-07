import * as React from "react";

import type { DashboardLoaderData } from "../../services/dashboard.server";

import { DashboardFloorplanSelect } from "./DashboardFloorplanSelect";
import { DashboardMetrics } from "./DashboardMetrics";

export function DashboardTopBar(props: {
    metrics: {
        openMenusGuests: number | null;
        waitingGuests: number | null;
        averageWaitMinutesLastHour: number | null;
        waitTimeMissMinutesDailyAverage: number | null;
    };
    floorplans: DashboardLoaderData["floorplans"];
    selectedFloorplanId: string | null;
    isBusy: boolean;
    onOpenUndo: () => void;
    onFloorplanChange: (nextId: string) => void;
}) {
    return (
        <div className="dashboardTopBar">
            <DashboardMetrics
                openMenusGuests={props.metrics.openMenusGuests}
                waitingGuests={props.metrics.waitingGuests}
                averageWaitMinutesLastHour={
                    props.metrics.averageWaitMinutesLastHour
                }
                waitTimeMissMinutesDailyAverage={
                    props.metrics.waitTimeMissMinutesDailyAverage
                }
            />

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-end",
                }}
            >
                <button
                    type="button"
                    className="tablesUndoButton tablesSmallButton"
                    disabled={props.isBusy}
                    onClick={props.onOpenUndo}
                >
                    Undo
                </button>

                <DashboardFloorplanSelect
                    floorplans={props.floorplans}
                    selectedFloorplanId={props.selectedFloorplanId}
                    onChange={props.onFloorplanChange}
                />
            </div>
        </div>
    );
}
