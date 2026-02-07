import * as React from "react";

import { TablePicker } from "../TablePicker";
import type { ServerOption, TableOption } from "../types";

type FieldErrors = Record<string, string> | undefined;

export function SectionEditForm({
    Form,
    floorplanId,
    sectionId,
    name,
    setName,
    serverId,
    setServerId,
    tables,
    servers,
    tableIds,
    setTableIds,
    tableSearch,
    setTableSearch,
    errors,
    formError,
    isBusy,
    onCancel,
}: {
    Form: React.ElementType;
    floorplanId: string;
    sectionId: string;

    name: string;
    setName: (v: string) => void;

    serverId: string;
    setServerId: (v: string) => void;

    tables: TableOption[];
    servers: ServerOption[];

    tableIds: string[];
    setTableIds: React.Dispatch<React.SetStateAction<string[]>>;

    tableSearch: string;
    setTableSearch: (v: string) => void;

    errors: FieldErrors;
    formError?: string;
    isBusy: boolean;
    onCancel: () => void;
}) {
    return (
        <Form method="post" className="floorplanSectionForm">
            <input type="hidden" name="intent" value="update-section" />
            <input type="hidden" name="floorplanId" value={floorplanId} />
            <input type="hidden" name="sectionId" value={sectionId} />

            <div className="floorplanSectionGrid">
                <label className="tablesField">
                    <div className="tablesLabel">Name</div>
                    <input
                        className="tablesInput"
                        name="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
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
                        onChange={(e) => setServerId(e.currentTarget.value)}
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
                        selectedTableIds={tableIds}
                        onSelectedTableIdsChange={setTableIds}
                        search={tableSearch}
                        onSearchChange={setTableSearch}
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

            <div className="floorplanSectionActions">
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
