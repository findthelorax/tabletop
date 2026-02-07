import { WaitlistStatus } from "../prisma-enums";
import { responseBadRequest, responseNotFound } from "../validate";
import { type WaitlistActionResult } from "../types";

export async function handleWaitlistArrived(args: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
}): Promise<Response> {
    let { prisma, restaurantId, formData } = args;

    let id = String(formData.get("id") ?? "").trim();
    if (!id) {
        return responseBadRequest({
            ok: false,
            fieldErrors: { id: "Missing guest" },
        } satisfies WaitlistActionResult);
    }

    let now = new Date();

    let entry = await prisma.waitlistEntry.findFirst({
        where: { restaurantId, id },
        select: {
            id: true,
            status: true,
            isCallAhead: true,
            waitingStartedAt: true,
        },
    });

    if (!entry) {
        return responseNotFound({
            ok: false,
            formError: "Guest not found",
        } satisfies WaitlistActionResult);
    }

    // Only meaningful for call-ahead (or entries without a start time).
    await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: {
            status: WaitlistStatus.WAITING,
            arrivedAt: now,
            waitingStartedAt: entry.waitingStartedAt ?? now,
        },
    });

    return Response.json({ ok: true } satisfies WaitlistActionResult);
}
