import type { SidebarWaitlistItem } from "./waitlist-sidebar-types";

export type WaitlistAddValues = {
    partyName: string;
    partySize: number;
    phoneNumber: string;
    isCallAhead: boolean;
    preferredTableId: string | null;
    quotedWaitMinutes: number | null;
    notes: string;
};

export type WaitlistEditValues = {
    id: string;
    partyName: string;
    partySize: number;
    phoneNumber: string;
    isCallAhead: boolean;
    preferredTableId: string | null;
    quotedWaitMinutes: number | null;
    notes: string;
};

export function fdWaitlistAdd(values: WaitlistAddValues): FormData {
    let fd = new FormData();
    fd.set("intent", "waitlist-add");
    fd.set("partyName", values.partyName);
    fd.set("partySize", String(values.partySize));
    fd.set("phoneNumber", values.phoneNumber);
    fd.set("isCallAhead", values.isCallAhead ? "true" : "false");

    if (values.preferredTableId) {
        fd.set("preferredTableId", values.preferredTableId);
    }

    if (values.quotedWaitMinutes != null) {
        fd.set("quotedWaitMinutes", String(values.quotedWaitMinutes));
    }

    fd.set("notes", values.notes);
    return fd;
}

export function fdWaitlistEdit(values: WaitlistEditValues): FormData {
    let fd = new FormData();
    fd.set("intent", "waitlist-edit");
    fd.set("id", values.id);
    fd.set("partyName", values.partyName);
    fd.set("partySize", String(values.partySize));
    fd.set("phoneNumber", values.phoneNumber);
    fd.set("isCallAhead", values.isCallAhead ? "true" : "false");

    if (values.preferredTableId && values.preferredTableId !== "") {
        fd.set("preferredTableId", values.preferredTableId);
    }

    if (values.quotedWaitMinutes != null) {
        fd.set("quotedWaitMinutes", String(values.quotedWaitMinutes));
    }

    fd.set("notes", values.notes);
    return fd;
}

export function fdWaitlistArrived(id: string): FormData {
    let fd = new FormData();
    fd.set("intent", "waitlist-arrived");
    fd.set("id", id);
    return fd;
}

export function fdWaitlistRemove(id: string): FormData {
    let fd = new FormData();
    fd.set("intent", "waitlist-remove");
    fd.set("id", id);
    return fd;
}

export function fdWaitlistText(id: string): FormData {
    let fd = new FormData();
    fd.set("intent", "waitlist-text");
    fd.set("id", id);
    return fd;
}

export function seatingToastLabel(guest: SidebarWaitlistItem): string {
    return guest.partyName ? `Seating ${guest.partyName}` : "Seating guest";
}
