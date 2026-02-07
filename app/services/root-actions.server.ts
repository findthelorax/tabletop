import { redirect } from "react-router";

import { getPrisma } from "../utils/db.server";
import { logout, requireAuth, requireRestaurantId } from "../utils/auth.server";
import { themeCookie, type Theme } from "../utils/theme.server";
import { todayServiceDayLocal } from "../utils/service-day";
import { toTitleCaseName } from "../utils/name-case";
import { getPrismaErrorInfo, prismaP2021Message } from "./prisma-errors.server";

function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
}

function todayServiceDay(now: Date) {
    return todayServiceDayLocal(now);
}

type WaitlistFieldErrors = Record<string, string>;

function parseWaitlistFields(formData: FormData, now: Date) {
    let partyName = toTitleCaseName(String(formData.get("partyName") ?? ""));
    let phoneNumberRaw = String(formData.get("phoneNumber") ?? "").trim();
    let partySizeRaw = String(formData.get("partySize") ?? "").trim();
    let isCallAhead = formData.get("isCallAhead") === "on";
    let quotedWaitMinutesRaw = String(
        formData.get("quotedWaitMinutes") ?? "",
    ).trim();
    let notes = String(formData.get("notes") ?? "").trim();

    let phoneDigits = onlyDigits(phoneNumberRaw);

    let fieldErrors: WaitlistFieldErrors = {};

    if (!partyName) fieldErrors.partyName = "Guest name is required";

    if (!partySizeRaw) {
        fieldErrors.partySize = "Party size is required";
    } else if (!/^\d+$/.test(partySizeRaw)) {
        fieldErrors.partySize = "Party size must be a whole number";
    }

    let partySize = /^\d+$/.test(partySizeRaw)
        ? Number.parseInt(partySizeRaw, 10)
        : Number.NaN;

    if (Number.isFinite(partySize) && partySize <= 0) {
        fieldErrors.partySize = "Party size must be at least 1";
    }

    let quotedWaitMinutes: number | undefined;
    if (quotedWaitMinutesRaw) {
        if (!/^\d+$/.test(quotedWaitMinutesRaw)) {
            fieldErrors.quotedWaitMinutes = "Wait time must be a whole number";
        } else {
            quotedWaitMinutes = Number.parseInt(quotedWaitMinutesRaw, 10);
        }
    }

    if (phoneDigits && phoneDigits.length !== 10) {
        fieldErrors.phoneNumber = "Phone number must be exactly 10 digits";
    }

    let serviceDay = todayServiceDay(now);

    return {
        partyName,
        phoneDigits,
        partySize,
        isCallAhead,
        quotedWaitMinutes,
        notes,
        serviceDay,
        fieldErrors,
    };
}

function toWaitlistErrorResponse(options: {
    error: unknown;
    intentLabel: string;
    defaultMessage: string;
}) {
    let { error, intentLabel, defaultMessage } = options;

    let errorId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    console.error(`[root:${intentLabel}] failed (${errorId})`, error);

    let isProd = process.env.NODE_ENV === "production";

    let { code: prismaCode, modelName: prismaModelName } =
        getPrismaErrorInfo(error);

    let knownMessage: string | undefined;
    if (prismaCode === "P2021") {
        knownMessage = prismaP2021Message(prismaModelName);
    }

    let errorMessage =
        error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : defaultMessage;

    let message = errorMessage.includes("DATABASE_URL")
        ? "Database is not configured (DATABASE_URL missing)"
        : knownMessage
          ? knownMessage
          : isProd
            ? `Operation failed (error ${errorId})`
            : errorMessage;

    return Response.json(
        {
            ok: false,
            formError: message,
            errorId,
            debug: isProd
                ? undefined
                : error instanceof Error
                  ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                    }
                  : { message: errorMessage },
        },
        { status: 500 },
    );
}

async function handleAddToWaitlist(formData: FormData, restaurantId: string) {
    let now = new Date();
    let {
        partyName,
        phoneDigits,
        partySize,
        isCallAhead,
        quotedWaitMinutes,
        notes,
        serviceDay,
        fieldErrors,
    } = parseWaitlistFields(formData, now);

    if (Object.keys(fieldErrors).length > 0) {
        return Response.json({ ok: false, fieldErrors }, { status: 400 });
    }

    try {
        let prisma = getPrisma() as any;

        await prisma.waitlistEntry.create({
            data: {
                restaurantId,
                serviceDay,
                partyName,
                partySize,
                phoneNumber: phoneDigits || null,
                isCallAhead,
                quotedWaitMinutes: Number.isFinite(quotedWaitMinutes)
                    ? quotedWaitMinutes
                    : null,
                notes: notes || null,
                status: isCallAhead ? "CALL_AHEAD" : "WAITING",
                waitingStartedAt: isCallAhead ? null : now,
                arrivedAt: null,
                seatedAt: null,
                removedAt: null,
            },
        });

        return Response.json({ ok: true }, { status: 200 });
    } catch (error) {
        return toWaitlistErrorResponse({
            error,
            intentLabel: "add-to-waitlist",
            defaultMessage: "Could not add to waitlist",
        });
    }
}

async function handleUpdateWaitlistEntry(
    formData: FormData,
    intent: string,
    restaurantId: string,
) {
    let waitlistEntryId = String(formData.get("waitlistEntryId") ?? "").trim();
    if (!waitlistEntryId) {
        return Response.json(
            { ok: false, formError: "Missing waitlist entry id" },
            { status: 400 },
        );
    }

    let now = new Date();
    let serviceDay = todayServiceDay(now);

    try {
        let prisma = getPrisma() as any;

        let existing = await prisma.waitlistEntry.findFirst({
            where: {
                id: waitlistEntryId,
                restaurantId,
                serviceDay,
            },
            select: {
                id: true,
                isCallAhead: true,
                status: true,
                waitingStartedAt: true,
            },
        });

        if (!existing) {
            return Response.json(
                { ok: false, formError: "Waitlist entry not found" },
                { status: 404 },
            );
        }

        if (intent === "sit-waitlist-entry") {
            await prisma.waitlistEntry.update({
                where: { id: existing.id },
                data: {
                    status: "SEATED",
                    seatedAt: now,
                    removedAt: now,
                },
            });

            return Response.json({ ok: true }, { status: 200 });
        }

        if (intent === "remove-waitlist-entry") {
            await prisma.waitlistEntry.update({
                where: { id: existing.id },
                data: {
                    status: "CANCELLED",
                    removedAt: now,
                },
            });

            return Response.json({ ok: true }, { status: 200 });
        }

        // intent === "update-waitlist-entry"
        let {
            partyName,
            phoneDigits,
            partySize,
            isCallAhead,
            quotedWaitMinutes,
            notes,
            fieldErrors,
        } = parseWaitlistFields(formData, now);

        if (Object.keys(fieldErrors).length > 0) {
            return Response.json({ ok: false, fieldErrors }, { status: 400 });
        }

        let nextStatus: "CALL_AHEAD" | "WAITING" = isCallAhead
            ? "CALL_AHEAD"
            : "WAITING";
        let nextWaitingStartedAt = isCallAhead
            ? null
            : (existing.waitingStartedAt ?? now);

        await prisma.waitlistEntry.update({
            where: { id: existing.id },
            data: {
                partyName,
                partySize,
                phoneNumber: phoneDigits || null,
                isCallAhead,
                quotedWaitMinutes: Number.isFinite(quotedWaitMinutes)
                    ? quotedWaitMinutes
                    : null,
                notes: notes || null,
                status: nextStatus,
                waitingStartedAt: nextWaitingStartedAt,
            },
        });

        return Response.json({ ok: true }, { status: 200 });
    } catch (error) {
        return toWaitlistErrorResponse({
            error,
            intentLabel: String(intent),
            defaultMessage: "Operation failed",
        });
    }
}

export async function runRootAction(request: Request) {
    let formData = await request.formData();
    let intent = String(formData.get("intent") ?? "");

    let redirectTo = request.headers.get("Referer") ?? "/";

    if (intent === "toggle-theme") {
        let cookieHeader = request.headers.get("Cookie");
        let currentTheme = (await themeCookie.parse(cookieHeader)) as
            | Theme
            | undefined;
        let nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";

        return redirect(redirectTo, {
            headers: {
                "Set-Cookie": await themeCookie.serialize(nextTheme),
            },
        });
    }

    if (intent === "logout") {
        return logout(request);
    }

    await requireAuth(request);
    let restaurantId = await requireRestaurantId(request);

    if (intent === "add-to-waitlist") {
        return handleAddToWaitlist(formData, restaurantId);
    }

    if (
        intent === "update-waitlist-entry" ||
        intent === "sit-waitlist-entry" ||
        intent === "remove-waitlist-entry"
    ) {
        return handleUpdateWaitlistEntry(formData, intent, restaurantId);
    }

    return null;
}
