import * as React from "react";

import type { DashboardActionResult } from "./dashboard-utils";

type Intent =
    | "set-section-server-id"
    | "set-section-status"
    | "seat-waitlist"
    | "seat-waitlist-combined"
    | "undo-action"
    | "add-temp-table"
    | null;

export function useDashboardActionFeedback(options: {
    fetcher: { state: string; data: DashboardActionResult | undefined };
    addToast: (message: string, kind: "success" | "error") => void;
    revalidate: () => void;
    pendingToastRef: React.MutableRefObject<string | null>;
    pendingIntentRef: React.MutableRefObject<string | null>;
    clearSeatingMode: () => void;
    onSuccess: {
        closeActiveTable: () => void;
        closeActiveSection: () => void;
        closeUndoModal: () => void;
        resetTempModal: () => void;
    };
}) {
    let {
        fetcher,
        addToast,
        revalidate,
        pendingToastRef,
        pendingIntentRef,
        clearSeatingMode,
        onSuccess,
    } = options;

    // React Router fetchers can transition back to `idle` multiple times during
    // revalidation while still holding the same `data` object. Track the last
    // handled result so we only toast once per response.
    let lastHandledResultRef = React.useRef<DashboardActionResult | null>(null);

    React.useEffect(() => {
        if (fetcher.state !== "idle") return;
        if (!fetcher.data) return;

        if (lastHandledResultRef.current === fetcher.data) return;
        lastHandledResultRef.current = fetcher.data;

        if (fetcher.data.ok) {
            addToast(pendingToastRef.current ?? "Updated table", "success");
            pendingToastRef.current = null;
            onSuccess.closeActiveTable();

            let intent = (pendingIntentRef.current as Intent) ?? null;

            if (
                intent === "set-section-server-id" ||
                intent === "set-section-status"
            ) {
                pendingIntentRef.current = null;
                onSuccess.closeActiveSection();
            }

            if (
                intent === "seat-waitlist" ||
                intent === "seat-waitlist-combined"
            ) {
                pendingIntentRef.current = null;
                clearSeatingMode();
            }

            if (intent === "undo-action") {
                pendingIntentRef.current = null;
                onSuccess.closeUndoModal();
            }

            if (intent === "add-temp-table") {
                pendingIntentRef.current = null;
                onSuccess.resetTempModal();
            }

            revalidate();
            return;
        }

        if (fetcher.data.formError) {
            addToast(fetcher.data.formError, "error");
        } else {
            addToast("Could not update table", "error");
        }
    }, [
        addToast,
        clearSeatingMode,
        fetcher.data,
        fetcher.state,
        lastHandledResultRef,
        onSuccess,
        pendingIntentRef,
        pendingToastRef,
        revalidate,
    ]);
}
