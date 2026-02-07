import * as React from "react";

import { onlyDigits, tableKindLabel, type TableKind } from "../utils";

export function TableCardEditForm({
    Form,
    tableId,
    kindOptions,
    allAreas,
    tableNumber,
    setTableNumber,
    capacity,
    setCapacity,
    kind,
    setKind,
    areaId,
    setAreaId,
    updateErrors,
    updateFormError,
    isBusy,
    onCancel,
}: {
    Form: React.ElementType;
    tableId: string;
    kindOptions: Array<TableKind>;
    allAreas: Array<{ id: string; name: string }>;

    tableNumber: string;
    setTableNumber: (v: string) => void;
    capacity: string;
    setCapacity: (v: string) => void;
    kind: TableKind;
    setKind: (v: TableKind) => void;
    areaId: string;
    setAreaId: (v: string) => void;

    updateErrors?: Record<string, string>;
    updateFormError?: string;
    isBusy: boolean;
    onCancel: () => void;
}) {
    return (
        <Form method="post" className="tableCardEditForm">
            <input type="hidden" name="intent" value="update-table" />
            <input type="hidden" name="tableId" value={tableId} />

            <div className="tableCardEditRow">
                <label className="tablesField">
                    <div className="tablesLabel">Table #</div>
                    <input
                        className="tablesInput"
                        name="tableNumber"
                        type="text"
                        inputMode="numeric"
                        value={tableNumber}
                        onChange={(e) =>
                            setTableNumber(onlyDigits(e.currentTarget.value))
                        }
                        pattern="[0-9]+"
                        aria-invalid={
                            updateErrors?.tableNumber ? true : undefined
                        }
                    />
                    {updateErrors?.tableNumber ? (
                        <div className="tablesFieldError">
                            {updateErrors.tableNumber}
                        </div>
                    ) : null}
                </label>

                <label className="tablesField">
                    <div className="tablesLabel">Seats</div>
                    <input
                        className="tablesInput"
                        name="capacity"
                        type="text"
                        inputMode="numeric"
                        value={capacity}
                        onChange={(e) =>
                            setCapacity(onlyDigits(e.currentTarget.value))
                        }
                        pattern="[0-9]+"
                        aria-invalid={updateErrors?.capacity ? true : undefined}
                    />
                    {updateErrors?.capacity ? (
                        <div className="tablesFieldError">
                            {updateErrors.capacity}
                        </div>
                    ) : null}
                </label>
            </div>

            <div className="tableCardEditRow">
                <label className="tablesField">
                    <div className="tablesLabel">Type</div>
                    <select
                        className="tablesSelect"
                        name="kind"
                        value={kind}
                        onChange={(e) =>
                            setKind(e.currentTarget.value as TableKind)
                        }
                        aria-invalid={updateErrors?.kind ? true : undefined}
                    >
                        {kindOptions.map((k) => (
                            <option key={k} value={k}>
                                {tableKindLabel(k)}
                            </option>
                        ))}
                    </select>
                    {updateErrors?.kind ? (
                        <div className="tablesFieldError">
                            {updateErrors.kind}
                        </div>
                    ) : null}
                </label>

                <label className="tablesField">
                    <div className="tablesLabel">Area</div>
                    <select
                        className="tablesSelect"
                        name="areaId"
                        value={areaId}
                        onChange={(e) => setAreaId(e.currentTarget.value)}
                        aria-invalid={updateErrors?.areaId ? true : undefined}
                    >
                        <option value="">Unassigned</option>
                        {allAreas.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                    {updateErrors?.areaId ? (
                        <div className="tablesFieldError">
                            {updateErrors.areaId}
                        </div>
                    ) : null}
                </label>
            </div>

            {updateFormError ? (
                <div className="tablesFormError">{updateFormError}</div>
            ) : null}

            <div className="tableCardActions">
                <button
                    type="submit"
                    className="tablesPrimaryButton tablesSmallButton"
                    data-action="save"
                    disabled={isBusy}
                >
                    Save
                </button>
                <button
                    type="button"
                    className="tablesSecondaryButton tablesSmallButton"
                    data-action="cancel"
                    onClick={onCancel}
                    disabled={isBusy}
                >
                    Cancel
                </button>
            </div>
        </Form>
    );
}
