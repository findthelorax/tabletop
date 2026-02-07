import * as React from "react";

import type { DashboardLoaderData } from "../../services/dashboard.server";
import { Modal } from "../../ui/modal";

import { minutesSince } from "./dashboard-utils";

type RecentAction = DashboardLoaderData["recentActions"][number];

export function DashboardUndoActionsModal(props: {
    open: boolean;
    recentActions: DashboardLoaderData["recentActions"];
    isBusy: boolean;
    onClose: () => void;
    onPickAction: (action: RecentAction) => void;
}) {
    return (
        <Modal open={props.open} title="Undo" onClose={props.onClose}>
            <div className="dashboardDialogBody">
                {props.recentActions.length === 0 ? (
                    <div className="tablesEmpty">No recent actions.</div>
                ) : (
                    <div className="tablesArea">
                        {props.recentActions.map((a) => {
                            let mins = minutesSince(a.createdAt);
                            let details = [
                                mins !== null ? `${mins}m ago` : null,
                            ]
                                .filter(Boolean)
                                .join(" • ");

                            return (
                                <div
                                    key={a.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 12,
                                        padding: "8px",
                                        borderBottom: "1px solid var(--border)",
                                    }}
                                >
                                    <div>
                                        <div className="tablesAreaTitle">
                                            {a.label}
                                        </div>
                                        <div className="pageSubtitle">
                                            {details}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="tablesPrimaryButton tablesSmallButton"
                                        disabled={props.isBusy}
                                        onClick={() => props.onPickAction(a)}
                                    >
                                        Undo
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
