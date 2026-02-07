import * as React from "react";
import type { FetcherWithComponents } from "react-router";

import type { SidebarData } from "./waitlist-sidebar-types";

export function useNowMs(tickMs: number = 1_000): number {
    let [nowMs, setNowMs] = React.useState(() => Date.now());

    React.useEffect(() => {
        const id = window.setInterval(() => setNowMs(Date.now()), tickMs);
        return () => window.clearInterval(id);
    }, [tickMs]);

    return nowMs;
}

export function useWaitlistSidebarPolling(
    dataFetcher: FetcherWithComponents<SidebarData>,
    options?: { pollMs?: number; enabled?: boolean },
): void {
    let pollMs = options?.pollMs ?? 30_000;
    let enabled = options?.enabled ?? true;

    React.useEffect(() => {
        if (!enabled) return;
        dataFetcher.load("/waitlist/sidebar");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    React.useEffect(() => {
        if (!enabled) return;
        const id = window.setInterval(
            () => dataFetcher.load("/waitlist/sidebar"),
            pollMs,
        );
        return () => window.clearInterval(id);
    }, [dataFetcher, enabled, pollMs]);
}
