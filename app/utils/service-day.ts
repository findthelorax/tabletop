export function formatServiceDayLocal(date: Date): string {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    let mm = String(month).padStart(2, "0");
    let dd = String(day).padStart(2, "0");

    return `${year}-${mm}-${dd}`;
}

export const SERVICE_DAY_CUTOFF_HOUR_LOCAL = 1;

export function todayServiceDayLocal(now: Date = new Date()): string {
    // Service day flips at 1am local time.
    // Example: 12:30am on Jan 2 belongs to Jan 1 service day.
    let adjusted = new Date(now);
    adjusted.setHours(adjusted.getHours() - SERVICE_DAY_CUTOFF_HOUR_LOCAL);
    return formatServiceDayLocal(adjusted);
}

export function serviceDayStartLocal(serviceDay: string): Date {
    // serviceDay is YYYY-MM-DD
    let year = Number(serviceDay.slice(0, 4));
    let month = Number(serviceDay.slice(5, 7));
    let day = Number(serviceDay.slice(8, 10));

    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
    ) {
        // Fallback: treat as "today" if somehow invalid.
        return new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
        );
    }

    return new Date(
        year,
        month - 1,
        day,
        SERVICE_DAY_CUTOFF_HOUR_LOCAL,
        0,
        0,
        0,
    );
}

export function serviceDayEndLocal(serviceDay: string): Date {
    let start = serviceDayStartLocal(serviceDay);
    return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}
