export const TABLE_KIND_OPTIONS = [
    "BAR",
    "HIGHTOP",
    "BOOTH",
    "TABLE_AND_CHAIRS",
    "MIXED",
] as const;

export type TableKind = (typeof TABLE_KIND_OPTIONS)[number];

export function tableKindLabel(kind: TableKind) {
    if (kind === "TABLE_AND_CHAIRS") return "Table";
    if (kind === "HIGHTOP") return "High-top";
    return kind
        .toLowerCase()
        .split("_")
        .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
        .join(" ");
}

export function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}
