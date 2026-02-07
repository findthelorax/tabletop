import type { Route } from "./+types/dashboard";
import { DashboardPage } from "../components/dashboard";
import {
    loadDashboardData,
    runDashboardAction,
} from "../services/dashboard.server";
import { requireAuth } from "../utils/auth.server";

export async function loader(args: Route.LoaderArgs) {
    await requireAuth(args.request);
    return loadDashboardData(args.request);
}

export async function action(args: Route.ActionArgs) {
    await requireAuth(args.request);
    return runDashboardAction(args.request);
}

export default function Dashboard(_: Route.ComponentProps) {
    return <DashboardPage />;
}
