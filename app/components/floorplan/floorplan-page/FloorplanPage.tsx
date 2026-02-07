import * as React from "react";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";

import type { LoaderData } from "../types";
import { useToast } from "../../../ui/toast";
import { CreateFloorplanForm } from "./CreateFloorplanForm";
import { FloorplanSelector } from "./FloorplanSelector";
import { FloorplanCard } from "./FloorplanCard";
import { RemoveFloorplanDialog } from "./RemoveFloorplanDialog";
import type {
    CreateFloorplanResult,
    CreateSectionResult,
    DeleteFloorplanResult,
    FieldErrors,
    RenameFloorplanResult,
} from "./types";

function getFieldErrors(data: unknown): FieldErrors | undefined {
    if (!data || typeof data !== "object") return undefined;
    if (!("ok" in data) || (data as any).ok !== false) return undefined;
    return (data as any).fieldErrors as FieldErrors | undefined;
}

function getFormError(data: unknown): string | undefined {
    if (!data || typeof data !== "object") return undefined;
    if (!("ok" in data) || (data as any).ok !== false) return undefined;
    return (data as any).formError as string | undefined;
}

export function FloorplanPage() {
    let data = useLoaderData() as LoaderData;
    let [searchParams, setSearchParams] = useSearchParams();
    let { addToast } = useToast();

    let createFloorplanFetcher = useFetcher<CreateFloorplanResult>();
    let renameFloorplanFetcher = useFetcher<RenameFloorplanResult>();
    let deleteFloorplanFetcher = useFetcher<DeleteFloorplanResult>();
    let createSectionFetcher = useFetcher<CreateSectionResult>();

    let [showCreateFloorplan, setShowCreateFloorplan] = React.useState(false);
    let [newFloorplanName, setNewFloorplanName] = React.useState("");

    let [isRenaming, setIsRenaming] = React.useState(false);
    let [renameName, setRenameName] = React.useState(
        data.selectedFloorplanName ?? "",
    );

    let [showAddSection, setShowAddSection] = React.useState(false);
    let [newSectionName, setNewSectionName] = React.useState("");
    let [newSectionServerId, setNewSectionServerId] = React.useState("");
    let [newSectionTableIds, setNewSectionTableIds] = React.useState<string[]>(
        [],
    );
    let [newSectionTableSearch, setNewSectionTableSearch] = React.useState("");

    let [confirmRemoveFloorplan, setConfirmRemoveFloorplan] =
        React.useState(false);

    React.useEffect(() => {
        setRenameName(data.selectedFloorplanName ?? "");
        setIsRenaming(false);
        setShowAddSection(false);
        setNewSectionName("");
        setNewSectionServerId("");
        setNewSectionTableIds([]);
        setNewSectionTableSearch("");
    }, [data.selectedFloorplanId, data.selectedFloorplanName]);

    let createFloorplanErrors = getFieldErrors(createFloorplanFetcher.data);
    let createFloorplanFormError = getFormError(createFloorplanFetcher.data);

    let renameFloorplanErrors = getFieldErrors(renameFloorplanFetcher.data);
    let renameFloorplanFormError = getFormError(renameFloorplanFetcher.data);

    let createSectionErrors = getFieldErrors(createSectionFetcher.data);
    let createSectionFormError = getFormError(createSectionFetcher.data);

    let prevCreateFloorplanState = React.useRef(createFloorplanFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevCreateFloorplanState.current === "idle";
        let isIdle = createFloorplanFetcher.state === "idle";
        prevCreateFloorplanState.current = createFloorplanFetcher.state;

        if (wasIdle || !isIdle || !createFloorplanFetcher.data) return;
        if (
            "ok" in createFloorplanFetcher.data &&
            createFloorplanFetcher.data.ok
        ) {
            addToast("Floorplan added", "success");
            let next = new URLSearchParams(searchParams);
            next.set("floorplanId", createFloorplanFetcher.data.floorplanId);
            setSearchParams(next);
            setShowCreateFloorplan(false);
            setNewFloorplanName("");
        } else {
            addToast(
                createFloorplanFetcher.data.formError ??
                    "Could not create floorplan",
                "error",
            );
        }
    }, [
        addToast,
        createFloorplanFetcher.data,
        createFloorplanFetcher.state,
        searchParams,
        setSearchParams,
    ]);

    let prevCreateSectionState = React.useRef(createSectionFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevCreateSectionState.current === "idle";
        let isIdle = createSectionFetcher.state === "idle";
        prevCreateSectionState.current = createSectionFetcher.state;

        if (wasIdle || !isIdle || !createSectionFetcher.data) return;
        if ("ok" in createSectionFetcher.data && createSectionFetcher.data.ok) {
            addToast("Section added", "success");
            setShowAddSection(false);
            setNewSectionName("");
            setNewSectionServerId("");
            setNewSectionTableIds([]);
            setNewSectionTableSearch("");
        } else {
            addToast(
                createSectionFetcher.data.formError ?? "Could not add section",
                "error",
            );
        }
    }, [addToast, createSectionFetcher.data, createSectionFetcher.state]);

    let prevRenameFloorplanState = React.useRef(renameFloorplanFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevRenameFloorplanState.current === "idle";
        let isIdle = renameFloorplanFetcher.state === "idle";
        prevRenameFloorplanState.current = renameFloorplanFetcher.state;

        if (wasIdle || !isIdle || !renameFloorplanFetcher.data) return;
        if (
            "ok" in renameFloorplanFetcher.data &&
            renameFloorplanFetcher.data.ok
        ) {
            addToast("Floorplan updated", "success");
            setIsRenaming(false);
        } else {
            addToast(
                renameFloorplanFetcher.data.formError ??
                    "Could not update floorplan",
                "error",
            );
        }
    }, [addToast, renameFloorplanFetcher.data, renameFloorplanFetcher.state]);

    let prevDeleteFloorplanState = React.useRef(deleteFloorplanFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevDeleteFloorplanState.current === "idle";
        let isIdle = deleteFloorplanFetcher.state === "idle";
        prevDeleteFloorplanState.current = deleteFloorplanFetcher.state;

        if (wasIdle || !isIdle || !deleteFloorplanFetcher.data) return;
        if (
            "ok" in deleteFloorplanFetcher.data &&
            deleteFloorplanFetcher.data.ok
        ) {
            addToast("Floorplan deleted", "success");
            setConfirmRemoveFloorplan(false);
        } else {
            addToast(
                deleteFloorplanFetcher.data.formError ??
                    "Could not delete floorplan",
                "error",
            );
        }
    }, [addToast, deleteFloorplanFetcher.data, deleteFloorplanFetcher.state]);

    let selectedId = data.selectedFloorplanId;

    return (
        <div className="page">
            <div className="floorplanTopBar">
                <div>
                    <div className="pageTitleRow">
                        <h1 className="pageTitle">Floorplan</h1>
                        <button
                            type="button"
                            className="tablesPrimaryButton tablesSmallButton"
                            data-action="add"
                            onClick={() => setShowCreateFloorplan(true)}
                        >
                            Add Floorplan
                        </button>
                    </div>
                    <p className="pageSubtitle">
                        Create floorplans for different shifts and assign tables
                        to sections.
                    </p>
                </div>
            </div>

            <CreateFloorplanForm
                fetcher={createFloorplanFetcher}
                show={showCreateFloorplan}
                name={newFloorplanName}
                onNameChange={setNewFloorplanName}
                errors={createFloorplanErrors}
                formError={createFloorplanFormError}
                onCancel={() => {
                    setShowCreateFloorplan(false);
                    setNewFloorplanName("");
                }}
            />

            <FloorplanSelector
                floorplans={data.floorplans}
                selectedId={selectedId}
                onSelect={(floorplanId) => {
                    let next = new URLSearchParams(searchParams);
                    next.set("floorplanId", floorplanId);
                    setSearchParams(next);
                }}
            />

            {selectedId ? (
                <FloorplanCard
                    selectedId={selectedId}
                    selectedName={data.selectedFloorplanName}
                    isRenaming={isRenaming}
                    renameName={renameName}
                    onRenameNameChange={setRenameName}
                    onStartRenaming={() => {
                        setIsRenaming(true);
                        setRenameName(data.selectedFloorplanName ?? "");
                    }}
                    onCancelRenaming={() => setIsRenaming(false)}
                    onStartAddSection={() => setShowAddSection(true)}
                    onRequestRemove={() => setConfirmRemoveFloorplan(true)}
                    deleteBusy={deleteFloorplanFetcher.state !== "idle"}
                    renameFloorplanFetcher={renameFloorplanFetcher}
                    renameErrors={renameFloorplanErrors}
                    renameFormError={renameFloorplanFormError}
                    showAddSection={showAddSection}
                    createSectionFetcher={createSectionFetcher}
                    createSectionErrors={createSectionErrors}
                    createSectionFormError={createSectionFormError}
                    newSectionName={newSectionName}
                    onNewSectionNameChange={setNewSectionName}
                    newSectionServerId={newSectionServerId}
                    onNewSectionServerIdChange={setNewSectionServerId}
                    newSectionTableIds={newSectionTableIds}
                    onNewSectionTableIdsChange={setNewSectionTableIds}
                    newSectionTableSearch={newSectionTableSearch}
                    onNewSectionTableSearchChange={setNewSectionTableSearch}
                    onCancelAddSection={() => {
                        setShowAddSection(false);
                        setNewSectionName("");
                        setNewSectionServerId("");
                        setNewSectionTableIds([]);
                        setNewSectionTableSearch("");
                    }}
                    sections={data.sections}
                    tables={data.tables}
                    servers={data.servers}
                />
            ) : null}

            <RemoveFloorplanDialog
                open={confirmRemoveFloorplan}
                selectedFloorplanId={selectedId}
                selectedFloorplanName={data.selectedFloorplanName}
                deleteFloorplanFetcher={deleteFloorplanFetcher}
                isBusy={deleteFloorplanFetcher.state !== "idle"}
                onCancel={() => setConfirmRemoveFloorplan(false)}
            />
        </div>
    );
}
