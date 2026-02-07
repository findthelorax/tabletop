import type * as React from "react";

type Floorplan = {
    id: string;
    name: string;
};

type Props = {
    floorplans: Floorplan[];
    selectedId: string | null;
    onSelect: (floorplanId: string) => void;
};

export function FloorplanSelector({ floorplans, selectedId, onSelect }: Props) {
    return (
        <div className="floorplanSelector" role="list">
            {floorplans.length === 0 ? (
                <div className="tablesEmpty">
                    No floorplans yet. Click “Add Floorplan”.
                </div>
            ) : (
                floorplans.map((fp) => (
                    <button
                        key={fp.id}
                        type="button"
                        className={
                            fp.id === selectedId
                                ? "tablesPrimaryButton tablesSmallButton"
                                : "tablesSecondaryButton tablesSmallButton"
                        }
                        onClick={() => onSelect(fp.id)}
                    >
                        {fp.name}
                    </button>
                ))
            )}
        </div>
    );
}
