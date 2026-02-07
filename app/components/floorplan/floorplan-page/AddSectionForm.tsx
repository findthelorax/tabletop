import type * as React from "react";
import type { FetcherWithComponents } from "react-router";

import type { CreateSectionResult, FieldErrors } from "./types";
import type { ServerOption, TableOption } from "../types";
import { TablePicker } from "../TablePicker";

type Props = {
    fetcher: FetcherWithComponents<CreateSectionResult>;
    show: boolean;
    floorplanId: string;
    name: string;
    onNameChange: (next: string) => void;
    serverId: string;
    onServerIdChange: (next: string) => void;
    selectedTableIds: string[];
    onSelectedTableIdsChange: React.Dispatch<React.SetStateAction<string[]>>;
    tableSearch: string;
    onTableSearchChange: (next: string) => void;
    tables: TableOption[];
    servers: ServerOption[];
    errors?: FieldErrors;
    formError?: string;
    onCancel: () => void;
};

export function AddSectionForm({
    fetcher,
    show,
    floorplanId,
    name,
    onNameChange,
    serverId,
    onServerIdChange,
    selectedTableIds,
    onSelectedTableIdsChange,
    tableSearch,
    onTableSearchChange,
    tables,
    servers,
    errors,
    formError,
    onCancel,
}: Props) {
    if (!show) return null;

    return (
        <fetcher.Form method="post" className="floorplanSectionForm">
            <input type="hidden" name="intent" value="create-section" />
            <input type="hidden" name="floorplanId" value={floorplanId} />

            <div className="floorplanSectionGrid">
                <label className="tablesField">
                    <div className="tablesLabel">Name</div>
                    <input
                        className="tablesInput"
                        name="name"
                        type="text"
                        value={name}
                        onChange={(e) => onNameChange(e.currentTarget.value)}
                        autoFocus
                        aria-invalid={errors?.name ? true : undefined}
                    />
                    {errors?.name ? (
                        <div className="tablesFieldError">{errors.name}</div>
                    ) : null}
                </label>

                <label className="tablesField">
                    <div className="tablesLabel">Team member</div>
                    {servers.length === 0 ? (
                        <div className="floorplanHint">
                            No servers yet. <a href="/servers">Add a server</a>.
                        </div>
                    ) : null}
                    <select
                        className="tablesSelect"
                        name="serverId"
                        value={serverId}
                        onChange={(e) =>
                            onServerIdChange(e.currentTarget.value)
                        }
                    >
                        <option value="">Unassigned</option>
                        {servers.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                                {srv.name}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="tablesField floorplanTablesField">
                    <div className="tablesLabel">Tables</div>
                    <TablePicker
                        tables={tables}
                        selectedTableIds={selectedTableIds}
                        onSelectedTableIdsChange={onSelectedTableIdsChange}
                        search={tableSearch}
                        onSearchChange={onTableSearchChange}
                        inputName="tableIds"
                    />
                    {errors?.tableIds ? (
                        <div className="tablesFieldError">
                            {errors.tableIds}
                        </div>
                    ) : null}
                </div>
            </div>

            {formError ? (
                <div className="tablesFormError">{formError}</div>
            ) : null}

            <div className="tablesInlineActions">
                <button
                    type="submit"
                    className="tablesPrimaryButton"
                    data-action="save"
                    disabled={fetcher.state !== "idle"}
                >
                    Save
                </button>
                <button
                    type="button"
                    className="tablesSecondaryButton"
                    data-action="cancel"
                    onClick={onCancel}
                    disabled={fetcher.state !== "idle"}
                >
                    Cancel
                </button>
            </div>
        </fetcher.Form>
    );
}
