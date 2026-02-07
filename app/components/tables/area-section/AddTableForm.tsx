import * as React from "react";

import type { TableKind } from "../utils";
import { onlyDigits, tableKindLabel } from "../utils";

import type { ActionFetcher } from "./types";

export function AddTableForm({
    fetcher,
    areaId,
    tableNumber,
    setTableNumber,
    capacity,
    setCapacity,
    kind,
    setKind,
    kindOptions,
    tableNumberInputRef,
    errors,
    formError,
    onCancel,
}: {
    fetcher: ActionFetcher;
    areaId: string;
    tableNumber: string;
    setTableNumber: (value: string) => void;
    capacity: string;
    setCapacity: (value: string) => void;
    kind: TableKind;
    setKind: (value: TableKind) => void;
    kindOptions: Array<TableKind>;
    tableNumberInputRef: React.RefObject<HTMLInputElement | null>;
    errors: Record<string, string> | undefined;
    formError: string | undefined;
    onCancel: () => void;
}) {
    return (
        <fetcher.Form method="post" className="tablesInlineForm">
            <input type="hidden" name="intent" value="add-table" />
            <input type="hidden" name="areaId" value={areaId} />

            <div className="tablesInlineRow">
                <label className="tablesField">
                    <div className="tablesLabel">Table #</div>
                    <input
                        className="tablesInput"
                        name="tableNumber"
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        ref={tableNumberInputRef}
                        value={tableNumber}
                        onChange={(e) =>
                            setTableNumber(onlyDigits(e.currentTarget.value))
                        }
                        pattern="[0-9]+"
                        aria-invalid={errors?.tableNumber ? true : undefined}
                    />
                    {errors?.tableNumber ? (
                        <div className="tablesFieldError">
                            {errors.tableNumber}
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
                        aria-invalid={errors?.capacity ? true : undefined}
                    />
                    {errors?.capacity ? (
                        <div className="tablesFieldError">
                            {errors.capacity}
                        </div>
                    ) : null}
                </label>

                <label className="tablesField">
                    <div className="tablesLabel">Type</div>
                    <select
                        className="tablesSelect"
                        name="kind"
                        value={kind}
                        onChange={(e) =>
                            setKind(e.currentTarget.value as TableKind)
                        }
                        aria-invalid={errors?.kind ? true : undefined}
                    >
                        {kindOptions.map((k) => (
                            <option key={k} value={k}>
                                {tableKindLabel(k)}
                            </option>
                        ))}
                    </select>
                    {errors?.kind ? (
                        <div className="tablesFieldError">{errors.kind}</div>
                    ) : null}
                </label>
            </div>

            {formError ? (
                <div className="tablesFormError">{formError}</div>
            ) : null}

            <div className="tablesInlineActions">
                <button
                    type="submit"
                    className="tablesPrimaryButton"
                    data-action="add"
                    disabled={fetcher.state !== "idle"}
                >
                    Add table
                </button>
                <button
                    type="button"
                    className="tablesSecondaryButton"
                    data-action="cancel"
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
        </fetcher.Form>
    );
}
