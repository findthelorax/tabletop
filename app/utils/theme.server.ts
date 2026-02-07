import { createCookie } from "react-router";

export type Theme = "light" | "dark";

export const themeCookie = createCookie("theme", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
});
