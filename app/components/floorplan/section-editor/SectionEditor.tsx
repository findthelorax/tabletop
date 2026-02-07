import * as React from "react";
import { useFetcher } from "react-router";

import type {
    FloorplanSectionModel,
    ServerOption,
    TableOption,
} from "../types";
import { useToast } from "../../../ui/toast";

import { SectionEditForm } from "./SectionEditForm";
import { SectionSummary } from "./SectionSummary";
import { getSelectedTables } from "./utils";

type ActionResult =
    | { ok: true }
    | {
          ok: false;
          formError?: string;
          fieldErrors?: Record<string, string>;
      };

export function SectionEditor({
    floorplanId,
    section,
    tables,
    servers,
}: {
    floorplanId: string;
    section: FloorplanSectionModel;
    tables: TableOption[];
    servers: ServerOption[];
}) {
    let { addToast } = useToast();

    let updateFetcher = useFetcher<ActionResult>();
    let deleteFetcher = useFetcher<ActionResult>();

    let [isEditing, setIsEditing] = React.useState(false);
    let [confirmRemoveOpen, setConfirmRemoveOpen] = React.useState(false);

    let [name, setName] = React.useState(section.name);
    let [serverId, setServerId] = React.useState(section.serverId ?? "");
    let [tableIds, setTableIds] = React.useState<string[]>(section.tableIds);
    let [tableSearch, setTableSearch] = React.useState("");

    React.useEffect(() => {
        setIsEditing(false);
        setName(section.name);
        setServerId(section.serverId ?? "");
        setTableIds(section.tableIds);
        setTableSearch("");
    }, [section.id]);

    let errors =
        updateFetcher.data &&
        "ok" in updateFetcher.data &&
        !updateFetcher.data.ok
            ? updateFetcher.data.fieldErrors
            : undefined;

    let formError =
        updateFetcher.data &&
        "ok" in updateFetcher.data &&
        !updateFetcher.data.ok
            ? updateFetcher.data.formError
            : undefined;

    let prevUpdateState = React.useRef(updateFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevUpdateState.current === "idle";
        let isIdle = updateFetcher.state === "idle";
        prevUpdateState.current = updateFetcher.state;

        if (wasIdle || !isIdle || !updateFetcher.data) return;
        if ("ok" in updateFetcher.data && updateFetcher.data.ok) {
            addToast("Section updated", "success");
            setIsEditing(false);
        } else {
            addToast(
                updateFetcher.data.formError ?? "Could not update section",
                "error",
            );
        }
    }, [addToast, updateFetcher.data, updateFetcher.state]);

    let prevDeleteState = React.useRef(deleteFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevDeleteState.current === "idle";
        let isIdle = deleteFetcher.state === "idle";
        prevDeleteState.current = deleteFetcher.state;

        if (wasIdle || !isIdle || !deleteFetcher.data) return;
        if ("ok" in deleteFetcher.data && deleteFetcher.data.ok) {
            addToast("Section deleted", "success");
            setConfirmRemoveOpen(false);
        } else {
            addToast(
                deleteFetcher.data.formError ?? "Could not delete section",
                "error",
            );
        }
    }, [addToast, deleteFetcher.data, deleteFetcher.state]);

    let deleteFormError =
        deleteFetcher.data &&
        "ok" in deleteFetcher.data &&
        !deleteFetcher.data.ok
            ? deleteFetcher.data.formError
            : undefined;

    let selectedTables = React.useMemo(() => {
        return getSelectedTables({
            sectionTableIds: section.tableIds,
            tables,
        });
    }, [section.tableIds, tables]);

    let isBusy =
        updateFetcher.state !== "idle" || deleteFetcher.state !== "idle";

    return (
        <div className="floorplanSectionItem">
            {!isEditing ? (
                <SectionSummary
                    floorplanId={floorplanId}
                    section={section}
                    selectedTables={selectedTables}
                    isBusy={isBusy}
                    deleteFormError={deleteFormError}
                    confirmRemoveOpen={confirmRemoveOpen}
                    onStartEdit={() => {
                        setIsEditing(true);
                        setName(section.name);
                        setServerId(section.serverId ?? "");
                        setTableIds(section.tableIds);
                        setTableSearch("");
                    }}
                    onRequestDelete={() => setConfirmRemoveOpen(true)}
                    onConfirmDelete={() => {
                        let fd = new FormData();
                        fd.set("intent", "delete-section");
                        fd.set("floorplanId", floorplanId);
                        fd.set("sectionId", section.id);
                        deleteFetcher.submit(fd, { method: "post" });
                    }}
                    onCancelDelete={() => setConfirmRemoveOpen(false)}
                />
            ) : (
                <SectionEditForm
                    Form={updateFetcher.Form}
                    floorplanId={floorplanId}
                    sectionId={section.id}
                    name={name}
                    setName={setName}
                    serverId={serverId}
                    setServerId={setServerId}
                    tables={tables}
                    servers={servers}
                    tableIds={tableIds}
                    setTableIds={setTableIds}
                    tableSearch={tableSearch}
                    setTableSearch={setTableSearch}
                    errors={errors}
                    formError={formError}
                    isBusy={isBusy}
                    onCancel={() => setIsEditing(false)}
                />
            )}
        </div>
    );
}
