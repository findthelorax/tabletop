import type { DashboardLoaderData } from "../../../services/dashboard.server";

export function buildSectionIdByTableId(
    sections: DashboardLoaderData["sections"],
) {
    let map = new Map<string, string>();
    for (let section of sections) {
        for (let t of section.tables) {
            map.set(t.id, section.id);
        }
    }
    return map;
}

export function getTablesInTempSection(
    sections: DashboardLoaderData["sections"],
    tempSectionId: string | null,
): string[] {
    if (!tempSectionId) return [];
    return (
        sections.find((s) => s.id === tempSectionId)?.tables.map((t) => t.id) ??
        []
    );
}
