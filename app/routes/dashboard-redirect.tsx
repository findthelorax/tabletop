import { redirect } from "react-router";

import type { Route } from "./+types/dashboard-redirect";

export async function loader(_: Route.LoaderArgs) {
    throw redirect("/");
}

export default function DashboardRedirect(_: Route.ComponentProps) {
    return null;
}
