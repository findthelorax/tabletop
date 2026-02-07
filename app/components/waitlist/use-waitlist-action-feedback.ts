import * as React from "react";
import type { FetcherWithComponents } from "react-router";

import { useToast } from "../../ui/toast";
import type { ActionResult, SidebarData } from "./waitlist-sidebar-types";

export function useWaitlistActionFeedback(input: {
    actionFetcher: FetcherWithComponents<ActionResult>;
    dataFetcher: FetcherWithComponents<SidebarData>;
    pendingToastRef: React.MutableRefObject<string | null>;
    onSuccess?: () => void;
}): void {
    let { addToast } = useToast();
    let handledActionRef = React.useRef<ActionResult | null>(null);

    React.useEffect(() => {
        if (input.actionFetcher.state !== "idle") return;
        if (!input.actionFetcher.data) return;

        // Avoid duplicate toasts in React 18 StrictMode/dev.
        if (handledActionRef.current === input.actionFetcher.data) return;
        handledActionRef.current = input.actionFetcher.data;

        if (input.actionFetcher.data.ok) {
            addToast(
                input.pendingToastRef.current ?? "Updated waitlist",
                "success",
            );
            input.pendingToastRef.current = null;
            input.onSuccess?.();
            input.dataFetcher.load("/waitlist/sidebar");
            return;
        }

        addToast(
            input.actionFetcher.data.formError ?? "Could not update waitlist",
            "error",
        );
        input.pendingToastRef.current = null;
    }, [addToast, input]);
}
