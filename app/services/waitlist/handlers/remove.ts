import { WaitlistStatus } from "../prisma-enums";
import { responseBadRequest } from "../validate";
import { type WaitlistActionResult } from "../types";

export async function handleWaitlistRemove(args: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
}): Promise<Response> {
    let { prisma, formData } = args;

    let id = String(formData.get("id") ?? "").trim();
    if (!id) {
        return responseBadRequest({
            ok: false,
            fieldErrors: { id: "Missing guest" },
        } satisfies WaitlistActionResult);
    }

    let now = new Date();

    await prisma.waitlistEntry.update({
        where: { id },
        data: {
            status: WaitlistStatus.CANCELLED,
            removedAt: now,
        },
    });

    return Response.json({ ok: true } satisfies WaitlistActionResult);
}
