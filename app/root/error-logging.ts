import { isRouteErrorResponse } from "react-router";

export function handleRootError(
    error: unknown,
    args: { request: Request; params?: Record<string, string | undefined> },
) {
    try {
        let url = new URL(args.request.url);
        let method = args.request.method;

        let userAgent = args.request.headers.get("User-Agent") ?? undefined;
        let forwardedFor =
            args.request.headers.get("CF-Connecting-IP") ??
            args.request.headers.get("X-Forwarded-For") ??
            undefined;

        let cfRay = args.request.headers.get("CF-Ray") ?? undefined;
        let requestId =
            args.request.headers.get("X-Request-Id") ??
            args.request.headers.get("X-Request-ID") ??
            undefined;

        if (isRouteErrorResponse(error)) {
            console.error("[route-error]", {
                method,
                url: url.toString(),
                status: error.status,
                statusText: error.statusText,
                data: error.data,
                params: args.params,
                userAgent,
                forwardedFor,
                cfRay,
                requestId,
            });
            return;
        }

        if (error instanceof Error) {
            console.error("[unhandled-error]", {
                method,
                url: url.toString(),
                name: error.name,
                message: error.message,
                stack: error.stack,
                params: args.params,
                userAgent,
                forwardedFor,
                cfRay,
                requestId,
            });
            return;
        }

        console.error("[unhandled-error]", {
            method,
            url: url.toString(),
            error: String(error),
            params: args.params,
            userAgent,
            forwardedFor,
            cfRay,
            requestId,
        });
    } catch (loggingError) {
        console.error("[unhandled-error] Logging failed", loggingError);
        console.error(error);
    }
}
