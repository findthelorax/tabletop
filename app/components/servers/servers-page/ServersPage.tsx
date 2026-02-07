import * as React from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";

import type { ServersLoaderData } from "../../../services/servers.server";
import { useToast } from "../../../ui/toast";

import { ServersDayPicker } from "./ServersDayPicker";
import { ServersMetricsTable } from "./ServersMetricsTable";
import {
    AddServerModal,
    DeleteServerConfirm,
    EditServerModal,
    type ActionResult,
} from "./ServerModals";

export function ServersPage() {
    let data = useLoaderData() as ServersLoaderData;
    let { revalidate } = useRevalidator();
    let { addToast } = useToast();

    let createFetcher = useFetcher<ActionResult>();
    let manageFetcher = useFetcher<ActionResult>();

    let [open, setOpen] = React.useState(false);
    let [name, setName] = React.useState("");

    let [editOpen, setEditOpen] = React.useState(false);
    let [editServerId, setEditServerId] = React.useState<string>("");
    let [editName, setEditName] = React.useState("");
    let [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
        null,
    );

    let prevState = React.useRef(createFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevState.current === "idle";
        let isIdle = createFetcher.state === "idle";
        prevState.current = createFetcher.state;

        if (wasIdle || !isIdle || !createFetcher.data) return;
        if (createFetcher.data.ok) {
            addToast("Server added", "success");
            setOpen(false);
            setName("");
            revalidate();
        } else {
            addToast(
                createFetcher.data.formError ?? "Could not add server",
                "error",
            );
        }
    }, [addToast, createFetcher.data, createFetcher.state, revalidate]);

    let manageIntentRef = React.useRef<"update" | "delete" | null>(null);

    let prevManageState = React.useRef(manageFetcher.state);
    React.useEffect(() => {
        let wasIdle = prevManageState.current === "idle";
        let isIdle = manageFetcher.state === "idle";
        prevManageState.current = manageFetcher.state;

        if (wasIdle || !isIdle || !manageFetcher.data) return;

        if (manageFetcher.data.ok) {
            addToast(
                manageIntentRef.current === "delete"
                    ? "Server deleted"
                    : "Server updated",
                "success",
            );
            manageIntentRef.current = null;
            setEditOpen(false);
            setEditServerId("");
            setEditName("");
            setConfirmDeleteId(null);
            revalidate();
        } else {
            addToast(
                manageFetcher.data.formError ?? "Could not update server",
                "error",
            );
        }
    }, [addToast, manageFetcher.data, manageFetcher.state, revalidate]);

    let isBusy =
        createFetcher.state !== "idle" || manageFetcher.state !== "idle";

    return (
        <div className="page">
            <div className="serversTopBar">
                <div>
                    <div className="pageTitleRow">
                        <h1 className="pageTitle">Servers</h1>
                        <button
                            type="button"
                            className="tablesPrimaryButton tablesSmallButton"
                            data-action="add"
                            onClick={() => setOpen(true)}
                        >
                            Add Server
                        </button>
                    </div>
                    <p className="pageSubtitle">
                        Add your servers and track tables/guests.
                    </p>
                </div>

                <ServersDayPicker serviceDay={data.serviceDay} />
            </div>

            <div className="tablesArea">
                <div className="tablesAreaHeader">
                    <h2 className="tablesAreaTitle">Server Metrics</h2>
                </div>

                <ServersMetricsTable
                    rows={data.rows}
                    isBusy={isBusy}
                    onEdit={({ id, name }) => {
                        setEditServerId(id);
                        setEditName(name);
                        setEditOpen(true);
                    }}
                    onDelete={(id) => setConfirmDeleteId(id)}
                />
            </div>

            <AddServerModal
                open={open}
                name={name}
                setName={setName}
                isBusy={isBusy}
                createFetcher={createFetcher}
                onClose={() => {
                    if (createFetcher.state !== "idle") return;
                    setOpen(false);
                }}
            />

            <EditServerModal
                open={editOpen}
                editServerId={editServerId}
                editName={editName}
                setEditName={setEditName}
                manageFetcher={manageFetcher}
                isBusy={isBusy}
                onClose={() => {
                    if (isBusy) return;
                    setEditOpen(false);
                }}
                onWillSubmitUpdate={() => {
                    manageIntentRef.current = "update";
                }}
            />

            <DeleteServerConfirm
                open={confirmDeleteId !== null}
                isBusy={isBusy}
                onConfirm={() => {
                    if (!confirmDeleteId) return;
                    manageIntentRef.current = "delete";
                    let fd = new FormData();
                    fd.set("intent", "delete-server");
                    fd.set("serverId", confirmDeleteId);
                    manageFetcher.submit(fd, { method: "post" });
                }}
                onCancel={() => setConfirmDeleteId(null)}
            />
        </div>
    );
}
