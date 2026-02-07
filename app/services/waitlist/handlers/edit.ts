import { toTitleCaseName } from "../../../utils/name-case";
import { cleanNotes, normalizePhone } from "../parsing";
import { WaitlistStatus } from "../prisma-enums";
import {
    responseBadRequest,
    responseNotFound,
    validatePartyName,
    validatePartySize,
    validateQuotedWait,
} from "../validate";
import { type WaitlistActionResult } from "../types";

export async function handleWaitlistEdit(args: {
    prisma: any;
    restaurantId: string;
    formData: FormData;
}): Promise<Response> {
    let { prisma, restaurantId, formData } = args;

    let id = String(formData.get("id") ?? "").trim();
    let partyName = toTitleCaseName(String(formData.get("partyName") ?? ""));
    let partySizeRaw = String(formData.get("partySize") ?? "").trim();
    let phoneRaw = String(formData.get("phoneNumber") ?? "");
    let isCallAhead = String(formData.get("isCallAhead") ?? "") === "true";
    let quotedWaitRaw = String(formData.get("quotedWaitMinutes") ?? "").trim();
    let notes = String(formData.get("notes") ?? "").trim();
    let preferredTableId = String(
        formData.get("preferredTableId") ?? "",
    ).trim();

    let fieldErrors: Record<string, string> = {};
    if (!id) fieldErrors.id = "Missing guest";
    Object.assign(fieldErrors, validatePartyName(partyName));

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

    let existing = await prisma.waitlistEntry.findFirst({
        where: { restaurantId, id },
        select: {
            id: true,
            status: true,
            notes: true,
            waitingStartedAt: true,
            arrivedAt: true,
            isCallAhead: true,
        },
    });

    if (!existing) {
        return responseNotFound({
            ok: false,
            formError: "Guest not found",
        } satisfies WaitlistActionResult);
    }

    // Do not allow turning an in-progress guest back into CALL_AHEAD.
    if (
        isCallAhead &&
        (existing.status === WaitlistStatus.WAITING ||
            existing.status === WaitlistStatus.ARRIVED)
    ) {
        fieldErrors.isCallAhead = "Guest has already arrived";
    }

    if (Object.keys(fieldErrors).length > 0) {
        return responseBadRequest({
            ok: false,
            fieldErrors,
        } satisfies WaitlistActionResult);
    }

    let now = new Date();
    let nextStatus = isCallAhead ? WaitlistStatus.CALL_AHEAD : existing.status;
    if (!isCallAhead && existing.status === WaitlistStatus.CALL_AHEAD) {
        nextStatus = WaitlistStatus.WAITING;
    }

    let finalNotes = cleanNotes(notes);

    await prisma.waitlistEntry.update({
        where: { id },
        data: {
            partyName,
            partySize: partySize!,
            phoneNumber,
            isCallAhead,
            quotedWaitMinutes,
            notes: finalNotes,
            preferredTableId: preferredTableId || null,
            status: nextStatus,
            waitingStartedAt:
                nextStatus === WaitlistStatus.CALL_AHEAD
                    ? null
                    : (existing.waitingStartedAt ?? now),
            arrivedAt:
                nextStatus === WaitlistStatus.CALL_AHEAD
                    ? null
                    : (existing.arrivedAt ?? now),
        },
    });

    return Response.json({ ok: true } satisfies WaitlistActionResult);
}
