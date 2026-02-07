import type { TableOption } from "../types";

export function getSelectedTables({
    sectionTableIds,
    tables,
}: {
    sectionTableIds: string[];
    tables: TableOption[];
}): Array<{ id: string; label: string }> {
    let byId = new Map(tables.map((t) => [t.id, t] as const));

    return sectionTableIds
        .map((id) => byId.get(id))
        .filter((t): t is TableOption => Boolean(t))
        .slice()
        .sort((a, b) => a.tableNumber - b.tableNumber)
        .map((t) => ({ id: t.id, label: `Table ${t.tableNumber}` }));
}
