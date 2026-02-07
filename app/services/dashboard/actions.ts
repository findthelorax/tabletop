import { getPrisma } from "../../utils/db.server";
import { requireRestaurantId } from "../../utils/auth.server";
import { handleSetDashboardFloorplan } from "./actions/floorplan";
import {
    handleSetSectionServerId,
    handleSetSectionStatus,
} from "./actions/section";
import {
    handleMoveSeating,
    handleSeatTable,
    handleSeatWaitlistCombined,
} from "./actions/seating";
import { handleSetTableStatus } from "./actions/table-status";
import { handleAddTempTable } from "./actions/temp-tables";
import { handleUndoAction } from "./actions/undo-action";
import { handleUndoSeating } from "./actions/undo-seating";
import { publishIfOkJsonResponse } from "../../utils/live-updates.server";

export async function runDashboardAction(request: Request): Promise<Response> {
    let formData = await request.formData();
    let intent = String(formData.get("intent") ?? "");
    let floorplanIdRaw = String(formData.get("floorplanId") ?? "").trim();
    let floorplanId = floorplanIdRaw ? floorplanIdRaw : null;

    let restaurantId = await requireRestaurantId(request);

    let prisma;
    try {
        prisma = getPrisma() as any;
    } catch (error) {
        let message =
            error instanceof Error
                ? error.message
                : "Database is not available";
        return Response.json(
            { ok: false, formError: message },
            { status: 500 },
        );
    }

    async function runAndMaybePublish(
        result: Promise<Response>,
        options?: { publish?: boolean },
    ) {
        let response = await result;
        if (options?.publish !== false) {
            await publishIfOkJsonResponse(restaurantId, response);
        }
        return response;
    }

    if (intent === "set-dashboard-floorplan") {
        return runAndMaybePublish(
            handleSetDashboardFloorplan({
                prisma,
                restaurantId,
                floorplanId,
            }),
            // This is a per-device preference; don't spam other devices.
            { publish: false },
        );
    }

    if (intent === "undo-action") {
        return runAndMaybePublish(
            handleUndoAction({
                formData,
                prisma,
                restaurantId,
                floorplanId,
            }),
        );
    }

    if (intent === "undo-seating") {
        return runAndMaybePublish(
            handleUndoSeating({ formData, prisma, restaurantId }),
        );
    }

    if (intent === "add-temp-table") {
        return runAndMaybePublish(
            handleAddTempTable({ formData, prisma, restaurantId }),
        );
    }

    if (intent === "move-seating") {
        return runAndMaybePublish(
            handleMoveSeating({ formData, prisma, restaurantId }),
        );
    }

    if (intent === "seat-table") {
        return runAndMaybePublish(
            handleSeatTable({ formData, prisma, restaurantId, floorplanId }),
        );
    }

    if (intent === "seat-waitlist-combined") {
        return runAndMaybePublish(
            handleSeatWaitlistCombined({
                formData,
                prisma,
                restaurantId,
                floorplanId,
            }),
        );
    }

    if (intent === "set-table-status") {
        return runAndMaybePublish(
            handleSetTableStatus({
                formData,
                prisma,
                restaurantId,
                floorplanId,
            }),
        );
    }

    if (intent === "set-section-status") {
        return runAndMaybePublish(
            handleSetSectionStatus({ formData, prisma, restaurantId }),
        );
    }

    if (intent === "set-section-server-id") {
        return runAndMaybePublish(
            handleSetSectionServerId({ formData, prisma, restaurantId }),
        );
    }

    return Response.json(
        { ok: false, formError: "Unknown action" },
        { status: 400 },
    );
}
