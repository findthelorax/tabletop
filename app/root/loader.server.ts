import type { Route } from "../+types/root";

import { themeCookie, type Theme } from "../utils/theme.server";
import { getRestaurantId, requireAuth } from "../utils/auth.server";
import { getPrisma } from "../utils/db.server";
import { getWaitlistSidebarData } from "../services/waitlist-sidebar.server";
import type { RootLoaderData } from "./loader.types";
import { installServerErrorHandlers } from "./server-error-handlers.server";

installServerErrorHandlers();

export async function rootLoader({
    request,
}: Route.LoaderArgs): Promise<RootLoaderData> {
    let url = new URL(request.url);
    let restaurantId: string | null = null;
    if (url.pathname !== "/login") {
        let session = await requireAuth(request);
        // For document requests, we pre-load sidebar data; it must be scoped.
        // requireAuth guarantees restaurantId exists here.
        restaurantId = getRestaurantId(session);
    }

    let storeNumber: number | null = null;
    if (restaurantId) {
        try {
            let prisma = getPrisma() as any;
            let restaurant = await prisma.restaurant.findUnique({
                where: { id: restaurantId },
                select: { storeNumber: true },
            });
            storeNumber =
                typeof restaurant?.storeNumber === "number"
                    ? restaurant.storeNumber
                    : null;
        } catch {
            storeNumber = null;
        }
    }

    let cookieHeader = request.headers.get("Cookie");
    let theme = (await themeCookie.parse(cookieHeader)) as Theme | undefined;
    if (theme !== "dark" && theme !== "light") theme = "light";

    // Kick off a DB connection attempt so we get quick terminal signal.
    // This is intentionally non-fatal (e.g. missing DATABASE_URL in dev).
    try {
        getPrisma();
    } catch (error) {
        let message = error instanceof Error ? error.message : String(error);
        console.warn("[db] Connection not started:", message);
    }

    // Seed waitlist sidebar for full document requests to avoid the "empty blink"
    // on refresh while still keeping client navigations light.
    let accept = request.headers.get("Accept") ?? "";
    let isDocumentRequest = accept.includes("text/html");

    let waitlistSidebarData = null;
    if (url.pathname !== "/login" && isDocumentRequest) {
        try {
            if (restaurantId) {
                waitlistSidebarData = await getWaitlistSidebarData({
                    restaurantId,
                });
            } else {
                waitlistSidebarData = null;
            }
        } catch {
            waitlistSidebarData = null;
        }
    }

    return { theme, waitlistSidebarData, storeNumber };
}
