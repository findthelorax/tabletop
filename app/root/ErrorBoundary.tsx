import { isRouteErrorResponse, useLocation } from "react-router";

import type { Route } from "../+types/root";

export function RootErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let location = useLocation();
    let message = "Oops!";
    let details = "An unexpected error occurred.";
    let stack: string | undefined;
    let data: unknown;
    let showStack =
        import.meta.env.DEV || import.meta.env.VITE_SHOW_ERROR_STACK === "true";

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "404" : "Error";
        details =
            error.status === 404
                ? "The requested page could not be found."
                : error.statusText || details;
        data = error.data;
    } else if (error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
        if (!showStack) stack = undefined;
    } else if (error) {
        details = String(error);
    }

    return (
        <main className="errorPage">
            <h1>{message}</h1>
            <p>{details}</p>
            <p className="errorMeta">
                {location.pathname}
                {location.search}
            </p>
            {stack && (
                <pre className="errorStack">
                    <code>{stack}</code>
                </pre>
            )}
            {showStack && data !== undefined ? (
                <pre className="errorStack">
                    <code>{JSON.stringify(data, null, 2)}</code>
                </pre>
            ) : null}
        </main>
    );
}
