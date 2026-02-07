import * as React from "react";

import { Modal } from "../../ui/modal";
import { ConfirmDialog } from "../../ui/confirm-dialog";

type SectionModel = {
    id: string;
    name: string;
    serverId: string | null;
};

type ServerOption = { id: string; name: string };

export function DashboardSectionDialog({
    open,
    section,
    servers,
    isBusy,
    onClose,
    onSaveServerId,
    onEnableAll,
    onDisableAll,
    onDisableAvailable,
}: {
    open: boolean;
    section: SectionModel | null;
    servers: ServerOption[];
    isBusy: boolean;
    onClose: () => void;
    onSaveServerId: (serverId: string | null) => void;
    onEnableAll: () => void;
    onDisableAll: () => void;
    onDisableAvailable: () => void;
}) {
    let [serverId, setServerId] = React.useState<string>("");
    let [confirmServerChangeOpen, setConfirmServerChangeOpen] =
        React.useState(false);
    let [pendingServerId, setPendingServerId] = React.useState<string | null>(
        null,
    );

    React.useEffect(() => {
        if (!open) return;
        setServerId(section?.serverId ?? "");
    }, [open, section?.id, section?.serverId]);

    if (!open || !section) return null;

    let next = serverId ? serverId : null;
    let prev = section.serverId ?? null;

    return (
        <Modal
            open={open}
            title={`Edit ${section.name}`}
            onClose={() => {
                if (isBusy) return;
                onClose();
            }}
        >
            <div className="tablesInlineForm">
                <form
                    className="dashboardDialogBody"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (next !== prev) {
                            setPendingServerId(next);
                            setConfirmServerChangeOpen(true);
                            return;
                        }

                        onSaveServerId(next);
                    }}
                >
                    <div className="tablesField">
                        <div className="tablesLabel">Server</div>

                        {servers.length === 0 ? (
                            <div className="tablesHint">
                                No servers yet.{" "}
                                <a href="/servers">Add a server</a>
                            </div>
                        ) : null}

                        <select
                            className="tablesInput"
                            value={serverId}
                            onChange={(e) => setServerId(e.currentTarget.value)}
                            autoFocus
                        >
                            <option value="">Unassigned</option>
                            {servers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="dashboardDialogActions">
                        <button
                            type="submit"
                            className="tablesPrimaryButton tablesSmallButton"
                            data-action="save"
                            disabled={isBusy}
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton"
                            disabled={isBusy}
                            onClick={onEnableAll}
                        >
                            Enable all tables
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton"
                            disabled={isBusy}
                            onClick={onDisableAll}
                        >
                            Disable all tables
                        </button>
                        <button
                            type="button"
                            className="tablesSecondaryButton tablesSmallButton"
                            disabled={isBusy}
                            onClick={onDisableAvailable}
                        >
                            Disable clean tables
                        </button>
                    </div>
                </form>
            </div>

            <ConfirmDialog
                open={confirmServerChangeOpen}
                title="Change section server?"
                description="Changing the server for this section will reset today's section metrics (Tables/Guests)."
                confirmLabel="Change"
                isBusy={isBusy}
                onConfirm={() => {
                    onSaveServerId(pendingServerId);
                    setConfirmServerChangeOpen(false);
                    setPendingServerId(null);
                }}
                onCancel={() => {
                    setConfirmServerChangeOpen(false);
                    setPendingServerId(null);
                }}
            />
        </Modal>
    );
}
