import { getPrisma } from "../../utils/db.server";
import { handleCreateFloorplan } from "./actions/create-floorplan";
import { handleDeleteFloorplan } from "./actions/delete-floorplan";
import { handleRenameFloorplan } from "./actions/rename-floorplan";
import { handleCreateSection } from "./actions/create-section";
import { handleDeleteSection } from "./actions/delete-section";
import { handleUpdateSection } from "./actions/update-section";
import { publishIfOkJsonResponse } from "../../utils/live-updates.server";

export async function runFloorplanAction(options: {
    formData: FormData;
    restaurantId: string;
}): Promise<Response> {
    let { formData, restaurantId } = options;
    let intent = String(formData.get("intent") ?? "");

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

    if (intent === "create-floorplan") {
        let response = await handleCreateFloorplan({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "rename-floorplan") {
        let response = await handleRenameFloorplan({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "delete-floorplan") {
        let response = await handleDeleteFloorplan({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "create-section") {
        let response = await handleCreateSection({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "update-section") {
        let response = await handleUpdateSection({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "delete-section") {
        let response = await handleDeleteSection({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    return Response.json(
        { ok: false, formError: "Unknown action" },
        { status: 400 },
    );
}
