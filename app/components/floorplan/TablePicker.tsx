import * as React from "react";

import type { TableOption } from "./types";
import {
    onlyDigits,
    sliceFromTableNumber,
    windowAroundTableNumber,
} from "./utils";

function tableDisplayLabel(table: TableOption) {
    return `Table ${table.tableNumber}`;
}

export function TablePicker({
    tables,
    selectedTableIds,
    onSelectedTableIdsChange,
    search,
    onSearchChange,
    inputName,
}: {
    tables: TableOption[];
    selectedTableIds: string[];
    onSelectedTableIdsChange: React.Dispatch<React.SetStateAction<string[]>>;
    search: string;
    onSearchChange: (next: string) => void;
    inputName: string;
}) {
    let selectedSet = React.useMemo(
        () => new Set(selectedTableIds),
        [selectedTableIds],
    );
    let byId = React.useMemo(
        () => new Map(tables.map((t) => [t.id, t])),
        [tables],
    );

    let sortIdsByTableNumber = React.useCallback(
        (ids: string[]) => {
            return [...ids].sort((a, b) => {
                let ta = byId.get(a);
                let tb = byId.get(b);
                let na = ta ? ta.tableNumber : Number.POSITIVE_INFINITY;
                let nb = tb ? tb.tableNumber : Number.POSITIVE_INFINITY;
                if (na !== nb) return na - nb;
                return a.localeCompare(b);
            });
        },
        [byId],
    );

    let uniqueIds = React.useCallback((ids: string[]) => {
        return Array.from(new Set(ids));
    }, []);

    let removeOne = React.useCallback((ids: string[], id: string) => {
        let idx = ids.indexOf(id);
        if (idx === -1) return ids;
        return [...ids.slice(0, idx), ...ids.slice(idx + 1)];
    }, []);

    let digits = React.useMemo(() => onlyDigits(search), [search]);

    let numeric = React.useMemo(() => {
        if (!digits) return null;
        let n = Number.parseInt(digits, 10);
        return Number.isFinite(n) ? n : null;
    }, [digits]);

    let suggestions = React.useMemo(() => {
        if (numeric === null) return [];

        if (digits.length === 1) {
            return sliceFromTableNumber(tables, numeric * 10, 8);
        }

        return sliceFromTableNumber(tables, numeric, 8);
    }, [digits.length, numeric, tables]);

    return (
        <div className="floorplanTablePicker">
            {selectedTableIds.length === 0 ? null : (
                <div
                    className="floorplanChips"
                    role="list"
                    onMouseDown={(e) => {
                        // Clicking inside the chip list should never clear selection.
                        // Prevent focus/blur side-effects and stop parent click handlers.
                        e.preventDefault();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    {sortIdsByTableNumber(selectedTableIds)
                        .map((id) => byId.get(id))
                        .filter((t): t is TableOption => Boolean(t))
                        .map((t) => (
                            <div
                                key={t.id}
                                className="floorplanChip"
                                role="listitem"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <span className="floorplanChipLabel">
                                    {tableDisplayLabel(t)}
                                </span>
                                <button
                                    type="button"
                                    className="floorplanChipRemove"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onSelectedTableIdsChange((prev) =>
                                            sortIdsByTableNumber(
                                                removeOne(prev, t.id),
                                            ),
                                        );
                                    }}
                                    aria-label={`Delete ${tableDisplayLabel(t)}`}
                                    title="Delete"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                </div>
            )}

            {selectedTableIds.map((id) => (
                <input key={id} type="hidden" name={inputName} value={id} />
            ))}

            <input
                className="tablesInput"
                type="text"
                inputMode="numeric"
                value={search}
                onChange={(e) =>
                    onSearchChange(onlyDigits(e.currentTarget.value))
                }
                placeholder="Enter a table number…"
            />

            {numeric === null ? null : (
                <div className="floorplanSuggestions" role="list">
                    {suggestions.length === 0 ? (
                        <div className="floorplanHint">No tables found.</div>
                    ) : (
                        suggestions.map((t) => {
                            let isSelected = selectedSet.has(t.id);
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    className={
                                        isSelected
                                            ? "floorplanSuggestion floorplanSuggestionSelected"
                                            : "floorplanSuggestion"
                                    }
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onSelectedTableIdsChange((prev) => {
                                            if (prev.includes(t.id))
                                                return prev;
                                            return sortIdsByTableNumber(
                                                uniqueIds([...prev, t.id]),
                                            );
                                        });
                                    }}
                                    disabled={isSelected}
                                >
                                    <span className="floorplanSuggestionNumber">
                                        {t.tableNumber}
                                    </span>
                                    <span className="floorplanSuggestionLabel">
                                        {tableDisplayLabel(t)}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
