import type { Route } from "./+types/waitlist";

import { requireAuth } from "../utils/auth.server";
import { runWaitlistAction } from "../services/waitlist.server";

export { loader } from "./waitlist/loader.server";

export async function action({ request }: Route.ActionArgs) {
    await requireAuth(request);
    return runWaitlistAction(request);
}

export { default } from "./waitlist/page";
