import * as React from "react";
import {
    useFetchers,
    useLocation,
    useNavigation,
    useRevalidator,
} from "react-router";

type Options = {
    enabled?: boolean;
};

export function useLiveRevalidate(options?: Options) {
    let enabled = options?.enabled ?? true;

    let location = useLocation();
    let navigation = useNavigation();
    let fetchers = useFetchers();
    let { revalidate } = useRevalidator();

    let isBusy =
        navigation.state !== "idle" ||
        fetchers.some((fetcher) => fetcher.state !== "idle");

    let pendingRef = React.useRef(false);
    let lastRevalidateAtRef = React.useRef(0);

    let tryRevalidate = React.useCallback(() => {
        if (typeof document !== "undefined") {
            if (document.visibilityState !== "visible") return;
        }

        if (isBusy) {
            pendingRef.current = true;
            return;
        }

        let now = Date.now();
        // Throttle bursts (e.g. multiple status updates in quick succession).
        if (now - lastRevalidateAtRef.current < 300) {
            pendingRef.current = true;
            return;
        }

        pendingRef.current = false;
        lastRevalidateAtRef.current = now;
        revalidate();
    }, [isBusy, revalidate]);

    React.useEffect(() => {
        if (!enabled) return;
        if (!pendingRef.current) return;
        if (isBusy) return;

        // If we had to defer because of busy state, run as soon as it clears.
        tryRevalidate();
    }, [enabled, isBusy, tryRevalidate]);

    React.useEffect(() => {
        if (!enabled) return;

        // Reconnect SSE on route changes (keeps behavior predictable when
        // moving between pages, and helps if anything closes the connection).
        let es = new EventSource("/live");

        function onChange() {
            tryRevalidate();
        }

        es.addEventListener("change", onChange);
        es.addEventListener("message", onChange);

        // Also refresh when the user comes back.
        function onResume() {
            tryRevalidate();
        }

        window.addEventListener("focus", onResume);
        document.addEventListener("visibilitychange", onResume);

        return () => {
            window.removeEventListener("focus", onResume);
            document.removeEventListener("visibilitychange", onResume);
            es.removeEventListener("change", onChange);
            es.removeEventListener("message", onChange);
            es.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, location.pathname, tryRevalidate]);
}
