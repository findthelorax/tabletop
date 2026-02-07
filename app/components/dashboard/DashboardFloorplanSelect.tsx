export function DashboardFloorplanSelect({
    floorplans,
    selectedFloorplanId,
    onChange,
}: {
    floorplans: Array<{ id: string; name: string }>;
    selectedFloorplanId: string | null;
    onChange: (nextId: string) => void;
}) {
    let amFloorplans = floorplans.filter((fp) => /\bam\b/i.test(fp.name));
    let pmFloorplans = floorplans.filter((fp) => /\bpm\b/i.test(fp.name));
    let otherFloorplans = floorplans.filter(
        (fp) => !/\bam\b/i.test(fp.name) && !/\bpm\b/i.test(fp.name),
    );

    return (
        <label
            className="tablesField dashboardFloorplanField"
            style={{ width: 250 }}
        >
            <span className="tablesLabel">Floorplan</span>
            <select
                className="tablesSelect tablesSmallButton"
                value={selectedFloorplanId ?? ""}
                onChange={(e) => onChange(e.currentTarget.value)}
                disabled={floorplans.length === 0}
            >
                {floorplans.length === 0 ? (
                    <option value="">No floorplans</option>
                ) : null}

                {otherFloorplans.map((fp) => (
                    <option key={fp.id} value={fp.id}>
                        {fp.name}
                    </option>
                ))}

                {amFloorplans.length > 0 ? (
                    <optgroup label="AM">
                        {amFloorplans.map((fp) => (
                            <option key={fp.id} value={fp.id}>
                                {fp.name}
                            </option>
                        ))}
                    </optgroup>
                ) : null}

                {pmFloorplans.length > 0 ? (
                    <optgroup label="PM">
                        {pmFloorplans.map((fp) => (
                            <option key={fp.id} value={fp.id}>
                                {fp.name}
                            </option>
                        ))}
                    </optgroup>
                ) : null}
            </select>
        </label>
    );
}
