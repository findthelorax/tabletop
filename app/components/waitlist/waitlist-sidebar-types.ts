export type SidebarWaitlistItem = {
    id: string;
    partyName: string;
    partySize: number;
    phoneNumber: string | null;
    status: string;
    isCallAhead: boolean;
    quotedWaitMinutes: number | null;
    notes: string | null;
    preferredTableId: string | null;
    preferredTableNumber: number | null;
    waitingStartedAt: string | null;
    arrivedAt: string | null;
    createdAt: string;
    seatedTableLabel: string | null;
};

export type SidebarTable = {
    id: string;
    tableNumber: number;
    label: string | null;
    capacity: number;
};

export type SidebarData = {
    items: SidebarWaitlistItem[];
    tables: SidebarTable[];
};

export type ActionResult =
    | { ok: true }
    | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

export const QUOTED_WAIT_OPTIONS = [
    0,
    ...Array.from({ length: 12 }, (_, i) => (i + 1) * 5),
];
