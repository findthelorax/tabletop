import type { Route } from "./+types/live";
import { getRestaurantId, requireAuth } from "../utils/auth.server";
import { subscribeRestaurantUpdates } from "../utils/live-updates.server";

export async function loader({ request }: Route.LoaderArgs) {
    let session = await requireAuth(request);
    let restaurantId = getRestaurantId(session);
    if (!restaurantId) {
        return new Response("Unauthorized", { status: 401 });
    }

    let encoder = new TextEncoder();
    let stream = new TransformStream<Uint8Array, Uint8Array>();
    let writer = stream.writable.getWriter();

    let closed = false;

    function writeLine(line: string) {
        if (closed) return;
        // Fire-and-forget; if the client disconnects, writes will fail and we’ll
        // be cleaned up by the abort handler.
        void writer.write(encoder.encode(line));
    }

    function sendEvent(event: string, data: string) {
        // SSE format: event + data + blank line
        writeLine(`event: ${event}\n`);
        writeLine(`data: ${data}\n\n`);
    }

    // Initial event so the client can revalidate once on connect.
    sendEvent("hello", String(Date.now()));

    let unsubscribe = subscribeRestaurantUpdates(restaurantId, () => {
        sendEvent("change", String(Date.now()));
    });

    let keepAliveId = setInterval(() => {
        // Comment line keeps proxies from buffering/closing.
        writeLine(`: keepalive ${Date.now()}\n\n`);
    }, 15_000);

    async function cleanup() {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(keepAliveId);
        try {
            await writer.close();
        } catch {
            // ignore
        }
    }

    request.signal.addEventListener("abort", () => {
        void cleanup();
    });

    return new Response(stream.readable, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}

export default function Live(_: Route.ComponentProps) {
    return null;
}
