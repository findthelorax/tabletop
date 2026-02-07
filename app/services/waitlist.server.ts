import { getPrisma } from "../utils/db.server";
import { requireRestaurantId } from "../utils/auth.server";
import { todayServiceDayLocal } from "../utils/service-day";

import { handleWaitlistAdd } from "./waitlist/handlers/add";
import { handleWaitlistArrived } from "./waitlist/handlers/arrived";
import { handleWaitlistEdit } from "./waitlist/handlers/edit";
import { handleWaitlistRemove } from "./waitlist/handlers/remove";
import { handleWaitlistText } from "./waitlist/handlers/text";
import { type WaitlistActionResult } from "./waitlist/types";
import { publishIfOkJsonResponse } from "../utils/live-updates.server";

export type { WaitlistActionResult };

export async function runWaitlistAction(request: Request): Promise<Response> {
    let formData = await request.formData();
    let intent = String(formData.get("intent") ?? "");

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
            { ok: false, formError: message } satisfies WaitlistActionResult,
            { status: 500 },
        );
    }

    if (intent === "waitlist-add") {
        let serviceDay = todayServiceDayLocal();
        let response = await handleWaitlistAdd({
            prisma,
            restaurantId,
            formData,
            serviceDay,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "waitlist-edit") {
        let response = await handleWaitlistEdit({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "waitlist-arrived") {
        let response = await handleWaitlistArrived({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "waitlist-remove") {
        let response = await handleWaitlistRemove({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    if (intent === "waitlist-text") {
        let response = await handleWaitlistText({
            prisma,
            restaurantId,
            formData,
        });
        await publishIfOkJsonResponse(restaurantId, response);
        return response;
    }

    return Response.json(
        {
            ok: false,
            formError: "Unknown action",
        } satisfies WaitlistActionResult,
        { status: 400 },
    );
}
