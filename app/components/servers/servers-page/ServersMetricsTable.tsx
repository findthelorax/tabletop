import * as React from "react";

import type { ServersLoaderData } from "../../../services/servers.server";

export function ServersMetricsTable({
    rows,
    isBusy,
    onEdit,
    onDelete,
}: {
    rows: ServersLoaderData["rows"];
    isBusy: boolean;
    onEdit: (args: { id: string; name: string }) => void;
    onDelete: (id: string) => void;
}) {
    if (rows.length === 0) {
        return <div className="tablesEmpty">No servers yet.</div>;
    }

    return (
        <div className="serversTableWrap">
            <table className="serversTable">
                <thead>
                    <tr>
                        <th>Server</th>
                        <th>Tables</th>
                        <th>Guests</th>
                        <th>Avg (11–4) Tables</th>
                        <th>Avg (11–4) Guests</th>
                        <th>Avg (4–12) Tables</th>
                        <th>Avg (4–12) Guests</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td>{r.name}</td>
                            <td>{r.tablesToday}</td>
                            <td>{r.guestsToday}</td>
                            <td>{r.avgMorningTables ?? "—"}</td>
                            <td>{r.avgMorningGuests ?? "—"}</td>
                            <td>{r.avgEveningTables ?? "—"}</td>
                            <td>{r.avgEveningGuests ?? "—"}</td>
                            <td>
                                <div className="serversRowActions">
                                    <button
                                        type="button"
                                        className="tablesSecondaryButton tablesSmallButton"
                                        data-action="edit"
                                        disabled={isBusy}
                                        onClick={() =>
                                            onEdit({ id: r.id, name: r.name })
                                        }
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="tablesSecondaryButton tablesSmallButton"
                                        data-action="delete"
                                        disabled={isBusy}
                                        onClick={() => onDelete(r.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
