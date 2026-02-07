import type { WaitlistStatus } from "@prisma/client";

export type WaitlistItem = {
    id: string;
    partyName: string;
    partySize: number;
    phoneNumber: string | null;
    status: WaitlistStatus;
    isCallAhead: boolean;
    quotedWaitMinutes: number | null;
    notes: string | null;
    preferredTableNumber: number | null;
    waitingStartedAt: string | null;
    createdAt: string;
    removedAt: string | null;
    seatedAt: string | null;
    seatedTableLabel: string | null;
    waitMinutes: number | null;
    mealPeriod: "lunch" | "dinner" | null;
};

export type WaitlistLoaderData = {
    items: WaitlistItem[];
    selectedServiceDay: string;
    lunchAverageWaitMinutes: number | null;
    dinnerAverageWaitMinutes: number | null;
};
