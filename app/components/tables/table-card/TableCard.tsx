import * as React from "react";
import { useFetcher } from "react-router";

import type { ToastFn } from "../types";
import { TABLE_KIND_OPTIONS, tableKindLabel, type TableKind } from "../utils";

import { TableCardDeleteConfirm } from "./TableCardDeleteConfirm";
import { TableCardEditForm } from "./TableCardEditForm";
import { TableCardView } from "./TableCardView";

type MutationResult =
    | { ok: true }
    | {
          ok: false;
          formError?: string;
          fieldErrors?: Record<string, string>;
      };

export function TableCard({
    table,
    allAreas,
    addToast,
    onDidMutate,
}: {
    table: {
        id: string;
        areaId: string | null;
        tableNumber: number;
        capacity: number;
        kind: TableKind;
        seatedPartySize: number | null;
    };
    allAreas: Array<{ id: string; name: string }>;
    addToast: ToastFn;
    onDidMutate: () => void;
}) {
    let cardRef = React.useRef<HTMLDivElement | null>(null);

    let updateFetcher = useFetcher<MutationResult>();
    let deleteFetcher = useFetcher<MutationResult>();

    let [isEditing, setIsEditing] = React.useState(false);
    let [confirmRemoveOpen, setConfirmRemoveOpen] = React.useState(false);

    let [tableNumber, setTableNumber] = React.useState(
        String(table.tableNumber),
    );
    let [capacity, setCapacity] = React.useState(String(table.capacity));
    let [kind, setKind] = React.useState<TableKind>(table.kind);
    let [areaId, setAreaId] = React.useState<string>(table.areaId ?? "");

    let kindOptions = React.useMemo<Array<TableKind>>(() => {
        return [...TABLE_KIND_OPTIONS].sort((a, b) =>
            tableKindLabel(a).localeCompare(tableKindLabel(b), undefined, {
                sensitivity: "base",
            }),
        );
    }, []);

    let updateErrors =
        updateFetcher.data &&
        "ok" in updateFetcher.data &&
        !updateFetcher.data.ok
            ? updateFetcher.data.fieldErrors
            : undefined;

    let updateFormError =
        updateFetcher.data &&
        "ok" in updateFetcher.data &&
        !updateFetcher.data.ok
            ? updateFetcher.data.formError
            : undefined;

    let closeEdit = React.useCallback(() => {
        setIsEditing(false);
        setTableNumber(String(table.tableNumber));
        setCapacity(String(table.capacity));
        setKind(table.kind);
        setAreaId(table.areaId ?? "");
    }, [table.areaId, table.capacity, table.kind, table.tableNumber]);

    let prevUpdateState = React.useRef(updateFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevUpdateState.current === "idle";
        let isIdle = updateFetcher.state === "idle";
        prevUpdateState.current = updateFetcher.state;

        if (wasIdle || !isIdle || !updateFetcher.data) return;

        if ("ok" in updateFetcher.data && updateFetcher.data.ok) {
            addToast(`Updated Table ${table.tableNumber}`, "success");
            setIsEditing(false);
            onDidMutate();
        } else {
            addToast(
                updateFetcher.data.formError ?? "Could not update table",
                "error",
            );
        }
    }, [addToast, onDidMutate, updateFetcher.data, updateFetcher.state]);

    let prevDeleteState = React.useRef(deleteFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevDeleteState.current === "idle";
        let isIdle = deleteFetcher.state === "idle";
        prevDeleteState.current = deleteFetcher.state;

        if (wasIdle || !isIdle || !deleteFetcher.data) return;

        if ("ok" in deleteFetcher.data && deleteFetcher.data.ok) {
            addToast(`Deleted Table ${table.tableNumber}`, "success");
            setConfirmRemoveOpen(false);
            onDidMutate();
        } else {
            addToast(
                deleteFetcher.data.formError ?? "Could not delete table",
                "error",
            );
        }
    }, [addToast, deleteFetcher.data, deleteFetcher.state, onDidMutate]);

    React.useEffect(() => {
        if (!isEditing) return;

        function onMouseDown(event: MouseEvent) {
            if (updateFetcher.state !== "idle") return;
            let el = cardRef.current;
            if (!el) return;
            if (!(event.target instanceof Node)) return;
            if (!el.contains(event.target)) closeEdit();
        }

        document.addEventListener("mousedown", onMouseDown, true);
        return () =>
            document.removeEventListener("mousedown", onMouseDown, true);
    }, [closeEdit, isEditing, updateFetcher.state]);

    let occupied = Math.max(
        0,
        Math.min(table.capacity, table.seatedPartySize ?? 0),
    );

    return (
        <div className="tableCard" role="listitem" ref={cardRef}>
            {!isEditing ? (
                <TableCardView
                    tableNumber={table.tableNumber}
                    kindLabel={tableKindLabel(table.kind)}
                    capacity={table.capacity}
                    occupied={occupied}
                    onEdit={() => {
                        setIsEditing(true);
                        setTableNumber(String(table.tableNumber));
                        setCapacity(String(table.capacity));
                        setKind(table.kind);
                        setAreaId(table.areaId ?? "");
                    }}
                    onDelete={() => setConfirmRemoveOpen(true)}
                    disableActions={deleteFetcher.state !== "idle"}
                />
            ) : (
                <TableCardEditForm
                    Form={updateFetcher.Form}
                    tableId={table.id}
                    kindOptions={kindOptions}
                    allAreas={allAreas}
                    tableNumber={tableNumber}
                    setTableNumber={setTableNumber}
                    capacity={capacity}
                    setCapacity={setCapacity}
                    kind={kind}
                    setKind={setKind}
                    areaId={areaId}
                    setAreaId={setAreaId}
                    updateErrors={updateErrors}
                    updateFormError={updateFormError}
                    isBusy={updateFetcher.state !== "idle"}
                    onCancel={closeEdit}
                />
            )}

            <TableCardDeleteConfirm
                open={confirmRemoveOpen}
                tableNumber={table.tableNumber}
                isBusy={deleteFetcher.state !== "idle"}
                onConfirm={() => {
                    let fd = new FormData();
                    fd.set("intent", "delete-table");
                    fd.set("tableId", table.id);
                    deleteFetcher.submit(fd, { method: "post" });
                }}
                onCancel={() => setConfirmRemoveOpen(false)}
            />
        </div>
    );
}
