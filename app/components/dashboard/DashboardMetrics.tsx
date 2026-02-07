import * as React from "react";

export function DashboardMetrics({
    openMenusGuests,
    waitingGuests,
    averageWaitMinutesLastHour,
    waitTimeMissMinutesDailyAverage,
}: {
    openMenusGuests: number | null;
    waitingGuests: number | null;
    averageWaitMinutesLastHour: number | null;
    waitTimeMissMinutesDailyAverage: number | null;
}) {
    let fmtGuests = React.useCallback((v: number | null) => {
        if (v === null) return "—";
        return String(v);
    }, []);

    let fmtMinutes = React.useCallback((v: number | null) => {
        if (v === null) return "—";
        return `${v}m`;
    }, []);

    let fmtSignedMinutes = React.useCallback((v: number | null) => {
        if (v === null) return "—";
        let sign = v > 0 ? "+" : "";
        return `${sign}${v}m`;
    }, []);

    return (
        <div className="dashboardMetrics" role="list">
            <div className="dashboardMetric" role="listitem">
                <span className="dashboardMetricLabel">Open Menus:</span>
                <span className="dashboardMetricValue">
                    {fmtGuests(openMenusGuests)}
                </span>
            </div>

            <div className="dashboardMetric" role="listitem">
                <span className="dashboardMetricLabel">Waiting Guests:</span>
                <span className="dashboardMetricValue">
                    {fmtGuests(waitingGuests)}
                </span>
            </div>

            <div className="dashboardMetric" role="listitem">
                <span className="dashboardMetricLabel">Average Wait Time:</span>
                <span className="dashboardMetricValue">
                    {fmtMinutes(averageWaitMinutesLastHour)}
                </span>
            </div>

            <div className="dashboardMetric" role="listitem">
                <span className="dashboardMetricLabel">Wait Time Miss:</span>
                <span className="dashboardMetricValue">
                    {fmtSignedMinutes(waitTimeMissMinutesDailyAverage)}
                </span>
            </div>
        </div>
    );
}
