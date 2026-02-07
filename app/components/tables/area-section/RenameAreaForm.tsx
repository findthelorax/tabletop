import * as React from "react";

import type { ActionFetcher } from "./types";

export function RenameAreaForm({
    fetcher,
    formRef,
    areaId,
    areaName,
    setAreaName,
    errors,
    formError,
    onCancel,
}: {
    fetcher: ActionFetcher;
    formRef: React.RefObject<HTMLFormElement | null>;
    areaId: string;
    areaName: string;
    setAreaName: (value: string) => void;
    errors: Record<string, string> | undefined;
    formError: string | undefined;
    onCancel: () => void;
}) {
    return (
        <fetcher.Form
            method="post"
            className="tablesAreaHeaderForm"
            ref={formRef}
        >
            <input type="hidden" name="intent" value="rename-area" />
            <input type="hidden" name="areaId" value={areaId} />
            <input
                className="tablesInput"
                name="areaName"
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.currentTarget.value)}
                autoFocus
                aria-invalid={errors?.areaName ? true : undefined}
            />
            <div className="tablesHeaderActions">
                <button
                    type="submit"
                    className="tablesSecondaryButton tablesSmallButton"
                    data-action="save"
                    disabled={fetcher.state !== "idle"}
                >
                    Save
                </button>
                <button
                    type="button"
                    className="tablesSecondaryButton tablesSmallButton"
                    data-action="cancel"
                    onClick={onCancel}
                    disabled={fetcher.state !== "idle"}
                >
                    Cancel
                </button>
            </div>
            {errors?.areaName ? (
                <div className="tablesFieldError">{errors.areaName}</div>
            ) : null}
            {formError ? (
                <div className="tablesFieldError">{formError}</div>
            ) : null}
        </fetcher.Form>
    );
}
