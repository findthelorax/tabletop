import type { Route } from "./+types/waitlist.sidebar";
import { requireRestaurantId } from "../utils/auth.server";
import { getWaitlistSidebarData } from "../services/waitlist-sidebar.server";

export async function loader({ request }: Route.LoaderArgs) {
    let restaurantId = await requireRestaurantId(request);

    try {
        let data = await getWaitlistSidebarData({ restaurantId });
        return Response.json(data);
    } catch {
        return Response.json({ items: [], tables: [] });
    }
}

export default function WaitlistSidebarDataRoute(_: Route.ComponentProps) {
    return null;
}
