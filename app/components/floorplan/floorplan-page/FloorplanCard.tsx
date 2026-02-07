import type * as React from "react";
import type { FetcherWithComponents } from "react-router";

import { SectionEditor } from "../SectionEditor";
import { AddSectionForm } from "./AddSectionForm";
import type {
    FloorplanSectionModel,
    ServerOption,
    TableOption,
} from "../types";
import type {
    CreateSectionResult,
    FieldErrors,
    RenameFloorplanResult,
} from "./types";

type Props = {
    selectedId: string;
    selectedName: string | null;

    isRenaming: boolean;
    renameName: string;
    onRenameNameChange: (next: string) => void;
    onStartRenaming: () => void;
    onCancelRenaming: () => void;

    onStartAddSection: () => void;
    onRequestRemove: () => void;

    deleteBusy: boolean;

    renameFloorplanFetcher: FetcherWithComponents<RenameFloorplanResult>;
    renameErrors?: FieldErrors;
    renameFormError?: string;

    showAddSection: boolean;
    createSectionFetcher: FetcherWithComponents<CreateSectionResult>;
    createSectionErrors?: FieldErrors;
    createSectionFormError?: string;

    newSectionName: string;
    onNewSectionNameChange: (next: string) => void;
    newSectionServerId: string;
    onNewSectionServerIdChange: (next: string) => void;
    newSectionTableIds: string[];
    onNewSectionTableIdsChange: React.Dispatch<React.SetStateAction<string[]>>;
    newSectionTableSearch: string;
    onNewSectionTableSearchChange: (next: string) => void;
    onCancelAddSection: () => void;

    sections: FloorplanSectionModel[];
    tables: TableOption[];
    servers: ServerOption[];
};

export function FloorplanCard({
    selectedId,
    selectedName,
    isRenaming,
    renameName,
    onRenameNameChange,
    onStartRenaming,
    onCancelRenaming,
    onStartAddSection,
    onRequestRemove,
    deleteBusy,
    renameFloorplanFetcher,
    renameErrors,
    renameFormError,
    showAddSection,
    createSectionFetcher,
    createSectionErrors,
    createSectionFormError,
    newSectionName,
    onNewSectionNameChange,
    newSectionServerId,
    onNewSectionServerIdChange,
    newSectionTableIds,
    onNewSectionTableIdsChange,
    newSectionTableSearch,
    onNewSectionTableSearchChange,
    onCancelAddSection,
    sections,
    tables,
    servers,
}: Props) {
    return (
        <div className="floorplanCard">
            <div className="floorplanCardHeader">
                {!isRenaming ? (
                    <div className="floorplanCardTitleRow">
                        <h2 className="floorplanCardTitle">{selectedName}</h2>
                        <div className="tablesHeaderActions">
                            <button
                                type="button"
                                className="tablesSecondaryButton tablesSmallButton"
                                data-action="add"
                                onClick={onStartAddSection}
                                disabled={deleteBusy}
                            >
                                Add Section
                            </button>
                            <button
                                type="button"
                                className="tablesSecondaryButton tablesSmallButton"
                                data-action="edit"
                                onClick={onStartRenaming}
                                disabled={deleteBusy}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                className="tablesSecondaryButton tablesSmallButton"
                                data-action="delete"
                                disabled={deleteBusy}
                                onClick={onRequestRemove}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <renameFloorplanFetcher.Form
                        method="post"
                        className="floorplanRenameRow"
                    >
                        <input
                            type="hidden"
                            name="intent"
                            value="rename-floorplan"
                        />
                        <input
                            type="hidden"
                            name="floorplanId"
                            value={selectedId}
                        />
                        <label className="tablesField">
                            <div className="tablesLabel">Floorplan name</div>
                            <input
                                className="tablesInput"
                                name="name"
                                type="text"
                                value={renameName}
                                onChange={(e) =>
                                    onRenameNameChange(e.currentTarget.value)
                                }
                                autoFocus
                                aria-invalid={
                                    renameErrors?.name ? true : undefined
                                }
                            />
                            {renameErrors?.name ? (
                                <div className="tablesFieldError">
                                    {renameErrors.name}
                                </div>
                            ) : null}
                        </label>

                        {renameFormError ? (
                            <div className="tablesFieldError">
                                {renameFormError}
                            </div>
                        ) : null}

                        <div className="tablesHeaderActions">
                            <button
                                type="submit"
                                className="tablesSecondaryButton tablesSmallButton"
                                data-action="save"
                                disabled={
                                    renameFloorplanFetcher.state !== "idle"
                                }
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                className="tablesSecondaryButton tablesSmallButton"
                                data-action="cancel"
                                onClick={onCancelRenaming}
                                disabled={
                                    renameFloorplanFetcher.state !== "idle"
                                }
                            >
                                Cancel
                            </button>
                        </div>
                    </renameFloorplanFetcher.Form>
                )}
            </div>

            <div className="floorplanSections">
                <AddSectionForm
                    fetcher={createSectionFetcher}
                    show={showAddSection}
                    floorplanId={selectedId}
                    name={newSectionName}
                    onNameChange={onNewSectionNameChange}
                    serverId={newSectionServerId}
                    onServerIdChange={onNewSectionServerIdChange}
                    selectedTableIds={newSectionTableIds}
                    onSelectedTableIdsChange={onNewSectionTableIdsChange}
                    tableSearch={newSectionTableSearch}
                    onTableSearchChange={onNewSectionTableSearchChange}
                    tables={tables}
                    servers={servers}
                    errors={createSectionErrors}
                    formError={createSectionFormError}
                    onCancel={onCancelAddSection}
                />

                {sections.length === 0 ? (
                    <div className="tablesEmpty">
                        No sections yet. Click “Add Section”.
                    </div>
                ) : (
                    <div className="floorplanSectionList">
                        {sections.map((s) => (
                            <SectionEditor
                                key={s.id}
                                floorplanId={selectedId}
                                section={s}
                                tables={tables}
                                servers={servers}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
