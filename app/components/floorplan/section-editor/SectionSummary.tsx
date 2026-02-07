import * as React from "react";

import { ConfirmDialog } from "../../../ui/confirm-dialog";
import type { FloorplanSectionModel } from "../types";

export function SectionSummary({
    floorplanId,
    section,
    selectedTables,
    isBusy,
    deleteFormError,
    confirmRemoveOpen,
    onStartEdit,
    onRequestDelete,
    onConfirmDelete,
    onCancelDelete,
}: {
    floorplanId: string;
    section: FloorplanSectionModel;
    selectedTables: Array<{ id: string; label: string }>;
    isBusy: boolean;
    deleteFormError?: string;
    confirmRemoveOpen: boolean;
    onStartEdit: () => void;
    onRequestDelete: () => void;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
}) {
    return (
        <div className="floorplanSectionSummary">
            <div className="floorplanSectionSummaryGrid">
                <div>
                    <div className="floorplanSectionSummaryHeaderRow">
                        <div className="tablesLabel">Name</div>
                    </div>
                    <div className="floorplanSectionSummaryValue">
                        {section.name}
                    </div>
                </div>

                <div>
                    <div className="floorplanSectionSummaryHeaderRow floorplanSectionSummaryHeaderRowWithActions">
                        <div className="tablesLabel">Team Member</div>
                        <div className="floorplanSectionSummaryActions">
                            <button
                                type="button"
                                className="tablesSecondaryButton tablesSmallButton"
                                data-action="edit"
                                onClick={onStartEdit}
                                disabled={isBusy}
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                className="tablesSecondaryButton tablesSmallButton"
                                data-action="delete"
                                disabled={isBusy}
                                onClick={onRequestDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                    <div className="floorplanSectionSummaryValue">
                        {section.serverName ? section.serverName : "—"}
                    </div>
                </div>

                <div className="floorplanSectionSummaryTables">
                    <div className="tablesLabel">Tables</div>
                    {selectedTables.length === 0 ? (
                        <div className="floorplanSectionSummaryValue">
                            No tables
                        </div>
                    ) : (
                        <div className="floorplanChips" role="list">
                            {selectedTables.map((t) => (
                                <div
                                    key={t.id}
                                    className="floorplanChip"
                                    role="listitem"
                                >
                                    <span className="floorplanChipLabel">
                                        {t.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {deleteFormError ? (
                <div className="tablesFormError">{deleteFormError}</div>
            ) : null}

            <ConfirmDialog
                open={confirmRemoveOpen}
                title="Delete section?"
                description={`Delete section "${section.name}"?`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isBusy={isBusy}
                onConfirm={onConfirmDelete}
                onCancel={onCancelDelete}
            />
        </div>
    );
}
