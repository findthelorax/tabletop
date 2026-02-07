export function isServiceDay(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function minutesBetween(
    laterIso: string | null,
    earlierIso: string | null,
) {
    if (!laterIso || !earlierIso) return null;
    let later = new Date(laterIso);
    let earlier = new Date(earlierIso);
    let minutes = (later.getTime() - earlier.getTime()) / 60000;
    if (!Number.isFinite(minutes) || minutes < 0) return null;
    return Math.round(minutes);
}

export function average(numbers: number[]): number | null {
    if (numbers.length === 0) return null;
    let sum = numbers.reduce((a, b) => a + b, 0);
    return Math.round((sum / numbers.length) * 10) / 10;
}
