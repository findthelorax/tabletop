import { sendWaitlistTableReadyText } from "../../sms.server";
import { responseBadRequest, responseNotFound } from "../validate";
import { type WaitlistActionResult } from "../types";

export async function handleWaitlistText(args: {
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

    let entry = await prisma.waitlistEntry.findFirst({
        where: { restaurantId, id },
        select: { phoneNumber: true, partyName: true },
    });

    if (!entry) {
        return responseNotFound({
            ok: false,
            formError: "Guest not found",
        } satisfies WaitlistActionResult);
    }

    if (!entry.phoneNumber) {
        return responseBadRequest({
            ok: false,
            formError: "No phone number on file",
        } satisfies WaitlistActionResult);
    }

    try {
        await sendWaitlistTableReadyText({
            phoneNumber10: String(entry.phoneNumber),
            partyName: entry.partyName ? String(entry.partyName) : null,
        });
        return Response.json({ ok: true } satisfies WaitlistActionResult);
    } catch (error) {
        let message =
            error instanceof Error ? error.message : "Could not send text";
        return responseBadRequest({
            ok: false,
            formError: message,
        } satisfies WaitlistActionResult);
    }
}
