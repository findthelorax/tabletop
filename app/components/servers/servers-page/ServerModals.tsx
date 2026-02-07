import * as React from "react";
import type { FetcherWithComponents } from "react-router";

import { ConfirmDialog } from "../../../ui/confirm-dialog";
import { Modal } from "../../../ui/modal";

export type ActionResult =
    | { ok: true; serverId?: string }
    | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

export function AddServerModal({
    open,
    name,
    setName,
    isBusy,
    createFetcher,
    onClose,
}: {
    open: boolean;
    name: string;
    setName: (v: string) => void;
    isBusy: boolean;
    createFetcher: FetcherWithComponents<ActionResult>;
    onClose: () => void;
}) {
    let errors =
        createFetcher.data && !createFetcher.data.ok
            ? createFetcher.data.fieldErrors
            : undefined;
    let formError =
        createFetcher.data && !createFetcher.data.ok
            ? createFetcher.data.formError
            : undefined;

    return (
        <Modal open={open} title="Add server" onClose={onClose}>
            <div className="tablesInlineForm">
                <createFetcher.Form method="post">
                    <input type="hidden" name="intent" value="create-server" />

                    <div className="tablesField">
                        <div className="tablesLabel">Name</div>
                        <input
                            className="tablesInput"
                            name="name"
                            value={name}
                            onChange={(e) => setName(e.currentTarget.value)}
                            autoFocus
                            aria-invalid={errors?.name ? true : undefined}
                        />
                        {errors?.name ? (
                            <div className="tablesFieldError">
                                {errors.name}
                            </div>
                        ) : null}
                    </div>

                    {formError ? (
                        <div className="tablesFormError">{formError}</div>
                    ) : null}

                    <div className="tablesInlineActions">
                        <button
                            type="submit"
                            className="tablesPrimaryButton"
                            data-action="save"
                            disabled={isBusy}
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton"
                            data-action="cancel"
                            disabled={isBusy}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </createFetcher.Form>
            </div>
        </Modal>
    );
}

export function EditServerModal({
    open,
    editServerId,
    editName,
    setEditName,
    manageFetcher,
    isBusy,
    onClose,
    onWillSubmitUpdate,
}: {
    open: boolean;
    editServerId: string;
    editName: string;
    setEditName: (v: string) => void;
    manageFetcher: FetcherWithComponents<ActionResult>;
    isBusy: boolean;
    onClose: () => void;
    onWillSubmitUpdate: () => void;
}) {
    let manageErrors =
        manageFetcher.data && !manageFetcher.data.ok
            ? manageFetcher.data.fieldErrors
            : undefined;
    let manageFormError =
        manageFetcher.data && !manageFetcher.data.ok
            ? manageFetcher.data.formError
            : undefined;

    return (
        <Modal open={open} title="Edit server" onClose={onClose}>
            <div className="tablesInlineForm">
                <manageFetcher.Form
                    method="post"
                    onSubmit={() => {
                        onWillSubmitUpdate();
                    }}
                >
                    <input type="hidden" name="intent" value="update-server" />
                    <input type="hidden" name="serverId" value={editServerId} />

                    <div className="tablesField">
                        <div className="tablesLabel">Name</div>
                        <input
                            className="tablesInput"
                            name="name"
                            value={editName}
                            onChange={(e) => setEditName(e.currentTarget.value)}
                            autoFocus
                            aria-invalid={manageErrors?.name ? true : undefined}
                        />
                        {manageErrors?.name ? (
                            <div className="tablesFieldError">
                                {manageErrors.name}
                            </div>
                        ) : null}
                    </div>

                    {manageFormError ? (
                        <div className="tablesFormError">{manageFormError}</div>
                    ) : null}

                    <div className="tablesInlineActions">
                        <button
                            type="submit"
                            className="tablesPrimaryButton"
                            data-action="save"
                            disabled={isBusy}
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton"
                            data-action="cancel"
                            disabled={isBusy}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </manageFetcher.Form>
            </div>
        </Modal>
    );
}

export function DeleteServerConfirm({
    open,
    isBusy,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    isBusy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <ConfirmDialog
            open={open}
            title="Delete server?"
            description="This removes the server from your list. Existing seatings keep their history."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            isBusy={isBusy}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}
