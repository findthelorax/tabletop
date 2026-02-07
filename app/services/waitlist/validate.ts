import { type WaitlistActionErrorPayload } from "./types";
import { parseNonNegativeInt, parsePositiveInt } from "./parsing";

export function validatePartyName(partyName: string): Record<string, string> {
    let fieldErrors: Record<string, string> = {};
    if (!partyName) fieldErrors.partyName = "Guest name is required";
    if (partyName.length > 80) fieldErrors.partyName = "Guest name is too long";
    return fieldErrors;
}

export function validatePartySize(partySizeRaw: string): {
    fieldErrors: Record<string, string>;
    partySize: number | null;
} {
    let fieldErrors: Record<string, string> = {};

    let partySize = parsePositiveInt(partySizeRaw);
    if (!partySize) fieldErrors.partySize = "Party size must be a number";
    if (partySize && partySize > 50)
        fieldErrors.partySize = "Party size is too large";

    return { fieldErrors, partySize };
}

export function validateQuotedWait(quotedWaitRaw: string): {
    fieldErrors: Record<string, string>;
    quotedWaitMinutes: number;
} {
    let fieldErrors: Record<string, string> = {};
    let quotedWaitMinutes = 0;

    if (quotedWaitRaw) {
        let n = parseNonNegativeInt(quotedWaitRaw);
        if (n === null)
            fieldErrors.quotedWaitMinutes = "Quoted wait must be a number";
        if (typeof n === "number" && n % 5 !== 0)
            fieldErrors.quotedWaitMinutes =
                "Quoted wait must be in 5-minute increments";
        if (typeof n === "number" && n > 60)
            fieldErrors.quotedWaitMinutes =
                "Quoted wait must be 60 minutes or less";
        if (typeof n === "number" && n % 5 === 0 && n <= 60)
            quotedWaitMinutes = n;
    }

    return { fieldErrors, quotedWaitMinutes };
}

export function responseBadRequest(
    payload: WaitlistActionErrorPayload,
): Response {
    return Response.json(payload, { status: 400 });
}

export function responseNotFound(
    payload: WaitlistActionErrorPayload,
): Response {
    return Response.json(payload, { status: 404 });
}

export function responseServerError(
    payload: WaitlistActionErrorPayload,
): Response {
    return Response.json(payload, { status: 500 });
}
