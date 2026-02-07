import * as React from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";

import { AreaSection, TableCard, type Area } from "./index";
import { useToast } from "../../ui/toast";

export function TablesPage() {
    let { areas, unassigned } = useLoaderData() as {
        areas: Area[];
        unassigned: Area["tables"];
    };

    let revalidator = useRevalidator();
    let { addToast } = useToast();
    let addAreaFetcher = useFetcher<
        | { ok: true; areaId: string }
        | {
              ok: false;
              formError?: string;
              fieldErrors?: Record<string, string>;
          }
    >();

    let addAreaFormRef = React.useRef<HTMLFormElement | null>(null);

    let [showAddArea, setShowAddArea] = React.useState(false);
    let [areaName, setAreaName] = React.useState("");

    let closeAddArea = React.useCallback(() => {
        setShowAddArea(false);
        setAreaName("");
    }, []);

    let addAreaErrors =
        addAreaFetcher.data &&
        "ok" in addAreaFetcher.data &&
        !addAreaFetcher.data.ok
            ? addAreaFetcher.data.fieldErrors
            : undefined;

    let addAreaFormError =
        addAreaFetcher.data &&
        "ok" in addAreaFetcher.data &&
        !addAreaFetcher.data.ok
            ? addAreaFetcher.data.formError
            : undefined;

    let prevAddAreaState = React.useRef(addAreaFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevAddAreaState.current === "idle";
        let isIdle = addAreaFetcher.state === "idle";
        prevAddAreaState.current = addAreaFetcher.state;

        // Only react when a submission finishes.
        if (wasIdle || !isIdle || !addAreaFetcher.data) return;

        if ("ok" in addAreaFetcher.data && addAreaFetcher.data.ok) {
            addToast("Area added", "success");
            closeAddArea();
            revalidator.revalidate();
        } else {
            addToast(
                addAreaFetcher.data.formError ?? "Could not add area",
                "error",
            );
        }
    }, [
        addAreaFetcher.data,
        addAreaFetcher.state,
        addToast,
        closeAddArea,
        revalidator,
    ]);

    React.useEffect(() => {
        if (!showAddArea) return;

        function onMouseDown(event: MouseEvent) {
            // Don't auto-close while submitting; user may need to see errors.
            if (addAreaFetcher.state !== "idle") return;

            let el = addAreaFormRef.current;
            if (!el) return;
            if (!(event.target instanceof Node)) return;

            if (!el.contains(event.target)) {
                closeAddArea();
            }
        }

        document.addEventListener("mousedown", onMouseDown, true);
        return () =>
            document.removeEventListener("mousedown", onMouseDown, true);
    }, [addAreaFetcher.state, closeAddArea, showAddArea]);

    return (
        <div className="page">
            <div className="tablesTopBar">
                <div>
                    <div className="pageTitleRow">
                        <h1 className="pageTitle">Tables</h1>
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton"
                            data-action="add"
                            onClick={() => setShowAddArea(true)}
                            aria-label="Add Area"
                            title="Add Area"
                        >
                            Add Area
                        </button>
                    </div>
                    <p className="pageSubtitle">Add areas and tables.</p>
                </div>
            </div>

            {!showAddArea ? null : (
                <addAreaFetcher.Form
                    method="post"
                    className="tablesInlineForm"
                    ref={addAreaFormRef}
                >
                    <input type="hidden" name="intent" value="add-area" />
                    <label className="tablesField">
                        <div className="tablesLabel">Area name</div>
                        <input
                            className="tablesInput"
                            name="areaName"
                            type="text"
                            value={areaName}
                            onChange={(e) => setAreaName(e.currentTarget.value)}
                            autoFocus
                            aria-invalid={
                                addAreaErrors?.areaName ? true : undefined
                            }
                        />
                        {addAreaErrors?.areaName ? (
                            <div className="tablesFieldError">
                                {addAreaErrors.areaName}
                            </div>
                        ) : null}
                    </label>

                    {addAreaFormError ? (
                        <div className="tablesFormError">
                            {addAreaFormError}
                        </div>
                    ) : null}

                    <div className="tablesInlineActions">
                        <button
                            type="submit"
                            className="tablesPrimaryButton"
                            data-action="add"
                            disabled={addAreaFetcher.state !== "idle"}
                        >
                            Add
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton"
                            data-action="cancel"
                            onClick={() => {
                                closeAddArea();
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </addAreaFetcher.Form>
            )}

            <div className="tablesAreas">
                {areas.length === 0 && unassigned.length === 0 ? (
                    <div className="tablesEmpty">
                        No areas yet. Click “Add Area” to add one.
                    </div>
                ) : null}

                {areas.map((area) => (
                    <AreaSection
                        key={area.id}
                        area={area}
                        allAreas={areas.map((a) => ({
                            id: a.id,
                            name: a.name,
                        }))}
                        onDidMutate={revalidator.revalidate}
                        addToast={addToast}
                    />
                ))}

                {unassigned.length === 0 ? null : (
                    <section className="tablesArea">
                        <div className="tablesAreaHeader">
                            <h2 className="tablesAreaTitle">Unassigned</h2>
                        </div>

                        <div className="tablesGrid" role="list">
                            {unassigned.map((t) => (
                                <TableCard
                                    key={t.id}
                                    table={t}
                                    allAreas={areas.map((a) => ({
                                        id: a.id,
                                        name: a.name,
                                    }))}
                                    addToast={addToast}
                                    onDidMutate={revalidator.revalidate}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
