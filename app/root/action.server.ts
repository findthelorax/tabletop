import type { Route } from "../+types/root";

import { runRootAction } from "../services/root-actions.server";

export async function rootAction({ request }: Route.ActionArgs) {
    return runRootAction(request);
}
