import { toTitleCaseName } from "../../../utils/name-case";
import { cleanNotes, normalizePhone } from "../parsing";
import { WaitlistStatus } from "../prisma-enums";
import {
    responseBadRequest,
    validatePartyName,
    validatePartySize,
    validateQuotedWait,
} from "../validate";
import { type WaitlistActionResult } from "../types";

export async function handleWaitlistAdd(args: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
    serviceDay: string;
}): Promise<Response> {
    let { prisma, restaurantId, formData, serviceDay } = args;

    let partyName = toTitleCaseName(String(formData.get("partyName") ?? ""));
    let partySizeRaw = String(formData.get("partySize") ?? "").trim();
    let phoneRaw = String(formData.get("phoneNumber") ?? "");
    let isCallAhead = String(formData.get("isCallAhead") ?? "") === "true";
    let quotedWaitRaw = String(formData.get("quotedWaitMinutes") ?? "").trim();
    let notes = String(formData.get("notes") ?? "").trim();
    let preferredTableId = String(
        formData.get("preferredTableId") ?? "",
    ).trim();

    let fieldErrors: Record<string, string> = {
        ...validatePartyName(partyName),
    };

    let { fieldErrors: partySizeErrors, partySize } =
        validatePartySize(partySizeRaw);
    Object.assign(fieldErrors, partySizeErrors);

    let phoneNumber = phoneRaw.trim() ? normalizePhone(phoneRaw) : null;
    if (phoneRaw.trim() && !phoneNumber) {
        fieldErrors.phoneNumber = "Phone number must be 10 digits";
    }

    let { fieldErrors: quotedWaitErrors, quotedWaitMinutes } =
        validateQuotedWait(quotedWaitRaw);
    Object.assign(fieldErrors, quotedWaitErrors);

    if (preferredTableId) {
        let table = await prisma.table.findFirst({
            where: { restaurantId, id: preferredTableId },
            select: { tableNumber: true, label: true },
        });
        if (!table) {
            fieldErrors.preferredTableId = "Preferred table does not exist";
        }
    }

    if (Object.keys(fieldErrors).length > 0) {
        return responseBadRequest({
            ok: false,
            fieldErrors,
        } satisfies WaitlistActionResult);
    }

    let now = new Date();
    let finalNotes = cleanNotes(notes);

    await prisma.waitlistEntry.create({
        data: {
            restaurantId,
            serviceDay,
            partyName,
            partySize: partySize!,
            phoneNumber,
            isCallAhead,
            quotedWaitMinutes,
            notes: finalNotes,
            preferredTableId: preferredTableId || null,
            status: isCallAhead
                ? WaitlistStatus.CALL_AHEAD
                : WaitlistStatus.WAITING,
            waitingStartedAt: isCallAhead ? null : now,
            arrivedAt: isCallAhead ? null : now,
        },
        select: { id: true },
    });

    return Response.json({ ok: true } satisfies WaitlistActionResult);
}
