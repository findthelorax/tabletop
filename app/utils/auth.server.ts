import {
    createCookieSessionStorage,
    redirect,
    type Session,
} from "react-router";

import { getPrisma } from "./db.server";
import {
    ensureBootstrapRestaurant,
    findRestaurantForLogin,
} from "../services/restaurant.server";
import { hashPassword, verifyPassword } from "./password.server";

const SESSION_COOKIE_NAME = "__session";
const SESSION_RESTAURANT_ID_KEY = "restaurantId";

function isProd() {
    return process.env.NODE_ENV === "production";
}

function parseBoolEnv(value: string | undefined): boolean | null {
    if (!value) return null;
    let normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes")
        return true;
    if (normalized === "false" || normalized === "0" || normalized === "no")
        return false;
    return null;
}

function shouldUseSecureCookies(): boolean {
    // In production, Secure cookies are strongly recommended.
    // If you are testing by hitting the container over plain HTTP (LAN IP:port),
    // you can override this with SESSION_COOKIE_SECURE=false.
    let override = parseBoolEnv(process.env.SESSION_COOKIE_SECURE);
    if (override != null) return override;
    return isProd();
}

function getSessionSecret(): string {
    let secret = process.env.SESSION_SECRET;

    if (secret && secret.trim()) return secret;

    if (isProd()) {
        throw new Error(
            "SESSION_SECRET is required in production (set it as an env var)",
        );
    }

    return "dev-session-secret";
}

function getCreds() {
    let username = process.env.APP_USERNAME;
    let password = process.env.APP_PASSWORD;

    return {
        username: username && username.trim() ? username : null,
        password: password && password.trim() ? password : null,
    };
}

const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: SESSION_COOKIE_NAME,
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: shouldUseSecureCookies(),
        secrets: [getSessionSecret()],
    },
});

export async function getAuthSession(request: Request) {
    let cookieHeader = request.headers.get("Cookie");
    return sessionStorage.getSession(cookieHeader);
}

export function getRestaurantId(session: Session): string | null {
    let id = session.get(SESSION_RESTAURANT_ID_KEY);
    return typeof id === "string" && id.trim() ? id : null;
}

export function isAuthenticated(session: Session) {
    return getRestaurantId(session) != null;
}

export async function requireAuth(request: Request) {
    let session = await getAuthSession(request);
    if (isAuthenticated(session)) return session;

    let url = new URL(request.url);
    let redirectTo = url.pathname + url.search;

    throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function requireRestaurantId(request: Request): Promise<string> {
    let session = await requireAuth(request);
    let restaurantId = getRestaurantId(session);
    if (restaurantId) return restaurantId;

    let url = new URL(request.url);
    let redirectTo = url.pathname + url.search;
    throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function loginWithEnvCreds(options: {
    request: Request;
    username: string;
    password: string;
    redirectTo: string;
}) {
    // Backwards-compatible wrapper: treat env creds as the bootstrap restaurant login.
    return loginWithRestaurantCreds(options);
}

export async function loginWithRestaurantCreds(options: {
    request: Request;
    username: string;
    password: string;
    redirectTo: string;
}) {
    let { request, username, password, redirectTo } = options;

    let prisma = getPrisma() as any;
    try {
        await ensureBootstrapRestaurant(prisma);
    } catch (error) {
        // Common in fresh prod deploys: DB exists, but migrations haven't been applied.
        // Prisma throws P2021 (table does not exist).
        let code = (error as any)?.code;
        if (code === "P2021") {
            return Response.json(
                {
                    ok: false,
                    formError:
                        "Database is not initialized yet (missing tables). Run Prisma migrations (prisma migrate deploy) and try again.",
                },
                { status: 503 },
            );
        }
        throw error;
    }

    let restaurant;
    try {
        restaurant = await findRestaurantForLogin(prisma, username);
    } catch (error) {
        let code = (error as any)?.code;
        if (code === "P2021") {
            return Response.json(
                {
                    ok: false,
                    formError:
                        "Database is not initialized yet (missing tables). Run Prisma migrations (prisma migrate deploy) and try again.",
                },
                { status: 503 },
            );
        }
        throw error;
    }
    if (!restaurant) {
        return Response.json(
            { ok: false, formError: "Invalid username or password" },
            { status: 401 },
        );
    }

    let valid = false;
    if (restaurant.passwordSalt && restaurant.passwordHash) {
        valid = verifyPassword({
            password,
            salt: String(restaurant.passwordSalt),
            hash: String(restaurant.passwordHash),
        });
    } else {
        // If the bootstrap restaurant exists but has no stored password yet,
        // fall back to env creds once and persist the hash.
        let creds = getCreds();
        valid =
            !!creds.password &&
            password === creds.password &&
            (username === creds.username || /^\d+$/.test(username));

        if (valid && creds.password) {
            let hashed = hashPassword(creds.password);
            try {
                await prisma.restaurant.update({
                    where: { id: restaurant.id },
                    data: {
                        passwordSalt: hashed.salt,
                        passwordHash: hashed.hash,
                    },
                    select: { id: true },
                });
            } catch {
                // Non-fatal; session will still be established.
            }
        }
    }

    if (!valid) {
        return Response.json(
            { ok: false, formError: "Invalid username or password" },
            { status: 401 },
        );
    }

    let session = await getAuthSession(request);
    session.set(SESSION_RESTAURANT_ID_KEY, String(restaurant.id));

    return redirect("/", {
        headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
        },
    });
}

export async function logout(request: Request) {
    let session = await getAuthSession(request);

    return redirect("/login", {
        headers: {
            "Set-Cookie": await sessionStorage.destroySession(session),
        },
    });
}
