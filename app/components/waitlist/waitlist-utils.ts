export function digitsOnly(value: string): string {
    return value.replace(/\D+/g, "");
}

export function formatPhone(value: string | null): string {
    if (!value) return "—";
    let digits = digitsOnly(value);
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return value;
}

export type TimerState = "paused" | "countdown" | "countup" | "overdue";

function formatDurationHHmm(totalMinutes: number): string {
    let safe = Number.isFinite(totalMinutes) ? Math.max(0, totalMinutes) : 0;
    let hours = Math.floor(safe / 60);
    let minutes = safe % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function computeWaitTimer(input: {
    isCallAhead: boolean;
    waitingStartedAt: string | null;
    quotedWaitMinutes: number | null;
    nowMs: number;
}): { minutes: number; state: TimerState; label: string } {
    let { waitingStartedAt, quotedWaitMinutes, nowMs } = input;

    if (!waitingStartedAt) {
        return { minutes: 0, state: "paused", label: formatDurationHHmm(0) };
    }

    let started = new Date(waitingStartedAt);
    if (Number.isNaN(started.getTime())) {
        return { minutes: 0, state: "paused", label: formatDurationHHmm(0) };
    }

    let elapsedMinutes = Math.max(
        0,
        Math.floor((nowMs - started.getTime()) / 60000),
    );

    if (
        typeof quotedWaitMinutes === "number" &&
        Number.isFinite(quotedWaitMinutes)
    ) {
        if (quotedWaitMinutes <= 0) {
            return {
                minutes: elapsedMinutes,
                state: "countup",
                label: `+${formatDurationHHmm(elapsedMinutes)}`,
            };
        }

        let remaining = Math.floor(quotedWaitMinutes - elapsedMinutes);
        if (remaining > 0) {
            return {
                minutes: remaining,
                state: "countdown",
                label: formatDurationHHmm(remaining),
            };
        }
        let overdue = Math.abs(remaining);
        return {
            minutes: overdue,
            state: "overdue",
            label: `+${formatDurationHHmm(overdue)}`,
        };
    }

    // If no quoted wait was provided, still show a red +Xm style.
    return {
        minutes: elapsedMinutes,
        state: "overdue",
        label: `+${formatDurationHHmm(elapsedMinutes)}`,
    };
}
