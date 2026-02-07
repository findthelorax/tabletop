import * as React from "react";
import { useFetcher } from "react-router";

import type { Area, ToastFn } from "../types";
import { TABLE_KIND_OPTIONS, tableKindLabel, type TableKind } from "../utils";
import { TableCard } from "../TableCard";

import { AddTableForm } from "./AddTableForm";
import { RemoveAreaDialog } from "./RemoveAreaDialog";
import { RenameAreaForm } from "./RenameAreaForm";
import type { ActionResult } from "./types";

export function AreaSection({
    area,
    allAreas,
    onDidMutate,
    addToast,
}: {
    area: Area;
    allAreas: Array<{ id: string; name: string }>;
    onDidMutate: () => void;
    addToast: ToastFn;
}) {
    let sectionRef = React.useRef<HTMLElement | null>(null);
    let tableNumberInputRef = React.useRef<HTMLInputElement | null>(null);

    let addTableFetcher = useFetcher<ActionResult>();
    let renameAreaFetcher = useFetcher<ActionResult>();
    let deleteAreaFetcher = useFetcher<ActionResult>();

    let renameAreaFormRef = React.useRef<HTMLFormElement | null>(null);

    let [showAddTable, setShowAddTable] = React.useState(false);
    let [tableNumber, setTableNumber] = React.useState("");
    let [capacity, setCapacity] = React.useState("");
    let [kind, setKind] = React.useState<TableKind>("BOOTH");

    let [showRenameArea, setShowRenameArea] = React.useState(false);
    let [areaName, setAreaName] = React.useState(area.name);
    let [confirmRemoveAreaOpen, setConfirmRemoveAreaOpen] =
        React.useState(false);

    let closeAddTable = React.useCallback(() => {
        setShowAddTable(false);
        setTableNumber("");
        setCapacity("");
        setKind("BOOTH");
    }, []);

    let closeRenameArea = React.useCallback(() => {
        setShowRenameArea(false);
        setAreaName(area.name);
    }, [area.name]);

    let kindOptions = React.useMemo<Array<TableKind>>(() => {
        return [...TABLE_KIND_OPTIONS].sort((a, b) =>
            tableKindLabel(a).localeCompare(tableKindLabel(b), undefined, {
                sensitivity: "base",
            }),
        );
    }, []);

    let addTableErrors =
        addTableFetcher.data &&
        "ok" in addTableFetcher.data &&
        !addTableFetcher.data.ok
            ? addTableFetcher.data.fieldErrors
            : undefined;

    let addTableFormError =
        addTableFetcher.data &&
        "ok" in addTableFetcher.data &&
        !addTableFetcher.data.ok
            ? addTableFetcher.data.formError
            : undefined;

    let renameAreaErrors =
        renameAreaFetcher.data &&
        "ok" in renameAreaFetcher.data &&
        !renameAreaFetcher.data.ok
            ? renameAreaFetcher.data.fieldErrors
            : undefined;

    let renameAreaFormError =
        renameAreaFetcher.data &&
        "ok" in renameAreaFetcher.data &&
        !renameAreaFetcher.data.ok
            ? renameAreaFetcher.data.formError
            : undefined;

    let prevAddTableState = React.useRef(addTableFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevAddTableState.current === "idle";
        let isIdle = addTableFetcher.state === "idle";
        prevAddTableState.current = addTableFetcher.state;

        // Only react when a submission finishes.
        if (wasIdle || !isIdle || !addTableFetcher.data) return;

        if ("ok" in addTableFetcher.data && addTableFetcher.data.ok) {
            addToast("Table added", "success");
            setTableNumber("");
            setCapacity("");
            setKind("BOOTH");
            onDidMutate();

            // Keep the form open for rapid entry.
            window.setTimeout(() => {
                tableNumberInputRef.current?.focus();
            }, 0);
        } else {
            addToast(
                addTableFetcher.data.formError ?? "Could not add table",
                "error",
            );
        }
    }, [addTableFetcher.data, addTableFetcher.state, addToast, onDidMutate]);

    let prevRenameAreaState = React.useRef(renameAreaFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevRenameAreaState.current === "idle";
        let isIdle = renameAreaFetcher.state === "idle";
        prevRenameAreaState.current = renameAreaFetcher.state;

        if (wasIdle || !isIdle || !renameAreaFetcher.data) return;

        if ("ok" in renameAreaFetcher.data && renameAreaFetcher.data.ok) {
            addToast("Area updated", "success");
            setShowRenameArea(false);
            onDidMutate();
        } else {
            addToast(
                renameAreaFetcher.data.formError ?? "Could not update area",
                "error",
            );
        }
    }, [
        addToast,
        onDidMutate,
        renameAreaFetcher.data,
        renameAreaFetcher.state,
    ]);

    let prevDeleteAreaState = React.useRef(deleteAreaFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevDeleteAreaState.current === "idle";
        let isIdle = deleteAreaFetcher.state === "idle";
        prevDeleteAreaState.current = deleteAreaFetcher.state;

        if (wasIdle || !isIdle || !deleteAreaFetcher.data) return;

        if ("ok" in deleteAreaFetcher.data && deleteAreaFetcher.data.ok) {
            addToast("Area deleted", "success");
            setConfirmRemoveAreaOpen(false);
            onDidMutate();
        } else {
            addToast(
                deleteAreaFetcher.data.formError ?? "Could not delete area",
                "error",
            );
        }
    }, [
        addToast,
        deleteAreaFetcher.data,
        deleteAreaFetcher.state,
        onDidMutate,
    ]);

    // Intentionally do not auto-close the Add Table form on outside clicks.

    React.useEffect(() => {
        if (!showRenameArea) return;

        function onMouseDown(event: MouseEvent) {
            if (renameAreaFetcher.state !== "idle") return;

            let el = renameAreaFormRef.current;
            if (!el) return;
            if (!(event.target instanceof Node)) return;

            if (!el.contains(event.target)) {
                closeRenameArea();
            }
        }

        document.addEventListener("mousedown", onMouseDown, true);
        return () =>
            document.removeEventListener("mousedown", onMouseDown, true);
    }, [closeRenameArea, renameAreaFetcher.state, showRenameArea]);

    return (
        <section className="tablesArea" ref={sectionRef}>
            <div className="tablesAreaHeader">
                {!showRenameArea ? (
                    <h2 className="tablesAreaTitle">{area.name}</h2>
                ) : (
                    <RenameAreaForm
                        fetcher={renameAreaFetcher}
                        formRef={renameAreaFormRef}
                        areaId={area.id}
                        areaName={areaName}
                        setAreaName={setAreaName}
                        errors={renameAreaErrors}
                        formError={renameAreaFormError}
                        onCancel={closeRenameArea}
                    />
                )}

                <div className="tablesHeaderActions">
                    <button
                        type="button"
                        className="tablesSecondaryButton tablesSmallButton"
                        data-action={showAddTable ? undefined : "add"}
                        onClick={() => {
                            if (showAddTable) {
                                closeAddTable();
                            } else {
                                setShowAddTable(true);
                            }
                        }}
                        aria-label={
                            showAddTable
                                ? `Close add table for ${area.name}`
                                : `Add table to ${area.name}`
                        }
                        title={showAddTable ? "Close" : "Add Table"}
                    >
                        {showAddTable ? "Close" : "Add Table"}
                    </button>

                    <button
                        type="button"
                        className="tablesSecondaryButton tablesSmallButton"
                        data-action="edit"
                        onClick={() => {
                            setShowRenameArea(true);
                            setAreaName(area.name);
                        }}
                        disabled={
                            showRenameArea || deleteAreaFetcher.state !== "idle"
                        }
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        className="tablesSecondaryButton tablesSmallButton"
                        data-action="delete"
                        disabled={
                            showRenameArea || deleteAreaFetcher.state !== "idle"
                        }
                        onClick={() => setConfirmRemoveAreaOpen(true)}
                    >
                        Delete
                    </button>
                </div>
            </div>

            {!showAddTable ? null : (
                <AddTableForm
                    fetcher={addTableFetcher}
                    areaId={area.id}
                    tableNumber={tableNumber}
                    setTableNumber={setTableNumber}
                    capacity={capacity}
                    setCapacity={setCapacity}
                    kind={kind}
                    setKind={setKind}
                    kindOptions={kindOptions}
                    tableNumberInputRef={tableNumberInputRef}
                    errors={addTableErrors}
                    formError={addTableFormError}
                    onCancel={closeAddTable}
                />
            )}

            {area.tables.length === 0 ? (
                <div className="tablesEmpty">No tables in this area.</div>
            ) : (
                <div className="tablesGrid" role="list">
                    {area.tables.map((t) => (
                        <TableCard
                            key={t.id}
                            table={t}
                            allAreas={allAreas}
                            addToast={addToast}
                            onDidMutate={onDidMutate}
                        />
                    ))}
                </div>
            )}

            <RemoveAreaDialog
                open={confirmRemoveAreaOpen}
                areaName={area.name}
                areaId={area.id}
                fetcher={deleteAreaFetcher}
                onCancel={() => setConfirmRemoveAreaOpen(false)}
            />
        </section>
    );
}
