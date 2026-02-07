import * as React from "react";

import type { DashboardLoaderData } from "../../services/dashboard.server";
import { Modal } from "../../ui/modal";

type FloorplanTable = DashboardLoaderData["floorplanTables"][number];

function onlyDigits(value: string): string {
    return value.replace(/\D+/g, "");
}

export function DashboardTempTableModal(props: {
    open: boolean;
    tempSectionId: string | null;
    tempTableId: string;
    floorplanTables: DashboardLoaderData["floorplanTables"];
    tablesInTempSection: string[];
    isBusy: boolean;
    onClose: () => void;
    onChangeTempTableId: (nextId: string) => void;
    onAddTempTable: (toSectionId: string, tableId: string) => void;
}) {
    let triggerRef = React.useRef<HTMLInputElement | null>(null);
    let pickerWrapRef = React.useRef<HTMLDivElement | null>(null);
    let [tableSearch, setTableSearch] = React.useState("");

    React.useEffect(() => {
        if (!props.open) return;
        if (!props.tempSectionId) return;

        // Native <select> dropdowns (especially on Windows) may swallow key
        // events when the menu is open. Auto-focus the select on open so users
        // can type numbers immediately without opening the dropdown.
        requestAnimationFrame(() => triggerRef.current?.focus());
    }, [props.open, props.tempSectionId]);

    React.useEffect(() => {
        if (!props.open) return;
        setTableSearch("");
    }, [props.open]);

    let borrowableTempTables = React.useMemo(() => {
        if (!props.tempSectionId) return [] as FloorplanTable[];

        // Filter against what's currently visible in the target section.
        // This matters for tables that are "home" in this section but temp'd out.
        let inSection = new Set(props.tablesInTempSection);

        return props.floorplanTables
            .filter((t) => {
                if (inSection.has(t.id)) return false;
                let isOffFloorplan = !t.homeSectionId;
                if (!isOffFloorplan) {
                    if (t.status === "SEATED") return false;
                }
                return true;
            })
            .slice()
            .sort((a, b) => {
                if (a.tableNumber !== b.tableNumber)
                    return a.tableNumber - b.tableNumber;
                return a.id.localeCompare(b.id);
            });
    }, [props.floorplanTables, props.tablesInTempSection, props.tempSectionId]);

    React.useEffect(() => {
        if (!props.open) return;
        if (!props.tempSectionId) return;

        // If the current selection is no longer valid, clear it.
        if (
            props.tempTableId &&
            !borrowableTempTables.some((t) => t.id === props.tempTableId)
        ) {
            props.onChangeTempTableId("");
        }
    }, [
        borrowableTempTables,
        props.onChangeTempTableId,
        props.open,
        props.tempSectionId,
        props.tempTableId,
    ]);

    let visibleTempTables = React.useMemo(() => {
        let digits = onlyDigits(tableSearch);
        if (!digits) return borrowableTempTables;

        // Filter (don't window) so the list stays scrollable and complete.
        // Typing narrows the list to table numbers containing the digits.
        return borrowableTempTables.filter((t) =>
            String(t.tableNumber).includes(digits),
        );
    }, [borrowableTempTables, tableSearch]);

    let trySelectAndAddByDigits = React.useCallback(
        (digits: string) => {
            if (props.isBusy) return;
            if (!props.open) return;
            if (!props.tempSectionId) return;

            let num = Number(digits);
            if (!Number.isFinite(num)) return;

            // Prefer an exact table number match.
            let exact = borrowableTempTables.find((t) => t.tableNumber === num);
            if (!exact) return;

            if (props.tempTableId !== exact.id) {
                props.onChangeTempTableId(exact.id);
            }

            props.onAddTempTable(props.tempSectionId, exact.id);
        },
        [
            borrowableTempTables,
            props.isBusy,
            props.onAddTempTable,
            props.onChangeTempTableId,
            props.open,
            props.tempSectionId,
            props.tempTableId,
        ],
    );

    let selectedLabel = React.useMemo(() => {
        if (!props.tempTableId) return null;
        let t = props.floorplanTables.find((x) => x.id === props.tempTableId);
        if (!t) return null;
        return `Table ${t.tableNumber} (${t.homeSectionName})`;
    }, [props.floorplanTables, props.tempTableId]);

    return (
        <Modal open={props.open} title="Add temp table" onClose={props.onClose}>
            <div className="dashboardDialogBody">
                {!props.tempSectionId ? (
                    <div className="tablesEmpty">Pick a section.</div>
                ) : (
                    <>
                        <p className="pageSubtitle">
                            Borrow any table in the restaurant. If it belongs to
                            another section on this floorplan, it will disappear
                            from its original section and show in this section
                            until it’s marked Clean.
                        </p>

                        <div className="tablesField" style={{ marginTop: 12 }}>
                            <div className="tablesLabel">Table</div>
                            <div ref={pickerWrapRef}>
                                <input
                                    className="tablesSelect"
                                    ref={triggerRef}
                                    type="text"
                                    inputMode="numeric"
                                    disabled={props.isBusy}
                                    placeholder={
                                        selectedLabel ?? "Select a table…"
                                    }
                                    value={tableSearch}
                                    onChange={(e) => {
                                        setTableSearch(
                                            onlyDigits(e.currentTarget.value),
                                        );
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key !== "Enter") return;
                                        e.preventDefault();
                                        e.stopPropagation();

                                        // If a table is already selected, Enter should behave like clicking Add.
                                        if (
                                            props.tempSectionId &&
                                            props.tempTableId &&
                                            !props.isBusy
                                        ) {
                                            props.onAddTempTable(
                                                props.tempSectionId,
                                                props.tempTableId,
                                            );
                                            return;
                                        }

                                        let digits = onlyDigits(tableSearch);
                                        if (!digits) return;
                                        trySelectAndAddByDigits(digits);
                                    }}
                                />

                                <div
                                    className="floorplanSuggestions"
                                    role="listbox"
                                    aria-label="Temp tables"
                                    style={{
                                        marginTop: 8,
                                        maxHeight: 240,
                                        overflowY: "auto",
                                    }}
                                >
                                    {visibleTempTables.length === 0 ? (
                                        <div className="floorplanHint">
                                            No tables available.
                                        </div>
                                    ) : (
                                        visibleTempTables.map((t) => {
                                            let isSelected =
                                                t.id === props.tempTableId;
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={
                                                        isSelected
                                                            ? true
                                                            : undefined
                                                    }
                                                    className={
                                                        isSelected
                                                            ? "floorplanSuggestion floorplanSuggestionSelected"
                                                            : "floorplanSuggestion"
                                                    }
                                                    onClick={() => {
                                                        props.onChangeTempTableId(
                                                            t.id,
                                                        );
                                                        requestAnimationFrame(
                                                            () =>
                                                                triggerRef.current?.focus(),
                                                        );
                                                    }}
                                                    disabled={props.isBusy}
                                                >
                                                    <span className="floorplanSuggestionNumber">
                                                        {t.tableNumber}
                                                    </span>
                                                    <span className="floorplanSuggestionLabel">
                                                        {t.homeSectionName}
                                                    </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            className="tablesInlineActions"
                            style={{ marginTop: 12 }}
                        >
                            <button
                                type="button"
                                className="tablesPrimaryButton"
                                data-action="add"
                                disabled={props.isBusy || !props.tempTableId}
                                onClick={() => {
                                    if (!props.tempSectionId) return;
                                    if (!props.tempTableId) return;
                                    props.onAddTempTable(
                                        props.tempSectionId,
                                        props.tempTableId,
                                    );
                                }}
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                className="tablesSecondaryButton"
                                data-action="cancel"
                                disabled={props.isBusy}
                                onClick={props.onClose}
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
