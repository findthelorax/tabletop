import * as React from "react";

import type { DashboardLoaderData } from "../../../services/dashboard.server";
import { ConfirmDialog } from "../../../ui/confirm-dialog";

import { DashboardCombineTablesDialog } from "../DashboardCombineTablesDialog";
import { DashboardSectionDialog } from "../DashboardSectionDialog";
import { DashboardTableDialog } from "../DashboardTableDialog";
import { DashboardTempTableModal } from "../DashboardTempTableModal";
import { DashboardUndoActionsModal } from "../DashboardUndoActionsModal";

type RecentAction = DashboardLoaderData["recentActions"][number];
type TableModel = DashboardLoaderData["sections"][number]["tables"][number];

export function DashboardModals({
    data,
    isBusy,
    undoOpen,
    setUndoOpen,
    pendingUndo,
    setPendingUndo,
    onUndoConfirm,
    activeTable,
    setActiveTable,
    seatActiveTable,
    setActiveTableStatus,
    startMoveActiveTable,
    activeSection,
    activeSectionId,
    setActiveSectionId,
    onSaveServerId,
    onEnableAll,
    onDisableAll,
    onDisableAvailable,
    pendingCombineStart,
    seatPartySize,
    startCombineSelection,
    cancelCombineStart,
    tempOpen,
    setTempOpen,
    tempSectionId,
    tempTableId,
    onChangeTempTableId,
    tablesInTempSection,
    onAddTempTable,
}: {
    data: DashboardLoaderData;
    isBusy: boolean;

    undoOpen: boolean;
    setUndoOpen: (v: boolean) => void;

    pendingUndo: RecentAction | null;
    setPendingUndo: (v: RecentAction | null) => void;
    onUndoConfirm: () => void;

    activeTable: TableModel | null;
    setActiveTable: (v: TableModel | null) => void;
    seatActiveTable: (partySize: number) => void;
    setActiveTableStatus: (
        toStatus: "AVAILABLE" | "DIRTY" | "ON_HOLD" | "DISABLED",
    ) => void;
    startMoveActiveTable: () => void;

    activeSection: { id: string; name: string; serverId: string | null } | null;
    activeSectionId: string | null;
    setActiveSectionId: (v: string | null) => void;

    onSaveServerId: (serverId: string | null) => void;
    onEnableAll: () => void;
    onDisableAll: () => void;
    onDisableAvailable: () => void;

    pendingCombineStart: any;
    seatPartySize: number | null;
    startCombineSelection: (...args: any[]) => void;
    cancelCombineStart: () => void;

    tempOpen: boolean;
    setTempOpen: (v: boolean) => void;
    tempSectionId: string | null;
    tempTableId: string;
    onChangeTempTableId: (nextId: string) => void;
    tablesInTempSection: string[];
    onAddTempTable: (toSectionId: string, tableId: string) => void;
}) {
    return (
        <>
            <DashboardCombineTablesDialog
                open={pendingCombineStart !== null}
                seatPartySize={seatPartySize}
                pendingCombineStart={pendingCombineStart}
                isBusy={isBusy}
                onConfirm={startCombineSelection}
                onCancel={cancelCombineStart}
            />

            <DashboardUndoActionsModal
                open={undoOpen}
                recentActions={data.recentActions}
                isBusy={isBusy}
                onClose={() => {
                    if (isBusy) return;
                    setUndoOpen(false);
                }}
                onPickAction={(a) => setPendingUndo(a)}
            />

            <DashboardTempTableModal
                open={tempOpen}
                tempSectionId={tempSectionId}
                tempTableId={tempTableId}
                floorplanTables={data.floorplanTables}
                tablesInTempSection={tablesInTempSection}
                isBusy={isBusy}
                onClose={() => {
                    if (isBusy) return;
                    setTempOpen(false);
                }}
                onChangeTempTableId={onChangeTempTableId}
                onAddTempTable={onAddTempTable}
            />

            <ConfirmDialog
                open={pendingUndo !== null}
                title="Undo action?"
                description={
                    pendingUndo
                        ? `Undo: ${pendingUndo.label}?`
                        : "Undo the selected action?"
                }
                confirmLabel="Undo"
                cancelLabel="Cancel"
                isBusy={isBusy}
                onConfirm={onUndoConfirm}
                onCancel={() => setPendingUndo(null)}
            />

            <DashboardTableDialog
                open={activeTable !== null}
                table={activeTable}
                isBusy={isBusy}
                onClose={() => setActiveTable(null)}
                onSeat={seatActiveTable}
                onSetStatus={setActiveTableStatus}
                onMove={() => startMoveActiveTable()}
            />

            <DashboardSectionDialog
                open={activeSectionId !== null}
                section={activeSection}
                servers={data.servers}
                isBusy={isBusy}
                onClose={() => setActiveSectionId(null)}
                onSaveServerId={onSaveServerId}
                onEnableAll={onEnableAll}
                onDisableAll={onDisableAll}
                onDisableAvailable={onDisableAvailable}
            />
        </>
    );
}
