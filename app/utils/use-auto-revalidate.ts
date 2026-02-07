import * as React from "react";
import {
    useFetchers,
    useLocation,
    useNavigation,
    useRevalidator,
} from "react-router";

type Options = {
    intervalMs?: number;
    enabled?: boolean;
};

function isNavigatorOnline(): boolean {
    // `navigator.onLine` is widely supported but not perfect; treat missing as online.
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

export function useAutoRevalidate(options?: Options) {
    let intervalMs = options?.intervalMs ?? 10_000;
    let enabled = options?.enabled ?? true;

    let location = useLocation();
    let navigation = useNavigation();
    let fetchers = useFetchers();
    let { revalidate } = useRevalidator();

    let isBusy =
        navigation.state !== "idle" ||
        fetchers.some((fetcher) => fetcher.state !== "idle");

    let enabledRef = React.useRef(enabled);
    enabledRef.current = enabled;

    let busyRef = React.useRef(isBusy);
    busyRef.current = isBusy;

    React.useEffect(() => {
        if (!enabled) return;

        function canRevalidate(): boolean {
            if (!enabledRef.current) return false;
            if (busyRef.current) return false;
            if (!isNavigatorOnline()) return false;
            if (typeof document !== "undefined") {
                if (document.visibilityState !== "visible") return false;
            }
            return true;
        }

        function tick() {
            if (!canRevalidate()) return;
            revalidate();
        }

        // Keep things current when the user comes back.
        function onResume() {
            tick();
        }

        const intervalId = window.setInterval(tick, intervalMs);
        window.addEventListener("focus", onResume);
        document.addEventListener("visibilitychange", onResume);

        // If the route changes, reset the timer cadence (and get a quick refresh).
        tick();

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", onResume);
            document.removeEventListener("visibilitychange", onResume);
        };
        // We intentionally re-create the interval on pathname changes so page-to-page
        // navigations don't inherit a stale timer.
    }, [enabled, intervalMs, location.pathname, revalidate]);
}
