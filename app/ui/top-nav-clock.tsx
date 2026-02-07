import * as React from "react";

export const TopNavClock = React.memo(function TopNavClock() {
    let [nowMs, setNowMs] = React.useState(() => Date.now());

    React.useEffect(() => {
        let id = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    return (
        <div className="topNavTime" aria-label="Current time">
            <span suppressHydrationWarning>
                {new Date(nowMs).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                })}
            </span>
        </div>
    );
});
