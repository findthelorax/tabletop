import type { Route } from "./+types/floorplan";
import { FloorplanPage } from "../components/floorplan";
import {
    loadFloorplanData,
    runFloorplanAction,
} from "../services/floorplan.server";
import { requireRestaurantId } from "../utils/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
    await requireRestaurantId(request);
    return loadFloorplanData(request);
}

export async function action({ request }: Route.ActionArgs) {
    let restaurantId = await requireRestaurantId(request);
    let formData = await request.formData();
    return runFloorplanAction({ formData, restaurantId });
}

export default function Floorplan(_: Route.ComponentProps) {
    return <FloorplanPage />;
}
