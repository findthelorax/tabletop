type Listener = () => void;

type Bus = {
    subscribe: (restaurantId: string, listener: Listener) => () => void;
    publish: (restaurantId: string) => void;
};

function createBus(): Bus {
    let listenersByRestaurantId = new Map<string, Set<Listener>>();

    function subscribe(restaurantId: string, listener: Listener) {
        let set = listenersByRestaurantId.get(restaurantId);
        if (!set) {
            set = new Set();
            listenersByRestaurantId.set(restaurantId, set);
        }
        set.add(listener);

        return () => {
            let current = listenersByRestaurantId.get(restaurantId);
            if (!current) return;
            current.delete(listener);
            if (current.size === 0)
                listenersByRestaurantId.delete(restaurantId);
        };
    }

    function publish(restaurantId: string) {
        let set = listenersByRestaurantId.get(restaurantId);
        if (!set || set.size === 0) return;
        for (let listener of set) {
            try {
                listener();
            } catch {
                // Ignore listener failures.
            }
        }
    }

    return { subscribe, publish };
}

function getGlobalBus(): Bus {
    let g = globalThis as unknown as {
        __tableManagerLiveUpdateBus?: Bus;
    };

    if (!g.__tableManagerLiveUpdateBus) {
        g.__tableManagerLiveUpdateBus = createBus();
    }

    return g.__tableManagerLiveUpdateBus;
}

export function subscribeRestaurantUpdates(
    restaurantId: string,
    listener: Listener,
): () => void {
    return getGlobalBus().subscribe(restaurantId, listener);
}

export function publishRestaurantUpdate(restaurantId: string): void {
    getGlobalBus().publish(restaurantId);
}

export async function publishIfOkJsonResponse(
    restaurantId: string,
    response: Response,
): Promise<void> {
    if (!response || !response.ok) return;

    let contentType = response.headers.get("Content-Type") ?? "";
    if (!contentType.includes("application/json")) return;

    try {
        let data = await response.clone().json();
        if (
            data &&
            typeof data === "object" &&
            "ok" in data &&
            (data as any).ok === true
        ) {
            publishRestaurantUpdate(restaurantId);
        }
    } catch {
        // Ignore JSON parsing failures.
    }
}
