import type { SidebarWaitlistItem } from "./waitlist-sidebar-types";

export function getWaitlistStatusLabel(input: {
    item: SidebarWaitlistItem;
    seatWaitlistId: string | null;
}): string {
    let { item, seatWaitlistId } = input;

    if (seatWaitlistId && seatWaitlistId === item.id) {
        return "SITTING";
    }

    // Call-ahead: show CALL AHEAD until they are marked arrived (timer started).
    if (item.isCallAhead && !item.waitingStartedAt) {
        return "CALL AHEAD";
    }

    // Everything else in the active list is treated as waiting.
    return "WAITING";
}
