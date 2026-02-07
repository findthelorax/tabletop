import { Form, Outlet, useLocation } from "react-router";

import type { Route } from "../+types/root";
import { AppShell } from "../ui/app-shell";
import { ToastProvider } from "../ui/toast";
import { useAutoRevalidate } from "../utils/use-auto-revalidate";
import { useLiveRevalidate } from "../utils/use-live-revalidate";

export function RootApp({ loaderData }: Route.ComponentProps) {
    let location = useLocation();
    let isLoginRoute = location.pathname === "/login";

    useLiveRevalidate({ enabled: !isLoginRoute });
    // Fallback in case a device misses an event or the connection drops.
    useAutoRevalidate({ enabled: !isLoginRoute, intervalMs: 60_000 });

    return (
        <ToastProvider>
            {isLoginRoute ? (
                <Outlet />
            ) : (
                <AppShell
                    theme={loaderData.theme}
                    waitlistSidebarData={loaderData.waitlistSidebarData}
                    storeNumber={loaderData.storeNumber}
                    themeToggle={
                        <>
                            <Form method="post" className="themeToggleForm">
                                <button
                                    type="submit"
                                    name="intent"
                                    value="toggle-theme"
                                    className="themeToggleSwitch"
                                    data-theme={loaderData.theme}
                                    role="switch"
                                    aria-checked={
                                        loaderData.theme === "dark"
                                            ? true
                                            : false
                                    }
                                    aria-label="Toggle light/dark mode"
                                    title="Toggle theme"
                                >
                                    <span
                                        className="themeToggleTrackIcon themeToggleTrackIconLight"
                                        aria-hidden="true"
                                    >
                                        ☀
                                    </span>
                                    <span
                                        className="themeToggleTrackIcon themeToggleTrackIconDark"
                                        aria-hidden="true"
                                    >
                                        ☾
                                    </span>

                                    <span
                                        className="themeToggleKnob"
                                        aria-hidden="true"
                                    >
                                        <span className="themeToggleKnobIcon">
                                            {loaderData.theme === "dark"
                                                ? "☾"
                                                : "☀"}
                                        </span>
                                    </span>
                                </button>
                            </Form>

                            <Form method="post" className="themeToggleForm">
                                <button
                                    type="submit"
                                    name="intent"
                                    value="logout"
                                    className="themeToggleButton"
                                    aria-label="Log out"
                                >
                                    Logout
                                </button>
                            </Form>
                        </>
                    }
                >
                    <Outlet />
                </AppShell>
            )}
        </ToastProvider>
    );
}
