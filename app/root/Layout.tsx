import {
    Links,
    Meta,
    ScrollRestoration,
    Scripts,
    useLoaderData,
} from "react-router";

import type { RootLoaderData } from "./loader.types";

export function RootLayout({ children }: { children: React.ReactNode }) {
    // Apply theme on the initial document render to avoid a flash-of-incorrect-theme.
    let { theme } = useLoaderData() as RootLoaderData;
    return (
        <html
            lang="en"
            data-theme={theme}
            className={theme === "dark" ? "dark" : undefined}
        >
            <head suppressHydrationWarning>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <Meta />
                <Links />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}
