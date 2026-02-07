export type DashboardActionResult =
    | { ok: true }
    | {
          ok: false;
          formError?: string;
          fieldErrors?: Record<string, string>;
      };

export function minutesSince(
    iso: string | null,
    nowMs: number = Date.now(),
): number | null {
    if (!iso) return null;
    let d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((nowMs - d.getTime()) / 60000));
}

export function formatElapsedMinutes(mins: number | null): string | null {
    if (mins === null) return null;
    if (mins < 60) return `${mins}m`;
    let hours = Math.floor(mins / 60);
    let minutes = mins % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatTableStatus(status: string) {
    return status
        .split("_")
        .map((s) => s.slice(0, 1) + s.slice(1).toLowerCase())
        .join(" ");
}
