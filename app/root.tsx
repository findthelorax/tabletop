import type { ReactNode } from "react";

import type { Route } from "./+types/root";
import { AppShell } from "./ui/app-shell";
import { ToastProvider } from "./ui/toast";
import { rootLoader } from "./root/loader.server";
import { rootAction } from "./root/action.server";
import { rootLinks } from "./root/links";
import { RootLayout } from "./root/Layout";
import { RootApp } from "./root/App";
import { RootErrorBoundary } from "./root/ErrorBoundary";
import { handleRootError } from "./root/error-logging";
import "./styles/app.css";

export async function loader(args: Route.LoaderArgs) {
    return rootLoader(args);
}

export async function action(args: Route.ActionArgs) {
    return rootAction(args);
}

export function handleError(
    error: unknown,
    args: { request: Request; params?: Record<string, string | undefined> },
) {
    return handleRootError(error, args);
}

export const links: Route.LinksFunction = rootLinks;

export function Layout({ children }: { children: ReactNode }) {
    return <RootLayout>{children}</RootLayout>;
}

export default function App(props: Route.ComponentProps) {
    return <RootApp {...props} />;
}

export function ErrorBoundary(props: Route.ErrorBoundaryProps) {
    return <RootErrorBoundary {...props} />;
}
