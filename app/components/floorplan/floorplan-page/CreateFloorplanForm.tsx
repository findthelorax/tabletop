import type * as React from "react";
import type { FetcherWithComponents } from "react-router";

import type { CreateFloorplanResult, FieldErrors } from "./types";

type Props = {
    fetcher: FetcherWithComponents<CreateFloorplanResult>;
    show: boolean;
    name: string;
    onNameChange: (next: string) => void;
    errors?: FieldErrors;
    formError?: string;
    onCancel: () => void;
};

export function CreateFloorplanForm({
    fetcher,
    show,
    name,
    onNameChange,
    errors,
    formError,
    onCancel,
}: Props) {
    if (!show) return null;

    return (
        <fetcher.Form method="post" className="tablesInlineForm">
            <input type="hidden" name="intent" value="create-floorplan" />
            <label className="tablesField">
                <div className="tablesLabel">Floorplan name</div>
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
