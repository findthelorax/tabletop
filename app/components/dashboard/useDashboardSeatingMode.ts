import * as React from "react";
import type { SetURLSearchParams } from "react-router";

export function useDashboardSeatingMode(options: {
    searchParams: URLSearchParams;
    setSearchParams: SetURLSearchParams;
    onClearCombineSelection: () => void;
}) {
    let { searchParams, setSearchParams, onClearCombineSelection } = options;

    let seatWaitlistId = searchParams.get("seatWaitlistId")?.trim() || null;
    let seatPartySize = (() => {
        let raw = searchParams.get("seatPartySize");
        if (!raw) return null;
        let n = Number.parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    })();
    let seatPartyName = searchParams.get("seatPartyName")?.trim() || "";

    let clearSeatingMode = React.useCallback(() => {
        let next = new URLSearchParams(searchParams);
        next.delete("seatWaitlistId");
        next.delete("seatPartySize");
        next.delete("seatPartyName");
        setSearchParams(next);
        onClearCombineSelection();
    }, [onClearCombineSelection, searchParams, setSearchParams]);

    React.useEffect(() => {
        if (!seatWaitlistId || !seatPartySize) return;

        function onPointerDown(e: PointerEvent) {
            let target = e.target;
            if (!(target instanceof Element)) return;

            // If a modal is open and the user is interacting with it (e.g. confirming
            // combine tables), do not cancel seating mode.
            if (target.closest(".modalOverlay")) return;

            // If you click a table tile, allow seating to proceed.
            if (target.closest(".dashboardTableTile")) return;

            // Any other click cancels seating mode.
            clearSeatingMode();
        }

        window.addEventListener("pointerdown", onPointerDown, true);
        return () => {
            window.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, [clearSeatingMode, seatPartySize, seatWaitlistId]);

    return {
        seatWaitlistId,
        seatPartySize,
        seatPartyName,
        clearSeatingMode,
    };
}
