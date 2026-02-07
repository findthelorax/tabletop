import * as React from "react";
import { useFetchers, useNavigation } from "react-router";
import type { Theme } from "../utils/theme.server";
import { WaitlistSidebar } from "../components/waitlist/WaitlistSidebar";
import { TopNav } from "./top-nav";
import type { SidebarData } from "../components/waitlist/waitlist-sidebar-types";

type AppShellProps = {
    children: React.ReactNode;
    theme: Theme;
    themeToggle: React.ReactNode;
    waitlistSidebarData?: SidebarData | null;
    storeNumber?: number | null;
};

export function AppShell({
    children,
    theme,
    themeToggle,
    waitlistSidebarData,
    storeNumber,
}: AppShellProps) {
    let [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

    let [cachedWaitlistSidebarData, setCachedWaitlistSidebarData] =
        React.useState(waitlistSidebarData ?? undefined);
    React.useEffect(() => {
        if (waitlistSidebarData == null) return;
        setCachedWaitlistSidebarData(waitlistSidebarData);
    }, [waitlistSidebarData]);

    let navigation = useNavigation();
    let fetchers = useFetchers();

    let busy =
        navigation.state !== "idle" ||
        fetchers.some((fetcher) => fetcher.state !== "idle");

    React.useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    React.useEffect(() => {
        document.documentElement.setAttribute(
            "data-busy",
            busy ? "true" : "false",
        );
    }, [busy]);

    return (
        <div className="appShell">
            <div className="appFrame">
                <TopNav
                    brand={
                        storeNumber != null && storeNumber !== 1
                            ? `Store #${storeNumber}`
                            : "Table Manager"
                    }
                    themeToggle={themeToggle}
                />

                <div
                    className="appMainRow"
                    data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
                >
                    <aside
                        className="sidebar"
                        data-collapsed={sidebarCollapsed ? "true" : "false"}
                        aria-label="Sidebar"
                    >
                        <WaitlistSidebar
                            collapsed={sidebarCollapsed}
                            initialData={cachedWaitlistSidebarData}
                            onToggleCollapsed={() =>
                                setSidebarCollapsed((v) => !v)
                            }
                        />
                    </aside>

                    <main className="mainContent">{children}</main>
                </div>
            </div>
        </div>
    );
}
