import type { TableOption } from "./types";

export function onlyDigits(value: string): string {
    return value.replace(/\D+/g, "");
}

export function windowAroundTableNumber(
    tables: TableOption[],
    targetTableNumber: number,
    halfWindow: number,
): TableOption[] {
    // `tables` is expected to be sorted by tableNumber.
    let lo = 0;
    let hi = tables.length;
    while (lo < hi) {
        let mid = Math.floor((lo + hi) / 2);
        if (tables[mid].tableNumber < targetTableNumber) lo = mid + 1;
        else hi = mid;
    }

    let start = Math.max(0, lo - halfWindow);
    let endExclusive = Math.min(tables.length, lo + halfWindow + 1);

    // If we're near the start/end, try to keep the list roughly the same size.
    let desired = Math.min(tables.length, halfWindow * 2 + 1);
    while (endExclusive - start < desired) {
        if (start > 0) start--;
        else if (endExclusive < tables.length) endExclusive++;
        else break;
    }

    return tables.slice(start, endExclusive);
}

export function sliceFromTableNumber(
    tables: TableOption[],
    targetTableNumber: number,
    count: number,
): TableOption[] {
    if (count <= 0) return [];

    // `tables` is expected to be sorted by tableNumber.
    let lo = 0;
    let hi = tables.length;
    while (lo < hi) {
        let mid = Math.floor((lo + hi) / 2);
        if (tables[mid].tableNumber < targetTableNumber) lo = mid + 1;
        else hi = mid;
    }

    if (tables.length === 0) return [];

    // If the target is beyond the last table, show the last `count` tables.
    if (lo >= tables.length) {
        let start = Math.max(0, tables.length - count);
        return tables.slice(start);
    }

    return tables.slice(lo, Math.min(tables.length, lo + count));
}
