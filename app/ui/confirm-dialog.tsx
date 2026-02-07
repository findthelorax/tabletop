import * as React from "react";

import { Modal } from "./modal";

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    isBusy,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isBusy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    let resolvedConfirmLabel = confirmLabel ?? "Confirm";
    let confirmLabelLower = resolvedConfirmLabel.toLowerCase();
    let confirmDataAction =
        confirmLabelLower.includes("delete") ||
        confirmLabelLower.includes("remove")
            ? "delete"
            : confirmLabelLower.includes("add")
              ? "add"
              : confirmLabelLower.includes("save") ||
                  confirmLabelLower.includes("change")
                ? "save"
                : undefined;

    let cancelDataAction =
        confirmDataAction === "delete" ? undefined : "cancel";

    return (
        <Modal
            open={open}
            title={title}
            onClose={() => {
                if (isBusy) return;
                onCancel();
            }}
        >
            <div className="tablesInlineForm">
                <div className="dashboardDialogHint">{description}</div>
                <div className="tablesInlineActions">
                    <button
                        type="button"
                        className="tablesPrimaryButton"
                        data-action={confirmDataAction}
                        disabled={isBusy === true}
                        onClick={onConfirm}
                    >
                        {resolvedConfirmLabel}
                    </button>
                    <button
                        type="button"
                        className="tablesSecondaryButton"
                        data-action={cancelDataAction}
                        disabled={isBusy === true}
                        onClick={onCancel}
                    >
                        {cancelLabel ?? "Cancel"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
