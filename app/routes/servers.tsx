import type { Route } from "./+types/servers";

import { ServersPage } from "../components/servers/ServersPage";
import { loadServersData, runServersAction } from "../services/servers.server";
import { requireAuth } from "../utils/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
    await requireAuth(request);
    return loadServersData(request);
}

export async function action({ request }: Route.ActionArgs) {
    await requireAuth(request);
    return runServersAction(request);
}

export default function Servers(_: Route.ComponentProps) {
    return <ServersPage />;
}
