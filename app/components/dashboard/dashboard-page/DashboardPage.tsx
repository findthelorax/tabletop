import * as React from "react";
import {
    useFetcher,
    useLoaderData,
    useRevalidator,
    useSearchParams,
} from "react-router";

import type { DashboardLoaderData } from "../../../services/dashboard.server";
import { useToast } from "../../../ui/toast";

import { DashboardSectionCard } from "../DashboardSectionCard";
import type { DashboardActionResult } from "../dashboard-utils";
import { DashboardTopBar } from "../DashboardTopBar";
import { useDashboardActionFeedback } from "../useDashboardActionFeedback";
import { useDashboardSeatingMode } from "../useDashboardSeatingMode";
import { useDashboardTableInteractions } from "../useDashboardTableInteractions";

import { DashboardModals } from "./DashboardModals";
import { buildSectionIdByTableId, getTablesInTempSection } from "./utils";
import { useDashboardSubmitters } from "./useDashboardSubmitters";
import { useDashboardUndoHotkey } from "./useDashboardUndoHotkey";

export function DashboardPage() {
    let data = useLoaderData() as DashboardLoaderData;
    let [searchParams, setSearchParams] = useSearchParams();
    let { revalidate } = useRevalidator();
    let { addToast } = useToast();

    let tableActionFetcher = useFetcher<DashboardActionResult>();
    let floorplanPrefFetcher = useFetcher<{ ok: boolean }>();

    let isBusy = tableActionFetcher.state !== "idle";

    let sectionIdByTableId = React.useMemo(() => {
        return buildSectionIdByTableId(data.sections);
    }, [data.sections]);

    let [activeSectionId, setActiveSectionId] = React.useState<string | null>(
        null,
    );

    let [undoOpen, setUndoOpen] = React.useState(false);
    let [pendingUndo, setPendingUndo] = React.useState<
        DashboardLoaderData["recentActions"][number] | null
    >(null);

    let [tempOpen, setTempOpen] = React.useState(false);
    let [tempSectionId, setTempSectionId] = React.useState<string | null>(null);
    let [tempTableId, setTempTableId] = React.useState<string>("");

    let activeSection = React.useMemo(() => {
        if (!activeSectionId) return null;
        return data.sections.find((s) => s.id === activeSectionId) ?? null;
    }, [activeSectionId, data.sections]);

    let pendingToastRef = React.useRef<string | null>(null);
    let pendingIntentRef = React.useRef<string | null>(null);

    let clearCombineSelectionRef = React.useRef<() => void>(() => undefined);

    let { seatWaitlistId, seatPartySize, seatPartyName, clearSeatingMode } =
        useDashboardSeatingMode({
            searchParams,
            setSearchParams,
            onClearCombineSelection: () => clearCombineSelectionRef.current(),
        });

    let {
        activeTable,
        setActiveTable,
        pendingCombineStart,
        combineSelection,
        setCombineSelection,
        clearCombineSelection,
        onTableClick,
        startCombineSelection,
        cancelCombineStart,
        seatActiveTable,
        setActiveTableStatus,
        startMoveActiveTable,
    } = useDashboardTableInteractions({
        sections: data.sections,
        seatWaitlistId,
        seatPartySize,
        seatPartyName,
        addToast,
        tableActionFetcher,
        sectionIdByTableId,
        selectedFloorplanId: data.selectedFloorplanId,
        pendingToastRef,
        pendingIntentRef,
    });

    React.useEffect(() => {
        clearCombineSelectionRef.current = clearCombineSelection;
    }, [clearCombineSelection]);

    useDashboardActionFeedback({
        fetcher: tableActionFetcher,
        addToast,
        revalidate,
        pendingToastRef,
        pendingIntentRef,
        clearSeatingMode,
        onSuccess: {
            closeActiveTable: () => setActiveTable(null),
            closeActiveSection: () => setActiveSectionId(null),
            closeUndoModal: () => {
                setPendingUndo(null);
                setUndoOpen(false);
            },
            resetTempModal: () => {
                setTempTableId("");
                setTempSectionId(null);
                setTempOpen(false);
            },
        },
    });

    let {
        submitSetSectionServerId,
        submitSetSectionStatus,
        submitDisableAvailableTables,
        submitUndoAction,
        submitAddTempTable,
        onFloorplanChange,
    } = useDashboardSubmitters({
        selectedFloorplanId: data.selectedFloorplanId,
        tableActionFetcher,
        floorplanPrefFetcher,
        pendingToastRef,
        pendingIntentRef,
        searchParams,
        setSearchParams,
    });

    useDashboardUndoHotkey({
        isBusy,
        onOpenUndo: () => setUndoOpen(true),
    });

    let tablesInTempSection = React.useMemo(() => {
        return getTablesInTempSection(data.sections, tempSectionId);
    }, [data.sections, tempSectionId]);

    return (
        <div className="page dashboardPage">
            <DashboardTopBar
                metrics={{
                    openMenusGuests: data.openMenusGuests,
                    waitingGuests: data.waitingGuests,
                    averageWaitMinutesLastHour: data.averageWaitMinutesLastHour,
                    waitTimeMissMinutesDailyAverage:
                        data.waitTimeMissMinutesDailyAverage,
                }}
                floorplans={data.floorplans}
                selectedFloorplanId={data.selectedFloorplanId}
                isBusy={isBusy}
                onOpenUndo={() => setUndoOpen(true)}
                onFloorplanChange={onFloorplanChange}
            />

            <div className="dashboardFloorplanWrap">
                {combineSelection && seatPartySize ? (
                    <div className="dashboardCombineHint">
                        Combining tables: select more tables until seats cover
                        party size ({combineSelection.totalSeats}/
                        {seatPartySize})
                    </div>
                ) : null}

                {!data.selectedFloorplanId ? (
                    <div className="dashboardEmptyState">
                        Create a floorplan to start seating guests from the
                        dashboard.
                    </div>
                ) : null}

                {data.selectedFloorplanId ? (
                    <div className="dashboardSectionsGrid">
                        {data.sections.map((section) => (
                            <DashboardSectionCard
                                key={section.id}
                                section={section}
                                isBusy={isBusy}
                                onTableClick={onTableClick}
                                onEditSection={(sectionId) =>
                                    setActiveSectionId(sectionId)
                                }
                                onAddTempTable={(sectionId) => {
                                    setTempSectionId(sectionId);
                                    setTempTableId("");
                                    setTempOpen(true);
                                }}
                            />
                        ))}
                    </div>
                ) : null}
            </div>

            <DashboardModals
                data={data}
                isBusy={isBusy}
                undoOpen={undoOpen}
                setUndoOpen={setUndoOpen}
                pendingUndo={pendingUndo}
                setPendingUndo={setPendingUndo}
                onUndoConfirm={() => {
                    if (!pendingUndo) return;
                    submitUndoAction(pendingUndo.id);
                }}
                activeTable={activeTable}
                setActiveTable={setActiveTable}
                seatActiveTable={seatActiveTable}
                setActiveTableStatus={setActiveTableStatus}
                startMoveActiveTable={startMoveActiveTable}
                activeSection={
                    activeSection
                        ? {
                              id: activeSection.id,
                              name: activeSection.name,
                              serverId: activeSection.serverId,
                          }
                        : null
                }
                activeSectionId={activeSectionId}
                setActiveSectionId={setActiveSectionId}
                onSaveServerId={(serverId) => {
                    if (!activeSection) return;
                    submitSetSectionServerId(activeSection.id, serverId);
                }}
                onEnableAll={() => {
                    if (!activeSection) return;
                    submitSetSectionStatus(activeSection.id, "AVAILABLE");
                }}
                onDisableAll={() => {
                    if (!activeSection) return;
                    submitSetSectionStatus(activeSection.id, "DISABLED");
                }}
                onDisableAvailable={() => {
                    if (!activeSection) return;
                    submitDisableAvailableTables(activeSection.id);
                }}
                pendingCombineStart={pendingCombineStart}
                seatPartySize={seatPartySize}
                startCombineSelection={startCombineSelection}
                cancelCombineStart={cancelCombineStart}
                tempOpen={tempOpen}
                setTempOpen={setTempOpen}
                tempSectionId={tempSectionId}
                tempTableId={tempTableId}
                onChangeTempTableId={(nextId) => setTempTableId(nextId)}
                tablesInTempSection={tablesInTempSection}
                onAddTempTable={(toSectionId, tableId) => {
                    submitAddTempTable(toSectionId, tableId);
                }}
            />
        </div>
    );
}
